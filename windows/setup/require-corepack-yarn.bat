@echo off

::: Put Corepack Yarn shims first on PATH and require Yarn 4.11.0.
::: No install. Call from start/build scripts. Do not use setlocal so PATH persists.
:::
::: If this fails, run windows\check-setup.bat

set "PATH=%APPDATA%\npm;%PATH%"
set "REQUIRED_YARN=4.11.0"
set "YARN_VERSION="
for /f "tokens=*" %%i in ('yarn --version 2^>nul') do set "YARN_VERSION=%%i"
if not defined YARN_VERSION goto :fail
if "%YARN_VERSION:~0,1%"=="v" set "YARN_VERSION=%YARN_VERSION:~1%"
if "%YARN_VERSION%"=="%REQUIRED_YARN%" exit /b 0

:fail
if not defined YARN_VERSION set "YARN_VERSION=not found"
echo   [FAIL] Yarn %REQUIRED_YARN% is required ^(found: %YARN_VERSION%^)
echo          Run windows\check-setup.bat
exit /b 1
