import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Initial state
const initialState = {
  // User data
  userId: null,
  deviceInfo: null,
  
  // KYC workflow state
  currentStep: 1,
  kycData: {
    first_name: '',
    last_name: '',
    date_of_birth: '',
    document_number: '',
    nationality: '',
    country_of_issue: '',
    sex: '',
    expiry_date: '',
  },
  
  // Biometric captures
  captures: {
    document_scan: null,
    facial_liveness: null,
    fingerprint: null,
    nfc_read: null,
  },
  
  // Extracted information
  extractedPersonalInfo: null,
  personalInfoVerified: false,
  
  // Configuration
  biometricConfig: {
    mandatory_features: ['id_document_scan'],
    optional_features: ['facial_liveness', 'contactless_fingerprint', 'nfc_reading'],
    config: {
      id_document_scan: {
        enabled: true,
        mandatory: true,
        description: 'Scan passport or ID document for automatic information extraction'
      },
      facial_liveness: {
        enabled: true,
        mandatory: false,
        description: 'Advanced facial liveness detection for enhanced security'
      },
      contactless_fingerprint: {
        enabled: true,
        mandatory: false,
        description: 'Contactless fingerprint capture using smartphone camera'
      },
      nfc_reading: {
        enabled: true,
        mandatory: false,
        description: 'Read encrypted data from document NFC chip'
      }
    }
  },
  
  // UI state
  loading: false,
  error: null,
  
  // Workflow validation
  workflowValidation: null,
};

// Action types
const ActionTypes = {
  SET_USER_DATA: 'SET_USER_DATA',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  UPDATE_KYC_DATA: 'UPDATE_KYC_DATA',
  SET_CAPTURE_RESULT: 'SET_CAPTURE_RESULT',
  SET_EXTRACTED_INFO: 'SET_EXTRACTED_INFO',
  SET_PERSONAL_INFO_VERIFIED: 'SET_PERSONAL_INFO_VERIFIED',
  SET_BIOMETRIC_CONFIG: 'SET_BIOMETRIC_CONFIG',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_WORKFLOW_VALIDATION: 'SET_WORKFLOW_VALIDATION',
  RESET_STATE: 'RESET_STATE',
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_USER_DATA:
      return {
        ...state,
        userId: action.payload.userId,
        deviceInfo: action.payload.deviceInfo,
      };
      
    case ActionTypes.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload,
      };
      
    case ActionTypes.UPDATE_KYC_DATA:
      return {
        ...state,
        kycData: {
          ...state.kycData,
          ...action.payload,
        },
      };
      
    case ActionTypes.SET_CAPTURE_RESULT:
      return {
        ...state,
        captures: {
          ...state.captures,
          [action.payload.type]: action.payload.result,
        },
      };
      
    case ActionTypes.SET_EXTRACTED_INFO:
      return {
        ...state,
        extractedPersonalInfo: action.payload,
      };
      
    case ActionTypes.SET_PERSONAL_INFO_VERIFIED:
      return {
        ...state,
        personalInfoVerified: action.payload,
      };
      
    case ActionTypes.SET_BIOMETRIC_CONFIG:
      return {
        ...state,
        biometricConfig: action.payload,
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
      
    case ActionTypes.SET_WORKFLOW_VALIDATION:
      return {
        ...state,
        workflowValidation: action.payload,
      };
      
    case ActionTypes.RESET_STATE:
      return {
        ...initialState,
        userId: generateUserId(),
        deviceInfo: getDeviceInfo(),
        biometricConfig: state.biometricConfig,
      };
      
    default:
      return state;
  }
};

// Helper functions
const generateUserId = () => {
  return `web_user_${Date.now()}_${uuidv4().split('-')[0]}`;
};

const getDeviceInfo = () => {
  return {
    device_type: 'mobile_web',
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    has_camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    timestamp: new Date().toISOString(),
  };
};

// Create contexts
const AppStateContext = createContext();
const AppDispatchContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    userId: generateUserId(),
    deviceInfo: getDeviceInfo(),
  });

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load user data from localStorage
        const storedUserId = localStorage.getItem('mobile_kyc_user_id');
        const storedKycData = localStorage.getItem('mobile_kyc_data');
        const storedCaptures = localStorage.getItem('mobile_capture_results');
        
        if (storedUserId) {
          dispatch({
            type: ActionTypes.SET_USER_DATA,
            payload: {
              userId: storedUserId,
              deviceInfo: getDeviceInfo(),
            },
          });
        }
        
        if (storedKycData) {
          dispatch({
            type: ActionTypes.UPDATE_KYC_DATA,
            payload: JSON.parse(storedKycData),
          });
        }
        
        if (storedCaptures) {
          const parsedCaptures = JSON.parse(storedCaptures);
          Object.entries(parsedCaptures).forEach(([type, result]) => {
            dispatch({
              type: ActionTypes.SET_CAPTURE_RESULT,
              payload: { type, result },
            });
          });
        }
        
        console.log('✅ App state loaded from localStorage');
        
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Save data to localStorage when state changes
  useEffect(() => {
    const saveData = () => {
      try {
        if (state.userId) {
          localStorage.setItem('mobile_kyc_user_id', state.userId);
        }
        if (state.kycData) {
          localStorage.setItem('mobile_kyc_data', JSON.stringify(state.kycData));
        }
        if (state.captures) {
          localStorage.setItem('mobile_capture_results', JSON.stringify(state.captures));
        }
      } catch (error) {
        console.error('❌ Failed to save data:', error);
      }
    };

    // Debounce save operations
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.userId, state.kycData, state.captures]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

// Custom hooks
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
};

// Action creators
export const actions = {
  setUserData: (userId, deviceInfo) => ({
    type: ActionTypes.SET_USER_DATA,
    payload: { userId, deviceInfo },
  }),
  
  setCurrentStep: (step) => ({
    type: ActionTypes.SET_CURRENT_STEP,
    payload: step,
  }),
  
  updateKycData: (data) => ({
    type: ActionTypes.UPDATE_KYC_DATA,
    payload: data,
  }),
  
  setCaptureResult: (type, result) => ({
    type: ActionTypes.SET_CAPTURE_RESULT,
    payload: { type, result },
  }),
  
  setExtractedInfo: (info) => ({
    type: ActionTypes.SET_EXTRACTED_INFO,
    payload: info,
  }),
  
  setPersonalInfoVerified: (verified) => ({
    type: ActionTypes.SET_PERSONAL_INFO_VERIFIED,
    payload: verified,
  }),
  
  setBiometricConfig: (config) => ({
    type: ActionTypes.SET_BIOMETRIC_CONFIG,
    payload: config,
  }),
  
  setLoading: (loading) => ({
    type: ActionTypes.SET_LOADING,
    payload: loading,
  }),
  
  setError: (error) => ({
    type: ActionTypes.SET_ERROR,
    payload: error,
  }),
  
  setWorkflowValidation: (validation) => ({
    type: ActionTypes.SET_WORKFLOW_VALIDATION,
    payload: validation,
  }),
  
  resetState: () => ({
    type: ActionTypes.RESET_STATE,
  }),
};