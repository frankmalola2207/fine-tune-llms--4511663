import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch, actions } from '../context/AppContext';
import { checkBackendConnectivity } from '../services/api';

const WelcomeScreen = () => {
  const navigate = useNavigate();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [connectivity, setConnectivity] = useState(null);

  useEffect(() => {
    checkAPIConnectivity();
  }, []);

  const checkAPIConnectivity = async () => {
    try {
      const result = await checkBackendConnectivity();
      setConnectivity(result);
    } catch (error) {
      setConnectivity({ connected: false, error: 'Connection failed' });
    }
  };

  const handleStartProcess = async () => {
    try {
      dispatch(actions.setLoading(true));
      dispatch(actions.setError(null));

      // Check camera permissions
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera not supported in this browser. Please use a modern browser with camera support.');
        return;
      }

      console.log('🚀 Starting eKYC process for user:', state.userId);
      
      // Move to ID scan step
      dispatch(actions.setCurrentStep(2));
      navigate('/id-scan');

    } catch (error) {
      console.error('❌ Failed to start process:', error);
      alert('Failed to start the verification process. Please try again.');
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <div className="result-icon result-success">
          📱
        </div>
        <h1 className="screen-title">Mobile-Technologies</h1>
        <p className="screen-subtitle">
          Advanced Mobile Biometric eKYC Platform - Web Version
        </p>
      </div>

      {/* Features */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', textAlign: 'center', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
              Mobile-First
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Optimized for mobile browsers
            </p>
          </div>
          
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
              AI-Powered
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Intelligent verification
            </p>
          </div>
          
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
              Contactless
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Safe biometric capture
            </p>
          </div>
        </div>

        {/* Process Overview */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e40af', textAlign: 'center', marginBottom: '1rem' }}>
            ID Document Scan First
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#475569', textAlign: 'center', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            We'll start by scanning your passport or ID document to automatically
            extract your personal information. This ensures accuracy and saves you time.
          </p>

          <ul className="feature-list">
            <li className="feature-item">
              <span className="feature-icon">📷</span>
              <span className="feature-text">Scan your ID document with camera</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">🤖</span>
              <span className="feature-text">AI extracts your personal information</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">✅</span>
              <span className="feature-text">Review and verify the extracted data</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">👤</span>
              <span className="feature-text">Optional: Additional biometric security</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">🎉</span>
              <span className="feature-text">Complete your verification</span>
            </li>
          </ul>
        </div>

        {/* Connection Status */}
        <div className="status-container">
          <div className="status-item">
            <span style={{ fontSize: '1.25rem' }}>
              {connectivity?.connected ? '☁️' : '📵'}
            </span>
            <span className={`status-text ${connectivity?.connected ? 'status-connected' : 'status-disconnected'}`}>
              {connectivity?.connected ? 'Connected' : 'Offline Mode'}
            </span>
          </div>
          
          <div className="status-item">
            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
            <span className="status-text">
              {state.biometricConfig.mandatory_features?.length || 0} Mandatory,{' '}
              {state.biometricConfig.optional_features?.length || 0} Optional
            </span>
          </div>
        </div>

        {/* Camera Check */}
        <div style={{ 
          padding: '1rem', 
          background: navigator.mediaDevices ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>
              {navigator.mediaDevices ? '📹' : '❌'}
            </span>
            <span style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: navigator.mediaDevices ? '#059669' : '#dc2626'
            }}>
              Camera Status
            </span>
          </div>
          <p style={{ 
            fontSize: '0.75rem', 
            color: navigator.mediaDevices ? '#047857' : '#b91c1c',
            margin: 0 
          }}>
            {navigator.mediaDevices 
              ? 'Camera API available - Ready for document scanning'
              : 'Camera not available - Please use a browser that supports camera access'
            }
          </p>
        </div>

        {/* Action Button */}
        <button
          className={`btn btn-primary w-full ${(!navigator.mediaDevices || state.loading) ? 'btn:disabled' : ''}`}
          onClick={handleStartProcess}
          disabled={!navigator.mediaDevices || state.loading}
          style={{ marginBottom: '1rem' }}
        >
          {state.loading ? (
            <>
              <div className="loading-spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}></div>
              Starting...
            </>
          ) : (
            <>
              ▶️ Start ID Scanning Process
            </>
          )}
        </button>

        {/* Browser compatibility note */}
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          📝 <strong>Note:</strong> This web version works best in mobile browsers like Chrome, Safari, or Firefox.
          For optimal performance, use the native mobile app.
        </div>
      </div>

      {/* Compliance Footer */}
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '1.5rem', 
        borderTop: '1px solid rgba(203, 213, 225, 0.5)',
        marginTop: '2rem'
      }}>
        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
          🔒 GDPR • CCPA • Singapore Compliant
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;