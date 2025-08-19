/**
 * Configuration Screen - Settings and app configuration
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useAppState, useAppDispatch, actions} from '../contexts/AppContext';
import APIService from '../services/api';
import {getAppVersion} from '../utils/appInit';

const ConfigurationScreen = ({navigation}) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  const [appSettings, setAppSettings] = useState({
    cameraQuality: 'high',
    autoCapture: true,
    biometricEnabled: true,
    notificationsEnabled: true,
    dataRetention: true,
    debugMode: false,
  });
  const [connectivity, setConnectivity] = useState(null);
  const [appVersion, setAppVersion] = useState(null);

  useEffect(() => {
    loadSettings();
    checkConnectivity();
    loadAppVersion();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        setAppSettings(JSON.parse(settings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadAppVersion = () => {
    const version = getAppVersion();
    setAppVersion(version);
  };

  const checkConnectivity = async () => {
    try {
      const result = await APIService.checkConnectivity();
      setConnectivity(result);
    } catch (error) {
      setConnectivity({connected: false, error: 'Connection failed'});
    }
  };

  const handleSettingChange = async (key, value) => {
    try {
      const newSettings = {...appSettings, [key]: value};
      setAppSettings(newSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear App Data',
      'This will remove all stored verification data and restart the app. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'kyc_data',
                'capture_results',
              ]);
              dispatch(actions.resetState());
              Alert.alert('Success', 'App data cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear app data');
            }
          },
        },
      ]
    );
  };

  const handleTestConnectivity = async () => {
    setConnectivity({connected: false, testing: true});
    await checkConnectivity();
  };

  const renderSettingItem = (title, description, value, onValueChange, type = 'switch') => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{false: '#e5e7eb', true: '#3b82f6'}}
          thumbColor={value ? '#ffffff' : '#f3f4f6'}
        />
      )}
    </View>
  );

  const renderInfoItem = (label, value, icon) => (
    <View style={styles.infoItem}>
      <Icon name={icon} size={20} color="#6b7280" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Unknown'}</Text>
      </View>
    </View>
  );

  const renderBiometricConfigItem = (feature, config) => (
    <View style={styles.biometricItem}>
      <View style={styles.biometricHeader}>
        <Text style={styles.biometricTitle}>{feature.replace('_', ' ').toUpperCase()}</Text>
        <View style={[
          styles.biometricBadge,
          {backgroundColor: config.mandatory ? '#ef4444' : '#3b82f6'}
        ]}>
          <Text style={styles.biometricBadgeText}>
            {config.mandatory ? 'Mandatory' : 'Optional'}
          </Text>
        </View>
      </View>
      <Text style={styles.biometricDescription}>{config.description}</Text>
      <Text style={styles.biometricStatus}>
        Status: {config.enabled ? 'Enabled' : 'Disabled'}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#6b7280', '#4b5563']}
            style={styles.headerIcon}>
            <Icon name="settings" size={24} color="#ffffff" />
          </LinearGradient>
          <Text style={styles.title}>Configuration</Text>
          <Text style={styles.subtitle}>
            Manage app settings and view system information
          </Text>
        </View>

        {/* Connectivity Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.connectivityContainer}>
            <View style={styles.connectivityHeader}>
              <Icon
                name={connectivity?.connected ? 'cloud-done' : 'cloud-off'}
                size={24}
                color={connectivity?.connected ? '#10b981' : '#ef4444'}
              />
              <View style={styles.connectivityInfo}>
                <Text style={styles.connectivityTitle}>
                  Backend Connection
                </Text>
                <Text style={[
                  styles.connectivityStatus,
                  {color: connectivity?.connected ? '#10b981' : '#ef4444'}
                ]}>
                  {connectivity?.testing ? 'Testing...' : 
                   connectivity?.connected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTestConnectivity}>
                <Text style={styles.testButtonText}>Test</Text>
              </TouchableOpacity>
            </View>
            
            {connectivity?.connected && connectivity.version && (
              <Text style={styles.connectivityDetails}>
                Backend Version: {connectivity.version}
              </Text>
            )}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application Settings</Text>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              'High Quality Camera',
              'Use highest camera quality for better OCR results',
              appSettings.cameraQuality === 'high',
              (value) => handleSettingChange('cameraQuality', value ? 'high' : 'medium')
            )}
            
            {renderSettingItem(
              'Auto Capture',
              'Automatically capture images after positioning',
              appSettings.autoCapture,
              (value) => handleSettingChange('autoCapture', value)
            )}
            
            {renderSettingItem(
              'Biometric Storage',
              'Store biometric templates securely on device',
              appSettings.biometricEnabled,
              (value) => handleSettingChange('biometricEnabled', value)
            )}
            
            {renderSettingItem(
              'Push Notifications',
              'Receive notifications about verification status',
              appSettings.notificationsEnabled,
              (value) => handleSettingChange('notificationsEnabled', value)
            )}
            
            {renderSettingItem(
              'Data Retention',
              'Keep verification data for faster re-verification',
              appSettings.dataRetention,
              (value) => handleSettingChange('dataRetention', value)
            )}
            
            {renderSettingItem(
              'Debug Mode',
              'Show detailed logs and debugging information',
              appSettings.debugMode,
              (value) => handleSettingChange('debugMode', value)
            )}
          </View>
        </View>

        {/* Biometric Configuration */}
        {state.biometricConfig && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biometric Configuration</Text>
            <View style={styles.biometricContainer}>
              {Object.entries(state.biometricConfig.config || {}).map(([feature, config]) => 
                renderBiometricConfigItem(feature, config)
              )}
            </View>
          </View>
        )}

        {/* Current Session Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Session</Text>
          <View style={styles.infoContainer}>
            {renderInfoItem('User ID', state.userId, 'person')}
            {renderInfoItem('Current Step', `Step ${state.currentStep}`, 'timeline')}
            {renderInfoItem('Device Type', state.deviceInfo?.device_type, 'smartphone')}
            {renderInfoItem('Platform', state.deviceInfo?.system_name, 'phone-android')}
            {renderInfoItem(
              'Captures Completed',
              Object.values(state.captures).filter(c => c?.success).length.toString(),
              'check-circle'
            )}
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoContainer}>
            {renderInfoItem('Version', appVersion?.version, 'info')}
            {renderInfoItem('Build Number', appVersion?.buildNumber, 'build')}
            {renderInfoItem('Bundle ID', appVersion?.bundleId, 'apps')}
            {renderInfoItem('Platform', 'React Native', 'code')}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearData}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.actionButtonGradient}>
              <Icon name="delete" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Clear App Data</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryActionText}>Back to App</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mobile-Technologies eKYC Platform
          </Text>
          <Text style={styles.footerSubtext}>
            Advanced Mobile Biometric Verification System
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  connectivityContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  connectivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectivityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  connectivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  connectivityStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectivityDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    marginLeft: 36,
  },
  testButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  biometricContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  biometricItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  biometricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  biometricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  biometricBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  biometricBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  biometricDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  biometricStatus: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.5)',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ConfigurationScreen;