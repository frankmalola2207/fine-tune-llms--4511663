import React, { useState, useEffect } from "react";
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
  Globe
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
    user_id: ""
  });
  const [biometricStatus, setBiometricStatus] = useState({});
  const [documentStatus, setDocumentStatus] = useState({});
  const [riskAssessment, setRiskAssessment] = useState({});
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    // Generate unique user ID on mount
    setKycData(prev => ({
      ...prev,
      user_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/kyc/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setKycData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const initiateKYC = async () => {
    if (!kycData.first_name || !kycData.last_name || !kycData.date_of_birth) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/kyc/initiate`, kycData);
      setActiveStep(2);
    } catch (error) {
      console.error("KYC initiation error:", error);
      alert("Failed to initiate KYC process");
    } finally {
      setLoading(false);
    }
  };

  const simulateBiometricCapture = async (captureType) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/biometric/capture`, {
        user_id: kycData.user_id,
        capture_type: captureType,
        simulated_quality: Math.random() * 0.3 + 0.7 // Simulate 0.7-1.0 quality
      });

      setBiometricStatus(prev => ({
        ...prev,
        [captureType]: response.data
      }));

      // Check if all biometric types are captured
      const allCaptured = ["fingerprint", "facial", "document_scan"].every(
        type => biometricStatus[type] || captureType === type
      );

      if (allCaptured) {
        setActiveStep(3);
      }
    } catch (error) {
      console.error("Biometric capture error:", error);
      alert(`Failed to capture ${captureType}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateDocumentVerification = async () => {
    setLoading(true);
    try {
      const documentData = {
        document_number: kycData.document_number,
        first_name: kycData.first_name,
        last_name: kycData.last_name,
        date_of_birth: kycData.date_of_birth,
        nationality: kycData.nationality,
        issue_date: "2020-01-15",
        expiry_date: "2030-01-15",
        issuing_authority: `${kycData.nationality} Government`
      };

      const response = await axios.post(`${API}/document/verify`, {
        user_id: kycData.user_id,
        document_type: "passport",
        document_data: documentData
      });

      setDocumentStatus(response.data);
      setActiveStep(4);
    } catch (error) {
      console.error("Document verification error:", error);
      alert("Failed to verify document");
    } finally {
      setLoading(false);
    }
  };

  const performRiskAssessment = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/risk/assess`, {
        user_id: kycData.user_id,
        additional_context: {
          application_source: "web_portal",
          device_info: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

      setRiskAssessment(response.data);
      setActiveStep(5);
      fetchDashboard(); // Refresh dashboard
    } catch (error) {
      console.error("Risk assessment error:", error);
      alert("Failed to perform risk assessment");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected": return <XCircle className="w-5 h-5 text-red-500" />;
      case "review_required": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStepStatus = (step) => {
    if (step < activeStep) return "completed";
    if (step === activeStep) return "active";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  BioVerify Hub
                </h1>
                <p className="text-sm text-gray-600">Agentic AI eKYC Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Globe className="w-4 h-4" />
                <span>GDPR • CCPA • Singapore Compliant</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Lock className="w-3 h-3 mr-1" />
                Secure
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="kyc" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="kyc" className="data-[state=active]:bg-white">
              KYC Verification
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white">
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="space-y-8">
            {/* Progress Indicator */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Verification Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  {[
                    { step: 1, label: "Personal Info", icon: Users },
                    { step: 2, label: "Biometrics", icon: Scan },
                    { step: 3, label: "Document", icon: FileText },
                    { step: 4, label: "Risk Assessment", icon: Shield },
                    { step: 5, label: "Complete", icon: CheckCircle }
                  ].map(({ step, label, icon: Icon }) => (
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
                      <span className={`text-sm font-medium ${
                        getStepStatus(step) === "active" ? "text-blue-600" : "text-gray-600"
                      }`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <Progress value={(activeStep - 1) * 25} className="h-2" />
              </CardContent>
            </Card>

            {/* Step 1: Personal Information */}
            {activeStep === 1 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                  <CardDescription>
                    Enter your personal details to begin the KYC verification process
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={kycData.nationality}
                        onChange={(e) => handleInputChange("nationality", e.target.value)}
                        placeholder="e.g., Singapore, USA, UK"
                        className="bg-white/80"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="document_number">Document Number</Label>
                      <Input
                        id="document_number"
                        value={kycData.document_number}
                        onChange={(e) => handleInputChange("document_number", e.target.value)}
                        placeholder="Passport/ID number"
                        className="bg-white/80"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={initiateKYC}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {loading ? "Initiating..." : "Start KYC Process"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Biometric Capture */}
            {activeStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    type: "fingerprint",
                    title: "Fingerprint Capture",
                    description: "Contactless fingerprint verification",
                    icon: Fingerprint,
                    color: "from-purple-500 to-pink-500"
                  },
                  {
                    type: "facial",
                    title: "Facial Recognition",
                    description: "Liveness detection and facial matching",
                    icon: Camera,
                    color: "from-green-500 to-teal-500"
                  },
                  {
                    type: "document_scan",
                    title: "Document Scan",
                    description: "OCR and security feature analysis",
                    icon: Scan,
                    color: "from-orange-500 to-red-500"
                  }
                ].map(({ type, title, description, icon: Icon, color }) => (
                  <Card key={type} className="bg-white/70 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${color} w-fit`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {biometricStatus[type] ? (
                        <div className="space-y-3">
                          <Alert>
                            <CheckCircle className="w-4 h-4" />
                            <AlertDescription>
                              Capture successful! Quality: {
                                (biometricStatus[type].analysis?.quality_score || 0.85 * 100).toFixed(1)
                              }%
                            </AlertDescription>
                          </Alert>
                          <Badge className="bg-green-100 text-green-800">
                            {biometricStatus[type].analysis?.recommendation || "Accepted"}
                          </Badge>
                        </div>
                      ) : (
                        <Button
                          onClick={() => simulateBiometricCapture(type)}
                          disabled={loading}
                          className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                        >
                          {loading ? "Capturing..." : `Capture ${title.split(' ')[0]}`}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Step 3: Document Verification */}
            {activeStep === 3 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Document Verification</span>
                  </CardTitle>
                  <CardDescription>
                    AI-powered analysis of your identity document
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documentStatus.verification_result ? (
                    <div className="space-y-4">
                      <Alert>
                        <CheckCircle className="w-4 h-4" />
                        <AlertDescription>
                          Document verified successfully! Confidence: {
                            (documentStatus.verification_result.confidence_score * 100).toFixed(1)
                          }%
                        </AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Recommendation:</span>
                          <Badge className="ml-2 bg-green-100 text-green-800">
                            {documentStatus.verification_result.recommendation}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Document ID:</span>
                          <span className="ml-2 text-gray-600">{documentStatus.document_id}</span>
                        </div>
                      </div>
                      <Button
                        onClick={performRiskAssessment}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      >
                        Proceed to Risk Assessment
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-4">Ready to verify your document</p>
                        <Button
                          onClick={simulateDocumentVerification}
                          disabled={loading}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        >
                          {loading ? "Verifying..." : "Verify Document"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Risk Assessment */}
            {activeStep === 4 && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>AI Risk Assessment</span>
                  </CardTitle>
                  <CardDescription>
                    Comprehensive analysis for final KYC decision
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="p-8">
                      <Eye className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-pulse" />
                      <p className="text-gray-600 mb-4">Analyzing all verification data...</p>
                      <Button
                        onClick={performRiskAssessment}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      >
                        {loading ? "Assessing Risk..." : "Perform Risk Assessment"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Results */}
            {activeStep === 5 && riskAssessment.risk_assessment && (
              <Card className="bg-white/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getStatusIcon(riskAssessment.kyc_decision)}
                    <span>KYC Verification Complete</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={`p-6 rounded-lg border-2 ${
                    riskAssessment.kyc_decision === "approved" 
                      ? "bg-green-50 border-green-200" 
                      : riskAssessment.kyc_decision === "rejected"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-2 capitalize">
                        {riskAssessment.kyc_decision.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        Risk Score: {(riskAssessment.risk_assessment.risk_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Confidence Level</Label>
                      <Progress 
                        value={(riskAssessment.risk_assessment.confidence || 0.8) * 100} 
                        className="h-3" 
                      />
                      <div className="text-sm text-gray-600">
                        {((riskAssessment.risk_assessment.confidence || 0.8) * 100).toFixed(1)}% confident
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Compliance Status</Label>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">
                          {riskAssessment.risk_assessment.compliance_status || "Compliant"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setActiveStep(1);
                      setKycData({
                        first_name: "",
                        last_name: "",
                        date_of_birth: "",
                        document_number: "",
                        nationality: "",
                        user_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                      });
                      setBiometricStatus({});
                      setDocumentStatus({});
                      setRiskAssessment({});
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  >
                    Start New Verification
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

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
                    <CardTitle className="text-sm font-medium text-gray-600">Approval Rate</CardTitle>
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
        </Tabs>
      </main>
    </div>
  );
}

export default App;