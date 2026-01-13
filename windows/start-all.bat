@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Start Everything
::: Double-click this file to start daemon + app together

echo.
echo ========================================
echo   Third Space Vest - Full Startup
echo ========================================
echo.

:: Load optional local python override (windows\.env.bat)
if exist "%~dp0.env.bat" call "%~dp0.env.bat"

::: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please see SETUP.md for installation instructions.
    pause
    exit /b 1
)

::: Resolve Python command (TSV_PYTHON -> py -3.11 -> python/python3)
::: This resolved value is also exported as TSV_PYTHON for child processes
set "PYTHON_CMD="
if defined TSV_PYTHON (
    set "PYTHON_CMD=%TSV_PYTHON%"
) else (
    where py >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        py -3.11 -c "import sys" >nul 2>&1
        if !ERRORLEVEL! equ 0 set "PYTHON_CMD=py -3.11"
    )
    if not defined PYTHON_CMD (
        where python >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "PYTHON_CMD=python"
        ) else (
            where python3 >nul 2>&1
            if !ERRORLEVEL! equ 0 set "PYTHON_CMD=python3"
        )
    )
)
if not defined PYTHON_CMD (
    echo [ERROR] Python is not installed!
    echo Please see SETUP.md for installation instructions.
    pause
    exit /b 1
)

:: Set TSV_PYTHON so Electron can use the same Python if needed
set "TSV_PYTHON=%PYTHON_CMD%"

echo [OK] Node.js and Python found
echo [INFO] Python: %PYTHON_CMD%
echo.

::: Install and validate libusb DLL
call "%~dp0install-validate-libusb.bat"
if %ERRORLEVEL% neq 0 (
    echo.
    echo This is required for USB device communication.
    pause
    exit /b 1
)
echo.

::: Create a temporary script for the daemon (avoids quoting issues)
set "DAEMON_SCRIPT=%TEMP%\start-vest-daemon.bat"
echo @echo off > "%DAEMON_SCRIPT%"
echo set "PATH=%LIBUSB_PATH%;%%PATH%%" >> "%DAEMON_SCRIPT%"
echo cd /d "%~dp0..\modern-third-space\src" >> "%DAEMON_SCRIPT%"
echo %PYTHON_CMD% -m modern_third_space.cli daemon start --port 5050 >> "%DAEMON_SCRIPT%"
echo pause >> "%DAEMON_SCRIPT%"

::: Start the Python daemon in a new window
echo [..] Starting Python daemon...
start "Third Space Vest Daemon" cmd /k ""%DAEMON_SCRIPT%""

::: Wait a moment for daemon to start
echo [..] Waiting for daemon to initialize...
timeout /t 3 /nobreak >nul

::: Navigate to web directory
cd /d "%~dp0..\web"

::: Check if dependencies are installed
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

::: Start the app (pass TSV_PYTHON to Electron so it uses same Python for auto-start)
endlocal & set "TSV_PYTHON=%TSV_PYTHON%" & call yarn dev

::: If we get here, the app was stopped
echo.
echo App stopped. You can close the daemon window now.
pause

