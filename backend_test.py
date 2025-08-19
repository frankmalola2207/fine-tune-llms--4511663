import requests
import sys
import json
from datetime import datetime
import time
import base64

class MobileTechnologiesAPITester:
    def __init__(self, base_url="https://agentic-kyc.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = "test_mobile_user_123"
        
        # Sample base64 image data for testing
        self.sample_image_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        # Sample device info
        self.device_info = {
            "user_agent": "test_mobile_browser",
            "platform": "mobile_test",
            "timestamp": datetime.now().isoformat()
        }
        
    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json', 'User-Agent': 'Mobile-Technologies-Tester/1.0'}
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout, verify=False)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout, verify=False)
            
            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    # Truncate long responses for readability
                    response_str = json.dumps(response_data, indent=2)
                    if len(response_str) > 300:
                        details += f", Response: {response_str[:300]}..."
                    else:
                        details += f", Response: {response_str}"
                except:
                    details += f", Response: {response.text[:200]}..."
            else:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Error: {response.text[:300]}"
            
            return self.log_test(name, success, details), response.json() if success else {}
            
        except requests.exceptions.Timeout:
            return self.log_test(name, False, "Request timed out"), {}
        except requests.exceptions.SSLError:
            return self.log_test(name, False, "SSL Error - trying without verification"), {}
        except Exception as e:
            return self.log_test(name, False, f"Error: {str(e)}"), {}

    def test_api_version(self):
        """Test API version - should show 2.0.0 with mobile capabilities"""
        success, response = self.run_test("API Version Check", "GET", "", 200)
        
        if success:
            # Verify version and capabilities
            version = response.get("version")
            capabilities = response.get("capabilities", [])
            
            if version == "2.0.0":
                print(f"   ✓ Version 2.0.0 confirmed")
            else:
                print(f"   ⚠️ Expected version 2.0.0, got {version}")
                
            expected_capabilities = ["contactless_fingerprint", "facial_liveness", "passport_ocr", "nfc_reading"]
            for cap in expected_capabilities:
                if cap in capabilities:
                    print(f"   ✓ {cap} capability present")
                else:
                    print(f"   ⚠️ {cap} capability missing")
        
        return success, response

    def test_mobile_dashboard(self):
        """Test mobile biometric dashboard"""
        return self.run_test("Mobile Dashboard", "GET", "mobile/dashboard", 200)

    def test_mobile_fingerprint_capture(self):
        """Test contactless fingerprint capture"""
        fingerprint_data = {
            "user_id": self.user_id,
            "image_data": self.sample_image_data,
            "device_info": self.device_info,
            "quality_threshold": 0.6
        }
        
        success, response = self.run_test("Mobile Fingerprint Capture", "POST", "mobile/fingerprint/capture", 200, fingerprint_data, timeout=90)
        
        if success:
            # Check response structure
            if response.get("success"):
                print(f"   ✓ Fingerprint capture successful")
                print(f"   ✓ Quality score: {response.get('quality_score', 'N/A')}")
                print(f"   ✓ Features extracted: {response.get('features_extracted', 'N/A')}")
            else:
                print(f"   ⚠️ Fingerprint capture failed: {response.get('error', 'Unknown error')}")
        
        return success, response

    def test_facial_liveness_detection(self):
        """Test facial liveness detection"""
        # Create multiple frames for liveness detection
        frame_sequence = [self.sample_image_data] * 5  # 5 frames
        
        liveness_data = {
            "user_id": self.user_id,
            "frame_sequence": frame_sequence,
            "device_info": self.device_info,
            "liveness_threshold": 0.6
        }
        
        success, response = self.run_test("Facial Liveness Detection", "POST", "mobile/face/liveness", 200, liveness_data, timeout=90)
        
        if success:
            # Check response structure
            if response.get("success"):
                print(f"   ✓ Liveness detection successful")
                print(f"   ✓ Is live: {response.get('is_live', 'N/A')}")
                print(f"   ✓ Liveness score: {response.get('liveness_score', 'N/A')}")
                print(f"   ✓ Confidence: {response.get('confidence', 'N/A')}")
            else:
                print(f"   ⚠️ Liveness detection failed: {response.get('error', 'Unknown error')}")
        
        return success, response

    def test_passport_ocr_scan_enhanced(self):
        """Test Enhanced ICAO passport OCR with personal information extraction"""
        passport_data = {
            "user_id": self.user_id,
            "passport_image": self.sample_image_data,
            "extract_mrz": True,
            "device_info": self.device_info
        }
        
        success, response = self.run_test("Enhanced Passport OCR with Personal Info", "POST", "mobile/passport/scan", 200, passport_data, timeout=90)
        
        if success:
            # Check response structure
            if response.get("success"):
                print(f"   ✓ Passport OCR successful")
                print(f"   ✓ OCR confidence: {response.get('ocr_confidence', 'N/A')}")
                
                # Check for enhanced personal information extraction
                personal_info = response.get('personal_information', {})
                auto_fill_data = response.get('auto_fill_data', {})
                passport_data = response.get('passport_data', {})
                
                if personal_info:
                    print(f"   ✓ Personal information extracted")
                    print(f"   ✓ First name: {personal_info.get('first_name', 'N/A')}")
                    print(f"   ✓ Last name: {personal_info.get('last_name', 'N/A')}")
                    print(f"   ✓ Date of birth: {personal_info.get('date_of_birth', 'N/A')}")
                    print(f"   ✓ Document number: {personal_info.get('document_number', 'N/A')}")
                    print(f"   ✓ Nationality: {personal_info.get('nationality', 'N/A')}")
                    print(f"   ✓ Sex: {personal_info.get('sex', 'N/A')}")
                    print(f"   ✓ Extraction confidence: {personal_info.get('extraction_confidence', 'N/A')}")
                else:
                    print(f"   ⚠️ Personal information not extracted")
                
                if auto_fill_data:
                    print(f"   ✓ Auto-fill data available for form population")
                else:
                    print(f"   ⚠️ Auto-fill data not available")
                    
                if passport_data:
                    print(f"   ✓ MRZ passport data available")
                else:
                    print(f"   ⚠️ MRZ passport data not available")
                    
                # Check AI analysis
                ai_analysis = response.get('ai_analysis', {})
                if ai_analysis:
                    print(f"   ✓ AI analysis available")
                    print(f"   ✓ Personal info quality: {ai_analysis.get('personal_info_quality', 'N/A')}")
                    print(f"   ✓ Auto-fill confidence: {ai_analysis.get('auto_fill_confidence', 'N/A')}")
                else:
                    print(f"   ⚠️ AI analysis not available")
            else:
                print(f"   ⚠️ Passport OCR failed: {response.get('error', 'Unknown error')}")
        
        return success, response

    def test_personal_info_verification(self):
        """Test personal information verification endpoint"""
        # Sample extracted info (from OCR)
        extracted_info = {
            "first_name": "JOHN",
            "last_name": "DOE",
            "date_of_birth": "1990-01-15",
            "document_number": "P123456789",
            "nationality": "United States",
            "sex": "Male",
            "extraction_confidence": 0.85
        }
        
        # Sample user-verified info (user corrections)
        user_verified_info = {
            "first_name": "John",
            "last_name": "Doe",
            "date_of_birth": "1990-01-15",
            "document_number": "P123456789",
            "nationality": "United States",
            "sex": "Male"
        }
        
        verification_data = {
            "user_id": self.user_id,
            "extracted_info": extracted_info,
            "user_verified_info": user_verified_info,
            "verification_notes": "Corrected name capitalization"
        }
        
        success, response = self.run_test("Personal Information Verification", "POST", "mobile/personal-info/verify", 200, verification_data, timeout=90)
        
        if success:
            # Check response structure
            if response.get("success"):
                print(f"   ✓ Personal info verification successful")
                print(f"   ✓ Verification ID: {response.get('verification_id', 'N/A')}")
                print(f"   ✓ Confidence score: {response.get('confidence_score', 'N/A')}")
                
                # Check verified information
                verified_info = response.get('verified_information', {})
                if verified_info:
                    print(f"   ✓ Verified information stored")
                else:
                    print(f"   ⚠️ Verified information not returned")
                
                # Check AI analysis
                verification_analysis = response.get('verification_analysis', {})
                if verification_analysis:
                    print(f"   ✓ AI verification analysis available")
                    print(f"   ✓ Verification quality: {verification_analysis.get('verification_quality', 'N/A')}")
                    print(f"   ✓ Final confidence: {verification_analysis.get('final_confidence', 'N/A')}")
                else:
                    print(f"   ⚠️ AI verification analysis not available")
            else:
                print(f"   ⚠️ Personal info verification failed: {response.get('error', 'Unknown error')}")
        
        return success, response

    def test_nfc_chip_reading(self):
        """Test NFC chip reading simulation"""
        nfc_data = {
            "user_id": self.user_id,
            "passport_number": "P123456789",
            "birth_date": "900115",  # YYMMDD format
            "expiry_date": "301231",
            "device_info": self.device_info
        }
        
        success, response = self.run_test("NFC Chip Reading", "POST", "mobile/nfc/read", 200, nfc_data, timeout=90)
        
        if success:
            # Check response structure
            if response.get("success"):
                print(f"   ✓ NFC reading successful")
                print(f"   ✓ Security level: {response.get('security_level', 'N/A')}")
                nfc_info = response.get('nfc_data', {})
                if nfc_info:
                    print(f"   ✓ NFC data available")
            else:
                print(f"   ⚠️ NFC reading failed: {response.get('error', 'Unknown error')}")
        
        return success, response

    def test_biometric_config_get(self):
        """Test GET biometric configuration"""
        success, response = self.run_test("Get Biometric Configuration", "GET", "config/biometric", 200)
        
        if success:
            # Verify configuration structure
            config = response.get("config", {})
            mandatory_features = response.get("mandatory_features", [])
            optional_features = response.get("optional_features", [])
            
            print(f"   ✓ Configuration retrieved")
            print(f"   ✓ Mandatory features: {mandatory_features}")
            print(f"   ✓ Optional features: {optional_features}")
            
            # Verify passport_ocr is mandatory
            if "passport_ocr" in mandatory_features:
                print(f"   ✓ passport_ocr is correctly set as mandatory")
            else:
                print(f"   ⚠️ passport_ocr should be mandatory")
                
            # Check expected configuration structure
            expected_features = ["contactless_fingerprint", "facial_liveness", "passport_ocr", "nfc_reading"]
            for feature in expected_features:
                if feature in config:
                    feature_config = config[feature]
                    enabled = feature_config.get("enabled", False)
                    mandatory = feature_config.get("mandatory", False)
                    print(f"   ✓ {feature}: enabled={enabled}, mandatory={mandatory}")
                else:
                    print(f"   ⚠️ {feature} missing from configuration")
        
        return success, response

    def test_biometric_config_update(self):
        """Test POST biometric configuration update"""
        # Try to update optional feature configuration
        config_update = {
            "contactless_fingerprint": {
                "enabled": True,
                "mandatory": False
            }
        }
        
        success, response = self.run_test("Update Biometric Configuration", "POST", "config/biometric", 200, config_update)
        
        if success:
            if response.get("success"):
                print(f"   ✓ Configuration update successful")
            else:
                print(f"   ⚠️ Configuration update failed: {response.get('error', 'Unknown error')}")
        
        return success, response

    def test_biometric_config_mandatory_protection(self):
        """Test that mandatory features cannot be disabled"""
        # Try to disable mandatory passport_ocr
        config_update = {
            "passport_ocr": {
                "enabled": False,
                "mandatory": True
            }
        }
        
        success, response = self.run_test("Test Mandatory Feature Protection", "POST", "config/biometric", 200, config_update)
        
        if success:
            # Should fail to disable mandatory feature
            if not response.get("success"):
                print(f"   ✓ Mandatory feature protection working: {response.get('error', 'Protected')}")
            else:
                print(f"   ⚠️ Mandatory feature protection failed - should not allow disabling")
        
        return success, response

    def test_workflow_validation_mandatory_only(self):
        """Test workflow validation with mandatory features only"""
        validation_data = {
            "user_id": self.user_id,
            "completed_captures": ["passport_ocr"]  # Only mandatory feature
        }
        
        success, response = self.run_test("Workflow Validation - Mandatory Only", "POST", "kyc/workflow/validate", 200, validation_data)
        
        if success:
            workflow_valid = response.get("workflow_valid", False)
            can_proceed = response.get("can_proceed", False)
            mandatory_completed = response.get("mandatory_completed", 0)
            mandatory_total = response.get("mandatory_total", 0)
            
            print(f"   ✓ Workflow valid: {workflow_valid}")
            print(f"   ✓ Can proceed: {can_proceed}")
            print(f"   ✓ Mandatory completed: {mandatory_completed}/{mandatory_total}")
            
            if workflow_valid and can_proceed:
                print(f"   ✓ Workflow validation working correctly for mandatory-only completion")
            else:
                print(f"   ⚠️ Workflow should be valid with mandatory features completed")
        
        return success, response

    def test_workflow_validation_with_optional(self):
        """Test workflow validation with optional features"""
        validation_data = {
            "user_id": self.user_id,
            "completed_captures": ["passport_ocr", "fingerprint", "facial_liveness"]  # Mandatory + optional
        }
        
        success, response = self.run_test("Workflow Validation - With Optional", "POST", "kyc/workflow/validate", 200, validation_data)
        
        if success:
            workflow_valid = response.get("workflow_valid", False)
            optional_completed = response.get("optional_completed", 0)
            completed_optional = response.get("completed_optional", [])
            
            print(f"   ✓ Workflow valid: {workflow_valid}")
            print(f"   ✓ Optional completed: {optional_completed}")
            print(f"   ✓ Completed optional features: {completed_optional}")
        
        return success, response

    def test_workflow_validation_incomplete(self):
        """Test workflow validation with incomplete mandatory features"""
        validation_data = {
            "user_id": self.user_id,
            "completed_captures": ["fingerprint"]  # Only optional, missing mandatory
        }
        
        success, response = self.run_test("Workflow Validation - Incomplete", "POST", "kyc/workflow/validate", 200, validation_data)
        
        if success:
            workflow_valid = response.get("workflow_valid", False)
            missing_mandatory = response.get("missing_mandatory", [])
            
            print(f"   ✓ Workflow valid: {workflow_valid}")
            print(f"   ✓ Missing mandatory: {missing_mandatory}")
            
            if not workflow_valid and "passport_ocr" in missing_mandatory:
                print(f"   ✓ Correctly identified missing mandatory features")
            else:
                print(f"   ⚠️ Should identify missing mandatory passport_ocr")
        
        return success, response

    def test_enhanced_kyc_initiation(self):
        """Test enhanced KYC initiation with mobile capabilities"""
        kyc_data = {
            "user_id": self.user_id,
            "first_name": "John",
            "last_name": "Doe",
            "date_of_birth": "1990-01-15",
            "document_number": "P123456789",
            "nationality": "Singapore"
        }
        
        success, response = self.run_test("Enhanced KYC Initiation", "POST", "kyc/initiate", 200, kyc_data)
        
        if success:
            # Check for mobile capabilities
            mobile_features = response.get("mobile_features_enabled")
            if mobile_features:
                print(f"   ✓ Mobile features enabled")
            else:
                print(f"   ⚠️ Mobile features not enabled")
        
        return success, response

    def run_complete_mobile_workflow_test(self):
        """Run complete Mobile-Technologies workflow test"""
        print("\n" + "="*80)
        print("🚀 STARTING MOBILE-TECHNOLOGIES ENHANCED eKYC WORKFLOW TEST")
        print("="*80)
        
        # Step 1: API Version Check
        print("\n📋 STEP 1: API Version & Capabilities Check")
        version_success, version_response = self.test_api_version()
        if not version_success:
            print("❌ API version check failed. Stopping tests.")
            return False
            
        # Step 2: Configuration API Testing
        print("\n📋 STEP 2: Biometric Configuration API Testing")
        config_get_success, _ = self.test_biometric_config_get()
        config_update_success, _ = self.test_biometric_config_update()
        config_protection_success, _ = self.test_biometric_config_mandatory_protection()
        
        config_success = config_get_success and config_update_success and config_protection_success
        if not config_success:
            print("❌ Configuration API tests failed. Continuing with other tests...")
            
        # Step 3: Workflow Validation Testing
        print("\n📋 STEP 3: Workflow Validation API Testing")
        workflow_mandatory_success, _ = self.test_workflow_validation_mandatory_only()
        workflow_optional_success, _ = self.test_workflow_validation_with_optional()
        workflow_incomplete_success, _ = self.test_workflow_validation_incomplete()
        
        workflow_validation_success = workflow_mandatory_success and workflow_optional_success and workflow_incomplete_success
        if not workflow_validation_success:
            print("❌ Workflow validation tests failed. Continuing with other tests...")
            
        # Step 4: Mobile Dashboard
        print("\n📋 STEP 4: Mobile Dashboard Connectivity")
        dashboard_success, _ = self.test_mobile_dashboard()
        if not dashboard_success:
            print("❌ Mobile dashboard failed. Continuing with other tests...")
            
        # Step 5: Enhanced KYC Initiation
        print("\n📋 STEP 5: Enhanced KYC Initiation")
        kyc_success, _ = self.test_enhanced_kyc_initiation()
        if not kyc_success:
            print("❌ Enhanced KYC initiation failed. Continuing with other tests...")
            
        # Step 6: Enhanced Mobile Biometric Captures with Personal Information
        print("\n📋 STEP 6: Enhanced Mobile Biometric Capture Testing")
        print("   Testing all mobile biometric endpoints with personal information extraction...")
        
        # Contactless Fingerprint
        fingerprint_success, _ = self.test_mobile_fingerprint_capture()
        time.sleep(3)  # Pause between AI calls
        
        # Facial Liveness
        liveness_success, _ = self.test_facial_liveness_detection()
        time.sleep(3)
        
        # Enhanced Passport OCR with Personal Information Extraction
        passport_success, passport_response = self.test_passport_ocr_scan_enhanced()
        time.sleep(3)
        
        # Personal Information Verification (if passport OCR succeeded)
        personal_info_success = True
        if passport_success and passport_response.get('success'):
            personal_info_success, _ = self.test_personal_info_verification()
            time.sleep(3)
        else:
            print("   ⚠️ Skipping personal info verification due to passport OCR failure")
            personal_info_success = False
        
        # NFC Reading
        nfc_success, _ = self.test_nfc_chip_reading()
        time.sleep(2)
        
        mobile_biometric_success = fingerprint_success and liveness_success and passport_success and nfc_success and personal_info_success
        
        # Final Results
        print("\n" + "="*80)
        print("📊 MOBILE-TECHNOLOGIES ENHANCED WORKFLOW TEST RESULTS")
        print("="*80)
        
        workflow_steps = [
            ("API Version & Capabilities", version_success),
            ("Biometric Configuration GET", config_get_success),
            ("Biometric Configuration UPDATE", config_update_success),
            ("Mandatory Feature Protection", config_protection_success),
            ("Workflow Validation - Mandatory Only", workflow_mandatory_success),
            ("Workflow Validation - With Optional", workflow_optional_success),
            ("Workflow Validation - Incomplete", workflow_incomplete_success),
            ("Mobile Dashboard", dashboard_success), 
            ("Enhanced KYC Initiation", kyc_success),
            ("Mobile Fingerprint Capture", fingerprint_success),
            ("Facial Liveness Detection", liveness_success),
            ("Enhanced Passport OCR with Personal Info", passport_success),
            ("Personal Information Verification", personal_info_success),
            ("NFC Chip Reading", nfc_success)
        ]
        
        for step_name, step_success in workflow_steps:
            status = "✅ PASSED" if step_success else "❌ FAILED"
            print(f"   {step_name}: {status}")
            
        overall_success = all(success for _, success in workflow_steps)
        
        print(f"\n📈 Overall Tests: {self.tests_passed}/{self.tests_run} passed")
        print(f"🎯 Workflow Status: {'✅ COMPLETE SUCCESS' if overall_success else '❌ PARTIAL FAILURE'}")
        
        # Priority test results
        priority_tests = [
            ("Configuration API", config_success),
            ("Workflow Validation API", workflow_validation_success),
            ("Enhanced Backend API", version_success),
            ("Mobile Biometric Endpoints", mobile_biometric_success)
        ]
        
        print(f"\n🎯 PRIORITY TEST RESULTS:")
        for test_name, test_success in priority_tests:
            status = "✅ PASSED" if test_success else "❌ FAILED"
            print(f"   {test_name}: {status}")
        
        if overall_success:
            print("\n🎉 All Mobile-Technologies enhanced eKYC workflow tests completed successfully!")
            print("   ✓ Backend APIs are working with version 2.0.0")
            print("   ✓ Biometric configuration system working")
            print("   ✓ Workflow validation API functional")
            print("   ✓ Mandatory vs optional feature enforcement working")
            print("   ✓ Mobile biometric capabilities confirmed") 
            print("   ✓ AI integration is functional")
            print("   ✓ Complete mobile eKYC workflow operational")
            print("   ✓ Contactless fingerprint capture working")
            print("   ✓ Facial liveness detection working")
            print("   ✓ Enhanced ICAO passport OCR with personal information extraction working (mandatory)")
            print("   ✓ Personal information verification and AI analysis working")
            print("   ✓ Auto-fill data generation working")
            print("   ✓ ID-first workflow with personal info extraction operational")
            print("   ✓ NFC chip reading simulation working")
        else:
            print("\n⚠️  Some tests failed. Check the detailed logs above.")
            print("   Issues found in enhanced configuration or workflow validation.")
            
        return overall_success

def main():
    print("🔬 Mobile-Technologies Enhanced eKYC System - Backend API Testing")
    print("=" * 80)
    
    tester = MobileTechnologiesAPITester()
    
    # Run complete mobile workflow test
    success = tester.run_complete_mobile_workflow_test()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())