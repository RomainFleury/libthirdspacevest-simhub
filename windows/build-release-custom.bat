@echo off
REM Custom build release script for this specific computer
REM Uses the full path to Python to avoid "python not found" errors
REM Adds libusb DLL to PATH so USB devices can be detected during build

setlocal EnableDelayedExpansion

REM Set the Python executable path (update this if Python is installed elsewhere)
set PYTHON_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe

REM Add libusb DLL to PATH (required for PyUSB to detect USB devices)
set LIBUSB_DLL_PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python313\Lib\site-packages\libusb\_platform\windows\x86_64
set PATH=%LIBUSB_DLL_PATH%;%PATH%

REM Set LIBUSB_PATH for build-release.bat (used by PyInstaller)
set LIBUSB_PATH=%LIBUSB_DLL_PATH%

REM Add Python and Scripts to PATH so build scripts can find them
set PYTHON_DIR=%USERPROFILE%\AppData\Local\Programs\Python\Python313
set PYTHON_SCRIPTS=%PYTHON_DIR%\Scripts
set PATH=%PYTHON_DIR%;%PYTHON_SCRIPTS%;%PATH%

REM Set PYTHON_CMD for batch files that check it
set PYTHON_CMD=python

echo.
echo ========================================
echo   Third Space Vest - Custom Build
echo ========================================
echo.
echo Python: %PYTHON_EXE%
echo libusb DLL: %LIBUSB_DLL_PATH%
echo.

REM Navigate to windows directory
cd /d "%~dp0"

REM Call the original build-release.bat
call build-release.bat

REM Preserve exit code
exit /b %ERRORLEVEL%
