@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Yarn Setup Check
::: Checks and installs Yarn via Corepack
:::
::: Usage: call setup\check-yarn.bat
:::
::: Exits with error code 1 on failure

echo [CHECK] Checking Yarn installation...

:: First check if Node.js is available (required for Yarn)
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [SKIP] Node.js not found (required for Yarn)
    exit /b 1
)

:: Check if yarn is available
where yarn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [INFO] Yarn not found, attempting to enable via Corepack...
    
    :: Try to enable corepack
    call corepack enable >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo   [WARN] Corepack enable failed, trying npm install...
        call npm install -g yarn >nul 2>&1
    )
    
    :: Check again
    where yarn >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Could not install Yarn!
        echo.
        echo   Please try manually:
        echo     corepack enable
        echo   or:
        echo     npm install -g yarn
        echo.
        exit /b 1
    )
)

:: Get Yarn version
for /f "tokens=*" %%i in ('yarn --version') do set "YARN_VERSION=%%i"
echo   [OK] Yarn %YARN_VERSION%

exit /b 0
