/**
 * Global App Context for state management
 */

import React, {createContext, useContext, useReducer, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import APIService from '../services/api';

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
  biometricConfig: null,
  
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
        userId: state.userId,
        deviceInfo: state.deviceInfo,
        biometricConfig: state.biometricConfig,
      };
      
    default:
      return state;
  }
};

// Create contexts
const AppStateContext = createContext();
const AppDispatchContext = createContext();

// Provider component
export const AppProvider = ({children}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({type: ActionTypes.SET_LOADING, payload: true});
        
        // Load user data from storage
        const userId = await AsyncStorage.getItem('user_id');
        const deviceInfo = await AsyncStorage.getItem('device_info');
        const kycData = await AsyncStorage.getItem('kyc_data');
        const captures = await AsyncStorage.getItem('capture_results');
        
        if (userId) {
          dispatch({
            type: ActionTypes.SET_USER_DATA,
            payload: {
              userId,
              deviceInfo: deviceInfo ? JSON.parse(deviceInfo) : null,
            },
          });
        }
        
        if (kycData) {
          dispatch({
            type: ActionTypes.UPDATE_KYC_DATA,
            payload: JSON.parse(kycData),
          });
        }
        
        if (captures) {
          const parsedCaptures = JSON.parse(captures);
          Object.entries(parsedCaptures).forEach(([type, result]) => {
            dispatch({
              type: ActionTypes.SET_CAPTURE_RESULT,
              payload: {type, result},
            });
          });
        }
        
        // Load biometric configuration
        try {
          const config = await APIService.getBiometricConfig();
          dispatch({type: ActionTypes.SET_BIOMETRIC_CONFIG, payload: config});
        } catch (error) {
          console.warn('Failed to load biometric config:', error);
        }
        
      } catch (error) {
        console.error('Failed to load initial data:', error);
        dispatch({
          type: ActionTypes.SET_ERROR,
          payload: 'Failed to load app data',
        });
      } finally {
        dispatch({type: ActionTypes.SET_LOADING, payload: false});
      }
    };

    loadInitialData();
  }, []);

  // Save data to storage when state changes
  useEffect(() => {
    const saveData = async () => {
      try {
        if (state.kycData) {
          await AsyncStorage.setItem('kyc_data', JSON.stringify(state.kycData));
        }
        if (state.captures) {
          await AsyncStorage.setItem('capture_results', JSON.stringify(state.captures));
        }
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    };

    // Debounce save operations
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.kycData, state.captures]);

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
    payload: {userId, deviceInfo},
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
    payload: {type, result},
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