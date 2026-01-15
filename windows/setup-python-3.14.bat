@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Setup Python 3.14
:: This script helps configure Python 3.14 after installation
::
:: Usage: Double-click this file after installing Python 3.14

echo.
echo ========================================
echo   Third Space Vest - Python 3.14 Setup
echo ========================================
echo.

:: Check if Python 3.14 is available
echo [CHECK] Looking for Python 3.14...
py -3.14 --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [FAIL] Python 3.14 is not installed or not found!
    echo.
    echo   Please install Python 3.14 first:
    echo     1. Go to: https://www.python.org/downloads/
    echo     2. Download Python 3.14 (latest version)
    echo     3. Make sure to check "Add Python 3.14 to PATH" during installation
    echo     4. Restart your terminal after installation
    echo.
    pause
    exit /b 1
)

:: Get Python 3.14 version
for /f "tokens=*" %%i in ('py -3.14 --version 2^>^&1') do set "PY314_VERSION=%%i"
echo   [OK] Found %PY314_VERSION%
echo.

:: Create .env.bat to use Python 3.14
echo [CONFIG] Creating windows\.env.bat...
if exist "%~dp0.env.bat" (
    echo   [INFO] .env.bat already exists
    echo.
    set /p "OVERWRITE=  Overwrite with Python 3.14? [y/N]: "
    if /i "!OVERWRITE!" neq "Y" (
        echo   [SKIP] Keeping existing .env.bat
        goto :install_packages
    )
)

echo @echo off> "%~dp0.env.bat"
echo REM Third Space Vest - Python configuration>> "%~dp0.env.bat"
echo REM Configured to use Python 3.14>> "%~dp0.env.bat"
echo REM Edit this file to change Python version>> "%~dp0.env.bat"
echo.>> "%~dp0.env.bat"
echo set "TSV_PYTHON=py -3.14">> "%~dp0.env.bat"
echo   [OK] Created windows\.env.bat with TSV_PYTHON=py -3.14
echo.

:install_packages
:: Ask if user wants to install Python packages
echo [INSTALL] Install Python packages with Python 3.14?
echo.
echo   This will install all required packages (pyusb, mss, bettercam, etc.)
echo   in a fresh Python 3.14 environment.
echo.
set /p "INSTALL=  Install packages? [Y/n]: "
if /i "!INSTALL!"=="" set "INSTALL=Y"
if /i "!INSTALL!" neq "Y" (
    echo   [SKIP] Skipping package installation
    goto :summary
)

echo.
echo [INSTALL] Upgrading pip...
py -3.14 -m pip install --upgrade pip --quiet
if %ERRORLEVEL% neq 0 (
    echo   [WARN] Failed to upgrade pip, continuing anyway...
)

echo [INSTALL] Installing project packages...
cd /d "%~dp0..\modern-third-space"
py -3.14 -m pip install -e . --quiet
if %ERRORLEVEL% neq 0 (
    echo   [ERROR] Failed to install packages!
    echo   [INFO] You can try manually: py -3.14 -m pip install -e .
    pause
    exit /b 1
)
echo   [OK] Packages installed successfully
cd /d "%~dp0"

:summary
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo   Python 3.14 is configured as: py -3.14
echo   Configuration saved to: windows\.env.bat
echo.
echo   Next steps:
echo     1. Run check-setup.bat to verify everything
echo     2. Run start-all.bat to start the app
echo.
pause

