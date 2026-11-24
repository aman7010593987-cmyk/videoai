import os
import logging
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

_whisper_model = None
_model_lock = asyncio.Lock()

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading Whisper model '{settings.WHISPER_MODEL}' on {settings.WHISPER_DEVICE} ({settings.WHISPER_COMPUTE_TYPE})")
            _whisper_model = WhisperModel(
                settings.WHISPER_MODEL,
                device=settings.WHISPER_DEVICE,
                compute_type=settings.WHISPER_COMPUTE_TYPE
            )
            logger.info("Whisper model loaded successfully")
        except ImportError:
            logger.warning("faster-whisper not installed. Transcription unavailable.")
            return None
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            return None
    return _whisper_model

async def transcribe_audio(
    audio_path: str,
    language: Optional[str] = None,
    job=None
) -> Optional[Dict[str, Any]]:
    """Transcribe audio file using Faster-Whisper."""
    
    async with _model_lock:
        model = await asyncio.get_event_loop().run_in_executor(None, get_whisper_model)
    
    if not model:
        return _mock_transcription(audio_path)
    
    try:
        if job:
            job.progress = 20
            job.message = "Transcribing audio..."
        
        def _run():
            segments, info = model.transcribe(
                audio_path,
                language=language,
                word_timestamps=True,
                vad_filter=True,
                vad_parameters={"min_silence_duration_ms": 500}
            )
            
            result_segments = []
            full_text = []
            
            for segment in segments:
                seg_dict = {
                    "id": segment.id,
                    "start": round(segment.start, 3),
                    "end": round(segment.end, 3),
                    "text": segment.text.strip(),
                    "words": []
                }
                if segment.words:
                    seg_dict["words"] = [
                        {"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3), "probability": round(w.probability, 3)}
                        for w in segment.words
                    ]
                result_segments.append(seg_dict)
                full_text.append(segment.text.strip())
            
            return {
                "language": info.language,
                "language_probability": round(info.language_probability, 3),
                "duration": info.duration,
                "segments": result_segments,
                "full_text": " ".join(full_text),
                "word_count": sum(len(s["text"].split()) for s in result_segments)
            }
        
        result = await asyncio.get_event_loop().run_in_executor(None, _run)
        
        if job:
            job.progress = 80
            job.message = "Transcription complete"
        
        return result
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        return None

def _mock_transcription(audio_path: str) -> Dict:
    """Mock transcription when Whisper is unavailable."""
    logger.warning("Using mock transcription - faster-whisper not available")
    return {
        "language": "en",
        "language_probability": 0.99,
        "duration": 60.0,
        "segments": [
            {"id": 0, "start": 0.0, "end": 5.0, "text": "Welcome to this video.", "words": []},
            {"id": 1, "start": 5.0, "end": 10.0, "text": "Today we will explore an interesting topic.", "words": []},
            {"id": 2, "start": 10.0, "end": 20.0, "text": "This is an important point that everyone should know.", "words": []},
            {"id": 3, "start": 20.0, "end": 30.0, "text": "Here is something that will change your life.", "words": []},
            {"id": 4, "start": 30.0, "end": 45.0, "text": "The key insight here is that consistency beats perfection.", "words": []},
            {"id": 5, "start": 45.0, "end": 60.0, "text": "Thank you for watching. Don't forget to subscribe!", "words": []},
        ],
        "full_text": "Welcome to this video. Today we will explore an interesting topic. This is an important point that everyone should know. Here is something that will change your life. The key insight here is that consistency beats perfection. Thank you for watching. Don't forget to subscribe!",
        "word_count": 48,
        "_mock": True
    }

def generate_srt(segments: List[Dict], output_path: str) -> bool:
    """Generate SRT subtitle file from transcript segments."""
    try:
        def format_time(seconds: float) -> str:
            h = int(seconds // 3600)
            m = int((seconds % 3600) // 60)
            s = int(seconds % 60)
            ms = int((seconds % 1) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
        
        with open(output_path, "w", encoding="utf-8") as f:
            for i, seg in enumerate(segments, 1):
                f.write(f"{i}\n")
                f.write(f"{format_time(seg['start'])} --> {format_time(seg['end'])}\n")
                f.write(f"{seg['text']}\n\n")
        return True
    except Exception as e:
        logger.error(f"generate_srt error: {e}")
        return False

def generate_vtt(segments: List[Dict], output_path: str) -> bool:
    """Generate WebVTT subtitle file."""
    try:
        def format_time(seconds: float) -> str:
            h = int(seconds // 3600)
            m = int((seconds % 3600) // 60)
            s = int(seconds % 60)
            ms = int((seconds % 1) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for i, seg in enumerate(segments, 1):
                f.write(f"{i}\n")
                f.write(f"{format_time(seg['start'])} --> {format_time(seg['end'])}\n")
                f.write(f"{seg['text']}\n\n")
        return True
    except Exception as e:
        logger.error(f"generate_vtt error: {e}")
        return False
