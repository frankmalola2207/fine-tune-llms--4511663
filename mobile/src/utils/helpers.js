/**
 * General utility helper functions
 */

import {Platform, Dimensions} from 'react-native';

/**
 * Generate a simple UUID
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get screen dimensions
 */
export const getScreenDimensions = () => {
  return Dimensions.get('window');
};

/**
 * Check if device is iPhone X or newer (with notch)
 */
export const hasNotch = () => {
  if (Platform.OS === 'ios') {
    const {height, width} = getScreenDimensions();
    // iPhone X, XS, XR, XS Max, 11, 11 Pro, 11 Pro Max, 12, 12 Pro, 12 Pro Max
    return (
      (height === 812 || width === 812) || // iPhone X, XS, 11 Pro
      (height === 896 || width === 896) || // iPhone XR, XS Max, 11, 11 Pro Max
      (height === 844 || width === 844) || // iPhone 12, 12 Pro
      (height === 926 || width === 926)    // iPhone 12 Pro Max
    );
  }
  return false;
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Convert base64 to blob for file upload
 */
export const base64ToBlob = (base64Data, contentType = 'image/jpeg') => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], {type: contentType});
};

/**
 * Deep clone an object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Calculate file size from base64
 */
export const getBase64Size = (base64String) => {
  const padding = (base64String.match(/=/g) || []).length;
  const bytes = (base64String.length * 3) / 4 - padding;
  return bytes;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};