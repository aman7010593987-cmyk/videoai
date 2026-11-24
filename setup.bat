@echo off
title VIRA AI — Setup
color 0A
echo.
echo  ██╗   ██╗██╗██████╗  █████╗      █████╗ ██╗
echo  ██║   ██║██║██╔══██╗██╔══██╗    ██╔══██╗██║
echo  ██║   ██║██║██████╔╝███████║    ███████║██║
echo  ╚██╗ ██╔╝██║██╔══██╗██╔══██║    ██╔══██║██║
echo   ╚████╔╝ ██║██║  ██║██║  ██║    ██║  ██║██║
echo    ╚═══╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
echo.
echo  VIRA AI — Setup Script
echo  ======================
echo.

REM --- Check Python ---
echo Checking Python...
python --version 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found! Install Python 3.10+ from https://python.org
    pause & exit /b 1
)
echo [OK] Python found.

REM --- Check Node.js ---
echo Checking Node.js...
node --version 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Install from https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js found.

REM --- Check npm ---
echo Checking npm...
npm.cmd --version 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found!
    pause & exit /b 1
)
echo [OK] npm found.

REM --- Check FFmpeg ---
echo Checking FFmpeg...
where ffmpeg >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] FFmpeg found in PATH.
) else (
    echo [WARNING] FFmpeg not in PATH. Running FFmpeg installer...
    call "%~dp0scripts\download_ffmpeg.bat"
)

REM --- Check Disk Space ---
echo Checking disk space...
for /f "tokens=3" %%a in ('dir /-c /w "%~d0" 2^>nul ^| findstr "bytes free"') do set FREE_BYTES=%%a
echo Disk space check done.

REM --- Install Python deps ---
echo.
echo Installing Python backend dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Some Python dependencies failed. Check requirements.txt.
) else (
    echo [OK] Python dependencies installed.
)

REM --- Install Node.js deps ---
echo.
echo Installing frontend dependencies...
cd /d "%~dp0frontend"
npm.cmd install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed!
    pause & exit /b 1
)
echo [OK] Frontend dependencies installed.

REM --- Create storage ---
echo.
echo Creating storage directories...
mkdir "%~dp0backend\storage\uploads" 2>nul
mkdir "%~dp0backend\storage\outputs" 2>nul
mkdir "%~dp0backend\storage\temp" 2>nul
mkdir "%~dp0backend\storage\thumbnails" 2>nul
mkdir "%~dp0backend\storage\audio" 2>nul
mkdir "%~dp0backend\storage\exports" 2>nul
mkdir "%~dp0backend\logs" 2>nul
echo [OK] Storage directories created.

REM --- Initialize DB ---
echo.
echo Initializing database...
cd /d "%~dp0backend"
python -c "from app.core.database import init_db; init_db(); print('[OK] Database initialized.')"

REM --- Whisper model info ---
echo.
echo ===========================================
echo   OPTIONAL: Download Whisper Model
echo ===========================================
echo   For transcription, download a Whisper model:
echo   python -c "from faster_whisper import WhisperModel; WhisperModel('base')"
echo   (This downloads ~150MB on first run)
echo.

echo ===========================================
echo   OPTIONAL: Install Ollama AI
echo ===========================================
echo   For AI script generation:
echo   1. Download Ollama: https://ollama.ai
echo   2. Run: ollama pull llama3.2:3b
echo.

echo ===========================================
echo   SETUP COMPLETE!
echo ===========================================
echo.
echo   Run start.bat to launch VIRA AI.
echo.
pause
