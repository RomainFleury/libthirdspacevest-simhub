@echo off
setlocal EnableDelayedExpansion

REM Custom build wrapper (local overrides supported)
REM Prefer using windows\.env.bat instead of hardcoding Python paths.

if exist "%~dp0.env.bat" call "%~dp0.env.bat"

echo.
echo ========================================
echo   Third Space Vest - Custom Build
echo ========================================
echo.
if defined TSV_PYTHON (
    echo Using TSV_PYTHON=%TSV_PYTHON%
) else (
    echo Using default Python resolution (py -3.14, python, python3)
)
echo.

cd /d "%~dp0"
call build-release.bat
exit /b %ERRORLEVEL%

