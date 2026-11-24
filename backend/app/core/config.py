import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "VIRA AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/storage/vira.db"
    
    # Storage paths
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOADS_DIR: Path = BASE_DIR / "storage" / "uploads"
    OUTPUTS_DIR: Path = BASE_DIR / "storage" / "outputs"
    TEMP_DIR: Path = BASE_DIR / "storage" / "temp"
    THUMBNAILS_DIR: Path = BASE_DIR / "storage" / "thumbnails"
    AUDIO_DIR: Path = BASE_DIR / "storage" / "audio"
    
    # FFmpeg
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"
    
    # Whisper
    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    
    # Processing
    MAX_UPLOAD_SIZE_MB: int = 2000
    MAX_CONCURRENT_JOBS: int = 2
    
    # Export quality defaults
    DEFAULT_CRF: int = 18
    DEFAULT_PRESET: str = "medium"
    DEFAULT_AUDIO_BITRATE: str = "192k"
    
    class Config:
        env_file = str(BASE_DIR / ".env")
        case_sensitive = True

settings = Settings()

# Create storage dirs
for d in [settings.UPLOADS_DIR, settings.OUTPUTS_DIR, settings.TEMP_DIR,
          settings.THUMBNAILS_DIR, settings.AUDIO_DIR]:
    d.mkdir(parents=True, exist_ok=True)
