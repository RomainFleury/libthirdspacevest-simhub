@echo off
setlocal EnableDelayedExpansion

:: Third Space Vest - Install and Validate libusb
:: This script installs libusb if needed and validates the DLL exists
:: 
:: Usage: call install-validate-libusb.bat
:: 
:: Sets LIBUSB_PATH variable on success
:: Exits with error code 1 on failure

:: Get Python command
set "PYTHON_CMD=python"
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    where python3 >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Python is not installed or not in PATH!
        exit /b 1
    )
    set "PYTHON_CMD=python3"
)

:: Get Python prefix
for /f "tokens=*" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.prefix)" 2^>nul') do set "PYTHON_PREFIX=%%i"
if not defined PYTHON_PREFIX (
    echo [ERROR] Failed to get Python installation path
    exit /b 1
)

:: Check if libusb package is installed
echo [CHECK] Checking for libusb package...
%PYTHON_CMD% -c "import libusb" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] libusb package not found, installing...
    %PYTHON_CMD% -m pip install libusb --quiet
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install libusb package!
        echo Please run manually: pip install libusb
        exit /b 1
    )
    echo [OK] libusb package installed
) else (
    echo [OK] libusb package found
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
echo [ERROR] libusb DLL not found!
echo.
echo Searched in:
echo   %PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\x86_64
echo   %PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\_windows\x64
echo   %PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\x86
echo   %PYTHON_PREFIX%\Lib\site-packages\libusb\_platform\windows\arm64
echo.
echo The libusb package is installed but the DLL is missing.
echo Try reinstalling: pip uninstall libusb ^&^& pip install libusb
echo.
exit /b 1

:found
echo [OK] libusb DLL found at: %LIBUSB_DLL%
:: Add to PATH for current session
set "PATH=%LIBUSB_PATH%;%PATH%"
:: Export LIBUSB_PATH and LIBUSB_DLL for caller
:: Capture values using delayed expansion (already enabled at top)
set "EXPORT_LIBUSB_PATH=!LIBUSB_PATH!"
set "EXPORT_LIBUSB_DLL=!LIBUSB_DLL!"
endlocal & set "LIBUSB_PATH=%EXPORT_LIBUSB_PATH%" & set "LIBUSB_DLL=%EXPORT_LIBUSB_DLL%"
exit /b 0

