from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from services.client import ai_client

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    data: Optional[Dict[str, Any]] = None
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[Dict[str, Any]]] = None
    analysis: Optional[Dict[str, Any]] = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Chat endpoint for AI-powered health data analysis"""
    try:
        if request.data:
            # If health data is provided, analyze it
            analysis = await ai_client.analyze_health_data(request.data, request.message)
            
            # Generate chart suggestions if data is present
            suggestions = await ai_client.generate_chart_suggestions(request.data)
            
            return ChatResponse(
                response=analysis["analysis"],
                analysis=analysis,
                suggestions=suggestions
            )
        else:
            # General health-related chat without specific data
            response = await ai_client.analyze_health_data({}, request.message)
            return ChatResponse(response=response["analysis"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_data(data: Dict[str, Any]):
    """Dedicated endpoint for health data analysis"""
    try:
        analysis = await ai_client.analyze_health_data(data)
        suggestions = await ai_client.generate_chart_suggestions(data)
        
        return {
            "analysis": analysis,
            "chart_suggestions": suggestions,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-data")
async def upload_health_data(file: UploadFile = File(...)):
    """Upload and analyze health data files (CSV, JSON)"""
    try:
        # Read file content
        content = await file.read()
        
        # Parse based on file type
        if file.filename.endswith('.json'):
            import json
            data = json.loads(content.decode('utf-8'))
        elif file.filename.endswith('.csv'):
            # Basic CSV parsing - you might want to use pandas for more complex cases
            import csv
            import io
            csv_data = csv.DictReader(io.StringIO(content.decode('utf-8')))
            data = list(csv_data)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Use JSON or CSV.")
        
        # Analyze the uploaded data
        analysis = await ai_client.analyze_health_data(data)
        suggestions = await ai_client.generate_chart_suggestions(data)
        
        return {
            "filename": file.filename,
            "analysis": analysis,
            "chart_suggestions": suggestions,
            "data_preview": data[:5] if isinstance(data, list) else data,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")