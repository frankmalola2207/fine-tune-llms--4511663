import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch, actions } from '../context/AppContext';

const FacialBiometricsScreen = () => {
  const navigate = useNavigate();
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState('Position your face in the circle');
  const [captureResult, setCaptureResult] = useState(null);
  const [frameCount, setFrameCount] = useState(0);

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
      console.log('📹 Starting camera for facial biometrics...');

      // Front camera for facial capture
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user', // Front camera
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        console.log('✅ Front camera started for facial capture');
      }
    } catch (error) {
      console.error('❌ Camera access error:', error);
      alert('Camera access denied. Please enable camera permissions for facial verification.');
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

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const handleLivenessCapture = async () => {
    if (capturing) return;

    try {
      setCapturing(true);
      setCaptureProgress(0);
      setFrameCount(0);

      console.log('🎭 Starting facial liveness detection...');

      const frames = [];
      const totalFrames = 10;
      const frameInterval = 300;

      for (let i = 0; i < totalFrames; i++) {
        // Update progress and instruction
        const progress = (i + 1) / totalFrames;
        setCaptureProgress(progress);
        setFrameCount(i + 1);
        
        // Update instruction based on progress
        if (i < 3) {
          setCurrentInstruction('Look straight at the camera');
        } else if (i < 6) {
          setCurrentInstruction('Blink naturally');
        } else if (i < 9) {
          setCurrentInstruction('Turn head slightly left, then right');
        } else {
          setCurrentInstruction('Hold still...');
        }

        // Capture frame
        const frameData = captureFrame();
        if (frameData) {
          frames.push(frameData);
          console.log(`📸 Frame ${i + 1}/${totalFrames} captured`);
        }

        // Wait between frames
        if (i < totalFrames - 1) {
          await new Promise(resolve => setTimeout(resolve, frameInterval));
        }
      }

      stopCamera();

      if (frames.length < 5) {
        throw new Error('Insufficient frames captured for liveness detection');
      }

      // Process liveness detection
      await processLivenessDetection(frames);

    } catch (error) {
      console.error('❌ Liveness capture error:', error);
      alert('Failed to capture facial liveness data. Please try again.');
    } finally {
      setCapturing(false);
      setCaptureProgress(0);
      setFrameCount(0);
      setCurrentInstruction('Position your face in the circle');
    }
  };

  const processLivenessDetection = async (frames) => {
    try {
      dispatch(actions.setLoading(true));
      console.log('🔍 Processing facial liveness...');

      // Simulate liveness detection
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = {
        success: true,
        is_live: true,
        liveness_score: 0.92,
        confidence: 0.88,
        frames_analyzed: frames.length,
        indicators: {
          movement_detected: true,
          blink_detected: true,
          avg_quality: 0.85,
          frames_analyzed: frames.length
        },
        processing_time: 2.1,
        device_info: state.deviceInfo
      };

      dispatch(actions.setCaptureResult('facial_liveness', result));
      setCaptureResult(result);

      console.log('✅ Liveness detection completed:', result);

      // Navigate to completion after delay
      setTimeout(() => {
        dispatch(actions.setCurrentStep(5));
        navigate('/completion');
      }, 3000);

    } catch (error) {
      console.error('❌ Liveness processing error:', error);
      alert('Failed to process facial liveness. Please try again.');
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const handleSkipBiometrics = () => {
    if (confirm('Skip facial verification? This will reduce the security level of your verification.')) {
      dispatch(actions.setCurrentStep(5));
      navigate('/completion');
    }
  };

  // Render success result
  if (captureResult && captureResult.success) {
    return (
      <div className="screen">
        <div className="result-container">
          <div className={`result-icon ${captureResult.is_live ? 'result-success' : 'result-error'}`}>
            {captureResult.is_live ? '✅' : '❌'}
          </div>
          
          <h2 className={`result-title ${captureResult.is_live ? 'success' : 'error'}`}>
            {captureResult.is_live ? 'Liveness Verified!' : 'Liveness Check Failed'}
          </h2>
          
          <p className="result-description">
            Liveness Score: {(captureResult.liveness_score * 100).toFixed(1)}%
            <br />
            Confidence: {(captureResult.confidence * 100).toFixed(1)}%
          </p>

          {captureResult.indicators && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                Detection Indicators:
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Frames Analyzed</div>
                  <div className="info-value">{captureResult.indicators.frames_analyzed}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Movement Detected</div>
                  <div className="info-value">{captureResult.indicators.movement_detected ? 'Yes' : 'No'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Blink Detected</div>
                  <div className="info-value">{captureResult.indicators.blink_detected ? 'Yes' : 'No'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Average Quality</div>
                  <div className="info-value">{(captureResult.indicators.avg_quality * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary w-full mt-6"
            onClick={() => {
              dispatch(actions.setCurrentStep(5));
              navigate('/completion');
            }}
          >
            Continue Verification ➡️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <div className="badge badge-optional">
          ℹ️ OPTIONAL STEP
        </div>
        <h1 className="screen-title">Facial Verification</h1>
        <p className="screen-subtitle">
          Advanced facial liveness detection to ensure you are physically present.
          This provides additional security for your verification.
        </p>
      </div>

      {/* Camera Modal */}
      {cameraActive && (
        <div className="camera-modal">
          <div className="camera-header">
            <div className="camera-instructions">
              {currentInstruction}
            </div>
            {!capturing && (
              <button className="camera-close" onClick={stopCamera}>
                ✕
              </button>
            )}
          </div>

          <div className="camera-content">
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
            />
            
            {/* Face frame overlay */}
            <div className="face-frame">
              {capturing && (
                <div style={{ 
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {frameCount}/10
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Frames
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="camera-controls">
            {capturing ? (
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: '4px solid rgba(255,255,255,0.3)',
                  borderTop: '4px solid white',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }}></div>
                <div>Analyzing liveness...</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                  Progress: {Math.round(captureProgress * 100)}%
                </div>
              </div>
            ) : (
              <button className="capture-button" onClick={handleLivenessCapture}>
                👤
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
            <div className="result-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              👤
            </div>
            
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#7c3aed', textAlign: 'center', marginBottom: '0.5rem' }}>
              Facial Liveness Detection
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b46c1', textAlign: 'center', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Look at the camera and follow the on-screen instructions.
              We'll capture multiple frames to verify you're real.
            </p>

            <ul className="feature-list">
              <li className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Anti-spoofing protection</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">👁️</span>
                <span className="feature-text">Real-time face detection</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">📱</span>
                <span className="feature-text">Movement analysis</span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">👀</span>
                <span className="feature-text">Blink detection</span>
              </li>
            </ul>

            <button
              className={`btn btn-secondary w-full ${state.loading ? 'btn:disabled' : ''}`}
              onClick={startCamera}
              disabled={state.loading}
              style={{ marginBottom: '0.75rem' }}
            >
              {state.loading ? (
                <>
                  <div className="loading-spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}></div>
                  Processing...
                </>
              ) : (
                <>
                  👤 Start Facial Verification
                </>
              )}
            </button>

            <button
              className="btn btn-outline w-full"
              onClick={handleSkipBiometrics}
              style={{ fontSize: '0.875rem' }}
            >
              Skip (Optional)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacialBiometricsScreen;