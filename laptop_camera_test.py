#!/usr/bin/env python3
"""
Focused test for laptop camera ID capture functionality
"""
import requests
import json
from datetime import datetime
import base64

def test_laptop_camera_functionality():
    """Test laptop camera specific functionality"""
    base_url = "https://quickid.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Sample base64 image data for testing
    sample_image_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    
    print("🔬 Testing Laptop Camera ID Capture Functionality")
    print("=" * 60)
    
    # Test 1: Laptop Camera Test Endpoint
    print("\n1. Testing Laptop Camera Test Endpoint")
    try:
        response = requests.post(
            f"{api_url}/test/laptop-camera/id-capture",
            headers={'Content-Type': 'application/json'},
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Test endpoint successful")
            print(f"   Success: {data.get('success')}")
            print(f"   Test User ID: {data.get('test_user_id')}")
            print(f"   Endpoint Available: {data.get('endpoint_available')}")
            
            # Check processing result
            processing_result = data.get('processing_result', {})
            if processing_result.get('success'):
                print(f"   ✅ Processing successful")
            else:
                print(f"   ⚠️ Processing failed: {processing_result.get('error', 'Unknown')}")
        else:
            print(f"❌ Test endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Test endpoint error: {str(e)}")
    
    # Test 2: Enhanced Passport Scan with Laptop Camera
    print("\n2. Testing Enhanced Passport Scan with Laptop Camera")
    
    laptop_device_info = {
        "device_type": "laptop_camera",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "platform": "Win32",
        "screen_resolution": "1920x1080",
        "timestamp": datetime.now().isoformat()
    }
    
    processing_options = {
        "laptop_optimized": True,
        "enhance_contrast": True,
        "auto_rotate": True,
        "noise_reduction": True,
        "perspective_correction": True
    }
    
    passport_data = {
        "user_id": f"laptop_test_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "passport_image": sample_image_data,
        "extract_mrz": True,
        "device_info": laptop_device_info,
        "processing_options": processing_options
    }
    
    try:
        response = requests.post(
            f"{api_url}/mobile/passport/scan",
            json=passport_data,
            headers={'Content-Type': 'application/json'},
            timeout=60,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Passport scan endpoint accessible")
            print(f"   Success: {data.get('success')}")
            
            if data.get('success'):
                print(f"   ✅ Laptop camera passport scan successful")
                print(f"   OCR Confidence: {data.get('ocr_confidence')}")
                print(f"   Biometric ID: {data.get('biometric_id')}")
                
                # Check AI analysis for laptop-specific content
                ai_analysis = data.get('ai_analysis', {})
                if ai_analysis:
                    print(f"   ✅ AI analysis available")
                    capture_quality = str(ai_analysis.get('capture_quality_assessment', ''))
                    if 'laptop' in capture_quality.lower():
                        print(f"   ✅ Laptop-specific analysis detected")
                    else:
                        print(f"   ⚠️ Laptop-specific analysis not clearly present")
                else:
                    print(f"   ⚠️ AI analysis not available")
            else:
                print(f"   ⚠️ Passport scan failed: {data.get('error', 'Unknown')}")
        else:
            print(f"❌ Passport scan failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Passport scan error: {str(e)}")
    
    # Test 3: Dashboard Laptop Tracking
    print("\n3. Testing Dashboard Laptop Tracking")
    
    try:
        response = requests.get(
            f"{api_url}/mobile/dashboard",
            headers={'Content-Type': 'application/json'},
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            statistics = data.get("statistics", {})
            
            print(f"✅ Dashboard accessible")
            print(f"   Total captures: {statistics.get('total_captures', 0)}")
            print(f"   Laptop passport scans: {statistics.get('laptop_passport_scans', 0)}")
            
            if "laptop_passport_scans" in statistics:
                print(f"   ✅ Dashboard tracks laptop passport scans separately")
            else:
                print(f"   ⚠️ Dashboard does not track laptop passport scans")
                
            # Check success rates
            success_rates = data.get("success_rates", {})
            if "laptop_camera_passport_ocr_with_personal_info" in success_rates:
                rate = success_rates["laptop_camera_passport_ocr_with_personal_info"]
                print(f"   ✅ Laptop camera success rate: {rate}%")
            else:
                print(f"   ⚠️ Laptop camera success rate not tracked")
                
        else:
            print(f"❌ Dashboard failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Dashboard error: {str(e)}")
    
    # Test 4: Biometric Configuration
    print("\n4. Testing Biometric Configuration")
    
    try:
        response = requests.get(
            f"{api_url}/config/biometric",
            headers={'Content-Type': 'application/json'},
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Biometric config accessible")
            print(f"   Success: {data.get('success')}")
            
            config = data.get("config", {})
            mandatory_features = data.get("mandatory_features", [])
            optional_features = data.get("optional_features", [])
            
            print(f"   Mandatory features: {mandatory_features}")
            print(f"   Optional features: {optional_features}")
            
            if "passport_ocr" in mandatory_features:
                print(f"   ✅ passport_ocr correctly set as mandatory")
            else:
                print(f"   ⚠️ passport_ocr should be mandatory")
                
        else:
            print(f"❌ Biometric config failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Biometric config error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🎯 Laptop Camera Functionality Test Complete")

if __name__ == "__main__":
    test_laptop_camera_functionality()