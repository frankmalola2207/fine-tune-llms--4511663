/**
 * App initialization utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import {generateUUID} from './helpers';

/**
 * Initialize the app with device info and user session
 */
export const initializeApp = async () => {
  try {
    console.log('🚀 Initializing Mobile-Technologies App...');

    // Get or create user session
    let userId = await AsyncStorage.getItem('user_id');
    if (!userId) {
      userId = `mobile_user_${Date.now()}_${generateUUID()}`;
      await AsyncStorage.setItem('user_id', userId);
      console.log('✅ New user session created:', userId);
    } else {
      console.log('✅ Existing user session found:', userId);
    }

    // Get device information
    const deviceInfo = await getDeviceInfo();
    await AsyncStorage.setItem('device_info', JSON.stringify(deviceInfo));
    console.log('✅ Device information stored:', deviceInfo);

    // Initialize app settings
    const defaultSettings = {
      cameraQuality: 'high',
      autoCapture: true,
      biometricEnabled: true,
      language: 'en',
      theme: 'light',
    };

    const existingSettings = await AsyncStorage.getItem('app_settings');
    if (!existingSettings) {
      await AsyncStorage.setItem('app_settings', JSON.stringify(defaultSettings));
      console.log('✅ Default app settings initialized');
    }

    console.log('✅ App initialization completed successfully');
    return {userId, deviceInfo};
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    throw error;
  }
};

/**
 * Get comprehensive device information
 */
export const getDeviceInfo = async () => {
  try {
    const deviceInfo = {
      device_type: 'mobile_app',
      brand: DeviceInfo.getBrand(),
      model: DeviceInfo.getModel(),
      system_name: DeviceInfo.getSystemName(),
      system_version: DeviceInfo.getSystemVersion(),
      app_version: DeviceInfo.getVersion(),
      build_number: DeviceInfo.getBuildNumber(),
      bundle_id: DeviceInfo.getBundleId(),
      device_id: await DeviceInfo.getUniqueId(),
      manufacturer: await DeviceInfo.getManufacturer(),
      device_name: await DeviceInfo.getDeviceName(),
      has_notch: DeviceInfo.hasNotch(),
      is_tablet: DeviceInfo.isTablet(),
      user_agent: await DeviceInfo.getUserAgent(),
      timestamp: new Date().toISOString(),
    };

    return deviceInfo;
  } catch (error) {
    console.error('Failed to get device info:', error);
    return {
      device_type: 'mobile_app',
      system_name: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Clear app data (for testing or logout)
 */
export const clearAppData = async () => {
  try {
    await AsyncStorage.multiRemove([
      'user_id',
      'device_info',
      'kyc_data',
      'biometric_data',
      'capture_results',
    ]);
    console.log('✅ App data cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear app data:', error);
    throw error;
  }
};

/**
 * Get app version and build info
 */
export const getAppVersion = () => {
  return {
    version: DeviceInfo.getVersion(),
    buildNumber: DeviceInfo.getBuildNumber(),
    bundleId: DeviceInfo.getBundleId(),
  };
};