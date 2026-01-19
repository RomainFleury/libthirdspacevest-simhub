@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - PyInstaller Setup Check
::: Checks and installs PyInstaller for creating executable files
:::
::: Usage: call setup\check-pyinstaller.bat
:::
::: Requires: TSV_PYTHON to be set (call check-python.bat first)
:::
::: Exits with error code 1 on failure

echo [CHECK] Checking PyInstaller installation...

:: Load .env.bat if present
if exist "%~dp0..\.env.bat" call "%~dp0..\.env.bat"

:: Get Python command
if not defined TSV_PYTHON (
    set "PYTHON_CMD=python"
) else (
    set "PYTHON_CMD=%TSV_PYTHON%"
)

:: Check if PyInstaller package is installed
%PYTHON_CMD% -c "import PyInstaller" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [INFO] PyInstaller package not found, installing...
    %PYTHON_CMD% -m pip install pyinstaller --quiet
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Failed to install PyInstaller package!
        echo          Please run manually: pip install pyinstaller
        exit /b 1
    )
    echo   [OK] PyInstaller package installed
) else (
    echo   [OK] PyInstaller package found
)

:: Verify PyInstaller CLI works
%PYTHON_CMD% -m PyInstaller --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [WARN] PyInstaller CLI test failed (package may still work)
) else (
    for /f "tokens=*" %%i in ('%PYTHON_CMD% -m PyInstaller --version 2^>nul') do set "PYINSTALLER_VERSION=%%i"
    echo   [OK] PyInstaller CLI verified
    echo        Version: %PYINSTALLER_VERSION%
)

exit /b 0
