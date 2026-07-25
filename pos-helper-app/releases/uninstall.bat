@echo off
setlocal enabledelayedexpansion

set INSTALL_DIR=C:\MMG-POS
set EXE_NAME=mmg-helper.exe
set STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMG POS Helper.lnk

echo ============================================
echo  MMG POS Helper - Uninstaller
echo ============================================
echo.

:: Check for admin privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if %ERRORLEVEL% neq 0 (
    echo.
    echo WARNING: This uninstaller requires administrator privileges.
    echo Attempting to elevate...
    echo.

    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" 2>nul
    if %ERRORLEVEL% equ 0 exit /b 0

    echo ERROR: Could not elevate to administrator. Please run this script as administrator.
    pause
    exit /b 1
)

echo Uninstalling MMG POS Helper...
echo.

:: Close running process
echo Stopping mmg-helper.exe if running...
taskkill /IM %EXE_NAME% /F 2>nul
if %ERRORLEVEL% equ 0 (
    echo   - Process stopped
) else (
    echo   - Process not running (OK)
)
echo.

:: Delete installation directory
echo Removing installation directory...
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo   - Deleted %INSTALL_DIR%
    ) else (
        echo   - WARNING: Could not delete %INSTALL_DIR%
        echo   - Try manually: delete C:\MMG-POS folder
    )
) else (
    echo   - %INSTALL_DIR% not found (already removed)
)
echo.

:: Delete startup shortcut
echo Removing startup shortcut...
if exist "%STARTUP_LNK%" (
    del /F /Q "%STARTUP_LNK%" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo   - Deleted startup shortcut
    ) else (
        echo   - WARNING: Could not delete startup shortcut
    )
) else (
    echo   - Startup shortcut not found (already removed)
)
echo.

echo ============================================
echo  Uninstallation Complete!
echo ============================================
echo.
echo The following were removed:
echo   - %INSTALL_DIR%\
echo   - Startup shortcut
echo.
echo The helper will not start on next login.
echo.
echo Done. You can close this window.
pause
endlocal
