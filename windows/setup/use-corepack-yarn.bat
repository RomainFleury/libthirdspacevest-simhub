@echo off

::: Enable Corepack Yarn 4.11.0 for this machine.
::: Called only from check-yarn.bat. Do not use setlocal so PATH persists.
:::
::: - Installs Corepack if missing (Node 25+ does not bundle it)
::: - Enables the Yarn shim only (does not touch pnpm) in %APPDATA%\npm
::: - Skips prepare when Yarn 4.11.0 is already active

set "COREPACK_SHIMS=%APPDATA%\npm"
set "REQUIRED_YARN=4.11.0"

if not exist "%COREPACK_SHIMS%" mkdir "%COREPACK_SHIMS%"
set "PATH=%COREPACK_SHIMS%;%PATH%"

where corepack >nul 2>&1
if errorlevel 1 (
    where npm >nul 2>&1
    if errorlevel 1 (
        echo   [FAIL] npm not found; cannot install Corepack
        exit /b 1
    )
    echo   [INFO] Corepack not found ^(Node 25+ does not bundle it^), installing...
    call npm install -g corepack
    if errorlevel 1 (
        echo   [FAIL] Failed to install Corepack
        echo          Try: npm install -g corepack
        exit /b 1
    )
)

call corepack enable yarn --install-directory "%COREPACK_SHIMS%" >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] corepack enable yarn failed
    echo          Try: corepack enable yarn --install-directory "%COREPACK_SHIMS%"
    exit /b 1
)

set "CURRENT_YARN="
for /f "tokens=*" %%i in ('yarn --version 2^>nul') do set "CURRENT_YARN=%%i"
if not defined CURRENT_YARN goto :prepare
if "%CURRENT_YARN:~0,1%"=="v" set "CURRENT_YARN=%CURRENT_YARN:~1%"
if "%CURRENT_YARN%"=="%REQUIRED_YARN%" exit /b 0

:prepare
call corepack prepare yarn@%REQUIRED_YARN% --activate >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Failed to activate Yarn %REQUIRED_YARN%
    echo          Try: corepack prepare yarn@%REQUIRED_YARN% --activate
    exit /b 1
)

exit /b 0
