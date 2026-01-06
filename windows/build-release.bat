@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Release Builder for Windows
:: This script builds a complete Windows installer
::
:: Prerequisites:
::   - Python 3.11+ (in PATH)
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

:: Check for Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.11+ from https://python.org/
    pause
    exit /b 1
)

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

:: Show versions
for /f "tokens=*" %%i in ('python --version') do echo [OK] %%i
for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js %%i
echo.

:: Navigate to project root
cd /d "%~dp0.."

:: Step 1: Install Python dependencies
echo [1/5] Installing Python dependencies...
cd modern-third-space
pip install -e . >nul 2>&1
pip install pyinstaller libusb >nul 2>&1
cd ..

:: Install and validate libusb DLL
echo [CHECK] Verifying libusb DLL installation...
call "%~dp0install-validate-libusb.bat"
if %ERRORLEVEL% neq 0 (
    echo.
    echo This is required for USB device communication and must be available for the build.
    pause
    exit /b 1
)
echo [OK] Python dependencies installed
echo.

:: Step 2: Build Python daemon
echo [2/5] Building Python daemon (vest-daemon.exe)...
cd modern-third-space\build
set SRC_DIR=%CD%\..\src

:: Include libusb DLL in the bundle (extracted to same dir as exe at runtime)
python -m PyInstaller --onefile --name vest-daemon --console --clean --paths "%SRC_DIR%" --add-binary "%LIBUSB_PATH%\libusb-1.0.dll;." --hidden-import modern_third_space.vest --hidden-import modern_third_space.vest.controller --hidden-import modern_third_space.vest.status --hidden-import modern_third_space.vest.discovery --hidden-import modern_third_space.presets --hidden-import modern_third_space.server --hidden-import modern_third_space.server.daemon --hidden-import modern_third_space.server.protocol --hidden-import modern_third_space.server.client_manager --hidden-import modern_third_space.server.lifecycle --hidden-import modern_third_space.server.cs2_manager --hidden-import modern_third_space.server.alyx_manager --hidden-import modern_third_space.server.superhot_manager --hidden-import modern_third_space.legacy_adapter vest-daemon-entry.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to build daemon!
    pause
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
    pause
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
    pause
    exit /b 1
)
echo.

:: Step 5: Package with electron-builder
echo [5/5] Packaging with Electron Builder...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call yarn electron-builder --win --config electron-builder.yml
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to package application!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo Output files are in: web\release\
echo.
echo   - Third Space Vest Setup 1.0.0.exe (installer)
echo   - Third Space Vest-1.0.0-portable.zip (portable)
echo.

:: Open the release folder
start "" "%~dp0..\web\release"

pause
