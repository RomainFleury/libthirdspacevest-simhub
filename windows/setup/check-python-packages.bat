@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Python Packages Setup Check
::: Checks and installs the modern_third_space Python package
:::
::: Usage: call setup\check-python-packages.bat
:::
::: Requires: TSV_PYTHON to be set (call check-python.bat first)
:::
::: Exits with error code 1 on failure

echo [CHECK] Checking Python packages...

:: Load .env.bat if present
if exist "%~dp0..\.env.bat" call "%~dp0..\.env.bat"

:: Get Python command
if not defined TSV_PYTHON (
    echo   [WARN] TSV_PYTHON not set, using default python
    set "PYTHON_CMD=python"
) else (
    set "PYTHON_CMD=%TSV_PYTHON%"
)

:: Check if modern_third_space is importable
%PYTHON_CMD% -c "import modern_third_space" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [INFO] modern_third_space package not found, installing...
    
    :: Check if modern-third-space folder exists
    if not exist "%~dp0..\..\modern-third-space" (
        echo   [FAIL] modern-third-space folder not found!
        echo          Make sure you cloned the repository correctly.
        exit /b 1
    )
    
    :: Install the package in editable mode
    pushd "%~dp0..\..\modern-third-space"
    %PYTHON_CMD% -m pip install -e . --quiet
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Failed to install modern_third_space package!
        echo.
        echo   Please try manually:
        echo     cd modern-third-space
        echo     pip install -e .
        echo.
        popd
        exit /b 1
    )
    popd
    echo   [OK] modern_third_space package installed
) else (
    echo   [OK] modern_third_space package found
)

:: Verify the CLI works
%PYTHON_CMD% -m modern_third_space.cli ping >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [WARN] CLI ping test failed (may still work)
) else (
    echo   [OK] CLI ping test passed
)

exit /b 0
