from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.job_queue import job_queue
from app.core.config import settings
from app.services import youtube_service, ffmpeg_service, transcription_service, highlight_service
import os, uuid, logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/youtube", tags=["youtube"])

class YouTubeRequest(BaseModel):
    url: str
    max_clips: int = 10
    clip_durations: list = [15, 30, 45, 60]
    vertical: bool = True

@router.post("/info")
async def get_video_info(data: dict):
    """Get YouTube video metadata without downloading."""
    url = data.get("url", "")
    if not youtube_service.validate_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    info = await youtube_service.get_youtube_info(url)
    if not info:
        raise HTTPException(status_code=400, detail="Could not fetch video information. Check URL and internet connection.")
    return info

@router.post("/process")
async def process_youtube(request: YouTubeRequest):
    """Full YouTube to Shorts pipeline."""
    if not youtube_service.validate_youtube_url(request.url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    async def _process_job(job):
        project_id = str(uuid.uuid4())
        
        # Download
        job.progress = 5
        job.message = "Downloading video..."
        
        download_dir = str(settings.TEMP_DIR / project_id)
        result = await youtube_service.download_youtube(request.url, download_dir, job=job)
        
        if not result:
            raise Exception("Download failed. Check internet connection and URL.")
        
        file_path = result["file_path"]
        job.metadata["file_path"] = file_path
        job.metadata["title"] = result["title"]
        job.metadata["project_id"] = project_id
        
        # Extract audio
        job.progress = 30
        job.message = "Extracting audio for transcription..."
        
        audio_path = str(settings.TEMP_DIR / f"{project_id}.wav")
        ok = await ffmpeg_service.extract_audio(file_path, audio_path)
        if not ok:
            raise Exception("Audio extraction failed")
        
        # Transcribe
        job.progress = 40
        job.message = "Transcribing speech..."
        
        transcript = await transcription_service.transcribe_audio(audio_path, job=job)
        if not transcript:
            raise Exception("Transcription failed")
        
        try:
            os.remove(audio_path)
        except:
            pass
        
        # Detect highlights
        job.progress = 70
        job.message = "Detecting highlight moments..."
        
        highlights = highlight_service.analyze_transcript_for_highlights(
            transcript.get("segments", []),
            max_clips=request.max_clips,
            target_durations=request.clip_durations,
        )
        
        highlight_dicts = [
            {
                "start_time": h.start_time,
                "end_time": h.end_time,
                "duration": round(h.end_time - h.start_time, 2),
                "score": h.score,
                "highlight_type": h.highlight_type,
                "title": h.title,
                "explanation": h.explanation,
                "transcript_text": h.transcript_text,
            }
            for h in highlights
        ]
        
        job.progress = 90
        job.message = "Analysis complete - ready to generate clips"
        
        return {
            "project_id": project_id,
            "file_path": file_path,
            "video_title": result["title"],
            "duration": result["duration"],
            "transcript": transcript,
            "highlights": highlight_dicts,
            "highlight_count": len(highlight_dicts),
        }
    
    job_id = job_queue.submit("youtube_process", _process_job, metadata={"url": request.url})
    return {"job_id": job_id}

@router.get("/validate")
async def validate_url(url: str):
    """Validate a YouTube URL."""
    valid = youtube_service.validate_youtube_url(url)
    return {"valid": valid, "url": url}
