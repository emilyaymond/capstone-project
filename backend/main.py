from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from api import chat

def init_db():
    """Initialize database if needed - placeholder for now"""
    pass

def create_app() -> FastAPI:
    """Create and configure FastAPI application with all middleware and routes"""
    app = _create_base_app()
    
    init_db()
    _configure_middleware(app)
    _configure_routes(app)
    
    return app

def _create_base_app() -> FastAPI:
    """Create base FastAPI application with metadata"""
    return FastAPI(
        title="HealthVisAPI",
        description="HealthVis",
        version="1.0.0"
    )

def _configure_middleware(app: FastAPI) -> None:
    """Configure CORS and other middleware"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

def _configure_routes(app: FastAPI) -> None:
    """Configure all API routes"""
    app.include_router(chat.router, prefix="/api", tags=["Chat"])

app = create_app()

@app.get("/")
async def root():
    """API root endpoint with available endpoints"""
    return {
        "message": "HealthVis API is running",
        "version": "1.0.0",
        "endpoints": _get_api_endpoints()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with system status"""
    return {
        "status": "healthy",
        "ai_service": settings.ai_service,
        "api_configured": bool(settings.groq_api_key or settings.ppx_api_key),
        "max_file_size_mb": settings.max_file_size // (1024 * 1024)
    }

def _get_api_endpoints() -> dict:
    """Get available API endpoints"""
    return {
        "chat": "/api/chat"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 