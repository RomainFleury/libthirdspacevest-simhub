@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Start UI (Electron dev)
:: This script starts only the UI. (Daemon can be started separately.)

echo.
echo ========================================
echo   Third Space Vest - UI Startup
echo ========================================
echo.

:: Load optional local python override (windows\.env.bat)
if exist "%~dp0.env.bat" call "%~dp0.env.bat"

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please see SETUP.md for installation instructions.
    pause
    exit /b 1
)

:: Optional: show which Python is configured (useful for dev when UI spawns daemon)
if defined TSV_PYTHON (
    echo [INFO] TSV_PYTHON=%TSV_PYTHON%
) else (
    echo [INFO] TSV_PYTHON not set (see windows\.env.bat.example)
)
echo.

:: Navigate to web directory
cd /d "%~dp0..\web"

:: Ensure dependencies
if not exist "node_modules" (
    echo [WARN] Dependencies not installed. Installing...
    call corepack enable >nul 2>&1
    call yarn install
)

echo [OK] Starting Electron app...
echo.
call yarn dev

echo.
echo App stopped.
pause

