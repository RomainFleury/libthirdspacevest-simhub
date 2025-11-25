@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Run Application
:: Double-click this file to start the app

echo.
echo ========================================
echo   Third Space Vest - Starting App
echo ========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please run install.bat first.
    pause
    exit /b 1
)

:: Check for Yarn
where yarn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Yarn is not available.
    echo Please run install.bat first.
    pause
    exit /b 1
)

:: Navigate to web directory
cd /d "%~dp0..\web"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not find web directory
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [WARN] Dependencies not installed. Running install first...
    echo.
    call "%~dp0install.bat"
    cd /d "%~dp0..\web"
)

echo [OK] Starting development server...
echo.
echo The app window will open automatically.
echo Press Ctrl+C to stop the server.
echo.

:: Start the app
call yarn dev

:: If we get here, the app was stopped
echo.
echo App stopped.
pause

