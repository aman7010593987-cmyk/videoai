from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.job_queue import job_queue
from app.core.config import settings
from app.services import ai_service, tts_service, ffmpeg_service
import os, uuid, asyncio, logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/text-to-video", tags=["text_to_video"])

class TextToVideoRequest(BaseModel):
    prompt: str
    duration: int = 60
    style: str = "motivational"
    aspect_ratio: str = "16:9"
    voice_id: str = "en_US-lessac-medium"
    include_subtitles: bool = True

STYLES = [
    "cinematic", "documentary", "motivational", "educational",
    "news", "storytelling", "gaming", "cartoon", "historical"
]

@router.get("/styles")
def get_styles():
    return {"styles": STYLES}

@router.post("/generate")
async def generate_video(request: TextToVideoRequest):
    """Generate a video from a text prompt."""
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    if request.duration < 10 or request.duration > 300:
        raise HTTPException(status_code=400, detail="Duration must be 10-300 seconds")
    
    async def _t2v_job(job):
        project_id = str(uuid.uuid4())
        output_dir = settings.OUTPUTS_DIR / project_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Step 1: Generate script
        job.progress = 5
        job.message = "Generating script with AI..."
        
        script_data = await ai_service.generate_video_script(
            prompt=request.prompt,
            duration=request.duration,
            style=request.style,
            num_scenes=max(3, request.duration // 15)
        )
        
        # Step 2: Generate voiceover per scene
        job.progress = 20
        job.message = "Generating voiceovers..."
        
        audio_clips = []
        for i, scene in enumerate(script_data["scenes"]):
            audio_path = str(output_dir / f"audio_{i:03d}.wav")
            ok = await tts_service.generate_tts(
                text=scene["narration"],
                output_path=audio_path,
                voice_id=request.voice_id
            )
            if ok and os.path.exists(audio_path):
                audio_clips.append({"index": i, "path": audio_path, "scene": scene})
            job.progress = 20 + int(i / len(script_data["scenes"]) * 30)
        
        # Step 3: Create visual slides (colored backgrounds with text)
        job.progress = 50
        job.message = "Creating visual scenes..."
        
        video_clips = []
        for i, item in enumerate(audio_clips):
            scene = item["scene"]
            clip_path = str(output_dir / f"scene_{i:03d}.mp4")
            
            # Get audio duration
            audio_info = ffmpeg_service.get_video_info(item["path"])
            scene_dur = audio_info.get("duration", scene["duration"])
            
            # Create colored slide with text using FFmpeg
            w, h = _get_dimensions(request.aspect_ratio)
            color = _get_style_color(request.style, i)
            
            # Create scene video from audio + colored background
            ffmpeg_args = [
                "-y",
                "-f", "lavfi",
                "-i", f"color=c={color}:s={w}x{h}:d={scene_dur:.2f}",
                "-i", item["path"],
                "-shortest",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                "-vf", f"drawtext=text='{_safe_text(scene['visual_description'][:60])}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=10",
                clip_path
            ]
            
            ok = await ffmpeg_service.run_ffmpeg(ffmpeg_args)
            if ok:
                video_clips.append(clip_path)
            
            job.progress = 50 + int(i / len(audio_clips) * 35)
        
        if not video_clips:
            raise Exception("Failed to generate any video scenes")
        
        # Step 4: Concatenate all clips
        job.progress = 85
        job.message = "Assembling final video..."
        
        concat_list = str(output_dir / "concat.txt")
        with open(concat_list, "w") as f:
            for clip in video_clips:
                f.write(f"file '{clip.replace(chr(92), '/')}'\n")
        
        final_path = str(output_dir / f"final_{project_id[:8]}.mp4")
        concat_args = [
            "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list,
            "-c", "copy",
            final_path
        ]
        ok = await ffmpeg_service.run_ffmpeg(concat_args)
        
        if not ok:
            raise Exception("Video concatenation failed")
        
        # Create thumbnail
        thumb_path = str(settings.THUMBNAILS_DIR / f"{project_id}.jpg")
        await ffmpeg_service.create_thumbnail(final_path, thumb_path)
        
        job.progress = 100
        return {
            "project_id": project_id,
            "video_path": final_path,
            "thumbnail_path": thumb_path if os.path.exists(thumb_path) else None,
            "script": script_data,
            "scenes_count": len(video_clips),
            "note": "Video created using AI-generated script + voiceover + visual slides (not AI image generation)"
        }
    
    job_id = job_queue.submit("text_to_video", _t2v_job, metadata={"prompt": request.prompt[:100]})
    return {"job_id": job_id}

def _get_dimensions(aspect_ratio: str):
    ratios = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080)}
    return ratios.get(aspect_ratio, (1920, 1080))

def _get_style_color(style: str, index: int):
    colors = {
        "motivational": ["0x1a0a2e", "0x16213e", "0x0f3460"],
        "cinematic": ["0x0d0d0d", "0x1a1a2e", "0x16213e"],
        "educational": ["0x1e3a5f", "0x0a2342", "0x162447"],
        "documentary": ["0x1a1a1a", "0x2d2d2d", "0x1f1f1f"],
        "news": ["0x003366", "0x001f4d", "0x002b55"],
    }
    palette = colors.get(style, ["0x1a1a2e", "0x16213e", "0x0f3460"])
    return palette[index % len(palette)]

def _safe_text(text: str) -> str:
    """Make text safe for FFmpeg drawtext."""
    return text.replace("'", "").replace(":", " -").replace("\\", "").replace("[", "").replace("]", "")[:60]
