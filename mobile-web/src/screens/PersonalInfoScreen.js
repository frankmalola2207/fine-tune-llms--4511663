import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch, actions } from '../context/AppContext';

const PersonalInfoScreen = () => {
  const navigate = useNavigate();
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    document_number: '',
    nationality: '',
    country_of_issue: '',
    sex: '',
    expiry_date: '',
  });

  useEffect(() => {
    // Initialize form with KYC data
    setFormData(state.kycData);
  }, [state.kycData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVerifyAndContinue = async () => {
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
      alert('Please fill in at least the required fields: First Name, Last Name, and Date of Birth.');
      return;
    }

    try {
      dispatch(actions.setLoading(true));

      // Update KYC data in state
      dispatch(actions.updateKycData(formData));
      dispatch(actions.setPersonalInfoVerified(true));

      console.log('✅ Personal information verified');

      // Move to facial biometrics
      dispatch(actions.setCurrentStep(4));
      navigate('/facial-biometrics');

    } catch (error) {
      console.error('❌ Personal info verification error:', error);
      alert('Failed to verify personal information. Please try again.');
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const renderFormField = (field, label, placeholder, required = false) => {
    const value = formData[field] || '';
    const isExtracted = state.extractedPersonalInfo?.[field];
    
    return (
      <div className="form-field">
        <label className="form-label">
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
          {isExtracted && (
            <span style={{ 
              fontSize: '0.75rem', 
              color: '#059669', 
              marginLeft: '0.5rem',
              background: '#d1fae5',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.375rem'
            }}>
              ✨ Auto-filled
            </span>
          )}
        </label>
        <input
          type="text"
          className={`form-input ${isExtracted ? 'extracted' : ''}`}
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  };

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <div className="result-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          ✅
        </div>
        <h1 className="screen-title">Verify Personal Information</h1>
        <p className="screen-subtitle">
          Review and confirm the information extracted from your ID document.
          Make any necessary corrections.
        </p>
      </div>

      {/* Extraction Alert */}
      {state.extractedPersonalInfo && (
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          padding: '1rem',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '0.75rem',
          margin: '0 1rem 1.5rem',
          border: '1px solid #a7f3d0'
        }}>
          <div style={{ 
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '0.75rem'
          }}>
            <span style={{ color: 'white', fontSize: '0.875rem' }}>🤖</span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669', margin: '0 0 0.25rem' }}>
              Auto-extracted from ID
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#047857', margin: 0 }}>
              Please review the information below and make corrections if needed.
              Extraction confidence: {((state.extractedPersonalInfo.extraction_confidence || 0) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="form-container">
        <div className="card">
          <div className="form-section">
            <h2 className="form-section-title">Personal Details</h2>
            
            {renderFormField('first_name', 'First Name', 'Enter your first name', true)}
            {renderFormField('last_name', 'Last Name', 'Enter your last name', true)}
            {renderFormField('date_of_birth', 'Date of Birth', 'YYYY-MM-DD', true)}
            {renderFormField('sex', 'Sex', 'e.g. Male, Female')}
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Document Information</h2>
            
            {renderFormField('document_number', 'Document Number', 'Enter document number')}
            {renderFormField('nationality', 'Nationality', 'e.g. Singapore, USA, UK')}
            {renderFormField('country_of_issue', 'Country of Issue', 'Issuing country')}
            {renderFormField('expiry_date', 'Expiry Date', 'YYYY-MM-DD')}
          </div>
        </div>

        {/* Data Quality Indicator */}
        {state.extractedPersonalInfo && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>📊</span>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#6366f1', margin: 0 }}>
                Data Quality Assessment
              </h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Extraction Confidence
                </div>
                <div className="quality-indicator">
                  <div className="quality-bar">
                    <div 
                      className="quality-fill" 
                      style={{ width: `${(state.extractedPersonalInfo.extraction_confidence || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="quality-text">
                  {((state.extractedPersonalInfo.extraction_confidence || 0) * 100).toFixed(1)}%
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Fields Extracted
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', margin: '1rem 0' }}>
                  {Object.values(state.extractedPersonalInfo).filter(v => v && v !== '').length}/8
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          className={`btn btn-primary w-full ${state.loading ? 'btn:disabled' : ''}`}
          onClick={handleVerifyAndContinue}
          disabled={state.loading}
        >
          {state.loading ? (
            <>
              <div className="loading-spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}></div>
              Verifying...
            </>
          ) : (
            <>
              Continue to Biometric Verification ➡️
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PersonalInfoScreen;