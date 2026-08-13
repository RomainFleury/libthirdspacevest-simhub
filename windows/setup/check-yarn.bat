@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Yarn Setup Check
::: Checks and installs Yarn via Corepack
:::
::: Usage: call setup\check-yarn.bat
:::
::: Exits with error code 1 on failure

echo [CHECK] Checking Yarn installation...

call "%~dp0use-corepack-yarn.bat"
if errorlevel 1 (
    echo   [FAIL] Could not enable Corepack Yarn.
    echo.
    echo   Corepack is the only supported way to install Yarn.
    echo   Do NOT use: npm install -g yarn
    echo   A classic Yarn 1.x install ^(e.g. "C:\Program Files (x86)\Yarn"^) is ignored.
    echo.
    exit /b 1
)

for /f "tokens=*" %%i in ('yarn --version 2^>nul') do set "YARN_VERSION=%%i"
if not defined YARN_VERSION (
    echo   [FAIL] Yarn still not available after enabling Corepack!
    echo.
    echo   Please try manually:
    echo     npm install -g corepack
    echo     corepack enable yarn --install-directory "%%APPDATA%%\npm"
    echo     corepack prepare yarn@4.11.0 --activate
    echo     yarn --version
    echo.
    exit /b 1
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
    echo   A global Yarn 1.x install may still be winning on PATH.
    echo   Try: corepack prepare yarn@%REQUIRED_VERSION% --activate
    echo        cd web
    echo        yarn install
    echo.
    exit /b 1
)

echo   [OK] Yarn %YARN_VERSION% correct version

:: Keep Corepack shims first on PATH for the rest of check-setup.bat
endlocal & set "PATH=%PATH%"
exit /b 0
