@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Install and Validate RapidShot
::: This script installs rapidshot if needed and validates capture works.
:::
::: Usage: call install-validate-rapidshot.bat
:::
::: Notes:
::: - rapidshot uses Windows Desktop Duplication (DXGI)
::: - Capture may fail in some environments (e.g. Remote Desktop sessions)
:::
::: Sets RAPIDSHOT_OK=1 on success
::: Exits with error code 1 on failure

::: Get Python command
set "PYTHON_CMD="

:: Prefer Windows Python Launcher with a known-good version (3.11)
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    py -3.11 -c "import sys" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PYTHON_CMD=py -3.11"
    )
)

:: Fallback to python/python3 on PATH
if not defined PYTHON_CMD (
    set "PYTHON_CMD=python"
    where python >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        where python3 >nul 2>&1
        if %ERRORLEVEL% neq 0 (
            echo [ERROR] Python is not installed or not in PATH!
            echo Install Python 3.11+ and re-run this script.
            exit /b 1
        )
        set "PYTHON_CMD=python3"
    )
)

:: Verify Python version (RapidShot ecosystem may not support 3.14+ yet)
set "PY_MAJOR="
set "PY_MINOR="
for /f "delims=" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.version_info.major)" 2^>nul') do set "PY_MAJOR=%%i"
for /f "delims=" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.version_info.minor)" 2^>nul') do set "PY_MINOR=%%i"
if not defined PY_MAJOR (
    echo [ERROR] Failed to detect Python version.
    exit /b 1
)
if "%PY_MAJOR%"=="3" (
    if %PY_MINOR% GEQ 14 (
        echo [ERROR] Python %PY_MAJOR%.%PY_MINOR% detected. rapidshot (or its dependencies) is not compatible with Python 3.14+ yet.
        echo.
        echo Fix:
        echo   - Install Python 3.11 (recommended) and re-run this script, OR
        echo   - Use the Windows launcher explicitly: py -3.11 -m pip install rapidshot
        echo.
        exit /b 1
    )
)

::: Check if rapidshot package is installed
echo [CHECK] Checking for rapidshot package...
%PYTHON_CMD% -c "import rapidshot" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] rapidshot package not found, installing...
    %PYTHON_CMD% -m pip install rapidshot --quiet
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install rapidshot package!
        echo Please run manually: pip install rapidshot
        exit /b 1
    )
    echo [OK] rapidshot package installed
) else (
    echo [OK] rapidshot package found
)

::: Validate rapidshot can capture at least one ROI
echo [CHECK] Validating rapidshot capture (single ROI grab)...
%PYTHON_CMD% -c "import rapidshot; cap=rapidshot.create(output_idx=0, output_color='BGRA'); frame=cap.grab(region=(0,0,32,32)); assert frame is not None, 'grab returned None'; print('[OK] rapidshot grab shape=%s dtype=%s' % (getattr(frame,'shape',None), getattr(frame,'dtype',None)))"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] rapidshot is installed but capture validation failed.
    echo.
    echo Common causes:
    echo   - Running under Remote Desktop (RDP) / no desktop duplication available
    echo   - Missing GPU / driver issues
    echo   - Windows capture restrictions on this system
    echo.
    echo Try running locally on the Windows machine (not via RDP), then re-run:
    echo   call windows\install-validate-rapidshot.bat
    exit /b 1
)

::: Export RAPIDSHOT_OK for caller
endlocal & set "RAPIDSHOT_OK=1"
exit /b 0

