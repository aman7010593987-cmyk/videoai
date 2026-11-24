# ⚡ VIRA AI — Local AI Video Creation Studio

> **Free · Local · Unlimited** — No subscriptions. No API keys. No per-video charges.

VIRA AI is an open-source, locally-hosted AI video production platform that runs entirely on your own hardware. Create professional YouTube videos and Shorts using the power of FFmpeg, Faster-Whisper, and local AI models — without paying for cloud services.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 🎬 **YouTube → Shorts** | Paste a YouTube URL → auto-download, transcribe, detect highlights, generate vertical clips |
| 📤 **Upload & Clip** | Upload MP4/MOV/MKV/WEBM → AI highlight detection → clip generation |
| 🤖 **AI Video Generator** | Text prompt → AI script → voiceover → video with subtitles |
| ✂️ **AI Video Editor** | Browser-based editor: trim, crop, speed, text overlays, export |
| 📝 **AI Subtitles** | Faster-Whisper transcription → SRT / VTT / burned-in captions |
| 🎙️ **AI Voiceover** | Piper TTS / Windows SAPI → WAV export |
| 📁 **Project Manager** | Create, rename, delete, search projects with full history |
| 📊 **Dashboard** | Stats, system status, storage usage, recent projects |
| 📦 **Export Presets** | YouTube 1080p, YouTube 4K, YouTube Shorts, Instagram Reels, TikTok |

---

## 🖥️ System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 | Windows 11 |
| CPU | Any 4-core | Intel i5-11th gen+ |
| RAM | 8 GB | 16 GB |
| GPU | — | NVIDIA (for NVENC, optional) |
| Storage | 10 GB free | 50 GB free |
| Python | 3.10+ | 3.11–3.13 |
| Node.js | 18+ | 20–22 |

---

## 🚀 Quick Start (Windows)

### 1. Install Prerequisites

**Python 3.10+** — https://python.org/downloads  
**Node.js 18+** — https://nodejs.org  
**Git** — https://git-scm.com  

**FFmpeg** (required for all video processing):
```bat
# Option A — winget (recommended)
winget install Gyan.FFmpeg

# Option B — Chocolatey
choco install ffmpeg

# Option C — Manual
# Download from https://www.gyan.dev/ffmpeg/builds/
# Extract to C:\ffmpeg and add C:\ffmpeg\bin to PATH
```

### 2. Clone & Install

```bat
git clone https://github.com/aman7010593987-cmyk/videoai.git
cd videoai

# Run automated setup
setup.bat
```

`setup.bat` will:
- Verify Python, Node.js and FFmpeg
- Install all Python backend dependencies
- Install all frontend npm packages
- Create the SQLite database
- Set up local storage directories

### 3. Start the Application

```bat
start.bat
```

Then open **http://localhost:5173** in your browser.

> The backend API runs on **http://localhost:8000**  
> Interactive API docs: **http://localhost:8000/docs**

---

## 🧩 Optional AI Enhancements

### Faster-Whisper (transcription model)
Downloaded automatically on first transcription use:
```python
# In Python — downloads ~150 MB for "base" model
from faster_whisper import WhisperModel
WhisperModel("base")   # CPU INT8, good quality
WhisperModel("small")  # ~500 MB, better quality
```

### Ollama (local LLM for AI script generation)
1. Download Ollama: https://ollama.ai  
2. Pull a model:
   ```bat
   ollama pull llama3.2:3b   # 2 GB, recommended for 4–8 GB VRAM
   ollama pull phi3:mini     # 2.3 GB, fast alternative
   ```
3. VIRA AI detects Ollama automatically on startup.

### Piper TTS (high-quality offline voices)
1. Download from https://github.com/rhasspy/piper/releases  
2. Place `piper.exe` at `C:\piper\piper.exe`  
3. Download voice models from https://huggingface.co/rhasspy/piper-voices  
4. VIRA AI falls back to Windows SAPI if Piper is not installed.

---

## 📂 Project Structure

```
vira-ai/
├── backend/                  # Python FastAPI backend
│   ├── main.py               # App entrypoint
│   ├── requirements.txt      # Python dependencies
│   └── app/
│       ├── api/routes/       # REST API endpoints
│       │   ├── projects.py   # Project CRUD
│       │   ├── video.py      # Upload, analyze, clip
│       │   ├── youtube.py    # YouTube processing
│       │   ├── subtitles.py  # Subtitle generation
│       │   ├── voiceover.py  # TTS generation
│       │   ├── text_to_video.py  # Prompt → video
│       │   ├── export_routes.py  # Export presets
│       │   └── system.py    # Status & job management
│       ├── services/         # Core processing engines
│       │   ├── ffmpeg_service.py      # Video processing
│       │   ├── transcription_service.py  # Whisper
│       │   ├── highlight_service.py   # AI highlight detection
│       │   ├── youtube_service.py     # yt-dlp integration
│       │   ├── tts_service.py         # Piper / SAPI TTS
│       │   └── ai_service.py          # Ollama LLM
│       ├── models/           # SQLAlchemy ORM models
│       └── core/             # Config, DB, job queue, logging
│
├── frontend/                 # React + TypeScript + Tailwind
│   └── src/
│       ├── pages/            # 10 feature pages
│       ├── components/       # Reusable UI components
│       └── services/api.ts   # Typed API client
│
├── scripts/                  # Helper scripts
├── setup.bat                 # First-time setup
├── start.bat                 # Launch application
├── .env.example              # Environment template
└── README.md
```

---

## 🎞️ Export Quality

All exports default to **High Quality**:

| Setting | Value |
|---------|-------|
| Codec | H.264 (libx264) |
| CRF | 18 (High Quality) |
| Preset | medium |
| Audio | AAC 192 kbps, 48 kHz |
| Metadata | fast-start (web streaming ready) |

### Export Presets

| Preset | Resolution | Use For |
|--------|-----------|---------|
| `youtube_1080p` | 1920 × 1080 | Standard YouTube |
| `youtube_4k` | 3840 × 2160 | 4K YouTube |
| `youtube_shorts` | 1080 × 1920 | YouTube Shorts |
| `instagram_reels` | 1080 × 1920 | Instagram Reels |
| `tiktok` | 1080 × 1920 | TikTok |

---

## 🛠️ Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, React Query, Zustand  
**Backend:** Python 3.13, FastAPI, SQLAlchemy, SQLite, aiofiles, asyncio  
**Video:** FFmpeg (libx264, AAC, filters), OpenCV, PySceneDetect  
**AI:** Faster-Whisper (transcription), Piper TTS / Windows SAPI (voice), Ollama (LLM)  
**Media download:** yt-dlp  

---

## 🔒 Privacy

Everything runs **100% locally**:
- No video is uploaded to any external server
- No API keys required for core features
- All projects, clips and exports stay on your machine
- Database is a local SQLite file

---

## 📄 License

MIT License — free to use, modify and distribute.

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first for major changes.
