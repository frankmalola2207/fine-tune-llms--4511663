/**
 * Optional Biometrics Screen - Additional biometric captures
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Progress from 'react-native-progress';

import {useAppState, useAppDispatch, actions} from '../contexts/AppContext';
import APIService from '../services/api';

const OptionalBiometricsScreen = ({navigation}) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  const [completedCaptures, setCompletedCaptures] = useState({});
  const [currentCapture, setCurrentCapture] = useState(null);

  useEffect(() => {
    // Initialize completed captures from state
    const captures = {};
    if (state.captures.fingerprint?.success) captures.fingerprint = true;
    if (state.captures.facial_liveness?.success) captures.facial_liveness = true;
    if (state.captures.nfc_read?.success) captures.nfc_read = true;
    setCompletedCaptures(captures);
  }, [state.captures]);

  const handleFingerprintCapture = async () => {
    setCurrentCapture('fingerprint');
    
    try {
      dispatch(actions.setLoading(true));
      
      // Simulate fingerprint capture (in real app, would use camera)
      const mockImageData = 'mock_fingerprint_data';
      
      const result = await APIService.captureFingerprint(
        state.userId,
        mockImageData,
        0.6
      );

      if (result.success) {
        dispatch(actions.setCaptureResult('fingerprint', result));
        setCompletedCaptures(prev => ({...prev, fingerprint: true}));
        
        Alert.alert(
          'Fingerprint Captured',
          `Quality Score: ${(result.quality_score * 100).toFixed(1)}%`,
          [{text: 'OK'}]
        );
      } else {
        throw new Error(result.error || 'Fingerprint capture failed');
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      Alert.alert(
        'Capture Failed',
        'Failed to capture fingerprint. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      dispatch(actions.setLoading(false));
      setCurrentCapture(null);
    }
  };

  const handleNFCRead = async () => {
    setCurrentCapture('nfc');
    
    try {
      dispatch(actions.setLoading(true));
      
      const result = await APIService.readNFC(
        state.userId,
        state.kycData.document_number,
        state.kycData.date_of_birth?.replace(/-/g, '').substring(2),
        '301231' // Mock expiry
      );

      if (result.success) {
        dispatch(actions.setCaptureResult('nfc_read', result));
        setCompletedCaptures(prev => ({...prev, nfc_read: true}));
        
        Alert.alert(
          'NFC Read Complete',
          'Document chip information verified successfully.',
          [{text: 'OK'}]
        );
      } else {
        throw new Error(result.error || 'NFC reading failed');
      }
    } catch (error) {
      console.error('NFC reading error:', error);
      Alert.alert(
        'NFC Failed',
        'Failed to read document chip. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      dispatch(actions.setLoading(false));
      setCurrentCapture(null);
    }
  };

  const handleContinueOrComplete = async () => {
    // Validate workflow
    try {
      dispatch(actions.setLoading(true));
      
      const captureTypes = Object.keys(completedCaptures).filter(
        key => completedCaptures[key]
      );
      
      const validation = await APIService.validateWorkflow(
        state.userId,
        captureTypes
      );

      if (validation.workflow_valid) {
        dispatch(actions.setCurrentStep(6));
        navigation.navigate('Completion');
      } else {
        Alert.alert(
          'Additional Steps Required',
          `Missing required captures: ${validation.missing_mandatory.join(', ')}`,
          [{text: 'OK'}]
        );
      }
    } catch (error) {
      console.error('Workflow validation error:', error);
      // Continue anyway for optional biometrics
      dispatch(actions.setCurrentStep(6));
      navigation.navigate('Completion');
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const renderBiometricOption = (type, title, description, icon, colors, onPress) => {
    const isCompleted = completedCaptures[type];
    const isCapturing = currentCapture === type;
    const isEnabled = state.biometricConfig?.optional_features?.includes(type) ||
                     state.biometricConfig?.config?.[type]?.enabled;

    if (!isEnabled) return null;

    return (
      <View style={styles.optionContainer}>
        <LinearGradient
          colors={isCompleted ? ['#10b981', '#059669'] : colors}
          style={styles.optionGradient}>
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <View style={styles.optionIcon}>
                <Icon 
                  name={isCompleted ? 'check-circle' : icon} 
                  size={24} 
                  color="#ffffff" 
                />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionDescription}>{description}</Text>
              </View>
              <View style={styles.optionBadge}>
                <Text style={styles.badgeText}>Optional</Text>
              </View>
            </View>

            {isCompleted && (
              <View style={styles.completedInfo}>
                <Icon name="verified" size={16} color="#ffffff" />
                <Text style={styles.completedText}>Completed Successfully</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.optionButton,
                isCompleted && styles.completedButton,
                (isCapturing || state.loading) && styles.disabledButton,
              ]}
              onPress={onPress}
              disabled={isCompleted || isCapturing || state.loading}>
              {isCapturing ? (
                <View style={styles.loadingContainer}>
                  <Progress.Circle
                    size={20}
                    indeterminate
                    color="#ffffff"
                    borderWidth={2}
                  />
                  <Text style={styles.buttonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  {isCompleted ? 'Completed' : `Capture ${title}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const getCompletionProgress = () => {
    const totalOptional = state.biometricConfig?.optional_features?.length || 0;
    const completed = Object.values(completedCaptures).filter(Boolean).length;
    return totalOptional > 0 ? completed / totalOptional : 1;
  };

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#06b6d4', '#0891b2']}
            style={styles.headerIcon}>
            <Icon name="security" size={24} color="#ffffff" />
          </LinearGradient>
          <Text style={styles.title}>Additional Security</Text>
          <Text style={styles.subtitle}>
            Choose additional biometric verifications to enhance your security level.
            These steps are optional but recommended.
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Optional Security Progress</Text>
            <Text style={styles.progressText}>
              {Object.values(completedCaptures).filter(Boolean).length} of {state.biometricConfig?.optional_features?.length || 0} completed
            </Text>
          </View>
          <Progress.Bar
            progress={getCompletionProgress()}
            width={null}
            height={8}
            color="#06b6d4"
            unfilledColor="#e5e7eb"
            borderWidth={0}
            borderRadius={4}
          />
        </View>

        {/* Biometric Options */}
        <View style={styles.optionsContainer}>
          {renderBiometricOption(
            'contactless_fingerprint',
            'Contactless Fingerprint',
            'Capture fingerprint using smartphone camera',
            'fingerprint',
            ['#f59e0b', '#d97706'],
            handleFingerprintCapture
          )}

          {renderBiometricOption(
            'nfc_reading',
            'NFC Chip Reading',
            'Read encrypted data from document chip',
            'nfc',
            ['#8b5cf6', '#7c3aed'],
            handleNFCRead
          )}
        </View>

        {/* Security Level Indicator */}
        <View style={styles.securityContainer}>
          <View style={styles.securityHeader}>
            <Icon name="security" size={20} color="#059669" />
            <Text style={styles.securityTitle}>Current Security Level</Text>
          </View>
          
          <View style={styles.securityLevels}>
            <SecurityLevel
              level="Basic"
              description="ID verification only"
              active={true}
              color="#10b981"
            />
            <SecurityLevel
              level="Enhanced"
              description="ID + Facial verification"
              active={state.captures.facial_liveness?.success}
              color="#0891b2"
            />
            <SecurityLevel
              level="Maximum"
              description="All biometric verifications"
              active={Object.values(completedCaptures).filter(Boolean).length >= 2}
              color="#7c3aed"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              state.loading && styles.disabledButton,
            ]}
            onPress={handleContinueOrComplete}
            disabled={state.loading}>
            <LinearGradient
              colors={!state.loading ? ['#1e40af', '#3730a3'] : ['#9ca3af', '#6b7280']}
              style={styles.buttonGradient}>
              <Text style={styles.buttonText}>
                {state.loading ? 'Validating...' : 'Complete Verification'}
              </Text>
              <Icon
                name={state.loading ? 'hourglass-empty' : 'arrow-forward'}
                size={20}
                color="#ffffff"
              />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.skipText}>
            You can complete verification without additional biometrics
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const SecurityLevel = ({level, description, active, color}) => (
  <View style={[styles.securityLevel, active && styles.activeLevel]}>
    <View style={[styles.levelIndicator, {backgroundColor: active ? color : '#e5e7eb'}]} />
    <View style={styles.levelContent}>
      <Text style={[styles.levelTitle, active && {color}]}>{level}</Text>
      <Text style={styles.levelDescription}>{description}</Text>
    </View>
    {active && <Icon name="check-circle" size={16} color={color} />}
  </View>
);

const styles = StyleSheet.create({
  container: {
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
    fontSize: 24,
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
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionGradient: {
    padding: 1,
  },
  optionContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  optionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 12,
    color: '#059669',
    marginLeft: 4,
    fontWeight: '500',
  },
  optionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  securityContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  securityLevels: {
    space: 12,
  },
  securityLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  activeLevel: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  levelIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  levelContent: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  levelDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionContainer: {
    alignItems: 'center',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default OptionalBiometricsScreen;