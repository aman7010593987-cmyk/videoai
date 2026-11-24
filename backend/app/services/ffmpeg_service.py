import subprocess
import os
import json
import logging
import asyncio
import shutil
import re
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_ffmpeg_path() -> str:
    """Find FFmpeg binary path."""
    # Check config
    if shutil.which(settings.FFMPEG_PATH):
        return settings.FFMPEG_PATH
    # Check common locations on Windows
    common = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\tools\ffmpeg\bin\ffmpeg.exe",
    ]
    for p in common:
        if os.path.exists(p):
            return p
    # Try PATH
    found = shutil.which("ffmpeg")
    if found:
        return found
    return "ffmpeg"

def get_ffprobe_path() -> str:
    if shutil.which(settings.FFPROBE_PATH):
        return settings.FFPROBE_PATH
    ffmpeg = get_ffmpeg_path()
    ffprobe = ffmpeg.replace("ffmpeg.exe", "ffprobe.exe").replace("ffmpeg", "ffprobe")
    if os.path.exists(ffprobe):
        return ffprobe
    return "ffprobe"

FFMPEG = get_ffmpeg_path()
FFPROBE = get_ffprobe_path()

def is_ffmpeg_available() -> bool:
    try:
        result = subprocess.run([FFMPEG, "-version"], capture_output=True, timeout=5)
        return result.returncode == 0
    except Exception:
        return False

