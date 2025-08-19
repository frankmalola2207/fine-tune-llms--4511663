/**
 * ID Scan Screen - Document capture with mobile camera
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import * as Progress from 'react-native-progress';

import {useAppState, useAppDispatch, actions} from '../contexts/AppContext';
import APIService from '../services/api';
import {hasCameraPermission, requestCameraPermission} from '../utils/permissions';

const {width, height} = Dimensions.get('window');

const IDScanScreen = ({navigation}) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const cameraRef = useRef(null);
  
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [captureResult, setCaptureResult] = useState(null);

  const devices = useCameraDevices();
  const device = devices.back || devices.front;

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      const permission = await hasCameraPermission();
      setHasPermission(permission);
      
      if (!permission) {
        await requestCameraPermission();
        const newPermission = await hasCameraPermission();
        setHasPermission(newPermission);
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access to scan your ID document.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Try Again', onPress: checkCameraPermission},
        ]
      );
    }
  };

  const handleStartScan = async () => {
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
  };

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    try {
      setCapturing(true);
      setCaptureProgress(0);

      // Show progress animation
      const progressInterval = setInterval(() => {
        setCaptureProgress(prev => {
          if (prev >= 0.9) {
            clearInterval(progressInterval);
            return 0.9;
          }
          return prev + 0.1;
        });
      }, 400);

      console.log('📸 Starting ID document capture...');

      // Capture photo
      const photo = await cameraRef.current.takePhoto({
        quality: 90,
        enableAutoRedEyeReduction: false,
        enableAutoStabilization: true,
        enableShutterSound: Platform.OS === 'ios',
      });

      console.log('✅ Photo captured:', photo.path);

      // Convert to base64
      const imageData = await convertImageToBase64(photo.path);
      
      // Close camera modal
      setCameraVisible(false);
      clearInterval(progressInterval);
      setCaptureProgress(1);

      // Process with backend
      await processDocument(imageData);

    } catch (error) {
      console.error('❌ Capture error:', error);
      Alert.alert(
        'Capture Failed',
        'Failed to capture image. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setCapturing(false);
      setCaptureProgress(0);
    }
  };

  const processDocument = async (imageData) => {
    try {
      dispatch(actions.setLoading(true));
      dispatch(actions.setError(null));

      console.log('🔍 Processing document with backend...');

      const result = await APIService.scanDocument(
        state.userId,
        imageData,
        {
          mobile_optimized: true,
          enhance_contrast: true,
          auto_rotate: true,
          noise_reduction: true,
        }
      );

      console.log('✅ Document processed:', result);

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

          // Navigate to verification screen
          setTimeout(() => {
            dispatch(actions.setCurrentStep(3));
            navigation.navigate('PersonalInfo');
          }, 2000);
        } else {
          Alert.alert(
            'Processing Complete',
            'Document scanned but personal information could not be extracted. You can enter it manually.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  dispatch(actions.setCurrentStep(3));
                  navigation.navigate('PersonalInfo');
                },
              },
            ]
          );
        }
      } else {
        throw new Error(result.error || 'Document processing failed');
      }
    } catch (error) {
      console.error('❌ Document processing error:', error);
      Alert.alert(
        'Processing Failed',
        'Failed to process your document. Please try again with better lighting.',
        [
          {text: 'Retry', onPress: () => setCaptureResult(null)},
          {text: 'Continue Manually', onPress: () => {
            dispatch(actions.setCurrentStep(3));
            navigation.navigate('PersonalInfo');
          }},
        ]
      );
    } finally {
      dispatch(actions.setLoading(false));
    }
  };

  const convertImageToBase64 = async (imagePath) => {
    try {
      // This would typically use react-native-fs or similar library
      // For now, we'll simulate the conversion
      console.log('🔄 Converting image to base64...');
      
      // In a real implementation, you would read the file and convert to base64
      // const RNFS = require('react-native-fs');
      // const base64 = await RNFS.readFile(imagePath, 'base64');
      // return base64;
      
      // Placeholder base64 data for testing
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
      onBackdropPress={() => setCameraVisible(false)}
      onBackButtonPress={() => setCameraVisible(false)}>
      <View style={styles.cameraContainer}>
        {device && hasPermission && (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={cameraVisible}
            photo={true}
            enableZoomGesture
          />
        )}

        {/* Camera overlay */}
        <View style={styles.cameraOverlay}>
          <View style={styles.overlayTop}>
            <Text style={styles.instructionText}>
              Position your ID document in the frame
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCameraVisible(false)}>
              <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.overlayMiddle}>
            <View style={styles.documentFrame}>
              <View style={styles.frameCorner} style={[styles.frameCorner, styles.topLeft]} />
              <View style={styles.frameCorner} style={[styles.frameCorner, styles.topRight]} />
              <View style={styles.frameCorner} style={[styles.frameCorner, styles.bottomLeft]} />
              <View style={styles.frameCorner} style={[styles.frameCorner, styles.bottomRight]} />
              
              <View style={styles.documentIcon}>
                <Icon name="credit-card" size={40} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.documentText}>ID Document</Text>
              </View>
            </View>
          </View>

          <View style={styles.overlayBottom}>
            {capturing && (
              <View style={styles.progressContainer}>
                <Progress.Circle
                  size={60}
                  progress={captureProgress}
                  showsText={false}
                  color="#10b981"
                  unfilledColor="rgba(255, 255, 255, 0.3)"
                  borderWidth={0}
                  thickness={4}
                />
                <Text style={styles.progressText}>Processing...</Text>
              </View>
            )}

            {!capturing && (
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.captureButtonGradient}>
                  <Icon name="camera-alt" size={30} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
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
          colors={['#10b981', '#059669']}
          style={styles.successIcon}>
          <Icon name="check" size={40} color="#ffffff" />
        </LinearGradient>
        
        <Text style={styles.successTitle}>✅ ID Scanned Successfully!</Text>
        <Text style={styles.successText}>
          Personal information extracted with{' '}
          {((captureResult.ocr_confidence || 0) * 100).toFixed(1)}% confidence
        </Text>

        {captureResult.personal_information && (
          <View style={styles.extractedInfo}>
            <Text style={styles.extractedTitle}>Extracted Information:</Text>
            <View style={styles.infoGrid}>
              <InfoItem
                label="First Name"
                value={captureResult.personal_information.first_name}
              />
              <InfoItem
                label="Last Name"
                value={captureResult.personal_information.last_name}
              />
              <InfoItem
                label="Date of Birth"
                value={captureResult.personal_information.date_of_birth}
              />
              <InfoItem
                label="Document Number"
                value={captureResult.personal_information.document_number}
              />
              <InfoItem
                label="Nationality"
                value={captureResult.personal_information.nationality}
              />
              <InfoItem
                label="Sex"
                value={captureResult.personal_information.sex}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => {
            dispatch(actions.setCurrentStep(3));
            navigation.navigate('PersonalInfo');
          }}>
          <LinearGradient
            colors={['#1e40af', '#3730a3']}
            style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Continue to Verify Information</Text>
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
            colors={['#ef4444', '#dc2626']}
            style={styles.mandatoryBadge}>
            <Icon name="warning" size={16} color="#ffffff" />
            <Text style={styles.mandatoryText}>REQUIRED STEP</Text>
          </LinearGradient>
          <Text style={styles.title}>ID Document Scan</Text>
          <Text style={styles.subtitle}>
            Scan your passport or ID document to automatically extract your personal information.
            This step is required by regulation.
          </Text>
        </View>

        {/* Scan Result or Instructions */}
        {captureResult && captureResult.success ? (
          renderSuccessResult()
        ) : (
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionCard}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.instructionIcon}>
                <Icon name="camera-alt" size={48} color="#ffffff" />
              </LinearGradient>
              
              <Text style={styles.instructionTitle}>
                Required: Position ID document in camera view
              </Text>
              <Text style={styles.instructionText}>
                We'll automatically extract your personal information from the document
              </Text>

              <View style={styles.tipsList}>
                <View style={styles.tip}>
                  <Icon name="lightbulb-outline" size={16} color="#f59e0b" />
                  <Text style={styles.tipText}>Ensure good lighting</Text>
                </View>
                <View style={styles.tip}>
                  <Icon name="center-focus-strong" size={16} color="#f59e0b" />
                  <Text style={styles.tipText}>Keep document flat and steady</Text>
                </View>
                <View style={styles.tip}>
                  <Icon name="straighten" size={16} color="#f59e0b" />
                  <Text style={styles.tipText}>Align document in frame</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.scanButton,
                (!hasPermission || state.loading) && styles.disabledButton,
              ]}
              onPress={handleStartScan}
              disabled={!hasPermission || state.loading}>
              <LinearGradient
                colors={
                  hasPermission && !state.loading
                    ? ['#ef4444', '#dc2626']
                    : ['#9ca3af', '#6b7280']
                }
                style={styles.buttonGradient}>
                <Icon
                  name={state.loading ? 'hourglass-empty' : 'camera-alt'}
                  size={24}
                  color="#ffffff"
                />
                <Text style={styles.buttonText}>
                  {state.loading ? 'Processing...' : '📸 Scan ID Document'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {renderCameraModal()}
    </LinearGradient>
  );
};

const InfoItem = ({label, value}) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value || 'Not extracted'}</Text>
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
  mandatoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  mandatoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
    borderWidth: 2,
    borderColor: '#fee2e2',
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
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  tipsList: {
    alignSelf: 'stretch',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 8,
  },
  scanButton: {
    borderRadius: 12,
    overflow: 'hidden',
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
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    marginBottom: 24,
  },
  extractedInfo: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    width: '100%',
  },
  extractedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
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
    paddingTop: 50,
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
    paddingHorizontal: 40,
  },
  documentFrame: {
    width: width * 0.8,
    height: width * 0.5,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#10b981',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  documentIcon: {
    alignItems: 'center',
  },
  documentText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 8,
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
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 12,
  },
});

export default IDScanScreen;