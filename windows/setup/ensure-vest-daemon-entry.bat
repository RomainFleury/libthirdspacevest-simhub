@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Ensure vest-daemon-entry.py exists
::: Creates the vest-daemon-entry.py file if it doesn't exist
:::
::: Usage: call setup\ensure-vest-daemon-entry.bat
:::
::: Exits with error code 1 on failure

echo [CHECK] Ensuring vest-daemon-entry.py exists...

:: Load .env.bat if present
if exist "%~dp0..\.env.bat" call "%~dp0..\.env.bat"

:: Get absolute paths to avoid issues with directory changes
pushd "%~dp0..\.."
set "ROOT_DIR=%CD%"
popd

set "ENTRY_FILE=%ROOT_DIR%\modern-third-space\buildvest-daemon-entry.py"
set "BUILD_DIR=%ROOT_DIR%\modern-third-space\build"

:: Check if build directory exists, create if not
if not exist "%BUILD_DIR%" (
    echo   [INFO] Creating build directory...
    mkdir "%BUILD_DIR%"
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Failed to create build directory: %BUILD_DIR%
        exit /b 1
    )
)

:: Check if entry file exists and is valid
if exist "%ENTRY_FILE%" (
    :: Verify it's actually a Python file (check for import statement)
    findstr /C:"from modern_third_space.cli import main" "%ENTRY_FILE%" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo   [OK] vest-daemon-entry.py already exists and is valid
        echo        Path: %ENTRY_FILE%
        exit /b 0
    ) else (
        echo   [WARN] vest-daemon-entry.py exists but appears invalid, recreating...
        del /F /Q "%ENTRY_FILE%" >nul 2>&1
    )
)

:: Create the entry file
echo   [INFO] Creating vest-daemon-entry.py...

:: Write the file content directly using batch echo (most reliable for batch files)
(
echo #!/usr/bin/env python3
echo """
echo Entry point for PyInstaller-built vest-daemon executable.
echo.
echo This script is used as the entry point when building the daemon executable
echo with PyInstaller. It parses command line arguments and starts the daemon.
echo.
echo Usage:
echo     vest-daemon.exe daemon --port 5050
echo     vest-daemon.exe daemon start --port 5050
echo     vest-daemon.exe daemon stop
echo     vest-daemon.exe daemon status
echo """
echo.
echo import sys
echo from modern_third_space.cli import main
echo.
echo if __name__ == "__main__":
echo     # The CLI's main function handles all argument parsing
echo     # It will route "daemon" commands to the appropriate handler
echo     sys.exit(main^())
) > "%ENTRY_FILE%"

if !ERRORLEVEL! neq 0 (
    echo   [FAIL] Failed to create vest-daemon-entry.py!
    exit /b 1
)

:: Verify the file was created and is valid
if not exist "%ENTRY_FILE%" (
    echo   [FAIL] File was not created: %ENTRY_FILE%
    exit /b 1
)

:: Verify it contains the expected content
findstr /C:"from modern_third_space.cli import main" "%ENTRY_FILE%" >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo   [FAIL] Created file is invalid or corrupted!
    exit /b 1
)

echo   [OK] Created vest-daemon-entry.py
echo        Path: %ENTRY_FILE%

exit /b 0
