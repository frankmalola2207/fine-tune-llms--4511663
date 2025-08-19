/**
 * Personal Information Verification Screen
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Progress from 'react-native-progress';

import {useAppState, useAppDispatch, actions} from '../contexts/AppContext';
import APIService from '../services/api';

const PersonalInfoScreen = ({navigation}) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    document_number: '',
    nationality: '',
    country_of_issue: '',
    sex: '',
    expiry_date: '',
  });
  const [verificationNotes, setVerificationNotes] = useState('');
  const [extractionQuality, setExtractionQuality] = useState(null);

  useEffect(() => {
    // Initialize form with KYC data
    setFormData(state.kycData);
    
    // Set extraction quality if available
    if (state.extractedPersonalInfo?.extraction_confidence) {
      setExtractionQuality(state.extractedPersonalInfo.extraction_confidence);
    }
  }, [state.kycData, state.extractedPersonalInfo]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVerifyAndContinue = async () => {
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
      Alert.alert(
        'Missing Information',
        'Please fill in at least the required fields: First Name, Last Name, and Date of Birth.',
        [{text: 'OK'}]
      );
      return;
    }

    try {
      dispatch(actions.setLoading(true));
      dispatch(actions.setError(null));

      // Update KYC data in state
      dispatch(actions.updateKycData(formData));

      // Verify with backend
      const result = await APIService.verifyPersonalInfo(
        state.userId,
        state.extractedPersonalInfo || {},
        formData,
        verificationNotes
      );

      if (result.success) {
        dispatch(actions.setPersonalInfoVerified(true));
        
        // Determine next step based on configuration
        const hasOptionalBiometrics = state.biometricConfig?.optional_features?.length > 0;
        const hasFacialBiometrics = state.biometricConfig?.optional_features?.includes('facial_liveness') ||
                                  state.biometricConfig?.mandatory_features?.includes('facial_liveness');
        
        if (hasFacialBiometrics) {
          dispatch(actions.setCurrentStep(4));
          navigation.navigate('FacialBiometrics');
        } else if (hasOptionalBiometrics) {
          dispatch(actions.setCurrentStep(5));
          navigation.navigate('OptionalBiometrics');
        } else {
          dispatch(actions.setCurrentStep(6));
          navigation.navigate('Completion');
        }
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Personal info verification error:', error);
      Alert.alert(
        'Verification Failed',
        'Failed to verify personal information. Please check your data and try again.',
        [{text: 'OK'}]
      );
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const renderExtractionAlert = () => {
    if (!state.extractedPersonalInfo) return null;

    return (
      <View style={styles.extractionAlert}>
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.alertIcon}>
          <Icon name="auto-fix-high" size={20} color="#ffffff" />
        </LinearGradient>
        
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Auto-extracted from ID</Text>
          <Text style={styles.alertText}>
            Please review the information below and make corrections if needed.
            Extraction confidence: {((extractionQuality || 0) * 100).toFixed(1)}%
          </Text>
        </View>
        
        <View style={styles.confidenceIndicator}>
          <Progress.Bar
            progress={extractionQuality || 0}
            width={60}
            height={4}
            color="#10b981"
            unfilledColor="#d1fae5"
            borderWidth={0}
          />
        </View>
      </View>
    );
  };

  const renderFormField = (field, label, placeholder, required = false, multiline = false) => {
    const value = formData[field] || '';
    const isExtracted = state.extractedPersonalInfo?.[field];
    
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {required && <Text style={styles.requiredStar}>*</Text>}
          {isExtracted && (
            <View style={styles.extractedBadge}>
              <Icon name="auto-awesome" size={12} color="#059669" />
              <Text style={styles.extractedText}>Auto-filled</Text>
            </View>
          )}
        </View>
        
        <TextInput
          style={[
            styles.textInput,
            isExtracted && styles.extractedInput,
            multiline && styles.multilineInput,
          ]}
          value={value}
          onChangeText={(text) => handleInputChange(field, text)}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          autoCapitalize={field === 'first_name' || field === 'last_name' ? 'words' : 'none'}
          keyboardType={field === 'date_of_birth' || field === 'expiry_date' ? 'numeric' : 'default'}
        />
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.headerIcon}>
              <Icon name="verified-user" size={24} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.title}>Verify Personal Information</Text>
            <Text style={styles.subtitle}>
              Review and confirm the information extracted from your ID document.
              Make any necessary corrections.
            </Text>
          </View>

          {renderExtractionAlert()}

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              
              {renderFormField('first_name', 'First Name', 'Enter your first name', true)}
              {renderFormField('last_name', 'Last Name', 'Enter your last name', true)}
              {renderFormField('date_of_birth', 'Date of Birth', 'YYYY-MM-DD', true)}
              {renderFormField('sex', 'Sex', 'e.g. Male, Female')}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Document Information</Text>
              
              {renderFormField('document_number', 'Document Number', 'Enter document number')}
              {renderFormField('nationality', 'Nationality', 'e.g. Singapore, USA, UK')}
              {renderFormField('country_of_issue', 'Country of Issue', 'Issuing country')}
              {renderFormField('expiry_date', 'Expiry Date', 'YYYY-MM-DD')}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Verification Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={verificationNotes}
                onChangeText={setVerificationNotes}
                placeholder="Add any notes about corrections made or verification concerns..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Data Quality Indicator */}
          {state.extractedPersonalInfo && (
            <View style={styles.qualityContainer}>
              <View style={styles.qualityHeader}>
                <Icon name="assessment" size={20} color="#6366f1" />
                <Text style={styles.qualityTitle}>Data Quality Assessment</Text>
              </View>
              
              <View style={styles.qualityMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Extraction Confidence</Text>
                  <View style={styles.metricValue}>
                    <Progress.Bar
                      progress={extractionQuality || 0}
                      width={80}
                      height={6}
                      color="#10b981"
                      unfilledColor="#e5e7eb"
                      borderWidth={0}
                    />
                    <Text style={styles.metricText}>
                      {((extractionQuality || 0) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
                
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Fields Extracted</Text>
                  <Text style={styles.metricText}>
                    {Object.values(state.extractedPersonalInfo).filter(v => v && v !== '').length}/8
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              state.loading && styles.disabledButton,
            ]}
            onPress={handleVerifyAndContinue}
            disabled={state.loading}>
            <LinearGradient
              colors={
                !state.loading
                  ? ['#3b82f6', '#2563eb']
                  : ['#9ca3af', '#6b7280']
              }
              style={styles.buttonGradient}>
              <Text style={styles.buttonText}>
                {state.loading ? 'Verifying...' : 'Continue to Biometric Verification'}
              </Text>
              <Icon
                name={state.loading ? 'hourglass-empty' : 'arrow-forward'}
                size={20}
                color="#ffffff"
              />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  extractionAlert: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16,
  },
  confidenceIndicator: {
    marginLeft: 12,
  },
  formContainer: {
    marginBottom: 24,
  },
  formSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  requiredStar: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 2,
  },
  extractedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  extractedText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '500',
    marginLeft: 2,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  extractedInput: {
    borderColor: '#a7f3d0',
    backgroundColor: '#f0fdf4',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  qualityContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qualityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  qualityMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    alignItems: 'center',
  },
  metricText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default PersonalInfoScreen;