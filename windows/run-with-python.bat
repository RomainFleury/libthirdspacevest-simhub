@echo off
REM Helper script to run another batch file with the configured Python.
REM Prefer setting TSV_PYTHON in windows\.env.bat to pin the Python version.

setlocal EnableDelayedExpansion

if exist "%~dp0.env.bat" call "%~dp0.env.bat"

set "PYTHON_CMD="
if defined TSV_PYTHON (
  set "PYTHON_CMD=%TSV_PYTHON%"
) else (
  where py >nul 2>&1
  if %ERRORLEVEL% equ 0 (
    py -3.11 -c "import sys" >nul 2>&1
    if %ERRORLEVEL% equ 0 set "PYTHON_CMD=py -3.11"
  )
  if not defined PYTHON_CMD set "PYTHON_CMD=python"
)

REM Export PYTHON_CMD for scripts that use it
endlocal & (
  set "PYTHON_CMD=%PYTHON_CMD%"
  if "%~1"=="" (
    echo Usage: run-with-python.bat ^<script.bat^> [args...]
    exit /b 1
  )
  call "%~1" %*
  exit /b %ERRORLEVEL%
)

