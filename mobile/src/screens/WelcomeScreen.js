/**
 * Welcome Screen - Mobile-Technologies eKYC
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppState, useAppDispatch, actions} from '../contexts/AppContext';
import APIService from '../services/api';

const {width} = Dimensions.get('window');

const WelcomeScreen = ({navigation}) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [connectivity, setConnectivity] = useState(null);

  useEffect(() => {
    checkAPIConnectivity();
  }, []);

  const checkAPIConnectivity = async () => {
    try {
      const result = await APIService.checkConnectivity();
      setConnectivity(result);
    } catch (error) {
      setConnectivity({connected: false, error: 'Connection failed'});
    }
  };

  const handleStartProcess = async () => {
    if (!connectivity?.connected) {
      Alert.alert(
        'Connection Required',
        'Please check your internet connection and try again.',
        [{text: 'OK', onPress: checkAPIConnectivity}]
      );
      return;
    }

    try {
      dispatch(actions.setLoading(true));
      dispatch(actions.setError(null));

      // Initialize KYC process
      const kycResult = await APIService.initiateKYC({
        user_id: state.userId,
        platform: 'mobile_app',
        timestamp: new Date().toISOString(),
      });

      if (kycResult.success) {
        dispatch(actions.setCurrentStep(2));
        navigation.navigate('IDScan');
      } else {
        throw new Error(kycResult.error || 'Failed to start KYC process');
      }
    } catch (error) {
      console.error('Failed to start process:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to start the verification process. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const navigateToConfiguration = () => {
    navigation.navigate('Configuration');
  };

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0', '#cbd5e1']}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#1e40af', '#3730a3']}
            style={styles.logoContainer}>
            <Icon name="smartphone" size={40} color="#ffffff" />
          </LinearGradient>
          <Text style={styles.title}>Mobile-Technologies</Text>
          <Text style={styles.subtitle}>Advanced Mobile Biometric eKYC Platform</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.featureIcon}>
              <Icon name="camera-alt" size={24} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.featureTitle}>Mobile-First</Text>
            <Text style={styles.featureText}>Optimize for mobile cameras</Text>
          </View>

          <View style={styles.feature}>
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.featureIcon}>
              <Icon name="auto-fix-high" size={24} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.featureTitle}>AI-Powered</Text>
            <Text style={styles.featureText}>Intelligent verification</Text>
          </View>

          <View style={styles.feature}>
            <LinearGradient
              colors={['#06b6d4', '#0891b2']}
              style={styles.featureIcon}>
              <Icon name="security" size={24} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.featureTitle}>Contactless</Text>
            <Text style={styles.featureText}>Safe biometric capture</Text>
          </View>
        </View>

        {/* Process Overview */}
        <View style={styles.processContainer}>
          <Text style={styles.processTitle}>ID Document Scan First</Text>
          <Text style={styles.processDescription}>
            We'll start by scanning your passport or ID document to automatically
            extract your personal information. This ensures accuracy and saves you time.
          </Text>

          <View style={styles.stepsList}>
            <View style={styles.step}>
              <Icon name="photo-camera" size={20} color="#1e40af" />
              <Text style={styles.stepText}>Scan your ID document with camera</Text>
            </View>
            <View style={styles.step}>
              <Icon name="smart-toy" size={20} color="#1e40af" />
              <Text style={styles.stepText}>AI extracts your personal information</Text>
            </View>
            <View style={styles.step}>
              <Icon name="check-circle" size={20} color="#1e40af" />
              <Text style={styles.stepText}>Review and verify the extracted data</Text>
            </View>
            <View style={styles.step}>
              <Icon name="face" size={20} color="#1e40af" />
              <Text style={styles.stepText}>Optional: Additional biometric security</Text>
            </View>
            <View style={styles.step}>
              <Icon name="verified" size={20} color="#1e40af" />
              <Text style={styles.stepText}>Complete your verification</Text>
            </View>
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Icon
              name={connectivity?.connected ? 'cloud-done' : 'cloud-off'}
              size={20}
              color={connectivity?.connected ? '#10b981' : '#ef4444'}
            />
            <Text
              style={[
                styles.statusText,
                {color: connectivity?.connected ? '#10b981' : '#ef4444'},
              ]}>
              {connectivity?.connected ? 'Connected' : 'Offline'}
            </Text>
          </View>
          
          {state.biometricConfig && (
            <View style={styles.statusItem}>
              <Icon name="settings" size={20} color="#6b7280" />
              <Text style={styles.statusText}>
                {state.biometricConfig.mandatory_features?.length || 0} Mandatory,{' '}
                {state.biometricConfig.optional_features?.length || 0} Optional
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              (!connectivity?.connected || state.loading) && styles.disabledButton,
            ]}
            onPress={handleStartProcess}
            disabled={!connectivity?.connected || state.loading}>
            <LinearGradient
              colors={
                connectivity?.connected && !state.loading
                  ? ['#1e40af', '#3730a3']
                  : ['#9ca3af', '#6b7280']
              }
              style={styles.buttonGradient}>
              <Icon
                name={state.loading ? 'hourglass-empty' : 'play-arrow'}
                size={24}
                color="#ffffff"
              />
              <Text style={styles.buttonText}>
                {state.loading ? 'Starting...' : 'Start ID Scanning Process'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.configButton}
            onPress={navigateToConfiguration}>
            <Icon name="settings" size={20} color="#6b7280" />
            <Text style={styles.configButtonText}>Configuration</Text>
          </TouchableOpacity>
        </View>

        {/* Compliance Footer */}
        <View style={styles.complianceContainer}>
          <Text style={styles.complianceText}>
            🔒 GDPR • CCPA • Singapore Compliant
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  processContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  processTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 8,
  },
  processDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  stepsList: {
    space: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 12,
    flex: 1,
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  actionContainer: {
    marginBottom: 20,
  },
  startButton: {
    borderRadius: 12,
    marginBottom: 12,
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
    marginLeft: 8,
  },
  configButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  configButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  complianceContainer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.5)',
  },
  complianceText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
});