@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Web Dependencies Setup Check
::: Checks and installs Node.js dependencies for the Electron app
:::
::: Usage: call setup\check-web-dependencies.bat
:::
::: Requires: Node.js and Yarn to be available
:::
::: Exits with error code 1 on failure

echo [CHECK] Checking web dependencies...

:: Check if node is available
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [SKIP] Node.js not found
    exit /b 1
)

:: Check if yarn is available
where yarn >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [SKIP] Yarn not found
    exit /b 1
)

:: Check if web folder exists
if not exist "%~dp0..\..\web" (
    echo   [FAIL] web folder not found!
    exit /b 1
)

:: Check if node_modules exists
if exist "%~dp0..\..\web\node_modules" (
    echo   [OK] web/node_modules exists
) else (
    echo   [INFO] web/node_modules not found, installing...
    
    pushd "%~dp0..\..\web"
    call yarn install
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Failed to install web dependencies!
        echo.
        echo   Please try manually:
        echo     cd web
        echo     yarn install
        echo.
        popd
        exit /b 1
    )
    popd
    echo   [OK] Web dependencies installed
)

exit /b 0
