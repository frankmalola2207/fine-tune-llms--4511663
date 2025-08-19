/**
 * Facial Biometrics Screen - Liveness detection and facial verification
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import * as Progress from 'react-native-progress';

import {useAppState, useAppDispatch, actions} from '../contexts/AppContext';
import APIService from '../services/api';
import {hasCameraPermission} from '../utils/permissions';

const {width, height} = Dimensions.get('window');

const FacialBiometricsScreen = ({navigation}) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const cameraRef = useRef(null);
  
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [frameSequence, setFrameSequence] = useState([]);
  const [captureResult, setCaptureResult] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('Position your face in the circle');

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const frameCountAnim = useRef(new Animated.Value(0)).current;

  const devices = useCameraDevices();
  const device = devices.front || devices.back;

  useEffect(() => {
    checkCameraPermission();
    startPulseAnimation();
  }, []);

  const checkCameraPermission = async () => {
    const permission = await hasCameraPermission();
    setHasPermission(permission);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const handleStartCapture = async () => {
    if (!hasPermission) {
      await checkCameraPermission();
      return;
    }

    if (!device) {
      Alert.alert('Camera Error', 'No camera device found');
      return;
    }

    setCameraVisible(true);
    setCaptureResult(null);
    setFrameSequence([]);
  };

  const handleLivenessCapture = async () => {
    if (!cameraRef.current || capturing) return;

    try {
      setCapturing(true);
      setCaptureProgress(0);
      setFrameSequence([]);

      console.log('🎭 Starting facial liveness detection...');

      // Capture sequence of frames for liveness detection
      const frames = [];
      const totalFrames = 10;
      const frameInterval = 300; // 300ms between frames

      for (let i = 0; i < totalFrames; i++) {
        try {
          // Update progress and instruction
          const progress = (i + 1) / totalFrames;
          setCaptureProgress(progress);
          
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

          // Animate frame counter
          Animated.timing(frameCountAnim, {
            toValue: i + 1,
            duration: frameInterval / 2,
            useNativeDriver: false,
          }).start();

          // Capture frame
          const photo = await cameraRef.current.takePhoto({
            quality: 70,
            enableAutoRedEyeReduction: false,
            enableAutoStabilization: true,
          });

          const frameData = await convertImageToBase64(photo.path);
          frames.push(frameData);

          console.log(`📸 Frame ${i + 1}/${totalFrames} captured`);

          // Wait between frames
          if (i < totalFrames - 1) {
            await new Promise(resolve => setTimeout(resolve, frameInterval));
          }
        } catch (frameError) {
          console.error(`Frame ${i + 1} capture error:`, frameError);
          // Continue with remaining frames
        }
      }

      setCameraVisible(false);
      setFrameSequence(frames);

      if (frames.length < 5) {
        throw new Error('Insufficient frames captured for liveness detection');
      }

      console.log(`✅ Captured ${frames.length} frames for liveness detection`);

      // Process with backend
      await processLivenessDetection(frames);

    } catch (error) {
      console.error('❌ Liveness capture error:', error);
      Alert.alert(
        'Capture Failed',
        'Failed to capture facial liveness data. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setCapturing(false);
      setCaptureProgress(0);
      setCurrentInstruction('Position your face in the circle');
    }
  };

  const processLivenessDetection = async (frames) => {
    try {
      dispatch(actions.setLoading(true));
      dispatch(actions.setError(null));

      console.log('🔍 Processing facial liveness with backend...');

      const result = await APIService.detectFacialLiveness(
        state.userId,
        frames,
        0.6 // Liveness threshold
      );

      console.log('✅ Liveness detection processed:', result);

      if (result.success) {
        // Store capture result
        dispatch(actions.setCaptureResult('facial_liveness', result));
        setCaptureResult(result);

        if (result.is_live) {
          // Move to next step after delay
          setTimeout(() => {
            handleContinueToNext();
          }, 2000);
        } else {
          Alert.alert(
            'Liveness Detection Failed',
            'Unable to verify facial liveness. Please try again in better lighting conditions.',
            [
              {text: 'Retry', onPress: () => setCaptureResult(null)},
              {text: 'Skip', onPress: handleSkipBiometrics},
            ]
          );
        }
      } else {
        throw new Error(result.error || 'Liveness detection failed');
      }
    } catch (error) {
      console.error('❌ Liveness processing error:', error);
      Alert.alert(
        'Processing Failed',
        'Failed to process facial liveness. Please try again.',
        [
          {text: 'Retry', onPress: () => setCaptureResult(null)},
          {text: 'Skip', onPress: handleSkipBiometrics},
        ]
      );
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const handleContinueToNext = () => {
    // Determine next step based on configuration
    const hasOptionalBiometrics = state.biometricConfig?.optional_features?.length > 0;
    const hasNFC = state.biometricConfig?.config?.nfc_reading?.enabled;
    
    if (hasOptionalBiometrics) {
      dispatch(actions.setCurrentStep(5));
      navigation.navigate('OptionalBiometrics');
    } else if (hasNFC) {
      // Would navigate to NFC screen if implemented
      dispatch(actions.setCurrentStep(6));
      navigation.navigate('Completion');
    } else {
      dispatch(actions.setCurrentStep(6));
      navigation.navigate('Completion');
    }
  };

  const handleSkipBiometrics = () => {
    Alert.alert(
      'Skip Facial Verification?',
      'This will reduce the security level of your verification. Are you sure you want to skip?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Skip',
          style: 'destructive',
          onPress: handleContinueToNext,
        },
      ]
    );
  };

  const convertImageToBase64 = async (imagePath) => {
    try {
      console.log('🔄 Converting facial image to base64...');
      // Placeholder for actual base64 conversion
      return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    } catch (error) {
      console.error('Base64 conversion error:', error);
      throw error;
    }
  };

  const renderCameraModal = () => (
    <Modal
      isVisible={cameraVisible}
      style={styles.cameraModal}
      onBackdropPress={() => !capturing && setCameraVisible(false)}
      onBackButtonPress={() => !capturing && setCameraVisible(false)}>
      <View style={styles.cameraContainer}>
        {device && hasPermission && (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={cameraVisible}
            photo={true}
          />
        )}

        {/* Camera overlay */}
        <View style={styles.cameraOverlay}>
          <View style={styles.overlayTop}>
            <Text style={styles.instructionText}>{currentInstruction}</Text>
            {!capturing && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setCameraVisible(false)}>
                <Icon name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.overlayMiddle}>
            <Animated.View
              style={[
                styles.faceFrame,
                {transform: [{scale: pulseAnim}]},
              ]}>
              <View style={styles.faceCircle} />
              
              {capturing && (
                <View style={styles.progressOverlay}>
                  <Progress.Circle
                    size={200}
                    progress={captureProgress}
                    showsText={false}
                    color="#10b981"
                    unfilledColor="rgba(255, 255, 255, 0.2)"
                    borderWidth={0}
                    thickness={4}
                  />
                  <View style={styles.progressCenter}>
                    <Animated.Text style={styles.frameCount}>
                      {frameCountAnim._value.toFixed(0)}/10
                    </Animated.Text>
                    <Text style={styles.progressLabel}>Frames</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>

          <View style={styles.overlayBottom}>
            {!capturing && (
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleLivenessCapture}>
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.captureButtonGradient}>
                  <Icon name="face" size={30} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {capturing && (
              <View style={styles.capturingIndicator}>
                <Text style={styles.capturingText}>Analyzing liveness...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSuccessResult = () => {
    if (!captureResult || !captureResult.success) return null;

    return (
      <View style={styles.resultContainer}>
        <LinearGradient
          colors={captureResult.is_live ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
          style={styles.resultIcon}>
          <Icon 
            name={captureResult.is_live ? 'verified' : 'error'} 
            size={40} 
            color="#ffffff" 
          />
        </LinearGradient>
        
        <Text style={[
          styles.resultTitle,
          {color: captureResult.is_live ? '#10b981' : '#ef4444'}
        ]}>
          {captureResult.is_live ? '✅ Liveness Verified!' : '❌ Liveness Check Failed'}
        </Text>
        
        <Text style={styles.resultText}>
          Liveness Score: {(captureResult.liveness_score * 100).toFixed(1)}%
          {'\n'}Confidence: {(captureResult.confidence * 100).toFixed(1)}%
        </Text>

        {captureResult.indicators && (
          <View style={styles.indicatorsContainer}>
            <Text style={styles.indicatorsTitle}>Detection Indicators:</Text>
            <View style={styles.indicatorsList}>
              <IndicatorItem
                label="Frames Analyzed"
                value={captureResult.indicators.frames_analyzed || frameSequence.length}
                icon="camera"
              />
              <IndicatorItem
                label="Movement Detected"
                value={captureResult.indicators.movement_detected ? 'Yes' : 'No'}
                icon="gesture"
              />
              <IndicatorItem
                label="Blink Detected"
                value={captureResult.indicators.blink_detected ? 'Yes' : 'No'}
                icon="visibility"
              />
              <IndicatorItem
                label="Average Quality"
                value={`${(captureResult.indicators.avg_quality * 100).toFixed(1)}%`}
                icon="assessment"
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueToNext}>
          <LinearGradient
            colors={['#1e40af', '#3730a3']}
            style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Continue Verification</Text>
            <Icon name="arrow-forward" size={20} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.headerIcon}>
            <Icon name="face" size={24} color="#ffffff" />
          </LinearGradient>
          <Text style={styles.title}>Facial Verification</Text>
          <Text style={styles.subtitle}>
            Advanced facial liveness detection to ensure you are physically present.
            This provides additional security for your verification.
          </Text>
        </View>

        {/* Result or Instructions */}
        {captureResult && captureResult.success ? (
          renderSuccessResult()
        ) : (
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionCard}>
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.instructionIcon}>
                <Icon name="face" size={48} color="#ffffff" />
              </LinearGradient>
              
              <Text style={styles.instructionTitle}>
                Facial Liveness Detection
              </Text>
              <Text style={styles.instructionDescription}>
                Look at the camera and follow the on-screen instructions.
                We'll capture multiple frames to verify you're real.
              </Text>

              <View style={styles.featuresList}>
                <FeatureItem icon="security" text="Anti-spoofing protection" />
                <FeatureItem icon="face-detection" text="Real-time face detection" />
                <FeatureItem icon="motion-photos-on" text="Movement analysis" />
                <FeatureItem icon="visibility" text="Blink detection" />
              </View>
            </View>

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  (!hasPermission || state.loading) && styles.disabledButton,
                ]}
                onPress={handleStartCapture}
                disabled={!hasPermission || state.loading}>
                <LinearGradient
                  colors={
                    hasPermission && !state.loading
                      ? ['#8b5cf6', '#7c3aed']
                      : ['#9ca3af', '#6b7280']
                  }
                  style={styles.buttonGradient}>
                  <Icon
                    name={state.loading ? 'hourglass-empty' : 'face'}
                    size={24}
                    color="#ffffff"
                  />
                  <Text style={styles.buttonText}>
                    {state.loading ? 'Processing...' : 'Start Facial Verification'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {state.biometricConfig?.optional_features?.includes('facial_liveness') && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipBiometrics}>
                  <Text style={styles.skipButtonText}>Skip (Optional)</Text>
                </TouchableOpacity>
              )}
            </div>
          </View>
        )}
      </View>

      {renderCameraModal()}
    </LinearGradient>
  );
};

const FeatureItem = ({icon, text}) => (
  <View style={styles.featureItem}>
    <Icon name={icon} size={16} color="#8b5cf6" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const IndicatorItem = ({label, value, icon}) => (
  <View style={styles.indicatorItem}>
    <Icon name={icon} size={16} color="#6366f1" />
    <View style={styles.indicatorContent}>
      <Text style={styles.indicatorLabel}>{label}:</Text>
      <Text style={styles.indicatorValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  instructionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7c3aed',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionDescription: {
    fontSize: 14,
    color: '#6b46c1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  featuresList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 8,
  },
  actionContainer: {
    alignItems: 'center',
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  indicatorsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  indicatorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  indicatorsList: {
    space: 8,
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorContent: {
    flexDirection: 'row',
    marginLeft: 8,
    flex: 1,
  },
  indicatorLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  // Camera Modal Styles
  cameraModal: {
    margin: 0,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  overlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  progressOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  frameCount: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressLabel: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
  },
  overlayBottom: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  captureButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingIndicator: {
    alignItems: 'center',
  },
  capturingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FacialBiometricsScreen;