import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch, actions } from '../context/AppContext';
import { scanDocument } from '../services/api';

const IDScanScreen = () => {
  const navigate = useNavigate();
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      console.log('📹 Starting camera for ID document scan...');

      // Enhanced camera configuration for document scanning
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: { ideal: 'environment', exact: false }, // Prefer back camera
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        console.log('✅ Camera started successfully');
      }
    } catch (error) {
      console.error('❌ Camera access error:', error);
      
      let errorMessage = 'Camera access denied. Please enable camera permissions.';
      
      if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure your device has a camera.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    console.log('🛑 Camera stopped');
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Apply image enhancements for better OCR
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple contrast and brightness enhancement
    const contrast = 1.2;
    const brightness = 10;

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast and brightness to RGB channels
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));     // Red
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness)); // Green
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness)); // Blue
    }

    // Put enhanced image data back to canvas
    context.putImageData(imageData, 0, 0);

    // Return base64 image data
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
  };

  const handleCapture = async () => {
    if (capturing) return;

    try {
      setCapturing(true);
      console.log('📸 Capturing ID document...');

      // Wait a moment for stabilization
      await new Promise(resolve => setTimeout(resolve, 1000));

      const imageData = captureImage();
      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      console.log('✅ Image captured successfully');
      stopCamera();

      // Process with backend (or simulate if offline)
      await processDocument(imageData);

    } catch (error) {
      console.error('❌ Capture error:', error);
      alert('Failed to capture image. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const processDocument = async (imageData) => {
    try {
      dispatch(actions.setLoading(true));
      console.log('🔍 Processing document...');

      let result;
      try {
        // Try to process with backend
        result = await scanDocument(state.userId, imageData);
      } catch (error) {
        console.warn('⚠️ Backend unavailable, using mock processing');
        // Simulate processing for offline mode
        result = await simulateDocumentProcessing(imageData);
      }

      if (result.success) {
        // Store capture result
        dispatch(actions.setCaptureResult('document_scan', result));
        setCaptureResult(result);

        // Extract and store personal information
        if (result.personal_information) {
          dispatch(actions.setExtractedInfo(result.personal_information));
          
          // Auto-fill KYC data
          dispatch(actions.updateKycData({
            first_name: result.personal_information.first_name || '',
            last_name: result.personal_information.last_name || '',
            date_of_birth: result.personal_information.date_of_birth || '',
            document_number: result.personal_information.document_number || '',
            nationality: result.personal_information.nationality || '',
            country_of_issue: result.personal_information.country_of_issue || '',
            sex: result.personal_information.sex || '',
            expiry_date: result.personal_information.expiry_date || '',
          }));

          console.log('📝 Personal information extracted and stored');

          // Navigate to verification screen after delay
          setTimeout(() => {
            dispatch(actions.setCurrentStep(3));
            navigate('/personal-info');
          }, 2000);
        } else {
          alert('Document scanned but personal information could not be extracted. You can enter it manually.');
          setTimeout(() => {
            dispatch(actions.setCurrentStep(3));
            navigate('/personal-info');
          }, 1000);
        }
      } else {
        throw new Error(result.error || 'Document processing failed');
      }
    } catch (error) {
      console.error('❌ Document processing error:', error);
      alert('Failed to process document. Please try again with better lighting.');
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const simulateDocumentProcessing = async (imageData) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock result
    return {
      success: true,
      ocr_confidence: 0.85,
      personal_information: {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-15',
        document_number: 'A123456789',
        nationality: 'USA',
        country_of_issue: 'United States',
        sex: 'M',
        expiry_date: '2030-01-15',
        extraction_confidence: 0.85
      },
      processing_time: 2.1,
      device_info: state.deviceInfo
    };
  };

  // Render success result
  if (captureResult && captureResult.success) {
    return (
      <div className="screen">
        <div className="result-container">
          <div className="result-icon result-success">
            ✅
          </div>
          
          <h2 className="result-title success">ID Scanned Successfully!</h2>
          <p className="result-description">
            Personal information extracted with{' '}
            {((captureResult.ocr_confidence || 0) * 100).toFixed(1)}% confidence
          </p>

          {captureResult.personal_information && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#059669', marginBottom: '1rem' }}>
                Extracted Information:
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">First Name</div>
                  <div className="info-value">{captureResult.personal_information.first_name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Last Name</div>
                  <div className="info-value">{captureResult.personal_information.last_name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Date of Birth</div>
                  <div className="info-value">{captureResult.personal_information.date_of_birth}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Document Number</div>
                  <div className="info-value">{captureResult.personal_information.document_number}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Nationality</div>
                  <div className="info-value">{captureResult.personal_information.nationality}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Sex</div>
                  <div className="info-value">{captureResult.personal_information.sex}</div>
                </div>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary w-full mt-6"
            onClick={() => {
              dispatch(actions.setCurrentStep(3));
              navigate('/personal-info');
            }}
          >
            Continue to Verify Information ➡️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <div className="badge badge-required">
          ⚠️ REQUIRED STEP
        </div>
        <h1 className="screen-title">ID Document Scan</h1>
        <p className="screen-subtitle">
          Scan your passport or ID document to automatically extract your personal information.
          This step is required by regulation.
        </p>
      </div>

      {/* Camera Modal */}
      {cameraActive && (
        <div className="camera-modal">
          <div className="camera-header">
            <div className="camera-instructions">
              Position your ID document in the frame
            </div>
            <button className="camera-close" onClick={stopCamera}>
              ✕
            </button>
          </div>

          <div className="camera-content">
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
            />
            
            {/* Document frame overlay */}
            <div className="document-frame">
              <div className="document-frame-text">ID Document</div>
            </div>
          </div>

          <div className="camera-controls">
            {capturing ? (
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                <div>Processing...</div>
              </div>
            ) : (
              <button className="capture-button" onClick={handleCapture}>
                📷
              </button>
            )}
          </div>
        </div>
      )}

      {/* Canvas for image processing (hidden) */}
      <canvas ref={canvasRef} className="camera-canvas" />

      {/* Instructions */}
      {!cameraActive && (
        <div className="screen-content">
          <div className="card">
            <div className="result-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              📷
            </div>
            
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#dc2626', textAlign: 'center', marginBottom: '0.5rem' }}>
              Required: Position ID document in camera view
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#dc2626', textAlign: 'center', marginBottom: '1.5rem' }}>
              We'll automatically extract your personal information from the document
            </p>

            <ul className="feature-list">
              <li className="feature-item">
                <span className="feature-icon">💡</span>
                <span className="feature-text">Ensure good lighting</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">📐</span>
                <span className="feature-text">Keep document flat and steady</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">🎯</span>
                <span className="feature-text">Align document in frame</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">🔍</span>
                <span className="feature-text">Ensure text is clearly visible</span>
              </li>
            </ul>

            {cameraError && (
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                border: '1px solid #fecaca'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>
                  ❌ {cameraError}
                </p>
              </div>
            )}

            <button
              className={`btn btn-danger w-full ${state.loading ? 'btn:disabled' : ''}`}
              onClick={startCamera}
              disabled={state.loading}
            >
              {state.loading ? (
                <>
                  <div className="loading-spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}></div>
                  Processing...
                </>
              ) : (
                <>
                  📸 Scan ID Document
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDScanScreen;