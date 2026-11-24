from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.job_queue import job_queue
from app.core.config import settings
from app.services import transcription_service, ffmpeg_service
import os, uuid, logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subtitles", tags=["subtitles"])

class SubtitleRequest(BaseModel):
    file_path: str
    style: str = "modern"  # modern, shorts, default
    language: Optional[str] = None
    burn_in: bool = True
    output_format: str = "srt"  # srt, vtt

@router.post("/generate")
async def generate_subtitles(request: SubtitleRequest):
    """Generate subtitles for a video."""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=400, detail="Video file not found")
    
    async def _subtitle_job(job):
        job.progress = 5
        job.message = "Extracting audio..."
        
        audio_path = str(settings.TEMP_DIR / f"{job.id}_audio.wav")
        ok = await ffmpeg_service.extract_audio(request.file_path, audio_path)
        if not ok:
            raise Exception("Audio extraction failed")
        
        job.progress = 20
        job.message = "Transcribing..."
        
        transcript = await transcription_service.transcribe_audio(audio_path, language=request.language, job=job)
        if not transcript:
            raise Exception("Transcription failed")
        
        try:
            os.remove(audio_path)
        except:
            pass
        
        segments = transcript.get("segments", [])
        
        job.progress = 75
        job.message = "Generating subtitle files..."
        
        sub_id = str(uuid.uuid4())
        
        # Generate SRT
        srt_path = str(settings.TEMP_DIR / f"{sub_id}.srt")
        transcription_service.generate_srt(segments, srt_path)
        
        # Generate VTT
        vtt_path = str(settings.TEMP_DIR / f"{sub_id}.vtt")
        transcription_service.generate_vtt(segments, vtt_path)
        
        result = {
            "srt_path": srt_path,
            "vtt_path": vtt_path,
            "segments": segments,
            "language": transcript.get("language"),
            "word_count": transcript.get("word_count", 0),
        }
        
        # Burn subtitles
        if request.burn_in:
            job.progress = 80
            job.message = "Burning subtitles into video..."
            
            output_path = str(settings.OUTPUTS_DIR / f"subtitled_{sub_id}.mp4")
            ok = await ffmpeg_service.add_subtitles_to_video(
                request.file_path, output_path, srt_path, style=request.style
            )
            result["output_video"] = output_path if ok else None
        
        job.progress = 100
        return result
    
    job_id = job_queue.submit("subtitle_generation", _subtitle_job)
    return {"job_id": job_id}

@router.get("/styles")
def get_styles():
    return {
        "styles": [
            {"id": "default", "name": "Default", "description": "Clean white text with outline"},
            {"id": "modern", "name": "Modern", "description": "Bold white with dark background"},
            {"id": "shorts", "name": "YouTube Shorts", "description": "Impact font, yellow highlight"},
        ]
    }
