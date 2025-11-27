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

:: Add libusb DLL to PATH for PyUSB (find it in Python's site-packages)
for /f "tokens=*" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.prefix)"') do set "PYTHON_PREFIX=%%i"
set "LIBUSB_PATH=%PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\_windows\x64"
if exist "%LIBUSB_PATH%\libusb-1.0.dll" (
    set "PATH=%LIBUSB_PATH%;%PATH%"
    echo [OK] libusb DLL found
) else (
    echo [WARN] libusb DLL not found - USB devices may not be detected
)
echo.

:: Create a temporary script for the daemon (avoids quoting issues)
set "DAEMON_SCRIPT=%TEMP%\start-vest-daemon.bat"
echo @echo off > "%DAEMON_SCRIPT%"
echo set "PATH=%LIBUSB_PATH%;%%PATH%%" >> "%DAEMON_SCRIPT%"
echo cd /d "%~dp0..\modern-third-space\src" >> "%DAEMON_SCRIPT%"
echo %PYTHON_CMD% -m modern_third_space.cli daemon start --port 5050 >> "%DAEMON_SCRIPT%"
echo pause >> "%DAEMON_SCRIPT%"

:: Start the Python daemon in a new window
echo [..] Starting Python daemon...
start "Third Space Vest Daemon" cmd /k ""%DAEMON_SCRIPT%""

:: Wait a moment for daemon to start
echo [..] Waiting for daemon to initialize...
timeout /t 3 /nobreak >nul

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

