from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from pathlib import Path
import os, uuid, shutil
from app.core.database import get_db
from app.core.job_queue import job_queue
from app.core.config import settings
from app.models.project import Project
from app.models.export import VideoClip
from app.services import ffmpeg_service, transcription_service, highlight_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video", tags=["video"])

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a video file."""
    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp4", ".mov", ".mkv", ".webm", ".avi"]:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")
    
    upload_id = str(uuid.uuid4())
    dest_dir = settings.UPLOADS_DIR / upload_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"source{ext}"
    
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # Get video info
    info = ffmpeg_service.get_video_info(str(dest_path))
    
    # Create thumbnail
    thumb_path = settings.THUMBNAILS_DIR / f"{upload_id}.jpg"
    await ffmpeg_service.create_thumbnail(str(dest_path), str(thumb_path), time_offset=min(2.0, info.get("duration", 2)/2))
    
    # Create project if not given
    if not project_id:
        project = Project(
            id=str(uuid.uuid4()),
            name=Path(file.filename).stem,
            project_type="upload_clip",
            source_file=str(dest_path),
            thumbnail_path=str(thumb_path) if thumb_path.exists() else None,
        )
        db.add(project)
        db.commit()
        project_id = project.id
    
    return {
        "upload_id": upload_id,
        "project_id": project_id,
        "file_path": str(dest_path),
        "thumbnail_path": str(thumb_path) if thumb_path.exists() else None,
        "filename": file.filename,
        "info": info,
    }

@router.post("/analyze")
async def analyze_video(data: dict, db: Session = Depends(get_db)):
    """Start video analysis (transcription + highlight detection)."""
    file_path = data.get("file_path")
    project_id = data.get("project_id")
    max_clips = data.get("max_clips", 10)
    clip_durations = data.get("clip_durations", [15, 30, 45, 60])
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="File not found")
    
    async def _analyze_job(job):
        job.progress = 5
        job.message = "Extracting audio..."
        
        # Extract audio
        audio_path = str(settings.TEMP_DIR / f"{job.id}.wav")
        ok = await ffmpeg_service.extract_audio(file_path, audio_path)
        if not ok:
            raise Exception("Audio extraction failed")
        
        job.progress = 20
        job.message = "Transcribing audio..."
        
        transcript = await transcription_service.transcribe_audio(audio_path, job=job)
        if not transcript:
            raise Exception("Transcription failed")
        
        # Clean up audio
        try:
            os.remove(audio_path)
        except:
            pass
        
        job.progress = 70
        job.message = "Detecting highlights..."
        
        highlights = highlight_service.analyze_transcript_for_highlights(
            transcript.get("segments", []),
            max_clips=max_clips,
            target_durations=clip_durations,
        )
        
        job.progress = 90
        job.message = "Analysis complete"
        
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
        
        return {
            "transcript": transcript,
            "highlights": highlight_dicts,
            "highlight_count": len(highlight_dicts),
        }
    
    job_id = job_queue.submit("analyze_video", _analyze_job, metadata={"project_id": project_id})
    return {"job_id": job_id}

@router.post("/generate-clips")
async def generate_clips(data: dict, db: Session = Depends(get_db)):
    """Generate video clips from highlights."""
    file_path = data.get("file_path")
    project_id = data.get("project_id")
    highlights = data.get("highlights", [])
    vertical = data.get("vertical", True)
    add_subtitles = data.get("add_subtitles", False)
    transcript = data.get("transcript", {})
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="File not found")
    if not highlights:
        raise HTTPException(status_code=400, detail="No highlights provided")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id required")
    
    async def _generate_job(job):
        output_clips = []
        total = len(highlights)
        
        for i, h in enumerate(highlights):
            job.progress = int(i / total * 90)
            job.message = f"Generating clip {i+1}/{total}..."
            
            clip_id = str(uuid.uuid4())
            clip_dir = settings.OUTPUTS_DIR / project_id / "clips"
            clip_dir.mkdir(parents=True, exist_ok=True)
            
            clip_path = str(clip_dir / f"clip_{clip_id}.mp4")
            
            ok = await ffmpeg_service.extract_clip(
                input_path=file_path,
                output_path=clip_path,
                start=h["start_time"],
                end=h["end_time"],
                vertical=vertical,
                crf=18,
                job=job
            )
            
            if not ok:
                logger.error(f"Failed to generate clip {i+1}")
                continue
            
            # Thumbnail
            thumb_path = str(settings.THUMBNAILS_DIR / f"clip_{clip_id}.jpg")
            await ffmpeg_service.create_thumbnail(clip_path, thumb_path)
            
            # Save to DB
            clip = VideoClip(
                id=clip_id,
                project_id=project_id,
                title=h.get("title", f"Clip {i+1}"),
                file_path=clip_path,
                thumbnail_path=thumb_path if os.path.exists(thumb_path) else None,
                start_time=h["start_time"],
                end_time=h["end_time"],
                duration=h["end_time"] - h["start_time"],
                highlight_type=h.get("highlight_type", "general"),
                highlight_score=h.get("score", 0.0),
                explanation=h.get("explanation", ""),
                transcript_segment=h.get("transcript_text", ""),
                is_vertical=vertical,
            )
            db.add(clip)
            db.commit()
            
            output_clips.append(clip.to_dict())
        
        # Update project clip count
        proj = db.query(Project).filter(Project.id == project_id).first()
        if proj:
            proj.video_count = db.query(VideoClip).filter(VideoClip.project_id == project_id).count()
            db.commit()
        
        job.progress = 100
        job.message = f"Generated {len(output_clips)} clips"
        
        return {"clips": output_clips, "count": len(output_clips)}
    
    job_id = job_queue.submit("generate_clips", _generate_job, metadata={"project_id": project_id})
    return {"job_id": job_id}

@router.get("/clips/{project_id}")
def get_project_clips(project_id: str, db: Session = Depends(get_db)):
    clips = db.query(VideoClip).filter(VideoClip.project_id == project_id).all()
    return {"clips": [c.to_dict() for c in clips]}

@router.post("/test-video")
async def create_test_video():
    """Create a synthetic test video using FFmpeg."""
    output_path = str(settings.OUTPUTS_DIR / "test_video.mp4")
    ok = await ffmpeg_service.create_test_video(output_path, duration=15)
    if ok:
        return {"success": True, "file_path": output_path}
    raise HTTPException(status_code=500, detail="Failed to create test video")

@router.get("/info")
async def get_video_info(file_path: str):
    """Get video metadata."""
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    info = ffmpeg_service.get_video_info(file_path)
    return info
