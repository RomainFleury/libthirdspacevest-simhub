@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Start Everything
:: Double-click this file to start daemon + app together

echo.
echo ========================================
echo   Third Space Vest - Full Startup
echo ========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please see SETUP.md for installation instructions.
    pause
    exit /b 1
)

:: Check for Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    where python3 >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Python is not installed!
        echo Please see SETUP.md for installation instructions.
        pause
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

echo [OK] Node.js and Python found
echo.

:: Install and validate libusb DLL
call "%~dp0install-validate-libusb.bat"
if %ERRORLEVEL% neq 0 (
    echo.
    echo This is required for USB device communication.
    pause
    exit /b 1
)
echo.

:: Navigate to web directory
cd /d "%~dp0..\web"

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [WARN] Dependencies not installed. Installing...
    call corepack enable >nul 2>&1
    call yarn install
)

echo.
echo [OK] Starting Electron app...
echo.
echo Two windows will open:
echo   1. Daemon window (keep it open)
echo   2. App window (the debugger UI)
echo.
echo Close the app window to stop, then close the daemon window.
echo.

:: Start the app
call yarn dev

:: If we get here, the app was stopped
echo.
echo App stopped. You can close the daemon window now.
pause

