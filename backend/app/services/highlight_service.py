import logging
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class Highlight:
    start_time: float
    end_time: float
    score: float
    highlight_type: str
    title: str
    explanation: str
    transcript_text: str

# Strong keywords for different highlight types
HOOK_KEYWORDS = [
    "secret", "truth", "nobody tells you", "game changer", "life changing",
    "shocked", "surprising", "incredible", "unbelievable", "amazing",
    "you won't believe", "wait for it", "plot twist", "actually",
    "the real reason", "here's why", "this changes everything"
]

EDUCATIONAL_KEYWORDS = [
    "how to", "the key", "important", "you should know", "tip",
    "strategy", "method", "step", "learn", "understand",
    "the reason", "explained", "breakdown", "guide", "tutorial",
    "best way", "pro tip", "trick", "hack", "insight"
]

EMOTIONAL_KEYWORDS = [
    "i was", "i felt", "it was hard", "struggled", "failed", "success",
    "dream", "passion", "love", "hate", "fear", "proud", "grateful",
    "changed my life", "never give up", "believe", "hope", "journey"
]

FUNNY_KEYWORDS = [
    "funny", "hilarious", "lol", "joke", "laugh", "ridiculous",
    "crazy", "wild", "can't believe", "literally", "honestly",
    "wait what", "plot twist", "oops", "fail", "mistake"
]

def _keyword_score(text: str, keywords: List[str]) -> float:
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw in text_lower)
    return min(matches * 0.3, 1.0)

def _sentence_importance_score(text: str) -> float:
    """Score sentence importance based on heuristics."""
    score = 0.0
    words = text.split()
    word_count = len(words)
    
    # Favor medium-length sentences (8-25 words)
    if 8 <= word_count <= 25:
        score += 0.3
    elif word_count < 5:
        score -= 0.2
    
    # Questions are engaging
    if "?" in text:
        score += 0.2
    
    # Numbers add credibility/interest
    if re.search(r'\d+', text):
        score += 0.15
    
    # Quotes suggest important statements
    if '"' in text or "'" in text:
        score += 0.1
    
    # Emphatic words
    emphatic = ["must", "need to", "critical", "essential", "key", "best", "worst", "most", "never", "always"]
    for e in emphatic:
        if e in text.lower():
            score += 0.1
            break
    
    return min(score, 1.0)

def analyze_transcript_for_highlights(
    segments: List[Dict],
    max_clips: int = 10,
    clip_duration_range: tuple = (15, 60),
    target_durations: List[int] = None
) -> List[Highlight]:
    """
    Analyze transcript segments to find the most engaging moments.
    Returns a list of Highlight objects sorted by score.
    """
    if not segments:
        return []
    
    if target_durations is None:
        target_durations = [15, 30, 45, 60]
    
    min_dur, max_dur = clip_duration_range
    total_duration = max(s["end"] for s in segments) if segments else 0
    
    highlights = []
    
    # Score each segment
    scored_segments = []
    for seg in segments:
        text = seg.get("text", "")
        if len(text.strip()) < 10:
            continue
        
        hook_score = _keyword_score(text, HOOK_KEYWORDS)
        edu_score = _keyword_score(text, EDUCATIONAL_KEYWORDS)
        emotional_score = _keyword_score(text, EMOTIONAL_KEYWORDS)
        funny_score = _keyword_score(text, FUNNY_KEYWORDS)
        importance = _sentence_importance_score(text)
        
        # Determine primary type
        type_scores = {
            "hook": hook_score,
            "educational": edu_score,
            "emotional": emotional_score,
            "funny": funny_score,
        }
        primary_type = max(type_scores, key=type_scores.get)
        total_score = (hook_score * 1.3 + edu_score + emotional_score + funny_score * 1.1 + importance) / 4
        
        scored_segments.append({
            "segment": seg,
            "total_score": total_score,
            "type_scores": type_scores,
            "primary_type": primary_type,
        })
    
    # Sort by score descending
    scored_segments.sort(key=lambda x: x["total_score"], reverse=True)
    
    used_ranges = []
    generated = 0
    
    for item in scored_segments:
        if generated >= max_clips:
            break
        
        seg = item["segment"]
        center = (seg["start"] + seg["end"]) / 2
        
        # Choose target duration closest to segment length
        seg_len = seg["end"] - seg["start"]
        best_dur = min(target_durations, key=lambda d: abs(d - max(seg_len * 2, 15)))
        best_dur = min(best_dur, max_dur)
        best_dur = max(best_dur, min_dur)
        
        # Center the clip around the segment
        clip_start = max(0, center - best_dur / 2)
        clip_end = min(total_duration, clip_start + best_dur)
        clip_start = max(0, clip_end - best_dur)
        
        # Check overlap with already-selected clips
        overlap = False
        for (us, ue) in used_ranges:
            overlap_len = min(clip_end, ue) - max(clip_start, us)
            if overlap_len > best_dur * 0.5:
                overlap = True
                break
        
        if overlap:
            continue
        
        used_ranges.append((clip_start, clip_end))
        
        # Build explanation
        ptype = item["primary_type"]
        type_labels = {
            "hook": "Strong Opening Hook",
            "educational": "Educational Moment",
            "emotional": "Emotional Moment",
            "funny": "Funny/Engaging Moment"
        }
        
        # Collect text in this time range
        clip_text = " ".join(
            s["text"] for s in segments
            if s["start"] >= clip_start - 1 and s["end"] <= clip_end + 1
        )
        
        # Generate title from text
        words = clip_text.split()[:8]
        title = " ".join(words).capitalize()
        if not title:
            title = f"{type_labels.get(ptype, 'Highlight')} at {int(clip_start)}s"
        
        explanation = (
            f"This {type_labels.get(ptype, 'highlight')} was selected because it contains "
            f"engaging content (score: {item['total_score']:.2f}). "
            f"The segment includes: \"{seg['text'][:100]}...\""
            if len(seg['text']) > 100 else
            f"This {type_labels.get(ptype, 'highlight')} was selected for its high engagement potential."
        )
        
        highlights.append(Highlight(
            start_time=round(clip_start, 2),
            end_time=round(clip_end, 2),
            score=round(item["total_score"], 3),
            highlight_type=ptype,
            title=title + "...",
            explanation=explanation,
            transcript_text=clip_text[:500]
        ))
        generated += 1
    
    # If we have few scored highlights, fill with evenly-spaced clips
    if len(highlights) < min(max_clips, 3) and total_duration > min_dur * 2:
        logger.info("Filling highlights with evenly-spaced clips")
        spacing = total_duration / (max_clips + 1)
        for i in range(1, max_clips + 1):
            if generated >= max_clips:
                break
            clip_start = spacing * i - 30
            clip_start = max(0, clip_start)
            clip_end = min(total_duration, clip_start + 30)
            
            overlap = any(
                min(clip_end, ue) - max(clip_start, us) > 15
                for us, ue in used_ranges
            )
            if not overlap and clip_end - clip_start >= 15:
                clip_text = " ".join(
                    s["text"] for s in segments
                    if s["start"] >= clip_start and s["end"] <= clip_end
                )
                highlights.append(Highlight(
                    start_time=round(clip_start, 2),
                    end_time=round(clip_end, 2),
                    score=0.3,
                    highlight_type="general",
                    title=f"Clip at {int(clip_start)}s",
                    explanation="Evenly-spaced clip selected for coverage.",
                    transcript_text=clip_text[:500]
                ))
                used_ranges.append((clip_start, clip_end))
                generated += 1
    
    # Sort final list by start time for natural order
    highlights.sort(key=lambda h: h.start_time)
    return highlights
