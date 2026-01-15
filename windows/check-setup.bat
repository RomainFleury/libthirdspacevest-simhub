@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - Setup Check
::: Verifies all prerequisites and helps configure the environment
:::
::: Usage: Double-click this file or run from command line
:::
::: This script checks:
:::   1. Python installation (and helps create .env.bat)
:::   2. Node.js installation
:::   3. Yarn installation
:::   4. Python packages (modern_third_space)
:::   5. libusb (for USB vest communication)
:::   6. bettercam (for Screen Health feature)
:::   7. Web dependencies (node_modules)

echo.
echo ========================================
echo   Third Space Vest - Setup Check
echo ========================================
echo.

set "CHECKS_PASSED=0"
set "CHECKS_FAILED=0"
set "CHECKS_WARNED=0"

:: ============================================
:: 1. Python
:: ============================================
call "%~dp0setup\check-python.bat"
if %ERRORLEVEL% equ 0 (
    set /a CHECKS_PASSED+=1
) else (
    set /a CHECKS_FAILED+=1
    echo.
    echo   ^>^> Python is required. Please install it before continuing.
    echo.
    goto :summary
)
echo.

:: ============================================
:: 2. Node.js
:: ============================================
call "%~dp0setup\check-node.bat"
if %ERRORLEVEL% equ 0 (
    set /a CHECKS_PASSED+=1
) else (
    set /a CHECKS_FAILED+=1
)
echo.

:: ============================================
:: 3. Yarn
:: ============================================
call "%~dp0setup\check-yarn.bat"
if %ERRORLEVEL% equ 0 (
    set /a CHECKS_PASSED+=1
) else (
    set /a CHECKS_FAILED+=1
)
echo.

:: ============================================
:: 4. Python packages
:: ============================================
call "%~dp0setup\check-python-packages.bat"
if %ERRORLEVEL% equ 0 (
    set /a CHECKS_PASSED+=1
) else (
    set /a CHECKS_FAILED+=1
)
echo.

:: ============================================
:: 5. libusb
:: ============================================
call "%~dp0setup\check-libusb.bat"
if %ERRORLEVEL% equ 0 (
    set /a CHECKS_PASSED+=1
) else (
    set /a CHECKS_FAILED+=1
)
echo.

:: ============================================
:: 6. bettercam - for Screen Health
:: ============================================
call "%~dp0setup\check-bettercam.bat"
if %ERRORLEVEL% equ 0 (
    if "%BETTERCAM_OK%"=="1" (
        set /a CHECKS_PASSED+=1
    ) else (
        set /a CHECKS_WARNED+=1
    )
) else (
    set /a CHECKS_WARNED+=1
)
echo.

:: ============================================
:: 7. Web dependencies
:: ============================================
call "%~dp0setup\check-web-dependencies.bat"
if %ERRORLEVEL% equ 0 (
    set /a CHECKS_PASSED+=1
) else (
    set /a CHECKS_FAILED+=1
)
echo.


echo ========================================
echo.
echo   Useful files:
echo     windows\.env.bat       - Python configuration (edit to change version)
echo     windows\.env.bat.example - Example configuration
echo     windows\README.md      - Setup documentation
echo     windows\SETUP.md       - Detailed instructions
echo.


:summary
:: ============================================
:: Summary
:: ============================================
echo ========================================
echo   Summary
echo ========================================
echo.
echo   Passed:  !CHECKS_PASSED!
echo   Failed:  !CHECKS_FAILED!
echo   Warnings: !CHECKS_WARNED!
echo.

if !CHECKS_FAILED! equ 0 (
    if !CHECKS_WARNED! equ 0 (
        echo   [OK] All checks passed!
        echo.
        echo   Next steps:
        echo     - Run start-all.bat to start the app
        echo     - Or run start-daemon.bat + start-ui.bat separately
        echo.
    ) else (
        echo   [OK] Setup complete with warnings
        echo.
    )
) else (
    echo   [ERROR] Some checks failed
    echo.
    echo   Please fix the issues above and run this script again.
    echo.
)


@REM exit