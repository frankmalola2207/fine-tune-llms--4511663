/**
 * API Service for Mobile-Technologies Backend Integration
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getDeviceInfo} from '../utils/appInit';

// Configure axios defaults
const API_BASE_URL = 'http://localhost:8001/api'; // Use your backend URL
const API_TIMEOUT = 30000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include device info
apiClient.interceptors.request.use(
  async (config) => {
    const deviceInfo = await AsyncStorage.getItem('device_info');
    const userId = await AsyncStorage.getItem('user_id');
    
    if (deviceInfo) {
      config.headers['X-Device-Info'] = deviceInfo;
    }
    
    if (userId) {
      config.headers['X-User-ID'] = userId;
    }
    
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
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
 * API Service Class
 */
class APIService {
  /**
   * Get biometric configuration
   */
  async getBiometricConfig() {
    try {
      const response = await apiClient.get('/config/biometric');
      return response.data;
    } catch (error) {
      console.error('Failed to get biometric config:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Initiate KYC process
   */
  async initiateKYC(userData) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const payload = {
        ...userData,
        device_info: deviceInfo,
        platform: 'mobile_app',
      };

      const response = await apiClient.post('/kyc/initiate', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to initiate KYC:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Scan passport/ID document with mobile camera
   */
  async scanDocument(userId, imageData, processingOptions = {}) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const payload = {
        user_id: userId,
        passport_image: imageData,
        extract_mrz: true,
        device_info: {
          ...deviceInfo,
          device_type: 'mobile_app',
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
      throw this.handleError(error);
    }
  }

  /**
   * Verify personal information
   */
  async verifyPersonalInfo(userId, extractedInfo, userVerifiedInfo, notes = '') {
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
      throw this.handleError(error);
    }
  }

  /**
   * Capture mobile fingerprint
   */
  async captureFingerprint(userId, imageData, qualityThreshold = 0.6) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const payload = {
        user_id: userId,
        image_data: imageData,
        device_info: deviceInfo,
        quality_threshold: qualityThreshold,
      };

      const response = await apiClient.post('/mobile/fingerprint/capture', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to capture fingerprint:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Detect facial liveness
   */
  async detectFacialLiveness(userId, frameSequence, livenessThreshold = 0.6) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const payload = {
        user_id: userId,
        frame_sequence: frameSequence,
        device_info: deviceInfo,
        liveness_threshold: livenessThreshold,
      };

      const response = await apiClient.post('/mobile/face/liveness', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to detect facial liveness:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Read NFC chip (simulation)
   */
  async readNFC(userId, passportNumber, birthDate, expiryDate) {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const payload = {
        user_id: userId,
        passport_number: passportNumber,
        birth_date: birthDate,
        expiry_date: expiryDate,
        device_info: deviceInfo,
      };

      const response = await apiClient.post('/mobile/nfc/read', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to read NFC:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Validate KYC workflow
   */
  async validateWorkflow(userId, completedCaptures) {
    try {
      const payload = {
        user_id: userId,
        completed_captures: completedCaptures,
      };

      const response = await apiClient.post('/kyc/workflow/validate', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to validate workflow:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get mobile dashboard data
   */
  async getMobileDashboard() {
    try {
      const response = await apiClient.get('/mobile/dashboard');
      return response.data;
    } catch (error) {
      console.error('Failed to get dashboard:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Test laptop camera ID capture (for testing)
   */
  async testLaptopCameraCapture() {
    try {
      const response = await apiClient.post('/test/laptop-camera/id-capture');
      return response.data;
    } catch (error) {
      console.error('Failed to test camera capture:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get device info for API calls
   */
  async getDeviceInfo() {
    try {
      const storedDeviceInfo = await AsyncStorage.getItem('device_info');
      if (storedDeviceInfo) {
        return JSON.parse(storedDeviceInfo);
      }
      
      // Fallback to getting fresh device info
      return await getDeviceInfo();
    } catch (error) {
      console.error('Failed to get device info:', error);
      return {
        device_type: 'mobile_app',
        platform: 'react_native',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Handle API errors consistently
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const {status, data} = error.response;
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
  }

  /**
   * Check API connectivity
   */
  async checkConnectivity() {
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
        error: this.handleError(error),
      };
    }
  }
}

// Export singleton instance
export default new APIService();