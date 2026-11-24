import logging
import asyncio
import os
import subprocess
import shutil
from pathlib import Path
from typing import Optional, List, Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

PIPER_VOICES_DIR = Path.home() / ".local" / "share" / "piper" / "voices"
PIPER_EXE = None

def find_piper() -> Optional[str]:
    """Find piper TTS executable."""
    global PIPER_EXE
    if PIPER_EXE:
        return PIPER_EXE
    
    candidates = [
        shutil.which("piper"),
        r"C:\piper\piper.exe",
        str(Path.home() / "piper" / "piper.exe"),
        str(settings.STORAGE_DIR.parent / "piper" / "piper.exe"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            PIPER_EXE = c
            return c
    return None

def get_available_voices() -> List[Dict]:
    """Get list of available Piper voice models."""
    voices = []
    voice_dirs = [PIPER_VOICES_DIR, settings.STORAGE_DIR.parent / "models" / "piper"]
    
    for vdir in voice_dirs:
        if vdir.exists():
            for f in vdir.rglob("*.onnx"):
                name = f.stem
                config = f.with_suffix(".onnx.json")
                gender = "female" if any(x in name.lower() for x in ["amy", "jenny", "aria", "female", "woman"]) else "male"
                lang = "en"
                if "_" in name:
                    parts = name.split("_")
                    if len(parts) >= 2:
                        lang = parts[0]
                voices.append({
                    "id": name,
                    "name": name.replace("_", " ").title(),
                    "language": lang,
                    "gender": gender,
                    "model_path": str(f),
                    "config_path": str(config) if config.exists() else None,
                })
    
    # Default voices if piper not set up
    if not voices:
        voices = [
            {"id": "en_US-lessac-medium", "name": "Lessac (US Male)", "language": "en", "gender": "male", "model_path": None, "config_path": None},
            {"id": "en_US-amy-medium", "name": "Amy (US Female)", "language": "en", "gender": "female", "model_path": None, "config_path": None},
            {"id": "en_GB-alan-medium", "name": "Alan (GB Male)", "language": "en", "gender": "male", "model_path": None, "config_path": None},
        ]
    
    return voices

async def generate_tts(
    text: str,
    output_path: str,
    voice_id: str = "en_US-lessac-medium",
    speed: float = 1.0,
    job=None
) -> bool:
    """Generate TTS audio using Piper or fallback."""
    piper = find_piper()
    
    if piper:
        return await _piper_tts(text, output_path, voice_id, speed, piper, job)
    else:
        logger.warning("Piper not found, using system TTS fallback")
        return await _system_tts_fallback(text, output_path, speed, job)

async def _piper_tts(text: str, output_path: str, voice_id: str, speed: float, piper_path: str, job) -> bool:
    """Generate TTS using Piper."""
    # Find voice model
    voices = get_available_voices()
    voice = next((v for v in voices if v["id"] == voice_id and v.get("model_path")), None)
    
    if not voice or not voice.get("model_path"):
        logger.error(f"Voice model not found: {voice_id}")
        return await _system_tts_fallback(text, output_path, speed, job)
    
    try:
        wav_path = output_path if output_path.endswith(".wav") else output_path + ".wav"
        
        cmd = [piper_path, "--model", voice["model_path"], "--output_file", wav_path]
        if voice.get("config_path"):
            cmd += ["--config", voice["config_path"]]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate(input=text.encode("utf-8"))
        
        if proc.returncode != 0:
            logger.error(f"Piper TTS failed: {stderr.decode()}")
            return False
        
        if job:
            job.progress = 90
            job.message = "Audio generated"
        
        return os.path.exists(wav_path)
    except Exception as e:
        logger.error(f"Piper TTS error: {e}")
        return False

async def _system_tts_fallback(text: str, output_path: str, speed: float = 1.0, job=None) -> bool:
    """Windows SAPI TTS fallback."""
    try:
        wav_path = output_path if output_path.endswith(".wav") else output_path.replace(".mp3", ".wav")
        
        # Use PowerShell with Windows Speech API
        ps_script = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile('{wav_path}')
$synth.Rate = {int((speed - 1.0) * 5)}
$synth.Speak('{text.replace("'", "''")}')
$synth.Dispose()
"""
        proc = await asyncio.create_subprocess_exec(
            "powershell", "-Command", ps_script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate()
        
        if proc.returncode == 0 and os.path.exists(wav_path):
            if job:
                job.progress = 90
                job.message = "Audio generated (Windows TTS)"
            return True
        
        logger.error(f"System TTS failed: {stderr.decode()}")
        return False
    except Exception as e:
        logger.error(f"System TTS error: {e}")
        return False

async def generate_script_tts(script: str, output_dir: str, voice_id: str = "en_US-lessac-medium") -> List[Dict]:
    """Generate TTS for multi-scene scripts, one file per scene."""
    scenes = [s.strip() for s in script.split("\n\n") if s.strip()]
    results = []
    
    for i, scene_text in enumerate(scenes):
        output_path = os.path.join(output_dir, f"scene_{i:03d}.wav")
        success = await generate_tts(scene_text, output_path, voice_id)
        results.append({
            "scene_index": i,
            "text": scene_text,
            "audio_path": output_path if success else None,
            "success": success
        })
    
    return results
