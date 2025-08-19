import requests
import sys
import json
from datetime import datetime
import time

class BioVerifyAPITester:
    def __init__(self, base_url="https://bioverify-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = f"test_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(datetime.now()) % 10000}"
        
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
        headers = {'Content-Type': 'application/json'}
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            
            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                except:
                    details += f", Response: {response.text[:100]}..."
            else:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Error: {response.text[:200]}"
            
            return self.log_test(name, success, details), response.json() if success else {}
            
        except requests.exceptions.Timeout:
            return self.log_test(name, False, "Request timed out"), {}
        except Exception as e:
            return self.log_test(name, False, f"Error: {str(e)}"), {}

    def test_api_health(self):
        """Test basic API health"""
        return self.run_test("API Health Check", "GET", "", 200)

    def test_dashboard_connectivity(self):
        """Test dashboard endpoint to verify database connectivity"""
        return self.run_test("Dashboard Database Connectivity", "GET", "kyc/dashboard", 200)

    def test_kyc_initiation(self):
        """Test KYC process initiation"""
        kyc_data = {
            "user_id": self.user_id,
            "first_name": "John",
            "last_name": "Doe", 
            "date_of_birth": "1990-01-15",
            "document_number": "P123456789",
            "nationality": "Singapore"
        }
        
        success, response = self.run_test("KYC Initiation", "POST", "kyc/initiate", 200, kyc_data)
        return success, response

    def test_kyc_status_retrieval(self):
        """Test KYC status retrieval"""
        return self.run_test("KYC Status Retrieval", "GET", f"kyc/{self.user_id}", 200)

    def test_biometric_capture_fingerprint(self):
        """Test fingerprint biometric capture"""
        biometric_data = {
            "user_id": self.user_id,
            "capture_type": "fingerprint",
            "simulated_quality": 0.85
        }
        
        success, response = self.run_test("Biometric Capture - Fingerprint", "POST", "biometric/capture", 200, biometric_data, timeout=60)
        return success, response

    def test_biometric_capture_facial(self):
        """Test facial biometric capture"""
        biometric_data = {
            "user_id": self.user_id,
            "capture_type": "facial", 
            "simulated_quality": 0.90
        }
        
        success, response = self.run_test("Biometric Capture - Facial", "POST", "biometric/capture", 200, biometric_data, timeout=60)
        return success, response

    def test_biometric_capture_document_scan(self):
        """Test document scan biometric capture"""
        biometric_data = {
            "user_id": self.user_id,
            "capture_type": "document_scan",
            "simulated_quality": 0.88
        }
        
        success, response = self.run_test("Biometric Capture - Document Scan", "POST", "biometric/capture", 200, biometric_data, timeout=60)
        return success, response

    def test_document_verification(self):
        """Test AI-powered document verification"""
        document_data = {
            "user_id": self.user_id,
            "document_type": "passport",
            "document_data": {
                "document_number": "P123456789",
                "first_name": "John",
                "last_name": "Doe",
                "date_of_birth": "1990-01-15",
                "nationality": "Singapore",
                "issue_date": "2020-01-15",
                "expiry_date": "2030-01-15",
                "issuing_authority": "Singapore Government"
            }
        }
        
        success, response = self.run_test("Document Verification", "POST", "document/verify", 200, document_data, timeout=60)
        return success, response

    def test_risk_assessment(self):
        """Test AI-powered risk assessment"""
        risk_data = {
            "user_id": self.user_id,
            "additional_context": {
                "application_source": "api_test",
                "device_info": "Test Environment",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        success, response = self.run_test("Risk Assessment", "POST", "risk/assess", 200, risk_data, timeout=60)
        return success, response

    def run_complete_workflow_test(self):
        """Run complete KYC workflow test"""
        print("\n" + "="*80)
        print("🚀 STARTING COMPLETE BIOVERIFY HUB eKYC WORKFLOW TEST")
        print("="*80)
        
        # Step 1: API Health Check
        print("\n📋 STEP 1: Backend API Health Check")
        health_success, _ = self.test_api_health()
        if not health_success:
            print("❌ Backend API is not responding. Stopping tests.")
            return False
            
        # Step 2: Database connectivity
        print("\n📋 STEP 2: Database Connectivity Check")
        dashboard_success, _ = self.test_dashboard_connectivity()
        if not dashboard_success:
            print("❌ Database connectivity failed. Stopping tests.")
            return False
            
        # Step 3: KYC Initiation
        print("\n📋 STEP 3: KYC Process Initiation")
        kyc_success, kyc_response = self.test_kyc_initiation()
        if not kyc_success:
            print("❌ KYC initiation failed. Stopping tests.")
            return False
            
        # Step 4: KYC Status Check
        print("\n📋 STEP 4: KYC Status Retrieval")
        status_success, _ = self.test_kyc_status_retrieval()
        
        # Step 5: Biometric Captures (All three types)
        print("\n📋 STEP 5: Biometric Capture Testing")
        print("   Testing all three biometric capture types...")
        
        fingerprint_success, _ = self.test_biometric_capture_fingerprint()
        time.sleep(2)  # Brief pause between AI calls
        
        facial_success, _ = self.test_biometric_capture_facial()
        time.sleep(2)
        
        document_scan_success, _ = self.test_biometric_capture_document_scan()
        time.sleep(2)
        
        biometric_success = fingerprint_success and facial_success and document_scan_success
        
        # Step 6: Document Verification
        print("\n📋 STEP 6: AI Document Verification")
        doc_success, doc_response = self.test_document_verification()
        time.sleep(2)
        
        # Step 7: Risk Assessment
        print("\n📋 STEP 7: AI Risk Assessment")
        risk_success, risk_response = self.test_risk_assessment()
        
        # Final Results
        print("\n" + "="*80)
        print("📊 WORKFLOW TEST RESULTS")
        print("="*80)
        
        workflow_steps = [
            ("API Health Check", health_success),
            ("Database Connectivity", dashboard_success), 
            ("KYC Initiation", kyc_success),
            ("KYC Status Retrieval", status_success),
            ("Biometric Captures", biometric_success),
            ("Document Verification", doc_success),
            ("Risk Assessment", risk_success)
        ]
        
        for step_name, step_success in workflow_steps:
            status = "✅ PASSED" if step_success else "❌ FAILED"
            print(f"   {step_name}: {status}")
            
        overall_success = all(success for _, success in workflow_steps)
        
        print(f"\n📈 Overall Tests: {self.tests_passed}/{self.tests_run} passed")
        print(f"🎯 Workflow Status: {'✅ COMPLETE SUCCESS' if overall_success else '❌ PARTIAL FAILURE'}")
        
        if overall_success:
            print("\n🎉 All BioVerify Hub eKYC workflow tests completed successfully!")
            print("   ✓ Backend APIs are working")
            print("   ✓ Database connectivity confirmed") 
            print("   ✓ AI integration is functional")
            print("   ✓ Complete KYC workflow operational")
        else:
            print("\n⚠️  Some tests failed. Check the detailed logs above.")
            
        return overall_success

def main():
    print("🔬 BioVerify Hub Agentic AI eKYC System - Backend API Testing")
    print("=" * 80)
    
    tester = BioVerifyAPITester()
    
    # Run complete workflow test
    success = tester.run_complete_workflow_test()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())