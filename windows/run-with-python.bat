@echo off
REM Helper script to run other batch files with correct Python path
REM This ensures Python is found even if Windows Store alias interferes

setlocal EnableDelayedExpansion

REM Set Python executable path
set "PYTHON_EXE=%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe"

REM Add Python directory to PATH for this session (before WindowsApps)
set "PYTHON_DIR=%USERPROFILE%\AppData\Local\Programs\Python\Python313"
set "PYTHON_SCRIPTS=%PYTHON_DIR%\Scripts"
set "PATH=%PYTHON_DIR%;%PYTHON_SCRIPTS%;%PATH%"

REM Set PYTHON_CMD for batch files that check it
set "PYTHON_CMD=python"

REM If a script name was provided, run it
if "%~1" neq "" (
    call "%~1" %*
    exit /b %ERRORLEVEL%
)

REM Otherwise, show usage
echo Usage: run-with-python.bat [script.bat] [args...]
echo.
echo This script ensures Python is found correctly.
echo Example: run-with-python.bat install-validate-libusb.bat
exit /b 1
