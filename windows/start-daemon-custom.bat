@echo off
REM Custom daemon start script for this specific computer
REM Uses the full path to Python to avoid "python not found" errors

setlocal EnableDelayedExpansion

REM Set the Python executable path (update this if Python is installed elsewhere)
set PYTHON_EXE=C:\Users\froma\AppData\Local\Programs\Python\Python313\python.exe

REM Check if Python exists at the specified path
if not exist "%PYTHON_EXE%" (
    echo ERROR: Python not found at %PYTHON_EXE%
    echo Please update PYTHON_EXE in this batch file with your Python path.
    pause
    exit /b 1
)

REM Show Python version
for /f "tokens=*" %%i in ('"%PYTHON_EXE%" --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION% found

REM Add libusb DLL to PATH for PyUSB
for /f "tokens=*" %%i in ('"%PYTHON_EXE%" -c "import sys; print(sys.prefix)"') do set PYTHON_PREFIX=%%i
set LIBUSB_PATH=%PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\_windows\x64
if exist "%LIBUSB_PATH%\libusb-1.0.dll" (
    set PATH=%LIBUSB_PATH%;%PATH%
    echo [OK] libusb DLL found
) else (
    echo [WARN] libusb DLL not found - USB devices may not be detected
)

REM Get the script directory (where this .bat file is located)
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

REM Change to the modern-third-space src directory
cd /d "%PROJECT_ROOT%\modern-third-space\src"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not find modern-third-space/src directory
    pause
    exit /b 1
)

REM Set PYTHONPATH to include the src directory
set PYTHONPATH=%PROJECT_ROOT%\modern-third-space\src

REM Default port
set DAEMON_PORT=5050

REM Check if port argument is provided
if not "%~1"=="" (
    set DAEMON_PORT=%~1
)

echo.
echo ========================================
echo   Third Space Vest - Python Daemon
echo ========================================
echo Python: %PYTHON_EXE%
echo Port: %DAEMON_PORT%
echo Working Directory: %CD%
echo ========================================
echo.
echo The daemon will keep running in this window.
echo Press Ctrl+C to stop it.
echo.

REM Start the daemon
"%PYTHON_EXE%" -u -m modern_third_space.cli daemon start --port %DAEMON_PORT%

REM If we get here, the daemon exited
echo.
echo Daemon stopped.
pause

