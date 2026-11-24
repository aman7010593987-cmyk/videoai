from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.job_queue import job_queue
from app.core.config import settings
from app.services import ffmpeg_service
from app.models.export import Export
from app.core.database import SessionLocal
import os, uuid, logging, shutil
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])

class ExportRequest(BaseModel):
    file_path: str
    preset: str = "youtube_1080p"
    quality: str = "high"
    project_id: Optional[str] = None
    name: Optional[str] = None
    normalize_audio: bool = True

PRESETS = {
    "youtube_1080p": {"name": "YouTube 1080p", "width": 1920, "height": 1080, "fps": 30},
    "youtube_4k": {"name": "YouTube 4K", "width": 3840, "height": 2160, "fps": 30},
    "youtube_shorts": {"name": "YouTube Shorts", "width": 1080, "height": 1920, "fps": 30},
    "instagram_reels": {"name": "Instagram Reels", "width": 1080, "height": 1920, "fps": 30},
    "tiktok": {"name": "TikTok", "width": 1080, "height": 1920, "fps": 30},
}

@router.get("/presets")
def get_presets():
    return {"presets": PRESETS}

@router.post("/video")
async def export_video(request: ExportRequest):
    """Export a video with professional quality settings."""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=400, detail="Source file not found")
    
    if request.preset not in PRESETS:
        raise HTTPException(status_code=400, detail=f"Invalid preset. Choose: {list(PRESETS.keys())}")
    
    async def _export_job(job):
        job.progress = 5
        job.message = "Preparing export..."
        
        export_id = str(uuid.uuid4())
        export_name = request.name or f"export_{export_id[:8]}"
        output_path = str(settings.OUTPUTS_DIR / "exports" / f"{export_name}.mp4")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Normalize audio if requested
        input_path = request.file_path
        if request.normalize_audio:
            job.progress = 10
            job.message = "Normalizing audio..."
            norm_path = str(settings.TEMP_DIR / f"norm_{export_id}.mp4")
            ok = await ffmpeg_service.normalize_audio(input_path, norm_path)
            if ok and os.path.exists(norm_path):
                input_path = norm_path
        
        job.progress = 20
        job.message = f"Exporting {request.preset} ({request.quality} quality)..."
        
        async def progress_cb(pct):
            job.progress = 20 + int(pct * 0.75)
            job.message = f"Encoding: {job.progress}%"
        
        ok = await ffmpeg_service.export_video(
            input_path=input_path,
            output_path=output_path,
            preset=request.preset,
            quality=request.quality
        )
        
        # Cleanup temp norm file
        if request.normalize_audio:
            try:
                os.remove(str(settings.TEMP_DIR / f"norm_{export_id}.mp4"))
            except:
                pass
        
        if not ok:
            raise Exception("Export encoding failed")
        
        # Verify output
        if not os.path.exists(output_path):
            raise Exception("Output file was not created")
        
        file_size = os.path.getsize(output_path)
        if file_size < 1000:
            raise Exception("Output file is too small - encoding may have failed")
        
        info = ffmpeg_service.get_video_info(output_path)
        
        # Create thumbnail
        thumb_path = str(settings.THUMBNAILS_DIR / f"export_{export_id}.jpg")
        await ffmpeg_service.create_thumbnail(output_path, thumb_path)
        
        # Save to DB
        db = SessionLocal()
        try:
            export_record = Export(
                id=export_id,
                project_id=request.project_id,
                name=export_name,
                file_path=output_path,
                thumbnail_path=thumb_path if os.path.exists(thumb_path) else None,
                file_size=file_size,
                duration=info.get("duration", 0),
                width=info.get("width", 0),
                height=info.get("height", 0),
                fps=info.get("fps", 0),
                preset=request.preset,
                quality=request.quality,
            )
            db.add(export_record)
            db.commit()
        finally:
            db.close()
        
        job.progress = 100
        return {
            "export_id": export_id,
            "file_path": output_path,
            "file_size": file_size,
            "file_size_mb": round(file_size / 1024 / 1024, 2),
            "duration": info.get("duration", 0),
            "width": info.get("width", 0),
            "height": info.get("height", 0),
            "preset": request.preset,
            "quality": request.quality,
            "verified": True,
        }
    
    job_id = job_queue.submit("export", _export_job, metadata={"preset": request.preset})
    return {"job_id": job_id}

@router.get("/history")
def get_export_history(limit: int = 50):
    db = SessionLocal()
    try:
        exports = db.query(Export).order_by(Export.created_at.desc()).limit(limit).all()
        return {"exports": [e.to_dict() for e in exports]}
    finally:
        db.close()
