@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Node.js Setup Check
::: Checks Node.js installation
:::
::: Usage: call setup\check-node.bat
:::
::: Exits with error code 1 on failure

echo [CHECK] Checking Node.js installation...

:: Check if node is available
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [FAIL] Node.js is not installed!
    echo.
    echo   Please install Node.js:
    echo     Option A: Windows Store
    echo       1. Open Microsoft Store
    echo       2. Search for "Node.js LTS"
    echo       3. Click Install
    echo.
    echo     Option B: Direct Download
    echo       1. Go to https://nodejs.org/
    echo       2. Download the LTS version (green button)
    echo       3. Run installer
    echo.
    exit /b 1
)

:: Get Node version
for /f "tokens=*" %%i in ('node --version') do set "NODE_VERSION=%%i"

:: Extract major version number
set "NODE_MAJOR=%NODE_VERSION:~1%"
for /f "tokens=1 delims=." %%i in ("%NODE_MAJOR%") do set "NODE_MAJOR=%%i"

:: Check minimum version (v18+)
if %NODE_MAJOR% LSS 18 (
    echo   [WARN] Node.js %NODE_VERSION% found (v18+ recommended)
    echo          Some features may not work correctly.
    echo          Consider upgrading from https://nodejs.org/
) else (
    echo   [OK] Node.js %NODE_VERSION%
)

exit /b 0
