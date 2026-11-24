import logging
import asyncio
import os
import re
from pathlib import Path
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

async def download_youtube(
    url: str,
    output_dir: str,
    job=None,
    audio_only: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Download YouTube video using yt-dlp.
    Returns info dict with 'file_path', 'title', 'duration', etc.
    """
    try:
        import yt_dlp
    except ImportError:
        logger.error("yt-dlp not installed")
        return None
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    outtmpl = str(output_dir / "%(id)s.%(ext)s")
    
    ydl_opts = {
        "outtmpl": outtmpl,
        "quiet": True,
        "no_warnings": True,
        "merge_output_format": "mp4",
    }
    
    if audio_only:
        ydl_opts["format"] = "bestaudio/best"
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "wav",
            "preferredquality": "192",
        }]
    else:
        # Best quality up to 1080p to avoid massive file sizes
        ydl_opts["format"] = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
    
    if job:
        job.progress = 5
        job.message = "Fetching video information..."
    
    result = {}
    
    def progress_hook(d):
        if job and d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            downloaded = d.get("downloaded_bytes", 0)
            if total > 0:
                pct = int(downloaded / total * 70) + 5
                job.progress = pct
                job.message = f"Downloading: {pct}%"
    
    ydl_opts["progress_hooks"] = [progress_hook]
    
    try:
        loop = asyncio.get_event_loop()
        
        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                return info
        
        info = await loop.run_in_executor(None, _download)
        
        if not info:
            return None
        
        # Find downloaded file
        video_id = info.get("id", "")
        title = info.get("title", "Untitled")
        duration = info.get("duration", 0)
        thumbnail = info.get("thumbnail", "")
        
        # Find the actual file
        file_path = None
        for ext in ["mp4", "mkv", "webm", "wav"]:
            candidate = output_dir / f"{video_id}.{ext}"
            if candidate.exists():
                file_path = str(candidate)
                break
        
        if not file_path:
            # Search for any file matching the id
            for f in output_dir.iterdir():
                if video_id in f.name:
                    file_path = str(f)
                    break
        
        if not file_path:
            logger.error("Downloaded file not found")
            return None
        
        if job:
            job.progress = 80
            job.message = "Download complete"
        
        return {
            "file_path": file_path,
            "title": title,
            "duration": duration,
            "video_id": video_id,
            "thumbnail_url": thumbnail,
            "uploader": info.get("uploader", ""),
            "view_count": info.get("view_count", 0),
            "description": info.get("description", "")[:1000] if info.get("description") else "",
        }
    except Exception as e:
        logger.error(f"YouTube download error: {e}", exc_info=True)
        return None

def validate_youtube_url(url: str) -> bool:
    """Validate YouTube URL format."""
    patterns = [
        r"^https?://(www\.)?youtube\.com/watch\?v=[\w-]+",
        r"^https?://youtu\.be/[\w-]+",
        r"^https?://(www\.)?youtube\.com/shorts/[\w-]+",
    ]
    return any(re.match(p, url) for p in patterns)

async def get_youtube_info(url: str) -> Optional[Dict]:
    """Get YouTube video metadata without downloading."""
    try:
        import yt_dlp
        
        ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
        
        loop = asyncio.get_event_loop()
        
        def _extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        
        info = await loop.run_in_executor(None, _extract)
        if not info:
            return None
        
        return {
            "title": info.get("title", ""),
            "duration": info.get("duration", 0),
            "thumbnail_url": info.get("thumbnail", ""),
            "uploader": info.get("uploader", ""),
            "view_count": info.get("view_count", 0),
            "video_id": info.get("id", ""),
            "description": info.get("description", "")[:500] if info.get("description") else "",
        }
    except Exception as e:
        logger.error(f"get_youtube_info error: {e}")
        return None
