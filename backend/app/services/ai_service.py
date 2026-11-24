import logging
import asyncio
import os
import json
import httpx
from typing import Optional, Dict, List
from app.core.config import settings

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2:3b"  # Small, fast model

async def is_ollama_available() -> bool:
    """Check if Ollama is running."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False

async def get_available_models() -> List[str]:
    """Get list of installed Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                return [m["name"] for m in data.get("models", [])]
    except Exception:
        pass
    return []

async def generate_text(
    prompt: str,
    system: str = "",
    model: str = None,
    max_tokens: int = 1024,
    temperature: float = 0.7
) -> Optional[str]:
    """Generate text using Ollama local LLM."""
    if not model:
        models = await get_available_models()
        if models:
            # Prefer small models
            for preferred in ["llama3.2:3b", "llama3.2:1b", "phi3:mini", "mistral:7b"]:
                if any(preferred in m for m in models):
                    model = next(m for m in models if preferred in m)
                    break
            if not model:
                model = models[0]
        else:
            model = DEFAULT_MODEL
    
    if not await is_ollama_available():
        logger.warning("Ollama not available, using template-based generation")
        return None
    
    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", "").strip()
            logger.error(f"Ollama generate failed: {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"Ollama generate error: {e}")
        return None

async def generate_video_script(
    prompt: str,
    duration: int = 60,
    style: str = "motivational",
    num_scenes: int = 5
) -> Dict:
    """Generate a complete video script from a text prompt."""
    
    system_prompt = f"""You are a professional video scriptwriter. 
Create scripts that are engaging, visual, and suitable for {style} videos.
Structure each scene with a visual description and narration text.
Keep narration concise and impactful."""
    
    user_prompt = f"""Create a {duration}-second {style} video script for: "{prompt}"

Requirements:
- {num_scenes} scenes total
- Each scene 10-15 seconds of narration
- Include [VISUAL: description] for scene visuals
- Include [NARRATION: text] for voiceover
- Include [MUSIC: mood/type] once at the start
- Make it compelling for YouTube/social media

Format each scene as:
SCENE [number]:
[VISUAL: ...]
[NARRATION: ...]
[DURATION: X seconds]
"""
    
    result = await generate_text(user_prompt, system=system_prompt, max_tokens=2048)
    
    if not result:
        result = _template_script(prompt, duration, style, num_scenes)
    
    return _parse_script(result, prompt, duration, style)

def _template_script(prompt: str, duration: int, style: str, num_scenes: int) -> str:
    """Generate a template script without AI."""
    style_openers = {
        "motivational": "Every great journey begins with a single step.",
        "educational": "Let me share something fascinating with you.",
        "cinematic": "In a world of endless possibilities...",
        "documentary": "The story of how this all began...",
        "storytelling": "There's a story you need to hear.",
    }
    opener = style_openers.get(style, f"Today we explore: {prompt}")
    
    scenes = []
    for i in range(num_scenes):
        progress = (i + 1) / num_scenes
        scenes.append(f"""SCENE {i+1}:
[VISUAL: Dynamic {style} imagery related to {prompt}]
[NARRATION: {opener if i == 0 else f'Building on this foundation, we discover more about {prompt}.'}]
[DURATION: {duration // num_scenes} seconds]""")
    
    return "\n\n".join(scenes)

def _parse_script(raw: str, prompt: str, duration: int, style: str) -> Dict:
    """Parse script text into structured format."""
    import re
    
    scenes = []
    scene_blocks = re.split(r'SCENE \d+:', raw, flags=re.IGNORECASE)
    
    for i, block in enumerate(scene_blocks[1:], 1):
        visual_match = re.search(r'\[VISUAL:\s*(.+?)\]', block, re.DOTALL)
        narration_match = re.search(r'\[NARRATION:\s*(.+?)\]', block, re.DOTALL)
        duration_match = re.search(r'\[DURATION:\s*(\d+)', block)
        
        visual = visual_match.group(1).strip() if visual_match else f"Visual for scene {i}"
        narration = narration_match.group(1).strip() if narration_match else block.strip()[:200]
        scene_duration = int(duration_match.group(1)) if duration_match else duration // max(len(scene_blocks) - 1, 1)
        
        scenes.append({
            "index": i,
            "visual_description": visual,
            "narration": narration,
            "duration": scene_duration,
        })
    
    if not scenes:
        # Simple fallback
        word_count = int(duration * 2.5)  # ~2.5 words per second
        scenes = [{
            "index": 1,
            "visual_description": f"Cinematic visuals related to: {prompt}",
            "narration": f"Welcome to this {style} video about {prompt}. " * (word_count // 10),
            "duration": duration,
        }]
    
    music_match = re.search(r'\[MUSIC:\s*(.+?)\]', raw)
    
    return {
        "title": f"{style.title()}: {prompt[:50]}",
        "prompt": prompt,
        "style": style,
        "total_duration": duration,
        "num_scenes": len(scenes),
        "music_mood": music_match.group(1).strip() if music_match else f"uplifting {style}",
        "scenes": scenes,
        "raw_script": raw,
    }

async def generate_clip_titles(highlights: List[Dict]) -> List[str]:
    """Generate engaging titles for video clips."""
    if not highlights:
        return []
    
    texts = [h.get("transcript_text", "")[:200] for h in highlights]
    
    prompt = f"""Generate catchy, YouTube-optimized titles for these video clips.
Each title should be 5-10 words, engaging, and suitable for YouTube Shorts.

Clips:
{chr(10).join(f'{i+1}. "{t}"' for i, t in enumerate(texts))}

Return only the titles, one per line, numbered."""
    
    result = await generate_text(prompt, max_tokens=500)
    
    if result:
        import re
        lines = [re.sub(r'^\d+[\.\)]\s*', '', l).strip() for l in result.split('\n') if l.strip()]
        titles = [l for l in lines if len(l) > 3]
        if len(titles) >= len(highlights):
            return titles[:len(highlights)]
    
    # Fallback
    return [h.get("title", f"Clip {i+1}") for i, h in enumerate(highlights)]
