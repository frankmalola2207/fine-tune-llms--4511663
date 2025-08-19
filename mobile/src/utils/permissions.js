/**
 * Permission utilities for camera and other device features
 */

import {Platform, Alert, Linking} from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';

/**
 * Request camera permission for ID scanning and facial biometrics
 */
export const requestCameraPermission = async () => {
  try {
    const cameraPermission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA;

    const result = await check(cameraPermission);

    switch (result) {
      case RESULTS.UNAVAILABLE:
        throw new Error('Camera is not available on this device');
      case RESULTS.DENIED:
        const requestResult = await request(cameraPermission);
        if (requestResult !== RESULTS.GRANTED) {
          throw new Error('Camera permission denied');
        }
        break;
      case RESULTS.LIMITED:
        console.warn('Camera permission is limited');
        break;
      case RESULTS.GRANTED:
        console.log('Camera permission granted');
        break;
      case RESULTS.BLOCKED:
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in settings to use ID scanning and facial verification features.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: openSettings},
          ],
        );
        throw new Error('Camera permission blocked');
    }

    return true;
  } catch (error) {
    console.error('Camera permission error:', error);
    throw error;
  }
};

/**
 * Check if camera permission is granted
 */
export const hasCameraPermission = async () => {
  try {
    const cameraPermission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA;

    const result = await check(cameraPermission);
    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Check camera permission error:', error);
    return false;
  }
};

/**
 * Request storage permission for saving captured images
 */
export const requestStoragePermission = async () => {
  if (Platform.OS === 'ios') {
    return true; // iOS doesn't require explicit storage permission for app documents
  }

  try {
    const storagePermission = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
    const result = await check(storagePermission);

    if (result === RESULTS.DENIED) {
      const requestResult = await request(storagePermission);
      return requestResult === RESULTS.GRANTED;
    }

    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Storage permission error:', error);
    return false;
  }
};

/**
 * Request all required permissions
 */
export const requestAllPermissions = async () => {
  try {
    await requestCameraPermission();
    await requestStoragePermission();
    console.log('All permissions granted successfully');
    return true;
  } catch (error) {
    console.error('Failed to get all permissions:', error);
    return false;
  }
};