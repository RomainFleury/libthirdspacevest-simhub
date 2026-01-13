@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - libusb Setup Check
::: Checks and installs libusb for USB device communication
:::
::: Usage: call setup\check-libusb.bat
:::
::: Requires: TSV_PYTHON to be set (call check-python.bat first)
:::
::: Sets LIBUSB_PATH and LIBUSB_DLL on success
::: Exits with error code 1 on failure

echo [CHECK] Checking libusb installation...

:: Load .env.bat if present
if exist "%~dp0..\.env.bat" call "%~dp0..\.env.bat"

:: Get Python command
if not defined TSV_PYTHON (
    set "PYTHON_CMD=python"
) else (
    set "PYTHON_CMD=%TSV_PYTHON%"
)

:: Get Python prefix (installation path)
for /f "tokens=*" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.prefix)" 2^>nul') do set "PYTHON_PREFIX=%%i"
if not defined PYTHON_PREFIX (
    echo   [FAIL] Could not determine Python installation path
    exit /b 1
)

:: Check if libusb package is installed
%PYTHON_CMD% -c "import libusb" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [INFO] libusb package not found, installing...
    %PYTHON_CMD% -m pip install libusb --quiet
    if !ERRORLEVEL! neq 0 (
        echo   [FAIL] Failed to install libusb package!
        echo          Please run manually: pip install libusb
        exit /b 1
    )
    echo   [OK] libusb package installed
) else (
    echo   [OK] libusb package found
)

:: Find libusb DLL - try multiple possible locations
set "LIBUSB_PATH="
set "LIBUSB_DLL="

:: Try x86_64 first (most common on modern systems)
set "TEST_PATH=%PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\x86_64"
if exist "%TEST_PATH%\libusb-1.0.dll" (
    set "LIBUSB_PATH=%TEST_PATH%"
    set "LIBUSB_DLL=%TEST_PATH%\libusb-1.0.dll"
    goto :found
)

:: Try old path format (x64)
set "TEST_PATH=%PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\_windows\x64"
if exist "%TEST_PATH%\libusb-1.0.dll" (
    set "LIBUSB_PATH=%TEST_PATH%"
    set "LIBUSB_DLL=%TEST_PATH%\libusb-1.0.dll"
    goto :found
)

:: Try x86 (32-bit)
set "TEST_PATH=%PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\x86"
if exist "%TEST_PATH%\libusb-1.0.dll" (
    set "LIBUSB_PATH=%TEST_PATH%"
    set "LIBUSB_DLL=%TEST_PATH%\libusb-1.0.dll"
    goto :found
)

:: Try arm64 (for ARM Windows)
set "TEST_PATH=%PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\arm64"
if exist "%TEST_PATH%\libusb-1.0.dll" (
    set "LIBUSB_PATH=%TEST_PATH%"
    set "LIBUSB_DLL=%TEST_PATH%\libusb-1.0.dll"
    goto :found
)

:: DLL not found
echo   [FAIL] libusb DLL not found!
echo.
echo   The libusb package is installed but the DLL is missing.
echo   Searched in:
echo     %PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\x86_64
echo     %PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\x86
echo     %PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\arm64
echo.
echo   Try reinstalling: pip uninstall libusb ^&^& pip install libusb
exit /b 1

:found
echo   [OK] libusb DLL found
echo        Path: %LIBUSB_DLL%

:: Add to PATH for current session and export for caller
set "PATH=%LIBUSB_PATH%;%PATH%"
set "EXPORT_LIBUSB_PATH=!LIBUSB_PATH!"
set "EXPORT_LIBUSB_DLL=!LIBUSB_DLL!"
endlocal & set "LIBUSB_PATH=%EXPORT_LIBUSB_PATH%" & set "LIBUSB_DLL=%EXPORT_LIBUSB_DLL%"
exit /b 0
