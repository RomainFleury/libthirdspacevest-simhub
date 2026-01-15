@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Start Python Daemon
::: Double-click this file to start the daemon

echo.
echo ========================================
echo   Third Space Vest - Python Daemon
echo ========================================
echo.

:: Load optional local python override (windows\.env.bat)
if exist "%~dp0.env.bat" call "%~dp0.env.bat"

::: Resolve Python command (TSV_PYTHON -> py -3.14 -> python/python3)
set "PYTHON_CMD="
if defined TSV_PYTHON (
    set "PYTHON_CMD=%TSV_PYTHON%"
) else (
    where py >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        py -3.14 -c "import sys" >nul 2>&1
        if %ERRORLEVEL% equ 0 (
            set "PYTHON_CMD=py -3.14"
        )
    )
    if not defined PYTHON_CMD (
        where python >nul 2>&1
        if %ERRORLEVEL% equ 0 (
            set "PYTHON_CMD=python"
        ) else (
            where python3 >nul 2>&1
            if %ERRORLEVEL% equ 0 (
                set "PYTHON_CMD=python3"
            )
        )
    )
)
if not defined PYTHON_CMD (
    echo [ERROR] Python is not installed!
    echo.
    echo Please install Python 3.14+:
    echo   1. Go to https://www.python.org/downloads/
    echo   2. Download Python 3.14 or newer
    echo   3. Run installer, CHECK "Add to PATH"
    echo   4. Restart your computer
    echo.
    pause
    exit /b 1
)

::: Show Python version
for /f "tokens=*" %%i in ('%PYTHON_CMD% --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION% found

::: Install and validate libusb DLL
call "%~dp0setup\check-libusb.bat"
if %ERRORLEVEL% neq 0 (
    echo.
    echo This is required for USB device communication.
    echo Run check-setup.bat for more details.
    pause
    exit /b 1
)

::: Navigate to Python source directory
cd /d "%~dp0..\modern-third-space\src"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not find modern-third-space/src directory
    pause
    exit /b 1
)

echo.
echo [..] Starting daemon on port 5050...
echo.
echo The daemon will keep running in this window.
echo Press Ctrl+C to stop it.
echo.

::: Start the daemon
%PYTHON_CMD% -m modern_third_space.cli daemon start --port 5050

::: If we get here, daemon was stopped
echo.
echo Daemon stopped.
pause

