from fastapi import APIRouter
from app.core.job_queue import job_queue
from app.services.ffmpeg_service import is_ffmpeg_available, FFMPEG, FFPROBE
from app.services.tts_service import find_piper
from app.services.ai_service import is_ollama_available
from app.core.config import settings
import psutil, platform, os

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/status")
async def system_status():
    """Full system status check."""
    # Memory
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(str(settings.STORAGE_DIR))
    
    # GPU check
    gpu_info = {"available": False, "name": "Unknown", "vram_mb": 0}
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(", ")
            if len(parts) >= 2:
                gpu_info = {
                    "available": True,
                    "name": parts[0],
                    "vram_mb": int(parts[1].replace(" MiB", "")),
                    "vram_free_mb": int(parts[2].replace(" MiB", "")) if len(parts) > 2 else 0,
                }
    except:
        pass
    
    ollama_up = await is_ollama_available()
    
    return {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "ffmpeg": {
            "available": is_ffmpeg_available(),
            "path": FFMPEG,
        },
        "piper_tts": {
            "available": find_piper() is not None,
            "path": find_piper(),
        },
        "ollama": {
            "available": ollama_up,
        },
        "gpu": gpu_info,
        "memory": {
            "total_mb": round(mem.total / 1024 / 1024),
            "available_mb": round(mem.available / 1024 / 1024),
            "used_pct": mem.percent,
        },
        "disk": {
            "total_gb": round(disk.total / 1024**3, 1),
            "free_gb": round(disk.free / 1024**3, 1),
            "used_pct": round(disk.used / disk.total * 100, 1),
        },
        "storage_dir": str(settings.STORAGE_DIR),
    }

@router.get("/jobs")
def list_jobs():
    return {"jobs": job_queue.list_jobs()}

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = job_queue.get_job(job_id)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()

@router.delete("/jobs/{job_id}")
def cancel_job(job_id: str):
    success = job_queue.cancel_job(job_id)
    return {"success": success}

@router.post("/cleanup")
def cleanup_temp():
    """Remove old temp files."""
    import glob, shutil
    deleted = 0
    temp_dir = str(settings.TEMP_DIR)
    for f in os.listdir(temp_dir):
        try:
            fp = os.path.join(temp_dir, f)
            if os.path.isfile(fp):
                os.remove(fp)
                deleted += 1
        except:
            pass
    return {"deleted_files": deleted}
