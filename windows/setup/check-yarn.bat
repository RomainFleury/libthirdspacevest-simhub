@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Yarn Setup Check
::: Checks and installs Yarn via Corepack
:::
::: Usage: call setup\check-yarn.bat
:::
::: Exits with error code 1 on failure

echo [CHECK] Checking Yarn installation...

:: Check if yarn is available by trying to get version
for /f "tokens=*" %%i in ('yarn --version 2^>nul') do set "YARN_VERSION=%%i"
if not defined YARN_VERSION (
    echo   [INFO] Yarn not found, attempting to enable via Corepack...
    
    :: Try to enable corepack
    call corepack enable >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Corepack enable failed!
        echo.
        echo   Please enable Corepack manually:
        echo     corepack enable
        echo.
        echo   Corepack is the only supported way to install Yarn.
        echo   Do NOT use: npm install -g yarn
        echo.
        exit /b 1
    )
    
    :: Check again after enabling corepack
    for /f "tokens=*" %%i in ('yarn --version 2^>nul') do set "YARN_VERSION=%%i"
    if not defined YARN_VERSION (
        echo   [FAIL] Yarn still not available after enabling Corepack!
        echo.
        echo   Please try manually:
        echo     corepack enable
        echo     yarn --version
        echo.
        exit /b 1
    )
)

:: Verify version matches package.json requirement (4.11.0)
set "REQUIRED_VERSION=4.11.0"
echo   Found: Yarn %YARN_VERSION%
echo   Required: Yarn %REQUIRED_VERSION%

:: Extract major.minor.patch from version (handle "v4.11.0" or "4.11.0" format)
set "VERSION_CLEAN=%YARN_VERSION%"
if "%VERSION_CLEAN:~0,1%"=="v" set "VERSION_CLEAN=%VERSION_CLEAN:~1%"

if not "%VERSION_CLEAN%"=="%REQUIRED_VERSION%" (
    echo   [WARN] Yarn version mismatch!
    echo          Found: %YARN_VERSION%
    echo          Required: %REQUIRED_VERSION% from package.json
    echo.
    echo   Corepack should automatically use the correct version.
    echo   Try: corepack enable
    echo        cd web
    echo        yarn install
    echo.
    exit /b 1
)

echo   [OK] Yarn %YARN_VERSION% correct version

exit /b 0
