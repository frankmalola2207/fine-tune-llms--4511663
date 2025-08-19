import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Progress } from "./components/ui/progress";
import { Alert, AlertDescription } from "./components/ui/alert";
import { 
  Fingerprint, 
  Camera, 
  FileText, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  TrendingUp,
  AlertTriangle,
  Scan,
  Eye,
  Lock,
  Globe,
  Smartphone,
  Nfc,
  Zap,
  Target,
  Award,
  Activity
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeStep, setActiveStep] = useState(1);
  const [kycData, setKycData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    document_number: "",
    nationality: "",
    country_of_issue: "",
    sex: "",
    expiry_date: "",
    user_id: ""
  });
  
  // Mobile biometric states
  const [mobileCaptures, setMobileCaptures] = useState({});
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [mobileDashboard, setMobileDashboard] = useState(null);
  const [currentCapture, setCurrentCapture] = useState(null);
  const [biometricConfig, setBiometricConfig] = useState(null);
  const [workflowValidation, setWorkflowValidation] = useState(null);
  
  // Personal information extraction states
  const [extractedPersonalInfo, setExtractedPersonalInfo] = useState(null);
  const [personalInfoVerified, setPersonalInfoVerified] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  
  // Camera references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [captureMode, setCaptureMode] = useState(''); // 'fingerprint', 'face', 'passport'

  useEffect(() => {
    // Generate unique user ID on mount
    setKycData(prev => ({
      ...prev,
      user_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    fetchDashboard();
    fetchMobileDashboard();
    fetchBiometricConfig();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/kyc/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  const fetchMobileDashboard = async () => {
    try {
      const response = await axios.get(`${API}/mobile/dashboard`);
      setMobileDashboard(response.data);
    } catch (error) {
      console.error("Mobile dashboard fetch error:", error);
    }
  };

  const fetchBiometricConfig = async () => {
    try {
      const response = await axios.get(`${API}/config/biometric`);
      setBiometricConfig(response.data);
    } catch (error) {
      console.error("Biometric config fetch error:", error);
    }
  };

  const validateWorkflow = async () => {
    try {
      const completedCaptures = Object.keys(mobileCaptures).filter(
        key => mobileCaptures[key] && mobileCaptures[key].success
      );
      
      const response = await axios.post(`${API}/kyc/workflow/validate`, {
        user_id: kycData.user_id,
        completed_captures: completedCaptures
      });
      
      setWorkflowValidation(response.data);
      return response.data;
    } catch (error) {
      console.error("Workflow validation error:", error);
      return null;
    }
  };

  const handleInputChange = (field, value) => {
    setKycData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const initiateKYC = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/kyc/initiate`, kycData);
      // Start with ID scan (mandatory step)
      setActiveStep(2); // Go directly to ID scan
    } catch (error) {
      console.error("KYC initiation error:", error);
      alert("Failed to initiate KYC process");
    } finally {
      setLoading(false);
    }
  };

  // Camera utilities
  const startCamera = async (mode) => {
    try {
      setCaptureMode(mode);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: mode === 'fingerprint' ? 'environment' : 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Camera access denied. Please enable camera permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCaptureMode('');
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; // Return base64 without prefix
  };

  // Mobile biometric capture functions
  const captureMobileFingerprint = async () => {
    setLoading(true);
    setCurrentCapture('fingerprint');
    
    try {
      await startCamera('fingerprint');
      
      // Wait for user to position finger
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const imageData = captureImage();
      if (!imageData) {
        throw new Error("Failed to capture fingerprint image");
      }

      stopCamera();

      const response = await axios.post(`${API}/mobile/fingerprint/capture`, {
        user_id: kycData.user_id,
        image_data: imageData,
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        },
        quality_threshold: 0.6
      });

      setMobileCaptures(prev => ({
        ...prev,
        fingerprint: response.data
      }));

      if (response.data.success) {
        checkOptionalBiometricsComplete();
      }

    } catch (error) {
      console.error("Mobile fingerprint capture error:", error);
      alert(`Fingerprint capture failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      setCurrentCapture(null);
      stopCamera();
    }
  };

  const captureFacialLiveness = async () => {
    setLoading(true);
    setCurrentCapture('face');
    
    try {
      await startCamera('face');
      
      // Capture sequence of frames for liveness detection
      const frameSequence = [];
      
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms intervals
        const frameData = captureImage();
        if (frameData) {
          frameSequence.push(frameData);
        }
      }

      stopCamera();

      if (frameSequence.length < 5) {
        throw new Error("Insufficient frames captured for liveness detection");
      }

      const response = await axios.post(`${API}/mobile/face/liveness`, {
        user_id: kycData.user_id,
        frame_sequence: frameSequence,
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        },
        liveness_threshold: 0.6
      });

      setMobileCaptures(prev => ({
        ...prev,
        facial_liveness: response.data
      }));

      if (response.data.success) {
        checkOptionalBiometricsComplete();
      }

    } catch (error) {
      console.error("Facial liveness capture error:", error);
      alert(`Facial liveness detection failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      setCurrentCapture(null);
      stopCamera();
    }
  };

  const capturePassportOCR = async () => {
    setLoading(true);
    setCurrentCapture('passport');
    
    try {
      await startCamera('passport');
      
      // Wait for user to position passport
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const imageData = captureImage();
      if (!imageData) {
        throw new Error("Failed to capture passport image");
      }

      stopCamera();

      const response = await axios.post(`${API}/mobile/passport/scan`, {
        user_id: kycData.user_id,
        passport_image: imageData,
        extract_mrz: true,
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      });

      setMobileCaptures(prev => ({
        ...prev,
        passport_ocr: response.data
      }));

      if (response.data.success) {
        // Extract personal information from passport
        const personalInfo = response.data.personal_information;
        const passportData = response.data.passport_data;
        
        if (personalInfo) {
          // Store extracted personal information
          setExtractedPersonalInfo(personalInfo);
          
          // Auto-fill form with extracted data
          setKycData(prev => ({
            ...prev,
            first_name: personalInfo.first_name || prev.first_name,
            last_name: personalInfo.last_name || prev.last_name,
            date_of_birth: personalInfo.date_of_birth || prev.date_of_birth,
            document_number: personalInfo.document_number || prev.document_number,
            nationality: personalInfo.nationality || prev.nationality,
            country_of_issue: personalInfo.country_of_issue || prev.country_of_issue,
            sex: personalInfo.sex || prev.sex,
            expiry_date: personalInfo.expiry_date || prev.expiry_date
          }));
          
          // Move to personal information verification step
          setActiveStep(3);
        } else {
          // Fallback to manual entry if extraction failed
          alert("Could not extract personal information. Please enter manually.");
          setActiveStep(3);
        }
      }

    } catch (error) {
      console.error("Passport OCR capture error:", error);
      alert(`Passport scan failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      setCurrentCapture(null);
      stopCamera();
    }
  };

  const verifyPersonalInformation = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/mobile/personal-info/verify`, {
        user_id: kycData.user_id,
        extracted_info: extractedPersonalInfo || {},
        user_verified_info: kycData,
        verification_notes: verificationNotes
      });

      if (response.data.success) {
        setPersonalInfoVerified(true);
        
        // Move to optional biometrics or completion based on configuration
        const hasOptionalBiometrics = biometricConfig?.optional_features?.length > 0;
        if (hasOptionalBiometrics) {
          setActiveStep(4); // Optional biometrics
        } else {
          // Check if NFC is enabled
          const nfcEnabled = biometricConfig?.config?.nfc_reading?.enabled;
          if (nfcEnabled) {
            setActiveStep(5); // NFC step
          } else {
            setActiveStep(6); // Completion
          }
        }
      }

    } catch (error) {
      console.error("Personal info verification error:", error);
      alert(`Personal information verification failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performNFCRead = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/mobile/nfc/read`, {
        user_id: kycData.user_id,
        passport_number: kycData.document_number,
        birth_date: kycData.date_of_birth.replace(/-/g, '').substring(2), // Convert to YYMMDD
        expiry_date: "301231", // Mock expiry date
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          nfc_available: 'nfc' in navigator,
          timestamp: new Date().toISOString()
        }
      });

      setMobileCaptures(prev => ({
        ...prev,
        nfc_read: response.data
      }));

      if (response.data.success) {
        setActiveStep(5); // Move to completion
        fetchMobileDashboard(); // Refresh mobile dashboard
      }

    } catch (error) {
      console.error("NFC reading error:", error);
      alert(`NFC reading failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkOptionalBiometricsComplete = () => {
    // Check if we should move to mandatory ID OCR step
    // This happens either when optional biometrics are done or user chooses to skip
    setActiveStep(3); // Always move to ID OCR (mandatory)
  };

  const skipOptionalBiometrics = () => {
    // Allow user to skip optional biometric captures and go directly to mandatory ID OCR
    setActiveStep(3);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed": return <XCircle className="w-5 h-5 text-red-500" />;
      case "processing": return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStepStatus = (step) => {
    if (step < activeStep) return "completed";
    if (step === activeStep) return "active";
    return "pending";
  };

  // Check if optional biometric step should be shown
  const shouldShowOptionalBiometrics = () => {
    return biometricConfig?.optional_features?.length > 0;
  };

  // Get step configuration based on available features
  const getStepConfig = () => {
    const hasOptionalBiometrics = shouldShowOptionalBiometrics();
    const nfcEnabled = biometricConfig?.config?.nfc_reading?.enabled;
    
    const steps = [
      { step: 1, label: "Start Process", icon: Users },
      { step: 2, label: "ID Scan (Required)", icon: FileText },
      { step: 3, label: "Verify Info", icon: CheckCircle }
    ];
    
    if (hasOptionalBiometrics) {
      steps.push({ step: 4, label: "Biometrics (Optional)", icon: Smartphone });
    }
    
    if (nfcEnabled) {
      const nfcStep = hasOptionalBiometrics ? 5 : 4;
      steps.push({ step: nfcStep, label: "NFC Verification", icon: Nfc });
    }
    
    const finalStep = steps.length + 1;
    steps.push({ step: finalStep, label: "Complete", icon: Award });
    
    return steps;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Mobile-Technologies
                </h1>
                <p className="text-sm text-gray-600">Advanced Mobile Biometric eKYC Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Mobile-First
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  <Zap className="w-3 h-3 mr-1" />
                  AI-Powered
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Shield className="w-3 h-3 mr-1" />
                  Contactless
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Globe className="w-4 h-4" />
                <span>GDPR • CCPA • Singapore Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Camera Modal */}
      {cameraActive && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {captureMode === 'fingerprint' && 'Position your finger in the camera view'}
                {captureMode === 'face' && 'Look at the camera for liveness detection'}
                {captureMode === 'passport' && 'Position passport MRZ in camera view'}
              </h3>
              <Button onClick={stopCamera} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
            
            <div className="relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full rounded-lg"
                style={{ maxHeight: '400px' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Capture guidelines */}
              <div className="absolute inset-0 pointer-events-none">
                {captureMode === 'fingerprint' && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-32 h-40 border-2 border-green-400 rounded-lg bg-green-100 bg-opacity-20 flex items-center justify-center">
                      <Fingerprint className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                )}
                
                {captureMode === 'face' && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-48 h-56 border-2 border-blue-400 rounded-full bg-blue-100 bg-opacity-20 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                )}
                
                {captureMode === 'passport' && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-80 h-24 border-2 border-orange-400 rounded-lg bg-orange-100 bg-opacity-20 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-orange-600" />
                      <span className="ml-2 text-orange-700 font-medium">MRZ Area</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {loading && (
              <div className="mt-4 text-center">
                <div className="animate-pulse text-blue-600">Processing capture...</div>
                <Progress value={75} className="mt-2" />
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="mobile-kyc" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="mobile-kyc" className="data-[state=active]:bg-white">
              Mobile eKYC
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-white">
              Configuration
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="mobile-dashboard" className="data-[state=active]:bg-white">
              Mobile Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mobile-kyc" className="space-y-8">
            {/* Enhanced Progress Indicator */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Mobile Biometric Verification Progress</span>
                </CardTitle>
                <CardDescription>
                  ID OCR verification is mandatory • Biometric captures are configurable
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  {getStepConfig().map(({ step, label, icon: Icon }) => (
                    <div key={step} className="flex flex-col items-center space-y-2">
                      <div className={`p-3 rounded-full border-2 transition-all duration-300 ${
                        getStepStatus(step) === "completed" 
                          ? "bg-green-500 border-green-500 text-white" 
                          : getStepStatus(step) === "active"
                          ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                          : "bg-gray-100 border-gray-300 text-gray-400"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-medium text-center ${
                        getStepStatus(step) === "active" ? "text-blue-600" : "text-gray-600"
                      }`}>
                        {label}
                      </span>
                      {label.includes("Required") && (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          Mandatory
                        </Badge>
                      )}
                      {label.includes("Optional") && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Optional
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                <Progress value={((activeStep - 1) / (getStepConfig().length - 1)) * 100} className="h-2" />
                
                {/* Configuration Status */}
                {biometricConfig && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Configuration Status:</span>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className="bg-red-100 text-red-800">
                          {biometricConfig.mandatory_features?.length || 0} Mandatory
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          {biometricConfig.optional_features?.length || 0} Optional
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 1: Start Process */}
            {activeStep === 1 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Welcome to Mobile eKYC</span>
                  </CardTitle>
                  <CardDescription>
                    Start your identity verification journey. We'll scan your ID first to automatically capture your personal information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <FileText className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                      <h3 className="text-xl font-semibold text-blue-800 mb-2">ID Document Scan First</h3>
                      <p className="text-blue-700 mb-4">
                        We'll start by scanning your passport or ID document to automatically extract your personal information.
                        This ensures accuracy and saves you time.
                      </p>
                      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <h4 className="font-medium mb-2">What happens next:</h4>
                        <ul className="text-sm text-left text-gray-600 space-y-1">
                          <li>• 📸 Scan your ID document with camera</li>
                          <li>• 🤖 AI extracts your personal information</li>
                          <li>• ✅ Review and verify the extracted data</li>
                          <li>• 🔐 Optional: Additional biometric security</li>
                          <li>• ✨ Complete your verification</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={initiateKYC}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-lg"
                  >
                    {loading ? "Starting..." : "Start ID Scanning Process"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Mandatory ID Document Scanning */}
            {activeStep === 2 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 border-red-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Scan className="w-5 h-5" />
                      <span>ID Document Scan - REQUIRED</span>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Mandatory Step</Badge>
                  </div>
                  <CardDescription>
                    Scan your ID document to automatically extract personal information. This step is required by regulation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mobileCaptures.passport_ocr ? (
                    <div className="space-y-4">
                      <Alert>
                        {getStatusIcon(mobileCaptures.passport_ocr.success ? "success" : "failed")}
                        <AlertDescription>
                          {mobileCaptures.passport_ocr.success 
                            ? `✅ ID Scanned Successfully! Personal information extracted with ${(mobileCaptures.passport_ocr.ocr_confidence * 100).toFixed(1)}% confidence`
                            : `❌ ID scan failed: ${mobileCaptures.passport_ocr.error}`
                          }
                        </AlertDescription>
                      </Alert>
                      
                      {mobileCaptures.passport_ocr.success && extractedPersonalInfo && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-semibold mb-2 text-green-800">✅ Personal Information Extracted:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><strong>First Name:</strong> {extractedPersonalInfo.first_name || 'Not extracted'}</div>
                            <div><strong>Last Name:</strong> {extractedPersonalInfo.last_name || 'Not extracted'}</div>
                            <div><strong>Date of Birth:</strong> {extractedPersonalInfo.date_of_birth || 'Not extracted'}</div>
                            <div><strong>Document Number:</strong> {extractedPersonalInfo.document_number || 'Not extracted'}</div>
                            <div><strong>Nationality:</strong> {extractedPersonalInfo.nationality || 'Not extracted'}</div>
                            <div><strong>Sex:</strong> {extractedPersonalInfo.sex || 'Not extracted'}</div>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center space-x-2">
                              <Label className="text-xs">Extraction Confidence:</Label>
                              <Progress value={(extractedPersonalInfo.extraction_confidence || 0) * 100} className="h-2 flex-1" />
                              <span className="text-xs font-medium">
                                {((extractedPersonalInfo.extraction_confidence || 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {mobileCaptures.passport_ocr.success ? (
                        <Button
                          onClick={() => setActiveStep(3)}
                          className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white"
                        >
                          Continue to Verify Personal Information
                        </Button>
                      ) : (
                        <Button
                          onClick={capturePassportOCR}
                          disabled={loading || currentCapture === 'passport'}
                          className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white"
                        >
                          {currentCapture === 'passport' ? "Scanning..." : "Retry ID Document Scan"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <Alert>
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          <strong>REQUIRED STEP:</strong> ID document scanning is mandatory and will automatically extract your personal information.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="p-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
                        <Scan className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-red-800 mb-2">Required: Position ID document in camera view</h3>
                        <p className="text-red-600 mb-4">We'll automatically extract your personal information from the document</p>
                        <Button
                          onClick={capturePassportOCR}
                          disabled={loading || currentCapture === 'passport'}
                          className="bg-gradient-to-r from-red-600 to-orange-600 text-white"
                        >
                          {currentCapture === 'passport' ? "Scanning..." : "📸 Scan ID Document"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Personal Information Verification */}
            {activeStep === 3 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Verify Personal Information</span>
                  </CardTitle>
                  <CardDescription>
                    Review and confirm the information extracted from your ID document. Make any necessary corrections.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {extractedPersonalInfo && (
                    <Alert>
                      <Target className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Auto-extracted from ID:</strong> Please review the information below and make corrections if needed.
                        Extraction confidence: {((extractedPersonalInfo.extraction_confidence || 0) * 100).toFixed(1)}%
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={kycData.first_name}
                        onChange={(e) => handleInputChange("first_name", e.target.value)}
                        placeholder="Enter your first name"
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={kycData.last_name}
                        onChange={(e) => handleInputChange("last_name", e.target.value)}
                        placeholder="Enter your last name"
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth *</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={kycData.date_of_birth}
                        onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sex">Sex</Label>
                      <Input
                        id="sex"
                        value={kycData.sex}
                        onChange={(e) => handleInputChange("sex", e.target.value)}
                        placeholder="e.g. Male, Female"
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={kycData.nationality}
                        onChange={(e) => handleInputChange("nationality", e.target.value)}
                        placeholder="e.g., Singapore, USA, UK"
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country_of_issue">Country of Issue</Label>
                      <Input
                        id="country_of_issue"
                        value={kycData.country_of_issue}
                        onChange={(e) => handleInputChange("country_of_issue", e.target.value)}
                        placeholder="Document issuing country"
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="document_number">Document Number</Label>
                      <Input
                        id="document_number"
                        value={kycData.document_number}
                        onChange={(e) => handleInputChange("document_number", e.target.value)}
                        placeholder="Passport/ID number"
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry_date">Expiry Date</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={kycData.expiry_date}
                        onChange={(e) => handleInputChange("expiry_date", e.target.value)}
                        className="bg-white/80"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="verification_notes">Verification Notes (Optional)</Label>
                    <Input
                      id="verification_notes"
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="Any corrections or notes about the extracted information"
                      className="bg-white/80"
                    />
                  </div>
                  
                  <Button 
                    onClick={verifyPersonalInformation}
                    disabled={loading || !kycData.first_name || !kycData.last_name || !kycData.date_of_birth}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {loading ? "Verifying..." : "✅ Confirm Personal Information"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Optional Mobile Biometric Capture */}
            {activeStep === 4 && shouldShowOptionalBiometrics() && (
              <div className="space-y-6">
                {/* Optional Notice */}
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Optional Biometric Captures:</strong> You can perform these additional security checks or skip to mandatory ID verification.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contactless Fingerprint */}
                  {biometricConfig?.config?.contactless_fingerprint?.enabled && (
                    <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 w-fit">
                            <Fingerprint className="w-6 h-6 text-white" />
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Optional</Badge>
                        </div>
                        <CardTitle className="text-lg">Contactless Fingerprint</CardTitle>
                        <CardDescription>Smartphone camera-based fingerprint capture</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {mobileCaptures.fingerprint ? (
                          <div className="space-y-3">
                            <Alert>
                              {getStatusIcon(mobileCaptures.fingerprint.success ? "success" : "failed")}
                              <AlertDescription>
                                {mobileCaptures.fingerprint.success 
                                  ? `Quality: ${(mobileCaptures.fingerprint.quality_score * 100).toFixed(1)}% | Features: ${mobileCaptures.fingerprint.features_extracted}`
                                  : mobileCaptures.fingerprint.error
                                }
                              </AlertDescription>
                            </Alert>
                            {mobileCaptures.fingerprint.success && (
                              <Badge className="bg-green-100 text-green-800">
                                Contactless Capture Successful
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Button
                            onClick={captureMobileFingerprint}
                            disabled={loading || currentCapture === 'fingerprint'}
                            className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                          >
                            {currentCapture === 'fingerprint' ? "Capturing..." : "Capture Fingerprint"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Facial Liveness Detection */}
                  {biometricConfig?.config?.facial_liveness?.enabled && (
                    <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 w-fit">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Optional</Badge>
                        </div>
                        <CardTitle className="text-lg">Facial Liveness</CardTitle>
                        <CardDescription>Advanced anti-spoofing liveness detection</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {mobileCaptures.facial_liveness ? (
                          <div className="space-y-3">
                            <Alert>
                              {getStatusIcon(mobileCaptures.facial_liveness.success ? "success" : "failed")}
                              <AlertDescription>
                                {mobileCaptures.facial_liveness.success 
                                  ? `Liveness: ${mobileCaptures.facial_liveness.is_live ? 'LIVE' : 'NOT LIVE'} | Score: ${(mobileCaptures.facial_liveness.liveness_score * 100).toFixed(1)}%`
                                  : mobileCaptures.facial_liveness.error
                                }
                              </AlertDescription>
                            </Alert>
                            {mobileCaptures.facial_liveness.success && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <Badge variant="outline">
                                  Blinks: {mobileCaptures.facial_liveness.indicators?.blinks_detected || 0}
                                </Badge>
                                <Badge variant="outline">
                                  Movement: {mobileCaptures.facial_liveness.indicators?.movement_detected ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button
                            onClick={captureFacialLiveness}
                            disabled={loading || currentCapture === 'face'}
                            className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                          >
                            {currentCapture === 'face' ? "Detecting..." : "Start Liveness Check"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={skipOptionalBiometrics}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <span>Skip Optional Biometrics</span>
                    <Badge className="bg-red-100 text-red-800 ml-2">Go to Required ID Scan</Badge>
                  </Button>
                  
                  {Object.keys(mobileCaptures).length > 0 && (
                    <Button
                      onClick={checkOptionalBiometricsComplete}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    >
                      Continue to ID Verification
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Mandatory Document Scanning */}
            {activeStep === 3 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 border-red-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Scan className="w-5 h-5" />
                      <span>ICAO Passport OCR - MANDATORY</span>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Required Step</Badge>
                  </div>
                  <CardDescription>
                    ID document verification is mandatory for compliance and cannot be skipped
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mobileCaptures.passport_ocr ? (
                    <div className="space-y-4">
                      <Alert>
                        {getStatusIcon(mobileCaptures.passport_ocr.success ? "success" : "failed")}
                        <AlertDescription>
                          {mobileCaptures.passport_ocr.success 
                            ? `OCR Confidence: ${(mobileCaptures.passport_ocr.ocr_confidence * 100).toFixed(1)}% - MANDATORY REQUIREMENT MET`
                            : `ID verification failed: ${mobileCaptures.passport_ocr.error}`
                          }
                        </AlertDescription>
                      </Alert>
                      
                      {mobileCaptures.passport_ocr.success && mobileCaptures.passport_ocr.passport_data && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-semibold mb-2 text-green-800">✅ ID Verification Complete - Required Data Extracted:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><strong>Name:</strong> {mobileCaptures.passport_ocr.passport_data.surname}, {mobileCaptures.passport_ocr.passport_data.given_names}</div>
                            <div><strong>Document:</strong> {mobileCaptures.passport_ocr.passport_data.passport_number}</div>
                            <div><strong>Nationality:</strong> {mobileCaptures.passport_ocr.passport_data.nationality}</div>
                            <div><strong>Birth Date:</strong> {mobileCaptures.passport_ocr.passport_data.birth_date}</div>
                          </div>
                        </div>
                      )}
                      
                      {mobileCaptures.passport_ocr.success ? (
                        <Button
                          onClick={async () => {
                            const validation = await validateWorkflow();
                            if (validation && validation.can_proceed) {
                              // Check if NFC is enabled
                              const nfcEnabled = biometricConfig?.config?.nfc_reading?.enabled;
                              if (nfcEnabled && !mobileCaptures.nfc_read) {
                                setActiveStep(4); // NFC step
                              } else {
                                setActiveStep(5); // Completion
                              }
                            }
                          }}
                          className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white"
                        >
                          Mandatory Verification Complete - Continue
                        </Button>
                      ) : (
                        <Button
                          onClick={capturePassportOCR}
                          disabled={loading || currentCapture === 'passport'}
                          className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white"
                        >
                          {currentCapture === 'passport' ? "Scanning..." : "Retry Mandatory ID Scan"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <Alert>
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          <strong>MANDATORY STEP:</strong> ID document verification is required by regulation and cannot be skipped.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="p-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
                        <Scan className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-red-800 mb-2">Required: Position passport MRZ area in camera view</h3>
                        <p className="text-red-600 mb-4">This step is mandatory for compliance verification</p>
                        <Button
                          onClick={capturePassportOCR}
                          disabled={loading || currentCapture === 'passport'}
                          className="bg-gradient-to-r from-red-600 to-orange-600 text-white"
                        >
                          {currentCapture === 'passport' ? "Scanning..." : "Scan Required ID Document"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: NFC Verification */}
            {activeStep === 4 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Nfc className="w-5 h-5" />
                    <span>NFC Chip Verification</span>
                  </CardTitle>
                  <CardDescription>
                    ICAO 9303 compliant NFC chip reading and validation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mobileCaptures.nfc_read ? (
                    <div className="space-y-4">
                      <Alert>
                        {getStatusIcon(mobileCaptures.nfc_read.success ? "success" : "failed")}
                        <AlertDescription>
                          {mobileCaptures.nfc_read.success 
                            ? `NFC Reading Complete | Security Level: ${mobileCaptures.nfc_read.security_level}`
                            : mobileCaptures.nfc_read.error
                          }
                        </AlertDescription>
                      </Alert>
                      
                      {mobileCaptures.nfc_read.success && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-green-800">NFC Authentication:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <Badge className="bg-green-100 text-green-800">
                              <Shield className="w-3 h-3 mr-1" />
                              Chip Authentic
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              <Target className="w-3 h-3 mr-1" />
                              BAC Verified
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => setActiveStep(5)}
                        className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white"
                      >
                        Complete Verification
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="p-8 border-2 border-dashed border-blue-300 rounded-lg">
                        <Nfc className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-pulse" />
                        <p className="text-gray-600 mb-4">Simulating NFC chip reading...</p>
                        <Button
                          onClick={performNFCRead}
                          disabled={loading}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        >
                          {loading ? "Reading NFC..." : "Start NFC Reading"}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          *Demonstration mode - Real NFC reading requires compatible hardware
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 5: Completion */}
            {activeStep === 5 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-green-600" />
                    <span>Mobile eKYC Complete</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                    <Award className="w-16 h-16 mx-auto text-green-600 mb-4" />
                    <h3 className="text-2xl font-bold text-green-800 mb-2">Verification Successful!</h3>
                    <p className="text-green-700">All mandatory requirements completed • Optional biometrics captured</p>
                  </div>

                  {/* Workflow Completion Summary */}
                  {workflowValidation && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold mb-3 text-blue-800">📋 Completion Summary:</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Mandatory Steps:</strong>
                          <div className="flex items-center space-x-2 mt-1">
                            <Progress value={(workflowValidation.mandatory_completed / workflowValidation.mandatory_total) * 100} className="flex-1 h-2" />
                            <span className="text-xs font-medium">
                              {workflowValidation.mandatory_completed}/{workflowValidation.mandatory_total}
                            </span>
                          </div>
                        </div>
                        <div>
                          <strong>Optional Steps:</strong>
                          <div className="flex items-center space-x-2 mt-1">
                            <Progress value={workflowValidation.optional_available > 0 ? (workflowValidation.optional_completed / workflowValidation.optional_available) * 100 : 100} className="flex-1 h-2" />
                            <span className="text-xs font-medium">
                              {workflowValidation.optional_completed}/{workflowValidation.optional_available}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Capture Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(mobileCaptures).map(([type, data]) => (
                      <div key={type} className="text-center p-3 bg-white rounded-lg border">
                        <div className="mb-2">
                          {type === 'fingerprint' && <Fingerprint className="w-6 h-6 mx-auto text-purple-600" />}
                          {type === 'facial_liveness' && <Eye className="w-6 h-6 mx-auto text-green-600" />}
                          {type === 'passport_ocr' && <Scan className="w-6 h-6 mx-auto text-orange-600" />}
                          {type === 'nfc_read' && <Nfc className="w-6 h-6 mx-auto text-blue-600" />}
                        </div>
                        <div className="text-xs font-medium text-gray-700 capitalize">
                          {type.replace('_', ' ')}
                        </div>
                        <div className="flex items-center justify-center space-x-1 mt-1">
                          <Badge className={`${data.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {data.success ? 'Success' : 'Failed'}
                          </Badge>
                          {type === 'passport_ocr' && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Configuration Summary */}
                  {biometricConfig && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-gray-800">⚙️ Platform Configuration:</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Mandatory Features:</strong>
                          <ul className="mt-1 space-y-1">
                            {biometricConfig.mandatory_features?.map(feature => (
                              <li key={feature} className="flex items-center space-x-2">
                                <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                                <span className="capitalize">{feature.replace('_', ' ')}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong>Optional Features:</strong>
                          <ul className="mt-1 space-y-1">
                            {biometricConfig.optional_features?.map(feature => (
                              <li key={feature} className="flex items-center space-x-2">
                                <Badge className="bg-blue-100 text-blue-800 text-xs">Optional</Badge>
                                <span className="capitalize">{feature.replace('_', ' ')}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setActiveStep(1);
                      setKycData({
                        first_name: "",
                        last_name: "",
                        date_of_birth: "",
                        document_number: "",
                        nationality: "",
                        country_of_issue: "",
                        sex: "",
                        expiry_date: "",
                        user_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                      });
                      setMobileCaptures({});
                      setWorkflowValidation(null);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  >
                    Start New Verification
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Biometric Feature Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure which biometric features are mandatory or optional
                </CardDescription>
              </CardHeader>
              <CardContent>
                {biometricConfig ? (
                  <div className="space-y-6">
                    {/* Current Configuration Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 text-red-800 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Mandatory Features
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(biometricConfig.config || {})
                            .filter(([_, config]) => config.mandatory)
                            .map(([feature, config]) => (
                            <div key={feature} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                              <div>
                                <div className="font-medium capitalize">{feature.replace('_', ' ')}</div>
                                <div className="text-sm text-gray-600">{config.description}</div>
                              </div>
                              <Badge className="bg-red-100 text-red-800">
                                Required
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 text-blue-800 flex items-center">
                          <Activity className="w-4 h-4 mr-2" />
                          Optional Features
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(biometricConfig.config || {})
                            .filter(([_, config]) => config.enabled && !config.mandatory)
                            .map(([feature, config]) => (
                            <div key={feature} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div>
                                <div className="font-medium capitalize">{feature.replace('_', ' ')}</div>
                                <div className="text-sm text-gray-600">{config.description}</div>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">
                                Optional
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Configuration Rules */}
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold mb-2 text-yellow-800 flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Configuration Rules
                      </h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• <strong>ID OCR (Passport/Document)</strong> is always mandatory for regulatory compliance</li>
                        <li>• <strong>Contactless Fingerprint</strong> and <strong>Facial Liveness</strong> can be configured as optional</li>
                        <li>• At least one biometric verification method must be enabled</li>
                        <li>• Changes require system administrator privileges</li>
                      </ul>
                    </div>

                    {/* Configuration Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {biometricConfig.mandatory_features?.length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Mandatory</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {biometricConfig.optional_features?.length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Optional</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {Object.values(biometricConfig.config || {}).filter(c => c.enabled).length}
                          </div>
                          <div className="text-sm text-gray-600">Total Enabled</div>
                        </div>
                      </Card>
                    </div>

                    {/* Refresh Configuration */}
                    <div className="flex justify-center">
                      <Button
                        onClick={fetchBiometricConfig}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      >
                        {loading ? "Refreshing..." : "Refresh Configuration"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Loading biometric configuration...</p>
                    <Button onClick={fetchBiometricConfig} disabled={loading}>
                      Load Configuration
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Dashboard */}
          <TabsContent value="dashboard">
            {dashboard && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboard.statistics.total_requests}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{dashboard.statistics.approved}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{dashboard.statistics.pending}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {dashboard.statistics.approval_rate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Mobile Dashboard */}
          <TabsContent value="mobile-dashboard">
            {mobileDashboard && (
              <div className="space-y-6">
                {/* Mobile Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                        <Activity className="w-4 h-4 mr-2" />
                        Total Captures
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{mobileDashboard.statistics.total_captures}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                        <Fingerprint className="w-4 h-4 mr-2" />
                        Fingerprints
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{mobileDashboard.statistics.fingerprint_captures}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                        <Eye className="w-4 h-4 mr-2" />
                        Liveness
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{mobileDashboard.statistics.liveness_checks}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                        <Scan className="w-4 h-4 mr-2" />
                        OCR Scans
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{mobileDashboard.statistics.passport_scans}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                        <Nfc className="w-4 h-4 mr-2" />
                        NFC Reads
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{mobileDashboard.statistics.nfc_reads}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Success Rates */}
                <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle>Mobile Capture Success Rates</CardTitle>
                    <CardDescription>Quality scores and success rates by capture type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(mobileDashboard.success_rates).map(([type, rate]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {type === 'mobile_fingerprint' && <Fingerprint className="w-5 h-5 text-purple-600" />}
                            {type === 'mobile_facial_liveness' && <Eye className="w-5 h-5 text-green-600" />}
                            {type === 'mobile_passport_ocr' && <Scan className="w-5 h-5 text-orange-600" />}
                            {type === 'mobile_nfc_read' && <Nfc className="w-5 h-5 text-blue-600" />}
                            <span className="font-medium capitalize">{type.replace('mobile_', '').replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Progress value={rate} className="w-24" />
                            <span className="text-sm font-semibold">{rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">Average Quality Score</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {(mobileDashboard.statistics.average_quality * 100).toFixed(1)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mobile Capabilities */}
                <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle>Platform Capabilities</CardTitle>
                    <CardDescription>Advanced mobile biometric features</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(mobileDashboard.mobile_capabilities).map(([capability, enabled]) => (
                        <div key={capability} className={`p-4 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center space-x-2 mb-2">
                            {capability === 'contactless_fingerprint' && <Fingerprint className="w-5 h-5" />}
                            {capability === 'facial_liveness' && <Eye className="w-5 h-5" />}
                            {capability === 'passport_ocr' && <Scan className="w-5 h-5" />}
                            {capability === 'nfc_reading' && <Nfc className="w-5 h-5" />}
                            {capability === 'ai_analysis' && <Zap className="w-5 h-5" />}
                            <Badge className={enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {enabled ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium capitalize">
                            {capability.replace('_', ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;