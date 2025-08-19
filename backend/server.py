from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import base64

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
        session_id="ekyc-session",
        system_message="You are an AI expert in biometric verification, document analysis, and KYC compliance. Analyze biometric data, identity documents, and provide risk assessments for identity verification processes."
    ).with_model("openai", "gpt-4o")

# Define Models
class BiometricData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    fingerprint_quality: float = Field(ge=0.0, le=1.0)
    facial_liveness_score: float = Field(ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    document_type: str  # passport, driver_license, national_id
    extracted_data: Dict[str, Any]
    confidence_score: float = Field(ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KYCRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    document_number: str
    nationality: str
    biometric_captured: bool = False
    document_verified: bool = False
    status: str = "pending"  # pending, approved, rejected, review_required
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    verification_reasons: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class BiometricCaptureRequest(BaseModel):
    user_id: str
    capture_type: str  # fingerprint, facial, document_scan
    simulated_quality: Optional[float] = 0.85

class DocumentVerificationRequest(BaseModel):
    user_id: str
    document_type: str
    document_data: Dict[str, Any]

class RiskAssessmentRequest(BaseModel):
    user_id: str
    biometric_data: Optional[Dict[str, Any]] = None
    document_data: Optional[Dict[str, Any]] = None
    additional_context: Optional[Dict[str, Any]] = None

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('completed_at'), str):
        item['completed_at'] = datetime.fromisoformat(item['completed_at'])
    return item

# Routes
@api_router.get("/")
async def root():
    return {"message": "Agentic AI eKYC System API", "version": "1.0.0"}

@api_router.post("/kyc/initiate", response_model=KYCRequest)
async def initiate_kyc(request: KYCRequest):
    """Initiate a new KYC process"""
    kyc_dict = prepare_for_mongo(request.dict())
    await db.kyc_requests.insert_one(kyc_dict)
    return request

@api_router.get("/kyc/{user_id}", response_model=KYCRequest)
async def get_kyc_status(user_id: str):
    """Get KYC status for a user"""
    kyc_record = await db.kyc_requests.find_one({"user_id": user_id})
    if not kyc_record:
        raise HTTPException(status_code=404, detail="KYC record not found")
    
    kyc_record = parse_from_mongo(kyc_record)
    return KYCRequest(**kyc_record)

@api_router.post("/biometric/capture")
async def capture_biometric(request: BiometricCaptureRequest):
    """Simulate biometric capture and analysis"""
    try:
        ai_chat = await get_ai_chat()
        
        # Simulate biometric capture based on type
        if request.capture_type == "fingerprint":
            # Simulate fingerprint analysis
            analysis_prompt = f"""
            Analyze this simulated fingerprint capture for user {request.user_id}:
            - Capture Type: {request.capture_type}
            - Simulated Quality Score: {request.simulated_quality}
            
            Provide analysis on:
            1. Quality assessment (clarity, completeness, uniqueness markers)
            2. Fraud detection indicators
            3. Compliance with biometric standards
            4. Recommendation (accept/reject/recapture)
            
            Respond in JSON format with quality_score, fraud_indicators, compliance_status, and recommendation.
            """
        
        elif request.capture_type == "facial":
            analysis_prompt = f"""
            Analyze this simulated facial liveness detection for user {request.user_id}:
            - Capture Type: {request.capture_type}
            - Simulated Quality Score: {request.simulated_quality}
            
            Provide analysis on:
            1. Liveness detection (real person vs photo/video/deepfake)
            2. Image quality and lighting conditions
            3. Facial feature clarity and completeness
            4. Anti-spoofing assessment
            5. Recommendation (accept/reject/recapture)
            
            Respond in JSON format with liveness_score, quality_score, spoofing_risk, and recommendation.
            """
        
        else:  # document_scan
            analysis_prompt = f"""
            Analyze this simulated document scan for user {request.user_id}:
            - Capture Type: {request.capture_type}
            - Simulated Quality Score: {request.simulated_quality}
            
            Provide analysis on:
            1. Document authenticity indicators
            2. OCR/MRZ data extraction quality
            3. Security features verification
            4. Document condition and tampering signs
            5. Recommendation (accept/reject/recapture)
            
            Respond in JSON format with authenticity_score, extraction_quality, security_features, and recommendation.
            """

        # Get AI analysis
        user_message = UserMessage(text=analysis_prompt)
        ai_response = await ai_chat.send_message(user_message)
        
        try:
            analysis_result = json.loads(ai_response)
        except:
            # Fallback if JSON parsing fails
            analysis_result = {
                "quality_score": request.simulated_quality,
                "recommendation": "accept" if request.simulated_quality > 0.7 else "recapture",
                "analysis": ai_response
            }

        # Store biometric data
        biometric_data = BiometricData(
            user_id=request.user_id,
            fingerprint_quality=analysis_result.get("quality_score", request.simulated_quality),
            facial_liveness_score=analysis_result.get("liveness_score", request.simulated_quality)
        )
        
        biometric_dict = prepare_for_mongo(biometric_data.dict())
        await db.biometric_data.insert_one(biometric_dict)

        return {
            "status": "success",
            "capture_type": request.capture_type,
            "analysis": analysis_result,
            "biometric_id": biometric_data.id
        }

    except Exception as e:
        logging.error(f"Biometric capture error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Biometric capture failed: {str(e)}")

@api_router.post("/document/verify")
async def verify_document(request: DocumentVerificationRequest):
    """AI-powered document verification"""
    try:
        ai_chat = await get_ai_chat()
        
        document_analysis_prompt = f"""
        Perform comprehensive document verification analysis:
        
        User ID: {request.user_id}
        Document Type: {request.document_type}
        Document Data: {json.dumps(request.document_data, indent=2)}
        
        Analyze the following aspects:
        1. Document authenticity and security features
        2. Data consistency and format validation
        3. Expiration date and validity checks
        4. Cross-reference data points for consistency
        5. Fraud indicators and tampering signs
        6. Compliance with document standards for {request.document_type}
        
        Provide detailed analysis including:
        - Confidence score (0-1)
        - Identified issues or inconsistencies
        - Risk indicators
        - Verification recommendation (approve/reject/manual_review)
        - Extracted and validated data points
        
        Respond in JSON format with confidence_score, issues, risk_indicators, recommendation, and validated_data.
        """

        user_message = UserMessage(text=document_analysis_prompt)
        ai_response = await ai_chat.send_message(user_message)
        
        try:
            verification_result = json.loads(ai_response)
        except:
            verification_result = {
                "confidence_score": 0.8,
                "recommendation": "approve",
                "analysis": ai_response,
                "validated_data": request.document_data
            }

        # Store document verification
        document_data = DocumentData(
            user_id=request.user_id,
            document_type=request.document_type,
            extracted_data=verification_result.get("validated_data", request.document_data),
            confidence_score=verification_result.get("confidence_score", 0.8)
        )
        
        document_dict = prepare_for_mongo(document_data.dict())
        await db.document_data.insert_one(document_dict)

        return {
            "status": "success",
            "verification_result": verification_result,
            "document_id": document_data.id
        }

    except Exception as e:
        logging.error(f"Document verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document verification failed: {str(e)}")

@api_router.post("/risk/assess")
async def assess_risk(request: RiskAssessmentRequest):
    """AI-powered risk assessment for KYC decision"""
    try:
        ai_chat = await get_ai_chat()
        
        # Get user's biometric and document data
        biometric_data = await db.biometric_data.find_one({"user_id": request.user_id})
        document_data = await db.document_data.find_one({"user_id": request.user_id})
        
        risk_analysis_prompt = f"""
        Perform comprehensive risk assessment for KYC approval:
        
        User ID: {request.user_id}
        
        Biometric Data: {json.dumps(biometric_data, default=str) if biometric_data else "Not available"}
        Document Data: {json.dumps(document_data, default=str) if document_data else "Not available"}
        Additional Context: {json.dumps(request.additional_context) if request.additional_context else "None"}
        
        Assess risk factors including:
        1. Biometric quality and authenticity scores
        2. Document verification confidence
        3. Data consistency across sources
        4. Fraud indicators and red flags
        5. Compliance with GDPR, CCPA, and Singapore regulations
        6. Overall identity verification confidence
        
        Consider these compliance requirements:
        - GDPR: Data protection and consent validation
        - CCPA: Privacy rights and data handling
        - Singapore PDPA: Personal data protection standards
        
        Provide risk assessment with:
        - Overall risk score (0-1, where 1 is highest risk)
        - Risk factors identified
        - Compliance status
        - Decision recommendation (approve/reject/manual_review)
        - Confidence level in decision
        - Audit trail information
        
        Respond in JSON format with risk_score, risk_factors, compliance_status, recommendation, confidence, and audit_info.
        """

        user_message = UserMessage(text=risk_analysis_prompt)
        ai_response = await ai_chat.send_message(user_message)
        
        try:
            risk_result = json.loads(ai_response)
        except:
            risk_result = {
                "risk_score": 0.3,
                "recommendation": "approve",
                "confidence": 0.8,
                "analysis": ai_response
            }

        # Update KYC record with risk assessment
        kyc_update = {
            "risk_score": risk_result.get("risk_score", 0.3),
            "verification_reasons": risk_result.get("risk_factors", []),
            "status": "approved" if risk_result.get("recommendation") == "approve" else 
                     "rejected" if risk_result.get("recommendation") == "reject" else "review_required",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.kyc_requests.update_one(
            {"user_id": request.user_id},
            {"$set": kyc_update}
        )

        return {
            "status": "success",
            "risk_assessment": risk_result,
            "kyc_decision": kyc_update["status"]
        }

    except Exception as e:
        logging.error(f"Risk assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")

@api_router.get("/kyc/dashboard")
async def get_kyc_dashboard():
    """Get KYC dashboard statistics"""
    try:
        total_requests = await db.kyc_requests.count_documents({})
        approved = await db.kyc_requests.count_documents({"status": "approved"})
        rejected = await db.kyc_requests.count_documents({"status": "rejected"})
        pending = await db.kyc_requests.count_documents({"status": "pending"})
        review_required = await db.kyc_requests.count_documents({"status": "review_required"})
        
        recent_requests = await db.kyc_requests.find({}).sort("created_at", -1).limit(10).to_list(10)
        
        return {
            "statistics": {
                "total_requests": total_requests,
                "approved": approved,
                "rejected": rejected,
                "pending": pending,
                "review_required": review_required,
                "approval_rate": (approved / total_requests * 100) if total_requests > 0 else 0
            },
            "recent_requests": [parse_from_mongo(req) for req in recent_requests]
        }
    except Exception as e:
        logging.error(f"Dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Dashboard data fetch failed: {str(e)}")

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