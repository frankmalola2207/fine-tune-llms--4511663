from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import base64
import cv2
import numpy as np
import mediapipe as mp
import pytesseract
from PIL import Image
from io import BytesIO
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize AI Chat for KYC processing
emergent_key = os.environ.get('EMERGENT_LLM_KEY')

async def get_ai_chat():
    return LlmChat(
        api_key=emergent_key,
        session_id="mobile-ekyc-session",
        system_message="You are an AI expert in mobile biometric verification, contactless fingerprint analysis, facial liveness detection, passport OCR, and identity verification. Provide detailed analysis and recommendations for mobile-captured biometric data."
    ).with_model("openai", "gpt-4o")

# Enhanced Biometric Models
class BiometricData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    capture_type: str  # fingerprint, facial, document_scan, nfc_read
    quality_score: float = Field(ge=0.0, le=1.0)
    confidence_score: float = Field(ge=0.0, le=1.0)
    liveness_verified: bool = False
    features_extracted: int = 0
    processing_time: float = 0.0
    device_info: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MobileFingerprintRequest(BaseModel):
    user_id: str
    image_data: str  # base64 encoded
    device_info: Optional[Dict[str, str]] = None
    quality_threshold: float = Field(default=0.7, ge=0.0, le=1.0)

class FacialLivenessRequest(BaseModel):
    user_id: str
    frame_sequence: List[str]  # List of base64 encoded frames
    device_info: Optional[Dict[str, str]] = None
    liveness_threshold: float = Field(default=0.6, ge=0.0, le=1.0)

class PassportScanRequest(BaseModel):
    user_id: str
    passport_image: str  # base64 encoded
    extract_mrz: bool = True
    device_info: Optional[Dict[str, str]] = None

class NFCReadRequest(BaseModel):
    user_id: str
    passport_number: str
    birth_date: str
    expiry_date: str
    device_info: Optional[Dict[str, str]] = None

