@echo off
title VIRA AI — Downloading FFmpeg
echo.
echo ========================================
echo   VIRA AI — FFmpeg Downloader
echo ========================================
echo.

REM Check if already installed
where ffmpeg >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] FFmpeg already in PATH
    ffmpeg -version | findstr "ffmpeg version"
    goto :done
)

REM Check local installation
if exist "C:\ffmpeg\bin\ffmpeg.exe" (
    echo [OK] FFmpeg found at C:\ffmpeg
    goto :done
)

echo Downloading FFmpeg for Windows...
echo.
echo Please download FFmpeg manually from: https://www.gyan.dev/ffmpeg/builds/
echo Or run: winget install ffmpeg
echo.
echo Then add C:\ffmpeg\bin to your PATH.
echo.

REM Try winget
echo Attempting installation via winget...
winget install --id Gyan.FFmpeg -e --silent 2>nul
if %ERRORLEVEL% == 0 (
    echo [OK] FFmpeg installed via winget!
    goto :done
)

REM Try chocolatey
choco install ffmpeg -y 2>nul
if %ERRORLEVEL% == 0 (
    echo [OK] FFmpeg installed via Chocolatey!
    goto :done
)

echo [WARNING] Automatic FFmpeg installation failed.
echo Please install FFmpeg manually and add it to PATH.
echo Download: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
echo.

:done
echo.
pause