def probe_video(file_path: str) -> Optional[Dict]:
    """Get video metadata using ffprobe."""
    try:
        cmd = [
            FFPROBE, "-v", "quiet",
            "-print_format", "json",
            "-show_streams", "-show_format",
            str(file_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return json.loads(result.stdout)
        logger.error(f"ffprobe failed: {result.stderr}")
        return None
    except Exception as e:
        logger.error(f"probe_video error: {e}")
        return None

def get_video_info(file_path: str) -> Dict[str, Any]:
    """Extract key video information."""
    probe = probe_video(file_path)
    if not probe:
        return {}
    
    info = {"duration": 0, "width": 0, "height": 0, "fps": 0, "has_audio": False, "size": 0}
    
    try:
        fmt = probe.get("format", {})
        info["duration"] = float(fmt.get("duration", 0))
        info["size"] = int(fmt.get("size", 0))
        info["bitrate"] = int(fmt.get("bit_rate", 0))
        
        for stream in probe.get("streams", []):
            if stream.get("codec_type") == "video" and not info["width"]:
                info["width"] = stream.get("width", 0)
                info["height"] = stream.get("height", 0)
                fps_str = stream.get("r_frame_rate", "0/1")
                if "/" in fps_str:
                    n, d = fps_str.split("/")
                    info["fps"] = round(float(n) / float(d), 3) if float(d) else 0
                info["codec"] = stream.get("codec_name", "")
            elif stream.get("codec_type") == "audio":
                info["has_audio"] = True
                info["audio_codec"] = stream.get("codec_name", "")
                info["audio_sample_rate"] = stream.get("sample_rate", "")
    except Exception as e:
        logger.error(f"get_video_info parse error: {e}")
    
    return info

async def run_ffmpeg(args: List[str], progress_callback=None, job=None) -> bool:
    """Run FFmpeg command asynchronously with optional progress."""
    cmd = [FFMPEG] + args
    logger.info(f"FFmpeg: {' '.join(cmd)}")
    
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        duration = None
        stderr_lines = []
        
        async for line in proc.stderr:
            line_str = line.decode("utf-8", errors="replace").strip()
            stderr_lines.append(line_str)
            
            if "Duration:" in line_str and not duration:
                m = re.search(r"Duration: (\d+):(\d+):(\d+\.?\d*)", line_str)
                if m:
                    h, min_, s = m.groups()
                    duration = int(h)*3600 + int(min_)*60 + float(s)
            
            if "time=" in line_str and duration and progress_callback:
                m = re.search(r"time=(\d+):(\d+):(\d+\.?\d*)", line_str)
                if m:
                    h, min_, s = m.groups()
                    current = int(h)*3600 + int(min_)*60 + float(s)
                    pct = min(99, int(current / duration * 100))
                    await progress_callback(pct)
            
            if job and job.status.value == "cancelled":
                proc.kill()
                return False
        
        await proc.wait()
        if proc.returncode != 0:
            logger.error(f"FFmpeg failed:\n" + "\n".join(stderr_lines[-20:]))
            return False
        return True
    except Exception as e:
        logger.error(f"run_ffmpeg error: {e}")
        return False

async def extract_audio(input_path: str, output_path: str) -> bool:
    """Extract audio from video as WAV."""
    args = [
        "-y", "-i", input_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        output_path
    ]
    return await run_ffmpeg(args)

async def extract_clip(
    input_path: str, output_path: str,
    start: float, end: float,
    vertical: bool = False,
    crf: int = 18,
    job=None
) -> bool:
    """Extract a clip from a video, optionally converting to vertical."""
    duration = end - start
    
    vf_filters = []
    if vertical:
        # Smart crop to 9:16 vertical, centering
        vf_filters.append(
            "scale=1920:1080:force_original_aspect_ratio=decrease,"
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,"
            "crop=607:1080:(1920-607)/2:0,"
            "scale=1080:1920"
        )
    else:
        vf_filters.append("scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2")
    
    vf = ",".join(vf_filters)
    
    args = [
        "-y",
        "-ss", str(start),
        "-i", input_path,
        "-t", str(duration),
        "-vf", vf,
        "-c:v", "libx264",
        "-profile:v", "high",
        "-pix_fmt", "yuv420p",
        "-crf", str(crf),
        "-preset", "medium",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-movflags", "+faststart",
        output_path
    ]
    return await run_ffmpeg(args, job=job)

async def create_thumbnail(input_path: str, output_path: str, time_offset: float = 1.0) -> bool:
    """Create a JPEG thumbnail from video."""
    args = [
        "-y",
        "-ss", str(time_offset),
        "-i", input_path,
        "-vframes", "1",
        "-q:v", "2",
        "-vf", "scale=640:-1",
        output_path
    ]
    return await run_ffmpeg(args)

async def add_subtitles_to_video(
    input_path: str, output_path: str,
    srt_path: str, style: str = "default"
) -> bool:
    """Burn subtitles into video."""
    # Build subtitle filter with styling
    if style == "modern":
        force_style = "FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,Bold=1,Outline=2,Shadow=1,MarginV=50"
    elif style == "shorts":
        force_style = "FontName=Impact,FontSize=24,PrimaryColour=&H00FFFF00,OutlineColour=&H00000000,Bold=1,Outline=3,Shadow=1,MarginV=100"
    else:
        force_style = "FontName=Arial,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Bold=1,Outline=2,MarginV=30"
    
    # Escape path for ffmpeg subtitles filter
    srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
    
    args = [
        "-y", "-i", input_path,
        "-vf", f"subtitles='{srt_escaped}':force_style='{force_style}'",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium",
        "-c:a", "copy",
        "-movflags", "+faststart",
        output_path
    ]
    return await run_ffmpeg(args)

async def normalize_audio(input_path: str, output_path: str, target_lufs: float = -14.0) -> bool:
    """Normalize audio loudness to target LUFS."""
    # First pass to analyze
    args_analyze = [
        "-y", "-i", input_path,
        "-af", f"loudnorm=I={target_lufs}:TP=-2:LRA=11:print_format=json",
        "-f", "null", "NUL"
    ]
    
    proc = await asyncio.create_subprocess_exec(
        FFMPEG, *args_analyze,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    stderr_text = stderr.decode("utf-8", errors="replace")
    
    # Extract loudnorm stats
    try:
        import re
        json_match = re.search(r'\{[^{}]+\}', stderr_text, re.DOTALL)
        if json_match:
            stats = json.loads(json_match.group())
            # Second pass with measured values
            args_norm = [
                "-y", "-i", input_path,
                "-af", (
                    f"loudnorm=I={target_lufs}:TP=-2:LRA=11:"
                    f"measured_I={stats.get('input_i', -23)}:"
                    f"measured_TP={stats.get('input_tp', -2)}:"
                    f"measured_LRA={stats.get('input_lra', 7)}:"
                    f"measured_thresh={stats.get('input_thresh', -33)}:"
                    f"offset={stats.get('target_offset', 0)}:linear=true"
                ),
                "-c:v", "copy",
                "-ar", "48000",
                output_path
            ]
            return await run_ffmpeg(args_norm)
    except Exception as e:
        logger.error(f"loudnorm parse error: {e}")
    
    # Fallback: simple copy
    args_simple = ["-y", "-i", input_path, "-c", "copy", output_path]
    return await run_ffmpeg(args_simple)

async def export_video(
    input_path: str, output_path: str,
    preset: str = "youtube_1080p",
    quality: str = "high"
) -> bool:
    """Export video with professional quality settings."""
    
    # CRF values by quality
    crf_map = {"standard": 20, "high": 18, "maximum": 16}
    crf = crf_map.get(quality, 18)
    
    # Preset configurations
    presets = {
        "youtube_1080p": {
            "width": 1920, "height": 1080, "fps": 30, "bitrate": "8M"
        },
        "youtube_4k": {
            "width": 3840, "height": 2160, "fps": 30, "bitrate": "35M"
        },
        "youtube_shorts": {
            "width": 1080, "height": 1920, "fps": 30, "bitrate": "8M"
        },
        "instagram_reels": {
            "width": 1080, "height": 1920, "fps": 30, "bitrate": "8M"
        },
        "tiktok": {
            "width": 1080, "height": 1920, "fps": 30, "bitrate": "8M"
        },
    }
    
    cfg = presets.get(preset, presets["youtube_1080p"])
    w, h = cfg["width"], cfg["height"]
    
    args = [
        "-y", "-i", input_path,
        "-vf", f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264",
        "-profile:v", "high",
        "-pix_fmt", "yuv420p",
        "-crf", str(crf),
        "-preset", "medium",
        "-r", str(cfg["fps"]),
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-movflags", "+faststart",
        output_path
    ]
    return await run_ffmpeg(args)

async def create_test_video(output_path: str, duration: int = 10) -> bool:
    """Create a synthetic test video using FFmpeg."""
    args = [
        "-y",
        "-f", "lavfi", "-i", f"testsrc=duration={duration}:size=1280x720:rate=30",
        "-f", "lavfi", "-i", f"sine=frequency=440:duration={duration}",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        output_path
    ]
    return await run_ffmpeg(args)
