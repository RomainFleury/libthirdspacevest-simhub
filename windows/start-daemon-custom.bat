@echo off
REM Custom daemon start script for this specific computer
REM Uses the full path to Python to avoid "python not found" errors
REM Adds libusb DLL to PATH so USB devices can be detected

setlocal EnableDelayedExpansion

REM Set the Python executable path (update this if Python is installed elsewhere)
set PYTHON_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe

REM Add libusb DLL to PATH (required for PyUSB to detect USB devices)
set LIBUSB_DLL_PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python313\Lib\site-packages\libusb\_platform\windows\x86_64
set PATH=%LIBUSB_DLL_PATH%;%PATH%

cd modern-third-space\src
%PYTHON_EXE% -u -m modern_third_space.cli daemon start --port 5050
cd ..

