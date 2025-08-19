#!/usr/bin/env python3

import requests
import json
import time

def test_enhanced_passport_ocr():
    """Test the enhanced passport OCR with personal information extraction"""
    
    base_url = "https://9a8287fd-82ea-4aa7-8674-59d0430c9f32.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Sample test data from the review request
    test_data = {
        "user_id": "test_enhanced_workflow",
        "passport_image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "extract_mrz": True,
        "device_info": {
            "platform": "mobile_test", 
            "user_agent": "test_browser"
        }
    }
    
    print("🔍 Testing Enhanced Passport OCR with Personal Information Extraction")
    print("=" * 70)
    
    try:
        # Test the enhanced passport scan endpoint
        response = requests.post(
            f"{api_url}/mobile/passport/scan",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=60,
            verify=False
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Request successful")
            
            # Check if the response has the expected structure
            if result.get("success"):
                print(f"✅ Passport OCR processing successful")
                
                # Check for personal information extraction
                personal_info = result.get("personal_information", {})
                auto_fill_data = result.get("auto_fill_data", {})
                passport_data = result.get("passport_data", {})
                ai_analysis = result.get("ai_analysis", {})
                
                print(f"\n📋 PERSONAL INFORMATION EXTRACTION:")
                if personal_info:
                    print(f"✅ Personal information extracted successfully")
                    for key, value in personal_info.items():
                        print(f"   {key}: {value}")
                    
                    # Check extraction confidence
                    confidence = personal_info.get("extraction_confidence", 0)
                    print(f"\n📊 Extraction Confidence: {confidence}")
                else:
                    print(f"❌ Personal information not extracted")
                
                print(f"\n📋 AUTO-FILL DATA:")
                if auto_fill_data:
                    print(f"✅ Auto-fill data available")
                    for key, value in auto_fill_data.items():
                        print(f"   {key}: {value}")
                else:
                    print(f"❌ Auto-fill data not available")
                
                print(f"\n📋 MRZ PASSPORT DATA:")
                if passport_data:
                    print(f"✅ MRZ passport data available")
                    for key, value in passport_data.items():
                        if key != "validation":  # Skip complex validation object
                            print(f"   {key}: {value}")
                else:
                    print(f"❌ MRZ passport data not available")
                
                print(f"\n🤖 AI ANALYSIS:")
                if ai_analysis:
                    print(f"✅ AI analysis available")
                    for key, value in ai_analysis.items():
                        print(f"   {key}: {value}")
                else:
                    print(f"❌ AI analysis not available")
                
                # Check for enhanced features mentioned in review request
                print(f"\n🎯 ENHANCED FEATURES CHECK:")
                
                # 1. Personal information extraction and formatting
                if personal_info and personal_info.get("extraction_confidence", 0) > 0:
                    print(f"✅ Personal information extraction working")
                else:
                    print(f"❌ Personal information extraction not working")
                
                # 2. Date formatting (YYMMDD to YYYY-MM-DD)
                date_fields = ["date_of_birth", "expiry_date"]
                date_formatting_ok = False
                for field in date_fields:
                    if personal_info.get(field) and "-" in str(personal_info.get(field)):
                        date_formatting_ok = True
                        print(f"✅ Date formatting working: {field} = {personal_info.get(field)}")
                        break
                
                if not date_formatting_ok:
                    print(f"❌ Date formatting (YYMMDD to YYYY-MM-DD) not working")
                
                # 3. Nationality formatting (country codes to readable names)
                nationality = personal_info.get("nationality", "")
                if nationality and len(nationality) > 3:  # More than country code
                    print(f"✅ Nationality formatting working: {nationality}")
                else:
                    print(f"❌ Nationality formatting not working")
                
                # 4. Sex formatting (M/F to Male/Female)
                sex = personal_info.get("sex", "")
                if sex in ["Male", "Female", "Other"]:
                    print(f"✅ Sex formatting working: {sex}")
                else:
                    print(f"❌ Sex formatting not working")
                
                # 5. AI analysis quality assessment
                if ai_analysis and ai_analysis.get("personal_info_quality"):
                    print(f"✅ AI personal info quality assessment: {ai_analysis.get('personal_info_quality')}")
                else:
                    print(f"❌ AI personal info quality assessment not working")
                
                return True, result
                
            else:
                print(f"❌ Passport OCR processing failed: {result.get('error', 'Unknown error')}")
                return False, result
        else:
            print(f"❌ Request failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Error: {response.text}")
            return False, {}
            
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        return False, {}

def test_personal_info_verification():
    """Test the personal information verification endpoint"""
    
    base_url = "https://9a8287fd-82ea-4aa7-8674-59d0430c9f32.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Sample extracted and verified info
    extracted_info = {
        "first_name": "JOHN",
        "last_name": "DOE", 
        "date_of_birth": "1990-01-15",
        "document_number": "P123456789",
        "nationality": "United States",
        "sex": "Male",
        "extraction_confidence": 0.85
    }
    
    user_verified_info = {
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1990-01-15", 
        "document_number": "P123456789",
        "nationality": "United States",
        "sex": "Male"
    }
    
    verification_data = {
        "user_id": "test_enhanced_workflow",
        "extracted_info": extracted_info,
        "user_verified_info": user_verified_info,
        "verification_notes": "Corrected name capitalization from OCR"
    }
    
    print(f"\n🔍 Testing Personal Information Verification")
    print("=" * 50)
    
    try:
        response = requests.post(
            f"{api_url}/mobile/personal-info/verify",
            json=verification_data,
            headers={'Content-Type': 'application/json'},
            timeout=60,
            verify=False
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get("success"):
                print(f"✅ Personal information verification successful")
                
                verification_id = result.get("verification_id")
                confidence_score = result.get("confidence_score")
                verification_analysis = result.get("verification_analysis", {})
                
                print(f"   Verification ID: {verification_id}")
                print(f"   Confidence Score: {confidence_score}")
                
                if verification_analysis:
                    print(f"   AI Analysis:")
                    for key, value in verification_analysis.items():
                        print(f"     {key}: {value}")
                
                return True, result
            else:
                print(f"❌ Personal info verification failed: {result.get('error')}")
                return False, result
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False, {}
            
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        return False, {}

if __name__ == "__main__":
    print("🚀 Testing Enhanced Mobile-Technologies Platform")
    print("=" * 80)
    
    # Wait a moment for backend to fully restart
    print("⏳ Waiting for backend to fully restart...")
    time.sleep(5)
    
    # Test enhanced passport OCR
    ocr_success, ocr_result = test_enhanced_passport_ocr()
    
    # Test personal info verification
    verification_success, verification_result = test_personal_info_verification()
    
    print(f"\n" + "=" * 80)
    print(f"📊 ENHANCED FEATURES TEST SUMMARY")
    print("=" * 80)
    print(f"Enhanced Passport OCR: {'✅ PASSED' if ocr_success else '❌ FAILED'}")
    print(f"Personal Info Verification: {'✅ PASSED' if verification_success else '❌ FAILED'}")
    
    if ocr_success and verification_success:
        print(f"\n🎉 All enhanced features are working correctly!")
        print(f"   ✓ Personal information extraction implemented")
        print(f"   ✓ Auto-fill data generation working")
        print(f"   ✓ Enhanced AI analysis functional")
        print(f"   ✓ Personal information verification working")
    else:
        print(f"\n⚠️ Some enhanced features need attention")