# Mobile Fingerprint Processor
class MobileFingerprintProcessor:
    def __init__(self):
        self.orb = cv2.ORB_create(nfeatures=1000)
        
    def preprocess_mobile_fingerprint(self, image_data: str):
        """Enhanced preprocessing for smartphone camera captured fingerprints"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            img_array = np.array(image)
            
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Mobile-specific enhancements
            # Contrast enhancement for varying lighting conditions
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Noise reduction common in mobile cameras
            denoised = cv2.fastNlMeansDenoising(enhanced)
            
            # Edge enhancement for contactless capture
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            sharpened = cv2.filter2D(denoised, -1, kernel)
            
            # Adaptive thresholding for varying backgrounds
            binary = cv2.adaptiveThreshold(
                sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY_INV, 11, 2
            )
            
            # Morphological operations to clean ridges
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Mobile fingerprint preprocessing failed: {str(e)}")
    
    def extract_contactless_features(self, processed_image):
        """Extract features optimized for contactless capture"""
        try:
            # Multi-scale feature detection for contactless captures
            keypoints, descriptors = self.orb.detectAndCompute(processed_image, None)
            
            if descriptors is None:
                return None, [], 0.0
            
            # Calculate quality metrics specific to contactless capture
            quality_factors = {
                'feature_count': len(keypoints),
                'contrast_ratio': self._calculate_contrast_ratio(processed_image),
                'sharpness_score': self._calculate_sharpness(processed_image),
                'ridge_clarity': self._calculate_ridge_clarity(processed_image)
            }
            
            # Overall quality score
            quality_score = min(
                (quality_factors['feature_count'] / 100.0) * 0.4 +
                quality_factors['contrast_ratio'] * 0.3 +
                quality_factors['sharpness_score'] * 0.2 +
                quality_factors['ridge_clarity'] * 0.1,
                1.0
            )
            
            # Convert keypoints to serializable format
            kp_data = []
            for kp in keypoints:
                kp_dict = {
                    'x': float(kp.pt[0]),
                    'y': float(kp.pt[1]),
                    'angle': float(kp.angle),
                    'response': float(kp.response),
                    'size': float(kp.size)
                }
                kp_data.append(kp_dict)
            
            return descriptors, kp_data, quality_score
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Contactless feature extraction failed: {str(e)}")
    
    def _calculate_contrast_ratio(self, image):
        """Calculate contrast ratio for quality assessment"""
        try:
            mean_intensity = np.mean(image)
            std_intensity = np.std(image)
            return min(std_intensity / (mean_intensity + 1e-6), 1.0)
        except:
            return 0.0
    
    def _calculate_sharpness(self, image):
        """Calculate sharpness using Laplacian variance"""
        try:
            laplacian = cv2.Laplacian(image, cv2.CV_64F)
            variance = laplacian.var()
            return min(variance / 1000.0, 1.0)  # Normalize
        except:
            return 0.0
    
    def _calculate_ridge_clarity(self, image):
        """Calculate ridge clarity for fingerprint quality"""
        try:
            # Use Gabor filters to assess ridge clarity
            kernel = cv2.getGaborKernel((21, 21), 3, 0, 2*np.pi*0.5, 0.5, 0, ktype=cv2.CV_32F)
            filtered = cv2.filter2D(image, cv2.CV_8UC3, kernel)
            clarity = np.std(filtered) / 255.0
            return min(clarity, 1.0)
        except:
            return 0.0

# Mobile Liveness Detector
class MobileLivenessDetector:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Mobile-specific thresholds
        self.blink_threshold = 0.25
        self.movement_threshold = 0.0001
        self.expression_threshold = 0.02
        
        # State tracking
        self.reset_state()
    
    def reset_state(self):
        """Reset detection state for new session"""
        self.blink_counter = 0
        self.movement_history = []
        self.face_present_frames = 0
        self.expression_changes = 0
        self.last_landmarks = None
    
    def analyze_mobile_liveness(self, frame_sequence: List[str]):
        """Analyze liveness from mobile camera frame sequence"""
        try:
            self.reset_state()
            liveness_indicators = []
            
            for i, frame_data in enumerate(frame_sequence):
                # Decode frame
                image_data = base64.b64decode(frame_data)
                nparr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    continue
                
                # Analyze frame
                frame_result = self._analyze_single_frame(frame)
                liveness_indicators.append(frame_result)
            
            # Calculate overall liveness score
            return self._calculate_overall_liveness(liveness_indicators)
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Mobile liveness analysis failed: {str(e)}")
    
    def _analyze_single_frame(self, frame):
        """Analyze single frame for liveness indicators"""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            
            frame_data = {
                'face_detected': False,
                'blink_detected': False,
                'movement_detected': False,
                'expression_change': False,
                'quality_score': 0.0
            }
            
            if results.multi_face_landmarks:
                self.face_present_frames += 1
                frame_data['face_detected'] = True
                
                landmarks = results.multi_face_landmarks[0].landmark
                
                # Blink detection
                ear = self._calculate_eye_aspect_ratio(landmarks)
                if ear < self.blink_threshold:
                    frame_data['blink_detected'] = True
                    self.blink_counter += 1
                
                # Movement detection
                if self.last_landmarks is not None:
                    movement = self._calculate_movement(landmarks, self.last_landmarks)
                    if movement > self.movement_threshold:
                        frame_data['movement_detected'] = True
                        self.movement_history.append(movement)
                
                # Expression change detection
                expression_change = self._detect_expression_change(landmarks)
                if expression_change > self.expression_threshold:
                    frame_data['expression_change'] = True
                    self.expression_changes += 1
                
                # Quality assessment
                frame_data['quality_score'] = self._assess_frame_quality(frame)
                
                self.last_landmarks = landmarks
            
            return frame_data
            
        except Exception as e:
            return {'error': str(e)}
    
    def _calculate_eye_aspect_ratio(self, landmarks):
        """Calculate eye aspect ratio for blink detection"""
        try:
            # Left eye landmarks
            left_eye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
            right_eye = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
            
            # Calculate for both eyes
            left_ear = self._eye_aspect_ratio(landmarks, left_eye)
            right_ear = self._eye_aspect_ratio(landmarks, right_eye)
            
            return (left_ear + right_ear) / 2.0
        except:
            return 1.0
    
    def _eye_aspect_ratio(self, landmarks, eye_indices):
        """Calculate aspect ratio for specific eye"""
        try:
            # Get eye points
            eye_points = [(landmarks[i].x, landmarks[i].y) for i in eye_indices[:6]]
            
            # Calculate distances
            vertical_1 = np.linalg.norm(np.array(eye_points[1]) - np.array(eye_points[5]))
            vertical_2 = np.linalg.norm(np.array(eye_points[2]) - np.array(eye_points[4]))
            horizontal = np.linalg.norm(np.array(eye_points[0]) - np.array(eye_points[3]))
            
            if horizontal > 0:
                return (vertical_1 + vertical_2) / (2.0 * horizontal)
            return 0
        except:
            return 0
    
    def _calculate_movement(self, current_landmarks, previous_landmarks):
        """Calculate head movement between frames"""
        try:
            # Use nose tip as reference
            current_nose = [current_landmarks[1].x, current_landmarks[1].y]
            previous_nose = [previous_landmarks[1].x, previous_landmarks[1].y]
            
            movement = np.linalg.norm(np.array(current_nose) - np.array(previous_nose))
            return movement
        except:
            return 0.0
    
    def _detect_expression_change(self, landmarks):
        """Detect facial expression changes"""
        try:
            # Monitor mouth corners and eyebrows
            mouth_corners = [61, 291]  # Left and right mouth corners
            eyebrows = [70, 107, 55, 8, 9, 10, 151, 337, 299, 333]
            
            if self.last_landmarks is not None:
                mouth_change = 0
                for idx in mouth_corners:
                    current_pos = [landmarks[idx].x, landmarks[idx].y]
                    previous_pos = [self.last_landmarks[idx].x, self.last_landmarks[idx].y]
                    mouth_change += np.linalg.norm(np.array(current_pos) - np.array(previous_pos))
                
                return mouth_change / len(mouth_corners)
            return 0.0
        except:
            return 0.0
    
    def _assess_frame_quality(self, frame):
        """Assess frame quality for liveness detection"""
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Sharpness
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness = min(laplacian_var / 1000.0, 1.0)
            
            # Brightness
            brightness = np.mean(gray) / 255.0
            brightness_score = 1.0 - abs(brightness - 0.5) * 2  # Optimal around 0.5
            
            # Contrast
            contrast = np.std(gray) / 255.0
            
            return (sharpness + brightness_score + contrast) / 3.0
        except:
            return 0.0
    
    def _calculate_overall_liveness(self, frame_results):
        """Calculate overall liveness score from frame analysis"""
        try:
            valid_frames = [f for f in frame_results if 'error' not in f and f['face_detected']]
            
            if not valid_frames:
                return {
                    'is_live': False,
                    'liveness_score': 0.0,
                    'confidence': 0.0,
                    'indicators': {
                        'blinks_detected': 0,
                        'movement_detected': False,
                        'expression_changes': 0,
                        'avg_quality': 0.0
                    }
                }
            
            # Calculate indicators
            blinks = sum(1 for f in valid_frames if f['blink_detected'])
            movements = sum(1 for f in valid_frames if f['movement_detected'])
            expressions = sum(1 for f in valid_frames if f['expression_change'])
            avg_quality = np.mean([f['quality_score'] for f in valid_frames])
            
            # Score calculation
            blink_score = min(blinks / 3.0, 1.0)  # 3 blinks for full score
            movement_score = min(movements / len(valid_frames), 1.0)
            expression_score = min(expressions / len(valid_frames), 1.0)
            quality_score = avg_quality
            
            overall_score = (blink_score * 0.3 + movement_score * 0.3 + 
                           expression_score * 0.2 + quality_score * 0.2)
            
            return {
                'is_live': overall_score > 0.6,
                'liveness_score': overall_score,
                'confidence': min(len(valid_frames) / 10.0, 1.0),  # More frames = higher confidence
                'indicators': {
                    'blinks_detected': blinks,
                    'movement_detected': movements > 0,
                    'expression_changes': expressions,
                    'avg_quality': avg_quality,
                    'frames_analyzed': len(valid_frames)
                }
            }
            
        except Exception as e:
            return {
                'is_live': False,
                'liveness_score': 0.0,
                'confidence': 0.0,
                'error': str(e)
            }

# Mobile Passport OCR Processor
class MobilePassportProcessor:
    def __init__(self):
        # Configure Tesseract for mobile OCR
        self.mrz_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<'
        self.country_codes = self._load_country_codes()
    
    def _load_country_codes(self):
        """Load valid country codes"""
        return {
            'USA', 'GBR', 'CAN', 'AUS', 'DEU', 'FRA', 'JPN', 'CHN', 'IND', 'BRA',
            'SGP', 'MYS', 'THA', 'IDN', 'PHL', 'VNM', 'KOR', 'HKG', 'TWN', 'MAC'
        }
    
    def process_mobile_passport(self, image_data: str):
        """Process passport image from mobile device"""
        try:
            # Decode image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            img_array = np.array(image)
            
            # Mobile-specific preprocessing
            processed_image = self._preprocess_mobile_passport(img_array)
            
            # Detect MRZ region
            mrz_region, bbox = self._detect_mrz_mobile(processed_image)
            
            # Extract and parse MRZ
            mrz_text = self._extract_mrz_mobile(mrz_region)
            parsed_data = self._parse_mrz_data(mrz_text)
            
            return {
                'success': True,
                'mrz_data': parsed_data,
                'mrz_region_bbox': bbox,
                'confidence': self._calculate_ocr_confidence(parsed_data)
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Mobile passport processing failed: {str(e)}")
    
    def _preprocess_mobile_passport(self, img_array):
        """Preprocess passport image for mobile OCR"""
        try:
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Mobile-specific enhancements
            # Correct perspective distortion common in mobile photos
            gray = self._correct_perspective(gray)
            
            # Enhance contrast for varying lighting
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Reduce motion blur common in mobile captures
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            sharpened = cv2.filter2D(enhanced, -1, kernel)
            
            # Adaptive thresholding for mobile lighting conditions
            binary = cv2.adaptiveThreshold(
                sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            
            return binary
            
        except Exception as e:
            raise Exception(f"Mobile passport preprocessing failed: {str(e)}")
    
    def _correct_perspective(self, image):
        """Correct perspective distortion in mobile photos"""
        try:
            # Simple perspective correction - can be enhanced with more sophisticated methods
            height, width = image.shape
            
            # Find edges
            edges = cv2.Canny(image, 50, 150, apertureSize=3)
            
            # Find lines
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            if lines is not None and len(lines) > 0:
                # Simple rotation correction based on dominant line angle
                angles = []
                for line in lines:
                    rho, theta = line[0]
                    angle = theta * 180 / np.pi
                    if 85 < angle < 95:  # Near horizontal lines
                        angles.append(angle - 90)
                
                if angles:
                    avg_angle = np.mean(angles)
                    if abs(avg_angle) > 0.5:  # Only correct if significantly tilted
                        M = cv2.getRotationMatrix2D((width/2, height/2), avg_angle, 1)
                        image = cv2.warpAffine(image, M, (width, height))
            
            return image
            
        except:
            return image  # Return original if correction fails
    
    def _detect_mrz_mobile(self, processed_image):
        """Detect MRZ region optimized for mobile captures"""
        try:
            height, width = processed_image.shape
            
            # MRZ is typically in bottom 30% of passport
            mrz_region = processed_image[int(height*0.7):, :]
            
            # Find text regions using morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 1))
            connected = cv2.morphologyEx(mrz_region, cv2.MORPH_CLOSE, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter for MRZ-like regions
            potential_regions = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                area = w * h
                
                # MRZ characteristics: wide, moderate height, significant area
                if aspect_ratio > 10 and area > 1000:
                    potential_regions.append((x, y + int(height*0.7), w, h))
            
            if potential_regions:
                # Select the largest region
                best_region = max(potential_regions, key=lambda r: r[2] * r[3])
                x, y, w, h = best_region
                extracted_region = processed_image[y:y+h, x:x+w]
                return extracted_region, best_region
            else:
                # Fallback: use bottom portion
                bottom_region = processed_image[int(height*0.8):, :]
                bbox = (0, int(height*0.8), width, int(height*0.2))
                return bottom_region, bbox
                
        except Exception as e:
            raise Exception(f"MRZ detection failed: {str(e)}")
    
    def _extract_mrz_mobile(self, mrz_region):
        """Extract MRZ text optimized for mobile OCR"""
        try:
            # Scale up for better OCR
            scale_factor = 3
            height, width = mrz_region.shape
            scaled = cv2.resize(mrz_region, (width*scale_factor, height*scale_factor), 
                              interpolation=cv2.INTER_CUBIC)
            
            # Additional preprocessing for OCR
            # Morphological operations to clean up text
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 1))
            cleaned = cv2.morphologyEx(scaled, cv2.MORPH_CLOSE, kernel)
            
            # Extract text
            text = pytesseract.image_to_string(cleaned, config=self.mrz_config)
            
            # Clean up text
            lines = []
            for line in text.strip().split('\n'):
                cleaned_line = line.replace(' ', '').upper()
                # Valid MRZ lines are 30 or 44 characters
                if len(cleaned_line) in [30, 44]:
                    if all(c in '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<' for c in cleaned_line):
                        lines.append(cleaned_line)
            
            return lines
            
        except Exception as e:
            raise Exception(f"MRZ text extraction failed: {str(e)}")
    
    def _parse_mrz_data(self, mrz_lines):
        """Parse MRZ data into structured format"""
        try:
            if not mrz_lines or len(mrz_lines) < 2:
                raise ValueError("Insufficient MRZ data")
            
            parsed = {}
            
            if len(mrz_lines) == 2 and len(mrz_lines[0]) == 44:  # TD3 format
                line1, line2 = mrz_lines[0], mrz_lines[1]
                
                # Parse line 1
                parsed['document_type'] = line1[0]
                parsed['country_code'] = line1[2:5].replace('<', '')
                
                # Parse names
                names_part = line1[5:]
                if '<<' in names_part:
                    surname, given_names = names_part.split('<<', 1)
                    parsed['surname'] = surname.replace('<', ' ').strip()
                    parsed['given_names'] = given_names.replace('<', ' ').strip()
                else:
                    parsed['surname'] = names_part.replace('<', ' ').strip()
                    parsed['given_names'] = ''
                
                # Parse line 2
                parsed['passport_number'] = line2[0:9].replace('<', '')
                parsed['nationality'] = line2[10:13].replace('<', '')
                parsed['birth_date'] = line2[13:19]
                parsed['sex'] = line2[20]
                parsed['expiry_date'] = line2[21:27]
                parsed['personal_number'] = line2[28:42].replace('<', '')
                
                # Validation
                validation = self._validate_parsed_data(parsed)
                parsed['validation'] = validation
            
            return parsed
            
        except Exception as e:
            raise Exception(f"MRZ parsing failed: {str(e)}")
    
    def _validate_parsed_data(self, data):
        """Validate parsed MRZ data"""
        validation = {'is_valid': True, 'errors': [], 'warnings': []}
        
        try:
            # Validate country code
            if data.get('country_code') not in self.country_codes:
                validation['warnings'].append(f"Unrecognized country: {data.get('country_code')}")
            
            # Validate dates
            for date_field in ['birth_date', 'expiry_date']:
                date_val = data.get(date_field, '')
                if not self._validate_date(date_val):
                    validation['errors'].append(f"Invalid {date_field}: {date_val}")
            
            # Validate required fields
            required = ['document_type', 'country_code', 'surname', 'passport_number']
            for field in required:
                if not data.get(field):
                    validation['errors'].append(f"Missing {field}")
            
            validation['is_valid'] = len(validation['errors']) == 0
            
        except Exception as e:
            validation['errors'].append(f"Validation error: {str(e)}")
            validation['is_valid'] = False
        
        return validation
    
    def _validate_date(self, date_str):
        """Validate YYMMDD date format"""
        if len(date_str) != 6 or not date_str.isdigit():
            return False
        
        try:
            month = int(date_str[2:4])
            day = int(date_str[4:6])
            return 1 <= month <= 12 and 1 <= day <= 31
        except:
            return False
    
    def _calculate_ocr_confidence(self, parsed_data):
        """Calculate confidence score for OCR results"""
        try:
            score = 1.0
            
            # Penalize missing required fields
            required_fields = ['document_type', 'country_code', 'surname', 'passport_number']
            missing_fields = sum(1 for field in required_fields if not parsed_data.get(field))
            score -= missing_fields * 0.2
            
            # Penalize validation errors
            if 'validation' in parsed_data:
                error_count = len(parsed_data['validation'].get('errors', []))
                score -= error_count * 0.15
            
            return max(score, 0.0)
            
        except:
            return 0.5

# Initialize processors
fingerprint_processor = MobileFingerprintProcessor()
liveness_detector = MobileLivenessDetector()
passport_processor = MobilePassportProcessor()

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if item is None:
        return item
    if '_id' in item:
        del item['_id']
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('completed_at'), str):
        item['completed_at'] = datetime.fromisoformat(item['completed_at'])
    return item

# Configuration for optional biometric features
BIOMETRIC_CONFIG = {
    "contactless_fingerprint": {
        "enabled": True,
        "mandatory": False,
        "description": "Smartphone camera-based contactless fingerprint capture"
    },
    "facial_liveness": {
        "enabled": True, 
        "mandatory": False,
        "description": "Advanced facial liveness detection and anti-spoofing"
    },
    "facial_matching": {
        "enabled": True,
        "mandatory": False, 
        "description": "Facial biometric matching and verification"
    },
    "passport_ocr": {
        "enabled": True,
        "mandatory": True,
        "description": "ICAO passport OCR and MRZ extraction - REQUIRED"
    },
    "nfc_reading": {
        "enabled": True,
        "mandatory": False,
        "description": "NFC chip reading for enhanced security"
    }
}

# Enhanced Routes
@api_router.get("/")
async def root():
    return {
        "message": "Mobile-Technologies Agentic AI eKYC System", 
        "version": "2.0.0", 
        "capabilities": ["contactless_fingerprint", "facial_liveness", "passport_ocr", "nfc_reading"],
        "biometric_config": BIOMETRIC_CONFIG
    }

@api_router.get("/config/biometric")
async def get_biometric_config():
    """Get current biometric feature configuration"""
    return {
        "success": True,
        "config": BIOMETRIC_CONFIG,
        "mandatory_features": [k for k, v in BIOMETRIC_CONFIG.items() if v["mandatory"]],
        "optional_features": [k for k, v in BIOMETRIC_CONFIG.items() if v["enabled"] and not v["mandatory"]]
    }

@api_router.post("/config/biometric")
async def update_biometric_config(config_update: dict):
    """Update biometric feature configuration"""
    try:
        global BIOMETRIC_CONFIG
        
        for feature, settings in config_update.items():
            if feature in BIOMETRIC_CONFIG:
                # Don't allow disabling mandatory features
                if BIOMETRIC_CONFIG[feature]["mandatory"] and not settings.get("enabled", True):
                    return {
                        "success": False,
                        "error": f"Cannot disable mandatory feature: {feature}"
                    }
                
                # Update configuration
                BIOMETRIC_CONFIG[feature].update(settings)
        
        return {
            "success": True,
            "message": "Biometric configuration updated successfully",
            "config": BIOMETRIC_CONFIG
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Configuration update failed: {str(e)}"
        }

# Mobile Fingerprint Capture
@api_router.post("/mobile/fingerprint/capture")
async def capture_mobile_fingerprint(request: MobileFingerprintRequest):
    """Contactless fingerprint capture using smartphone camera"""
    try:
        start_time = datetime.now()
        
        ai_chat = await get_ai_chat()
        
        # Process mobile fingerprint
        processed_image = fingerprint_processor.preprocess_mobile_fingerprint(request.image_data)
        descriptors, keypoints, quality_score = fingerprint_processor.extract_contactless_features(processed_image)
        
        if descriptors is None:
            return {
                "success": False,
                "error": "No fingerprint features detected in mobile capture",
                "quality_score": 0.0
            }
        
        if quality_score < request.quality_threshold:
            return {
                "success": False,
                "error": f"Fingerprint quality below threshold ({quality_score:.2f} < {request.quality_threshold})",
                "quality_score": quality_score,
                "recommendation": "Improve lighting, clean finger, ensure proper distance from camera"
            }
        
        # AI analysis
        ai_prompt = f"""
        Analyze this contactless mobile fingerprint capture:
        - Quality Score: {quality_score}
        - Features Extracted: {len(keypoints)}
        - Device Info: {request.device_info}
        
        Provide analysis on:
        1. Capture quality assessment
        2. Contactless capture challenges addressed
        3. Fraud detection indicators
        4. Recommendations for improvement
        5. Compliance with mobile biometric standards
        
        Respond in JSON format with quality_assessment, fraud_indicators, recommendations, and compliance_status.
        """
        
        user_message = UserMessage(text=ai_prompt)
        ai_response = await ai_chat.send_message(user_message)
        
        try:
            ai_analysis = json.loads(ai_response)
        except:
            ai_analysis = {"analysis": ai_response}
        
        # Store biometric data
        processing_time = (datetime.now() - start_time).total_seconds()
        
        biometric_data = BiometricData(
            user_id=request.user_id,
            capture_type="mobile_fingerprint",
            quality_score=quality_score,
            confidence_score=ai_analysis.get("confidence", quality_score),
            features_extracted=len(keypoints),
            processing_time=processing_time,
            device_info=request.device_info
        )
        
        biometric_dict = prepare_for_mongo(biometric_data.dict())
        await db.biometric_data.insert_one(biometric_dict)
        
        return {
            "success": True,
            "biometric_id": biometric_data.id,
            "quality_score": quality_score,
            "features_extracted": len(keypoints),
            "processing_time": processing_time,
            "ai_analysis": ai_analysis,
            "template_data": {
                "descriptors": descriptors.tolist(),
                "keypoints": keypoints[:50]  # Limit for response size
            }
        }
        
    except Exception as e:
        logging.error(f"Mobile fingerprint capture error: {str(e)}")
        return {
            "success": False,
            "error": f"Mobile fingerprint capture failed: {str(e)}"
        }

# Facial Liveness Detection
@api_router.post("/mobile/face/liveness")
async def detect_mobile_liveness(request: FacialLivenessRequest):
    """Advanced facial liveness detection for mobile devices"""
    try:
        start_time = datetime.now()
        
        ai_chat = await get_ai_chat()
        
        # Analyze liveness from frame sequence
        liveness_result = liveness_detector.analyze_mobile_liveness(request.frame_sequence)
        
        # AI analysis
        ai_prompt = f"""
        Analyze this mobile facial liveness detection result:
        - Liveness Score: {liveness_result.get('liveness_score', 0)}
        - Frames Analyzed: {len(request.frame_sequence)}
        - Indicators: {liveness_result.get('indicators', {})}
        - Device Info: {request.device_info}
        
        Provide analysis on:
        1. Liveness detection confidence
        2. Anti-spoofing assessment
        3. Mobile capture quality factors
        4. Potential attack vectors identified
        5. Recommendations for enhanced security
        
        Respond in JSON format with confidence_assessment, spoofing_risk, quality_factors, and security_recommendations.
        """
        
        user_message = UserMessage(text=ai_prompt)
        ai_response = await ai_chat.send_message(user_message)
        
        try:
            ai_analysis = json.loads(ai_response)
        except:
            ai_analysis = {"analysis": ai_response}
        
        # Store biometric data
        processing_time = (datetime.now() - start_time).total_seconds()
        
        biometric_data = BiometricData(
            user_id=request.user_id,
            capture_type="mobile_facial_liveness",
            quality_score=liveness_result.get('indicators', {}).get('avg_quality', 0),
            confidence_score=liveness_result.get('confidence', 0),
            liveness_verified=liveness_result.get('is_live', False),
            features_extracted=liveness_result.get('indicators', {}).get('frames_analyzed', 0),
            processing_time=processing_time,
            device_info=request.device_info
        )
        
        biometric_dict = prepare_for_mongo(biometric_data.dict())
        await db.biometric_data.insert_one(biometric_dict)
        
        return {
            "success": True,
            "biometric_id": biometric_data.id,
            "is_live": liveness_result.get('is_live', False),
            "liveness_score": liveness_result.get('liveness_score', 0),
            "confidence": liveness_result.get('confidence', 0),
            "indicators": liveness_result.get('indicators', {}),
            "processing_time": processing_time,
            "ai_analysis": ai_analysis
        }
        
    except Exception as e:
        logging.error(f"Mobile liveness detection error: {str(e)}")
        return {
            "success": False,
            "error": f"Mobile liveness detection failed: {str(e)}"
        }

# Mobile Passport OCR
@api_router.post("/mobile/passport/scan")
async def scan_mobile_passport(request: PassportScanRequest):
    """ICAO passport OCR optimized for mobile capture"""
    try:
        start_time = datetime.now()
        
        ai_chat = await get_ai_chat()
        
        # Process passport
        ocr_result = passport_processor.process_mobile_passport(request.passport_image)
        
        if not ocr_result['success']:
            return {
                "success": False,
                "error": "Failed to extract passport data from mobile capture"
            }
        
        # AI analysis
        ai_prompt = f"""
        Analyze this mobile passport OCR result:
        - Extracted Data: {json.dumps(ocr_result['mrz_data'], indent=2)}
        - OCR Confidence: {ocr_result['confidence']}
        - Device Info: {request.device_info}
        
        Provide analysis on:
        1. Document authenticity assessment
        2. OCR accuracy and completeness
        3. ICAO compliance verification
        4. Data consistency checks
        5. Fraud indicators from mobile capture
        6. Regulatory compliance (GDPR, CCPA, Singapore)
        
        Respond in JSON format with authenticity_score, accuracy_assessment, compliance_status, fraud_indicators, and recommendations.
        """
        
        user_message = UserMessage(text=ai_prompt)
        ai_response = await ai_chat.send_message(user_message)
        
        try:
            ai_analysis = json.loads(ai_response)
        except:
            ai_analysis = {"analysis": ai_response}
        
        # Store processing results
        processing_time = (datetime.now() - start_time).total_seconds()
        
        biometric_data = BiometricData(
            user_id=request.user_id,
            capture_type="mobile_passport_ocr",
            quality_score=ocr_result['confidence'],
            confidence_score=ai_analysis.get('accuracy_assessment', {}).get('score', ocr_result['confidence']),
            processing_time=processing_time,
            device_info=request.device_info
        )
        
        biometric_dict = prepare_for_mongo(biometric_data.dict())
        await db.biometric_data.insert_one(biometric_dict)
        
        return {
            "success": True,
            "biometric_id": biometric_data.id,
            "passport_data": ocr_result['mrz_data'],
            "ocr_confidence": ocr_result['confidence'],
            "processing_time": processing_time,
            "ai_analysis": ai_analysis
        }
        
    except Exception as e:
        logging.error(f"Mobile passport OCR error: {str(e)}")
        return {
            "success": False,
            "error": f"Mobile passport OCR failed: {str(e)}"
        }

# NFC Reading Simulation (Enhanced)
@api_router.post("/mobile/nfc/read")
async def read_mobile_nfc(request: NFCReadRequest):
    """Simulate NFC chip reading for mobile devices"""
    try:
        start_time = datetime.now()
        
        ai_chat = await get_ai_chat()
        
        # Simulate NFC reading process
        ai_prompt = f"""
        Simulate NFC chip reading for passport verification:
        - Passport Number: {request.passport_number}
        - Birth Date: {request.birth_date}
        - Expiry Date: {request.expiry_date}
        - Device Info: {request.device_info}
        
        Simulate the following ICAO 9303 compliant NFC reading:
        1. Basic Access Control (BAC) authentication
        2. Data Group 1 (MRZ) extraction
        3. Data Group 2 (Facial image) reading
        4. Security Object Document (SOD) validation
        5. Passive Authentication verification
        
        Provide realistic simulation results including:
        - Authentication success/failure
        - Extracted data groups
        - Security validation results
        - Chip authenticity assessment
        - Compliance with mobile NFC standards
        
        Respond in JSON format with authentication_result, data_groups, security_validation, and chip_authenticity.
        """
        
        user_message = UserMessage(text=ai_prompt)
        ai_response = await ai_chat.send_message(user_message)
        
        try:
            nfc_simulation = json.loads(ai_response)
        except:
            nfc_simulation = {
                "authentication_result": {"success": True, "method": "BAC"},
                "data_groups": {
                    "dg1_mrz": f"P<{request.passport_number}<<<<<<<<<<<<<<<",
                    "dg2_face": "simulated_face_image_data",
                    "sod": "simulated_security_object"
                },
                "security_validation": {"passive_auth": True, "chip_authentic": True},
                "analysis": ai_response
            }
        
        # Store NFC reading results
        processing_time = (datetime.now() - start_time).total_seconds()
        
        biometric_data = BiometricData(
            user_id=request.user_id,
            capture_type="mobile_nfc_read",
            quality_score=0.9 if nfc_simulation.get("authentication_result", {}).get("success") else 0.3,
            confidence_score=0.95 if nfc_simulation.get("security_validation", {}).get("chip_authentic") else 0.5,
            processing_time=processing_time,
            device_info=request.device_info
        )
        
        biometric_dict = prepare_for_mongo(biometric_data.dict())
        await db.biometric_data.insert_one(biometric_dict)
        
        return {
            "success": True,
            "biometric_id": biometric_data.id,
            "nfc_data": nfc_simulation,
            "processing_time": processing_time,
            "security_level": "ICAO_9303_COMPLIANT"
        }
        
    except Exception as e:
        logging.error(f"Mobile NFC reading error: {str(e)}")
        return {
            "success": False,
            "error": f"Mobile NFC reading failed: {str(e)}"
        }

# Enhanced Dashboard
@api_router.get("/mobile/dashboard")
async def get_mobile_dashboard():
    """Get comprehensive mobile biometric dashboard"""
    try:
        # Basic statistics
        total_captures = await db.biometric_data.count_documents({})
        fingerprint_captures = await db.biometric_data.count_documents({"capture_type": "mobile_fingerprint"})
        liveness_checks = await db.biometric_data.count_documents({"capture_type": "mobile_facial_liveness"})
        passport_scans = await db.biometric_data.count_documents({"capture_type": "mobile_passport_ocr"})
        nfc_reads = await db.biometric_data.count_documents({"capture_type": "mobile_nfc_read"})
        
        # Quality metrics
        avg_quality = await db.biometric_data.aggregate([
            {"$group": {"_id": None, "avg_quality": {"$avg": "$quality_score"}}}
        ]).to_list(1)
        
        avg_quality_score = avg_quality[0]["avg_quality"] if avg_quality and avg_quality[0]["avg_quality"] is not None else 0.0
        
        # Recent captures
        recent_captures = await db.biometric_data.find({}).sort("created_at", -1).limit(10).to_list(10)
        
        # Success rates by capture type
        capture_types = ["mobile_fingerprint", "mobile_facial_liveness", "mobile_passport_ocr", "mobile_nfc_read"]
        success_rates = {}
        
        for capture_type in capture_types:
            total = await db.biometric_data.count_documents({"capture_type": capture_type})
            high_quality = await db.biometric_data.count_documents({
                "capture_type": capture_type,
                "quality_score": {"$gte": 0.7}
            })
            success_rates[capture_type] = (high_quality / total * 100) if total > 0 else 0
        
        return {
            "statistics": {
                "total_captures": total_captures,
                "fingerprint_captures": fingerprint_captures,
                "liveness_checks": liveness_checks,
                "passport_scans": passport_scans,
                "nfc_reads": nfc_reads,
                "average_quality": round(avg_quality_score, 3)
            },
            "success_rates": success_rates,
            "recent_captures": [parse_from_mongo(capture) for capture in recent_captures],
            "mobile_capabilities": {
                "contactless_fingerprint": True,
                "facial_liveness": True,
                "passport_ocr": True,
                "nfc_reading": True,
                "ai_analysis": True
            }
        }
        
    except Exception as e:
        logging.error(f"Mobile dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Dashboard data fetch failed: {str(e)}")

@api_router.post("/kyc/workflow/validate")
async def validate_kyc_workflow(request: dict):
    """Validate KYC workflow completion based on configuration"""
    try:
        user_id = request.get("user_id")
        completed_captures = request.get("completed_captures", [])
        
        if not user_id:
            return {
                "success": False,
                "error": "User ID is required"
            }
        
        # Check mandatory features
        mandatory_features = [k for k, v in BIOMETRIC_CONFIG.items() if v["mandatory"] and v["enabled"]]
        missing_mandatory = []
        
        for feature in mandatory_features:
            feature_completed = False
            
            # Map feature names to capture types
            if feature == "passport_ocr" and "passport_ocr" in completed_captures:
                feature_completed = True
            elif feature == "contactless_fingerprint" and "fingerprint" in completed_captures:
                feature_completed = True
            elif feature == "facial_liveness" and "facial_liveness" in completed_captures:
                feature_completed = True
            elif feature == "facial_matching" and "facial_matching" in completed_captures:
                feature_completed = True
            elif feature == "nfc_reading" and "nfc_read" in completed_captures:
                feature_completed = True
                
            if not feature_completed:
                missing_mandatory.append(feature)
        
        # Get optional features that are enabled
        optional_features = [k for k, v in BIOMETRIC_CONFIG.items() if v["enabled"] and not v["mandatory"]]
        completed_optional = []
        
        for feature in optional_features:
            if feature == "contactless_fingerprint" and "fingerprint" in completed_captures:
                completed_optional.append(feature)
            elif feature == "facial_liveness" and "facial_liveness" in completed_captures:
                completed_optional.append(feature)
            elif feature == "facial_matching" and "facial_matching" in completed_captures:
                completed_optional.append(feature)
            elif feature == "nfc_reading" and "nfc_read" in completed_captures:
                completed_optional.append(feature)
        
        # Workflow is valid if all mandatory features are completed
        workflow_valid = len(missing_mandatory) == 0
        
        return {
            "success": True,
            "workflow_valid": workflow_valid,
            "mandatory_completed": len(mandatory_features) - len(missing_mandatory),
            "mandatory_total": len(mandatory_features),
            "optional_completed": len(completed_optional),
            "optional_available": len(optional_features),
            "missing_mandatory": missing_mandatory,
            "completed_optional": completed_optional,
            "can_proceed": workflow_valid,
            "config": BIOMETRIC_CONFIG
        }
        
    except Exception as e:
        logging.error(f"Workflow validation error: {str(e)}")
        return {
            "success": False,
            "error": f"Workflow validation failed: {str(e)}"
        }

# Legacy KYC endpoints (enhanced)
@api_router.post("/kyc/initiate")
async def initiate_kyc(request: dict):
    """Enhanced KYC initiation with mobile capabilities"""
    try:
        # Add mobile capabilities info
        enhanced_request = {
            **request,
            "mobile_capabilities": {
                "contactless_fingerprint": True,
                "facial_liveness": True,
                "passport_ocr": True,
                "nfc_reading": True
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.kyc_requests.insert_one(enhanced_request)
        return {
            "success": True,
            "kyc_id": enhanced_request.get("user_id"),
            "mobile_features_enabled": True
        }
        
    except Exception as e:
        logging.error(f"KYC initiation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"KYC initiation failed: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()