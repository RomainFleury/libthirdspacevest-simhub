@echo off
REM Custom daemon start script for this specific computer
REM Uses the full path to Python to avoid "python not found" errors

setlocal EnableDelayedExpansion

REM Set the Python executable path (update this if Python is installed elsewhere)
set PYTHON_EXE=C:\Users\froma\AppData\Local\Programs\Python\Python313\python.exe

cd modern-third-space\src
%PYTHON_EXE% -u -m modern_third_space.cli daemon start --port 5050
cd ..

