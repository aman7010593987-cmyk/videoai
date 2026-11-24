from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.job_queue import job_queue
from app.core.config import settings
from app.services import tts_service, ffmpeg_service
import os, uuid, logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voiceover", tags=["voiceover"])

class VoiceoverRequest(BaseModel):
    text: str
    voice_id: str = "en_US-lessac-medium"
    speed: float = 1.0
    project_id: Optional[str] = None

@router.get("/voices")
async def get_voices():
    """Get available TTS voices."""
    voices = tts_service.get_available_voices()
    piper = tts_service.find_piper()
    return {
        "voices": voices,
        "piper_available": piper is not None,
        "piper_path": piper,
        "note": "Windows SAPI TTS used as fallback if Piper not installed"
    }

@router.post("/generate")
async def generate_voiceover(request: VoiceoverRequest):
    """Generate a voiceover from text."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    async def _tts_job(job):
        job.progress = 10
        job.message = "Generating voiceover..."
        
        output_id = str(uuid.uuid4())
        output_dir = settings.AUDIO_DIR
        output_path = str(output_dir / f"{output_id}.wav")
        
        ok = await tts_service.generate_tts(
            text=request.text,
            output_path=output_path,
            voice_id=request.voice_id,
            speed=request.speed,
            job=job
        )
        
        if not ok:
            raise Exception("TTS generation failed")
        
        job.progress = 100
        return {
            "audio_path": output_path,
            "audio_id": output_id,
            "file_exists": os.path.exists(output_path),
        }
    
    job_id = job_queue.submit("voiceover", _tts_job)
    return {"job_id": job_id}

@router.get("/preview")
async def preview_text(text: str, max_chars: int = 200):
    """Quick preview info for TTS text."""
    words = len(text.split())
    estimated_duration = words / 2.5  # ~2.5 words/second
    return {
        "word_count": words,
        "char_count": len(text),
        "estimated_duration_seconds": round(estimated_duration, 1),
    }
