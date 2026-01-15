@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Release Builder for Windows
:: This script builds a complete Windows installer
::
:: Prerequisites:
::   - Python 3.14+ (in PATH)
::   - Node.js 18+ (in PATH)
::   - Yarn (install via: corepack enable)
::
:: Output:
::   web/release/Third Space Vest Setup 1.0.0.exe

echo.
echo ========================================
echo   Third Space Vest - Release Builder
echo ========================================
echo.

:: Load optional local python override (windows\.env.bat)
if exist "%~dp0.env.bat" call "%~dp0.env.bat"

:: Resolve Python command (TSV_PYTHON -> py -3.14 -> python/python3)
set "PYTHON_CMD="
if defined TSV_PYTHON (
    set "PYTHON_CMD=%TSV_PYTHON%"
) else (
    echo "TSV PYTHON NOT DEFINED CHECK .env.bat"
    exit /b 1
)

echo [1/5] Checking setup
call "%~dp0check-setup.bat"
call "%~dp0setup\check-pyinstaller.bat"
call "%~dp0setup\check-libusb.bat"

echo [OK] Python dependencies installed

:: Step 1.5: Ensure vest-daemon-entry.py exists
echo [1.5/5] Ensuring vest-daemon-entry.py exists...
call "%~dp0setup\ensure-vest-daemon-entry.bat"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to ensure vest-daemon-entry.py exists!
    exit /b 1
)
echo.

:: Step 2: Build Python daemon
echo [2/5] Building Python daemon vest-daemon.exe...
cd /d "%~dp0..\modern-third-space\build"
set SRC_DIR=%CD%\..\src


:: Include libusb DLL in the bundle (extracted to same dir as exe at runtime)
%PYTHON_CMD% -m PyInstaller --onefile --name vest-daemon --console --clean --paths "%SRC_DIR%" --add-binary "%LIBUSB_DLL%;." --hidden-import modern_third_space.vest --hidden-import modern_third_space.vest.controller --hidden-import modern_third_space.vest.status --hidden-import modern_third_space.vest.discovery --hidden-import modern_third_space.presets --hidden-import modern_third_space.server --hidden-import modern_third_space.server.daemon --hidden-import modern_third_space.server.protocol --hidden-import modern_third_space.server.client_manager --hidden-import modern_third_space.server.lifecycle --hidden-import modern_third_space.server.cs2_manager --hidden-import modern_third_space.server.alyx_manager --hidden-import modern_third_space.server.superhot_manager --hidden-import modern_third_space.server.screen_health_manager --hidden-import modern_third_space.legacy_adapter --hidden-import bettercam vest-daemon-entry.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to build daemon!
    exit /b 1
)
cd ..\..
echo.

:: Step 3: Install Node dependencies
echo [3/5] Installing Node.js dependencies...
cd web
call corepack enable >nul 2>&1
call yarn install >nul 2>&1
echo [OK] Node.js dependencies installed
echo.

:: Step 4: Build React app
echo [4/5] Building React application...
call yarn build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to build React app!
    exit /b 1
)
echo.

:: Step 4.5: Copy daemon to dist/daemon for bundling
echo [4.5/5] Preparing daemon for bundling...
if not exist "dist\daemon" mkdir dist\daemon
if exist "..\modern-third-space\build\dist\vest-daemon.exe" (
    copy /Y "..\modern-third-space\build\dist\vest-daemon.exe" "dist\daemon\" >nul
    echo [OK] Daemon copied to dist/daemon/
) else (
    echo [ERROR] Daemon executable not found!
    echo Please run: cd modern-third-space\build && python build-daemon.py
    exit /b 1
)
echo.

:: Step 5: Package with electron-builder
echo [5/5] Packaging with Electron Builder...
if exist "release" (
    echo        Cleaning previous build...
    :: Kill any running Electron processes that might be locking files
    taskkill /F /IM electron.exe /T >nul 2>&1
    taskkill /F /IM "Third Space Vest.exe" /T >nul 2>&1
    timeout /t 1 /nobreak >nul 2>&1
    :: Use PowerShell to force remove locked files
    powershell -Command "if (Test-Path 'release') { Remove-Item -Path 'release' -Recurse -Force -ErrorAction SilentlyContinue }" >nul 2>&1
)
set CSC_IDENTITY_AUTO_DISCOVERY=false
call yarn electron-builder --win --config electron-builder.yml
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to package application!
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo Output files are in: web\release\
echo.
echo   - Third Space Vest Setup 1.0.0.exe -- installer
echo   - Third Space Vest-1.0.0-portable.zip -- portable
echo.

:: Open the release folder
start "" "%~dp0..\web\release"
