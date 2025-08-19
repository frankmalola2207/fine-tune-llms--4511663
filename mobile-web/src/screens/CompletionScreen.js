import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch, actions } from '../context/AppContext';

const CompletionScreen = () => {
  const navigate = useNavigate();
  const state = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Animation effect
    console.log('🎉 Verification completed for user:', state.userId);
  }, [state.userId]);

  const handleStartOver = () => {
    if (confirm('Start a new verification? This will clear all current data.')) {
      dispatch(actions.resetState());
      navigate('/');
    }
  };

  const getVerificationSummary = () => {
    const completed = [];
    const skipped = [];

    if (state.captures.document_scan?.success) {
      completed.push('ID Document Scan');
    } else {
      skipped.push('ID Document Scan');
    }

    if (state.personalInfoVerified) {
      completed.push('Personal Information Verification');
    }

    if (state.captures.facial_liveness?.success) {
      completed.push('Facial Liveness Detection');
    } else if (state.biometricConfig.optional_features.includes('facial_liveness')) {
      skipped.push('Facial Liveness Detection');
    }

    return { completed, skipped };
  };

  const getSecurityLevel = () => {
    const { completed } = getVerificationSummary();
    if (completed.length >= 3) return { level: 'Enhanced', color: '#059669', score: 85 };
    if (completed.length >= 2) return { level: 'Standard', color: '#0891b2', score: 75 };
    return { level: 'Basic', color: '#f59e0b', score: 65 };
  };

  const { completed, skipped } = getVerificationSummary();
  const securityLevel = getSecurityLevel();

  return (
    <div className="screen">
      {/* Success Animation */}
      <div style={{ 
        textAlign: 'center',
        marginBottom: '2rem',
        animation: 'fadeInUp 1s ease-out'
      }}>
        <div className="result-icon result-success" style={{ width: '7.5rem', height: '7.5rem', fontSize: '3rem', margin: '0 auto 1.5rem' }}>
          🎉
        </div>
        
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
          Verification Complete!
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', textAlign: 'center', lineHeight: '1.5', paddingHorizontal: '1.25rem' }}>
          Your identity has been successfully verified using Mobile-Technologies eKYC platform.
        </p>
      </div>

      {/* Security Level */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ 
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${securityLevel.color}, ${securityLevel.color})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '0.75rem'
          }}>
            <span style={{ color: 'white', fontSize: '1.25rem' }}>🔒</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
              Security Level: {securityLevel.level}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Trust Score: {securityLevel.score}%
            </p>
          </div>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${securityLevel.score}%` }}
          ></div>
        </div>
      </div>

      {/* Verification Summary */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
          Verification Summary
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>{completed.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Completed</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>{skipped.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Skipped</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>
              {state.extractedPersonalInfo ? 
                ((state.extractedPersonalInfo.extraction_confidence || 0) * 100).toFixed(0) : 
                '0'}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>OCR Accuracy</div>
          </div>
        </div>

        <div>
          {/* Completed Items */}
          {completed.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0.75rem 0',
              borderBottom: index < completed.length - 1 || skipped.length > 0 ? '1px solid #f3f4f6' : 'none'
            }}>
              <div style={{ 
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '0.75rem'
              }}>
                <span style={{ color: 'white', fontSize: '0.75rem' }}>✓</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>{item}</div>
                {item === 'ID Document Scan' && state.captures.document_scan && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                    Confidence: {((state.captures.document_scan.ocr_confidence || 0) * 100).toFixed(1)}%
                  </div>
                )}
                {item === 'Facial Liveness Detection' && state.captures.facial_liveness && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                    Liveness Score: {((state.captures.facial_liveness.liveness_score || 0) * 100).toFixed(1)}%
                  </div>
                )}
              </div>
              <span style={{ fontSize: '1.25rem', color: '#10b981' }}>✅</span>
            </div>
          ))}

          {/* Skipped Items */}
          {skipped.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0.75rem 0',
              borderBottom: index < skipped.length - 1 ? '1px solid #f3f4f6' : 'none'
            }}>
              <div style={{ 
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '0.75rem'
              }}>
                <span style={{ color: 'white', fontSize: '0.75rem' }}>−</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>{item}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                  Optional step - skipped
                </div>
              </div>
              <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>⏭️</span>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Information Preview */}
      {state.kycData && (
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
            Verified Information
          </h2>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Name</div>
              <div className="info-value">{`${state.kycData.first_name} ${state.kycData.last_name}`}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Date of Birth</div>
              <div className="info-value">{state.kycData.date_of_birth}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Document</div>
              <div className="info-value">{state.kycData.document_number}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Nationality</div>
              <div className="info-value">{state.kycData.nationality}</div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Information */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>🛡️</span>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#059669', margin: 0 }}>
            Compliance & Security
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', marginRight: '0.375rem' }}>📋</span>
            <span style={{ fontSize: '0.75rem', color: '#374151' }}>GDPR Compliant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', marginRight: '0.375rem' }}>🔒</span>
            <span style={{ fontSize: '0.75rem', color: '#374151' }}>CCPA Compliant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', marginRight: '0.375rem' }}>🇸🇬</span>
            <span style={{ fontSize: '0.75rem', color: '#374151' }}>Singapore PDPA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', marginRight: '0.375rem' }}>🔑</span>
            <span style={{ fontSize: '0.75rem', color: '#374151' }}>End-to-End Encrypted</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          className="btn btn-secondary w-full"
          onClick={handleStartOver}
          style={{ marginBottom: '0.75rem' }}
        >
          🔄 Start New Verification
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
            Thank you for using Mobile-Technologies eKYC
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '1.5rem', 
        borderTop: '1px solid rgba(203, 213, 225, 0.5)'
      }}>
        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
          Powered by Mobile-Technologies AI eKYC Platform
        </p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Advanced Mobile Biometric Verification - Web Version
        </p>
      </div>
    </div>
  );
};

export default CompletionScreen;