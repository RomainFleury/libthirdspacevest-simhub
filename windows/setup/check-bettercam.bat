@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - BetterCam Setup Check
::: Checks and installs bettercam for screen capture (used by Screen Health feature)
:::
::: Usage: call setup\check-bettercam.bat
:::
::: Requires: TSV_PYTHON to be set (call check-python.bat first)
:::
::: Notes:
:::   - bettercam uses Windows Desktop Duplication (DXGI)
:::   - Capture may fail in some environments (e.g. Remote Desktop sessions)
:::   - Compatible with Python 3.14+ (and 3.11+)
:::
::: Sets BETTERCAM_OK=1 on success
::: Exits with error code 1 on failure

echo [CHECK] Checking bettercam installation...

:: Load .env.bat if present
if exist "%~dp0..\.env.bat" call "%~dp0..\.env.bat"

:: Get Python command - TSV_PYTHON is REQUIRED
if not defined TSV_PYTHON (
    echo   [FAIL] Missing environment variable TSV_PYTHON
    echo.
    echo   Please set TSV_PYTHON in windows\.env.bat or run check-python.bat first.
    echo   Example: set "TSV_PYTHON=py -3.14"
    echo.
    exit /b 1
)
set "PYTHON_CMD=%TSV_PYTHON%"

:: Check if bettercam package is installed
@REM cmd /c "%PYTHON_CMD% -c \"import bettercam\"" >nul 2>&1
@REM if !ERRORLEVEL! neq 0 (
@REM     echo   [INFO] bettercam package not found, installing...
@REM     cmd /c "!PYTHON_CMD! -m pip install bettercam --quiet" >nul 2>&1
@REM     if !ERRORLEVEL! neq 0 (
@REM         echo   [FAIL] Failed to install bettercam package!
@REM         echo          Please run manually: pip install bettercam
@REM         exit /b 1
@REM     )
@REM     echo   [OK] bettercam package installed
@REM ) else (
@REM     echo   [OK] bettercam package found
@REM )

:: Validate bettercam can capture at least one ROI
echo   [..] Validating screen capture - single ROI grab...
:: call !PYTHON_CMD! "%~dp0test-bettercam-debug.py"


:: DO NOT TOUCH CODE BEFORE THIS LINE!!!!!

call !PYTHON_CMD! "%~dp0test-bettercam-debug.py" > "%TEMP%\bettercam-output.txt" 2>&1
type "%TEMP%\bettercam-output.txt"
findstr /C:"SUCCESS" "%TEMP%\bettercam-output.txt" >nul 2>&1
set "HAS_SUCCESS=!ERRORLEVEL!"
if !HAS_SUCCESS! equ 0 (
    echo   [OK] Screen capture test passed
    set "BETTERCAM_OK=1"
) else (
    echo   [WARN] bettercam capture test failed
    echo   Screen Health features may not work.
    :: Don't fail - just warn. Screen health is optional.
    set "BETTERCAM_OK=0"
)

:: Export BETTERCAM_OK for caller
endlocal & set "BETTERCAM_OK=%BETTERCAM_OK%"
exit /b 0

