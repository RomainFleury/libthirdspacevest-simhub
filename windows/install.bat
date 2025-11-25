@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Windows Installer
:: Double-click this file to install dependencies

echo.
echo ========================================
echo   Third Space Vest - Windows Installer
echo ========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo   1. Go to https://nodejs.org/
    echo   2. Download and install the LTS version
    echo   3. Restart your computer
    echo   4. Run this script again
    echo.
    pause
    exit /b 1
)

:: Show Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found

:: Enable Corepack for Yarn
echo.
echo [..] Enabling Yarn...
call corepack enable >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] Could not enable Corepack, trying alternative...
    npm install -g yarn >nul 2>&1
)

:: Check Yarn
where yarn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Yarn could not be installed
    echo Please try running: npm install -g yarn
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('yarn --version') do set YARN_VERSION=%%i
echo [OK] Yarn %YARN_VERSION% ready

:: Navigate to web directory
cd /d "%~dp0..\web"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Could not find web directory
    pause
    exit /b 1
)

echo.
echo [..] Installing dependencies (this may take 2-3 minutes)...
echo.

:: Install dependencies
call yarn install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo.
    echo Try these steps:
    echo   1. Delete the "node_modules" folder in web/
    echo   2. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   [OK] Setup complete!
echo ========================================
echo.
echo To run the app, double-click: run.bat
echo.
pause

