@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Install and Validate dxcam
::: This script installs dxcam if needed and validates capture works.
:::
::: Usage: call install-validate-dxcam.bat
:::
::: Notes:
::: - dxcam uses Windows DXGI Desktop Duplication (GPU capture)
::: - Capture may fail in some environments (e.g. Remote Desktop sessions)
:::
::: Sets DXCAM_OK=1 on success
::: Exits with error code 1 on failure

::: Get Python command
set "PYTHON_CMD=python"
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    where python3 >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Python is not installed or not in PATH!
        exit /b 1
    )
    set "PYTHON_CMD=python3"
)

::: Check if dxcam package is installed
echo [CHECK] Checking for dxcam package...
%PYTHON_CMD% -c "import dxcam" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] dxcam package not found, installing...
    %PYTHON_CMD% -m pip install dxcam --quiet
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dxcam package!
        echo Please run manually: pip install dxcam
        exit /b 1
    )
    echo [OK] dxcam package installed
) else (
    echo [OK] dxcam package found
)

::: Validate dxcam can capture at least one frame
echo [CHECK] Validating dxcam capture (single grab)...
%PYTHON_CMD% -c "import dxcam; cam=dxcam.create(output_idx=0, output_color='BGRA'); assert cam is not None, 'dxcam.create returned None'; frame=cam.grab(); assert frame is not None, 'dxcam.grab returned None'; print('[OK] dxcam grab shape=%s' % (getattr(frame,'shape',None),))"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] dxcam is installed but capture validation failed.
    echo.
    echo Common causes:
    echo   - Running under Remote Desktop (RDP) / no desktop duplication available
    echo   - Missing GPU / driver issues
    echo   - Windows capture restrictions on this system
    echo.
    echo Try running locally on the Windows machine (not via RDP), then re-run:
    echo   call windows\install-validate-dxcam.bat
    exit /b 1
)

::: Export DXCAM_OK for caller
endlocal & set "DXCAM_OK=1"
exit /b 0

