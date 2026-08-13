@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Start UI (Electron dev)
:: This script starts only the UI. (Daemon can be started separately or auto-started by Electron.)

echo.
echo ========================================
echo   Third Space Vest - UI Startup
echo ========================================
echo.

:: Load optional local python override (windows\.env.bat)
if exist "%~dp0.env.bat" call "%~dp0.env.bat"

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please see SETUP.md for installation instructions.
    pause
    exit /b 1
)

:: Resolve Python command and set TSV_PYTHON for Electron to inherit
:: This ensures the JavaScript daemon code uses the same Python as batch scripts
if not defined TSV_PYTHON (
    where py >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        py -3.14 -c "import sys" >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "TSV_PYTHON=py -3.14"
        )
    )
    if not defined TSV_PYTHON (
        where python >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "TSV_PYTHON=python"
        ) else (
            where python3 >nul 2>&1
            if !ERRORLEVEL! equ 0 (
                set "TSV_PYTHON=python3"
            )
        )
    )
)

echo [INFO] TSV_PYTHON=%TSV_PYTHON%
echo        (Electron will use this Python if it needs to start the daemon)
echo.

:: Yarn 4.11.0 must already be set up (run check-setup.bat)
call "%~dp0setup\require-corepack-yarn.bat"
if errorlevel 1 (
    echo [ERROR] Yarn 4.11.0 is required. Run check-setup.bat first.
    pause
    exit /b 1
)

:: Navigate to web directory
cd /d "%~dp0..\web"

:: Ensure dependencies
if not exist "node_modules" (
    echo [WARN] Dependencies not installed. Installing...
    call yarn install
)

echo [OK] Starting Electron app...
echo.

:: Pass TSV_PYTHON out of setlocal; endlocal restores cwd to the script folder, so cd to web before yarn.
endlocal & set "TSV_PYTHON=%TSV_PYTHON%" & set "PATH=%PATH%" & cd /d "%~dp0..\web" & call yarn dev

echo.
echo App stopped.
pause

