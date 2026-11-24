@echo off
title VIRA AI — Starting
color 0A

echo.
echo  ██╗   ██╗██╗██████╗  █████╗      █████╗ ██╗
echo  ╚██╗ ██╔╝██║██╔══██╗██╔══██╗    ██╔══██╗██║
echo   ╚████╔╝ ██║██████╔╝███████║    ███████║██║
echo    ╚██╔╝  ██║██╔══██╗██╔══██║    ██╔══██║██║
echo     ██║   ██║██║  ██║██║  ██║    ██║  ██║██║
echo     ╚═╝   ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
echo.
echo  VIRA AI — Starting up...
echo  =========================

REM Set working directory to script location
set "VIRA_DIR=%~dp0"

REM Check if dependencies are installed
if not exist "%VIRA_DIR%frontend\node_modules" (
    echo [WARNING] Frontend dependencies not installed. Run setup.bat first!
    echo Running quick install...
    cd /d "%VIRA_DIR%frontend"
    npm.cmd install --quiet
)

echo.
echo [1/2] Starting Backend (FastAPI on port 8000)...
start "VIRA AI Backend" /MIN cmd /c "cd /d "%VIRA_DIR%backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload 2>&1"

echo Waiting for backend to start...
timeout /t 4 /nobreak >nul

echo.
echo [2/2] Starting Frontend (Vite on port 5173)...
start "VIRA AI Frontend" /MIN cmd /c "cd /d "%VIRA_DIR%frontend" && npm.cmd run dev 2>&1"

echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo ==========================================
echo   VIRA AI is running!
echo ==========================================
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ==========================================
echo.
echo Opening browser...
start "" "http://localhost:5173"

echo.
echo Close this window to stop VIRA AI.
echo (Backend and Frontend run in separate windows)
echo.
pause
