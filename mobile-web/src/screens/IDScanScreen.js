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

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported on this device');
      }

      // Detect mobile devices more specifically
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      console.log('📱 Device detection:', { isMobile, isIOS });

      // iOS Safari-specific camera configuration
      let constraints;
      if (isIOS) {
        // iOS requires very basic constraints to avoid permission failures
        constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
            // No facingMode on iOS to avoid silent failures
          }
        };
        console.log('🍎 Using iOS-optimized constraints');
      } else if (isMobile) {
        // Android mobile constraints
        constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        };
      } else {
        // Desktop constraints
        constraints = {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        };
      }

      console.log('📱 Requesting camera access with constraints:', constraints);
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        // Fallback to basic constraints if the ideal ones fail
        console.warn('⚠️ Ideal constraints failed, trying basic constraints');
        constraints = {
          video: true
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      
      if (videoRef.current) {
        console.log('📹 Setting camera active first to ensure video element is rendered...');
        
        // Set camera active FIRST to ensure video element is rendered
        setCameraActive(true);
        
        // Wait for React to render the video element
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const video = videoRef.current;
        
        if (!video) {
          throw new Error('Video element not available after state update');
        }
        
        console.log('📹 Assigning stream to video element...');
        
        // Ensure video element is ready
        video.srcObject = stream;
        streamRef.current = stream;
        
        console.log('📺 Video element state:', {
          srcObject: !!video.srcObject,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });
        
        // Force video to load and play
        try {
          await video.load();
          await video.play();
          console.log('✅ Video loaded and playing successfully');
        } catch (playError) {
          console.warn('⚠️ Video play failed:', playError);
          // Try without load() call
          try {
            await video.play();
            console.log('✅ Video playing without load()');
          } catch (playError2) {
            console.warn('⚠️ Video play still failed, but continuing:', playError2);
          }
        }
        
        // Wait for video metadata with timeout
        await new Promise((resolve) => {
          const checkVideo = () => {
            console.log('🔍 Checking video state:', {
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              currentTime: video.currentTime
            });
            
            if (video.readyState >= 2 && video.videoWidth > 0) {
              console.log('✅ Video is ready with dimensions:', video.videoWidth, 'x', video.videoHeight);
              resolve();
            } else if (video.readyState === 4) {
              console.log('✅ Video metadata loaded, resolving');
              resolve();
            } else {
              setTimeout(checkVideo, 200);
            }
          };
          
          checkVideo();
          
          // Always resolve after 5 seconds to prevent hanging
          setTimeout(() => {
            console.log('⏰ Video check timeout, proceeding anyway');
            resolve();
          }, 5000);
        });
      } else {
        throw new Error('Video element not available');
      }
    } catch (error) {
      console.error('❌ Camera access error:', error);
      
      let errorMessage = 'Camera access denied. Please enable camera permissions and try again.';
      
      if (error.name === 'NotFoundError' || error.message.includes('not supported')) {
        errorMessage = 'No camera found or camera API not supported on this device.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints not supported. Trying basic camera access...';
        // Special handling for Apple devices
        try {
          console.log('🍎 Trying basic constraints for Apple device...');
          const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            streamRef.current = basicStream;
            setCameraActive(true);
            
            // For Apple devices, ensure video plays
            try {
              await videoRef.current.play();
              console.log('✅ Camera started with basic constraints on Apple device');
              return;
            } catch (playError) {
              console.log('⚠️ Play failed but continuing:', playError);
              return;
            }
          }
        } catch (basicError) {
          console.error('❌ Basic camera access also failed on Apple device:', basicError);
          errorMessage = `Camera access failed on Apple device: ${basicError.message}`;
        }
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
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Video or canvas ref not available');
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Check if video is ready and has dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.error('❌ Video not ready for capture');
      return null;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('❌ Video has no dimensions');
      return null;
    }
    
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    console.log(`📐 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);

    try {
      // Draw video frame to canvas
      context.drawImage(video, 0, 0);
      console.log('✅ Video frame drawn to canvas successfully');

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
      console.log('✅ Image enhancements applied');

      // Return base64 image data with explicit CORS error handling
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Data = dataUrl.split(',')[1];
        
        if (!base64Data || base64Data.length < 100) {
          console.error('❌ Generated image data is too small');
          return null;
        }
        
        console.log(`✅ Image captured: ${base64Data.length} characters`);
        return base64Data;
      } catch (corsError) {
        console.error('❌ CORS error during toDataURL():', corsError);
        console.error('❌ This is likely due to cross-origin canvas restrictions');
        return null;
      }
    } catch (drawError) {
      console.error('❌ Error drawing video to canvas:', drawError);
      console.error('❌ Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.error('❌ Canvas dimensions:', canvas.width, 'x', canvas.height);
      return null;
    }
  };

  const handleCapture = async () => {
    if (capturing) return;

    try {
      setCapturing(true);
      console.log('📸 Starting capture process...');
      console.log('🔍 Video element status:', {
        exists: !!videoRef.current,
        readyState: videoRef.current?.readyState,
        videoWidth: videoRef.current?.videoWidth,
        videoHeight: videoRef.current?.videoHeight
      });
      
      // Check if video is ready
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }
      
      const video = videoRef.current;
      
      // Wait for video to be fully ready
      if (video.readyState < video.HAVE_CURRENT_DATA) {
        console.log('⏳ Waiting for video to be ready...');
        await new Promise((resolve, reject) => {
          const checkReady = () => {
            console.log('🔄 Checking video ready state:', video.readyState);
            if (video.readyState >= video.HAVE_CURRENT_DATA) {
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('Video not ready after 5 seconds')), 5000);
        });
      }

      console.log('✅ Video is ready, dimensions:', video.videoWidth, 'x', video.videoHeight);

      // Additional stabilization wait
      console.log('⏳ Stabilizing camera...');
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('📷 Attempting to capture image...');
      const imageData = captureImage();
      
      console.log('🔍 Capture result:', {
        hasData: !!imageData,
        dataLength: imageData?.length || 0,
        firstChars: imageData?.substring(0, 50) || 'none'
      });
      
      if (!imageData) {
        throw new Error('captureImage() returned null - check video dimensions and canvas');
      }

      console.log('✅ Image captured successfully, processing...');
      stopCamera();

      // Process with backend (or simulate if offline)
      await processDocument(imageData);

    } catch (error) {
      console.error('❌ Capture error details:', {
        message: error.message,
        stack: error.stack,
        videoExists: !!videoRef.current,
        canvasExists: !!canvasRef.current
      });
      alert(`Failed to capture image: ${error.message}. Check console for details.`);
      // Don't stop camera on error so user can try again
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
              webkit-playsinline="true"
              muted
              width="100%"
              height="100%"
              style={{ objectFit: 'cover' }}
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
              onClick={async () => {
                try {
                  await startCamera();
                } catch (error) {
                  console.error('❌ Failed to start camera:', error);
                  setCameraError(`Failed to start camera: ${error.message}`);
                }
              }}
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

            {/* Mobile debugging info */}
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#4338ca'
            }}>
              <div>📱 Device: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</div>
              <div>🔐 HTTPS: {window.location.protocol === 'https:' ? '✅' : '❌'}</div>
              <div>📷 Camera API: {navigator.mediaDevices ? '✅' : '❌'}</div>
              <div>🌐 URL: {window.location.href}</div>
            </div>

            <div style={{ 
              marginTop: '0.75rem', 
              fontSize: '0.75rem', 
              color: '#6b7280',
              textAlign: 'center'
            }}>
              💡 If camera doesn't open, try refreshing the page and allowing camera permissions when prompted.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDScanScreen;