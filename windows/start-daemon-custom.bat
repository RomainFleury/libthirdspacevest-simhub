@echo off
setlocal EnableDelayedExpansion

REM Custom daemon start script (local overrides supported)
REM Prefer using windows\.env.bat instead of hardcoding Python paths.

if exist "%~dp0.env.bat" call "%~dp0.env.bat"

REM Resolve Python command
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

REM Ensure libusb is available and add DLL to PATH
call "%~dp0install-validate-libusb.bat"
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

cd /d "%~dp0..\modern-third-space\src"
%PYTHON_CMD% -u -m modern_third_space.cli daemon start --port 5050 --screen-health-debug --screen-health-debug-save --screen-health-debug-dir debug_logs --screen-health-debug-every-n 10

