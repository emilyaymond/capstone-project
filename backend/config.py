import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # AI Service Configuration
    openai_api_key: str = ""
    groq_api_key: str = ""
    ppx_api_key: str = ""
    ai_service: str = "perplexity"
    
    # File Upload Configuration
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # CORS Configuration
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()