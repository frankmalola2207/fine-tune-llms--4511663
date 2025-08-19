import axios from 'axios';

// Configure API base URL - use existing backend or localhost
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

/**
 * Check backend connectivity
 */
export const checkBackendConnectivity = async () => {
  try {
    const response = await apiClient.get('/');
    return {
      connected: true,
      version: response.data?.version || 'unknown',
      message: response.data?.message || 'Connected',
    };
  } catch (error) {
    return {
      connected: false,
      error: handleError(error),
    };
  }
};

/**
 * Scan document with mobile camera
 */
export const scanDocument = async (userId, imageData, processingOptions = {}) => {
  try {
    const payload = {
      user_id: userId,
      passport_image: imageData,
      extract_mrz: true,
      device_info: {
        device_type: 'mobile_web',
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString(),
      },
      processing_options: {
        mobile_optimized: true,
        enhance_contrast: true,
        auto_rotate: true,
        noise_reduction: true,
        ...processingOptions,
      },
    };

    const response = await apiClient.post('/mobile/passport/scan', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to scan document:', error);
    throw handleError(error);
  }
};

/**
 * Verify personal information
 */
export const verifyPersonalInfo = async (userId, extractedInfo, userVerifiedInfo, notes = '') => {
  try {
    const payload = {
      user_id: userId,
      extracted_info: extractedInfo,
      user_verified_info: userVerifiedInfo,
      verification_notes: notes,
    };

    const response = await apiClient.post('/mobile/personal-info/verify', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to verify personal info:', error);
    throw handleError(error);
  }
};

/**
 * Detect facial liveness
 */
export const detectFacialLiveness = async (userId, frameSequence, livenessThreshold = 0.6) => {
  try {
    const payload = {
      user_id: userId,
      frame_sequence: frameSequence,
      device_info: {
        device_type: 'mobile_web',
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
      liveness_threshold: livenessThreshold,
    };

    const response = await apiClient.post('/mobile/face/liveness', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to detect facial liveness:', error);
    throw handleError(error);
  }
};

/**
 * Get biometric configuration
 */
export const getBiometricConfig = async () => {
  try {
    const response = await apiClient.get('/config/biometric');
    return response.data;
  } catch (error) {
    console.error('Failed to get biometric config:', error);
    throw handleError(error);
  }
};

/**
 * Get mobile dashboard data
 */
export const getMobileDashboard = async () => {
  try {
    const response = await apiClient.get('/mobile/dashboard');
    return response.data;
  } catch (error) {
    console.error('Failed to get dashboard:', error);
    throw handleError(error);
  }
};

/**
 * Handle API errors consistently
 */
const handleError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      type: 'server_error',
      status,
      message: data?.error || data?.message || 'Server error occurred',
      details: data,
    };
  } else if (error.request) {
    // Network error
    return {
      type: 'network_error',
      message: 'Network connection failed. Please check your internet connection.',
      details: error.message,
    };
  } else {
    // Other error
    return {
      type: 'unknown_error',
      message: error.message || 'An unexpected error occurred',
      details: error,
    };
  }
};

export default {
  checkBackendConnectivity,
  scanDocument,
  verifyPersonalInfo,
  detectFacialLiveness,
  getBiometricConfig,
  getMobileDashboard,
};