@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - RapidShot Setup Check
::: Checks and installs rapidshot for screen capture (used by Screen Health feature)
:::
::: Usage: call setup\check-rapidshot.bat
:::
::: Requires: TSV_PYTHON to be set (call check-python.bat first)
:::
::: Notes:
:::   - rapidshot uses Windows Desktop Duplication (DXGI)
:::   - Capture may fail in some environments (e.g. Remote Desktop sessions)
:::   - Not compatible with Python 3.14+ yet
:::
::: Sets RAPIDSHOT_OK=1 on success
::: Exits with error code 1 on failure

echo [CHECK] Checking rapidshot installation...

:: Load .env.bat if present
if exist "%~dp0..\.env.bat" call "%~dp0..\.env.bat"

:: Get Python command
if not defined TSV_PYTHON (
    set "PYTHON_CMD=python"
) else (
    set "PYTHON_CMD=%TSV_PYTHON%"
)

:: Verify Python version (RapidShot ecosystem may not support 3.14+ yet)
set "PY_MAJOR="
set "PY_MINOR="
for /f "delims=" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.version_info.major)" 2^>nul') do set "PY_MAJOR=%%i"
for /f "delims=" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.version_info.minor)" 2^>nul') do set "PY_MINOR=%%i"

if not defined PY_MAJOR (
    echo   [FAIL] Could not detect Python version
    exit /b 1
)

if "%PY_MAJOR%"=="3" (
    if !PY_MINOR! GEQ 14 (
        echo   [FAIL] Python %PY_MAJOR%.%PY_MINOR% detected
        echo          rapidshot is not compatible with Python 3.14+ yet.
        echo.
        echo   Fix: Install Python 3.11 and update your .env.bat
        echo        set "TSV_PYTHON=py -3.11"
        exit /b 1
    )
)

:: Check if rapidshot package is installed
%PYTHON_CMD% -c "import rapidshot" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [INFO] rapidshot package not found, installing...
    %PYTHON_CMD% -m pip install rapidshot --quiet
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Failed to install rapidshot package!
        echo          Please run manually: pip install rapidshot
        exit /b 1
    )
    echo   [OK] rapidshot package installed
) else (
    echo   [OK] rapidshot package found
)

:: Validate rapidshot can capture at least one ROI
echo   [..] Validating screen capture (single ROI grab)...
%PYTHON_CMD% -c "import rapidshot; cap=rapidshot.create(output_idx=0, output_color='BGRA'); frame=cap.grab(region=(0,0,32,32)); assert frame is not None, 'grab returned None'" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [WARN] rapidshot capture test failed
    echo.
    echo   This may be normal if:
    echo     - Running via Remote Desktop (RDP)
    echo     - No GPU / driver issues
    echo     - Windows capture restrictions
    echo.
    echo   Screen Health features may not work.
    echo   Try running locally (not via RDP) if you need this feature.
    :: Don't fail - just warn. Screen health is optional.
    endlocal & set "RAPIDSHOT_OK=0"
    exit /b 0
) else (
    echo   [OK] Screen capture test passed
)

:: Export RAPIDSHOT_OK for caller
endlocal & set "RAPIDSHOT_OK=1"
exit /b 0
