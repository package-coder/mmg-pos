@echo off
setlocal enabledelayedexpansion

REM MMG POS Helper - Uninstaller
REM Removes startup shortcut (files stay in extracted folder)

set EXE_NAME=mmg-helper.exe
set STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMG POS Helper.lnk

echo ============================================
echo  MMG POS Helper - Uninstaller
echo ============================================
echo.

REM Check for admin privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if %ERRORLEVEL% neq 0 (
    echo.
    echo WARNING: This uninstaller requires administrator privileges.
    echo Attempting to elevate...
    echo.

    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" 2>nul
    if %ERRORLEVEL% equ 0 exit /b 0

    echo ERROR: Could not elevate to administrator. Please run as administrator.
    pause
    exit /b 1
)

echo Uninstalling MMG POS Helper...
echo.

REM Close running process
echo Stopping %EXE_NAME% if running...
taskkill /IM %EXE_NAME% /F 2>nul
if %ERRORLEVEL% equ 0 (
    echo   [OK] Process stopped
) else (
    echo   [OK] Process not running
)
echo.

REM Delete startup shortcut
echo Removing startup shortcut...
if exist "%STARTUP_LNK%" (
    del /F /Q "%STARTUP_LNK%" 2>nul
    if %ERRORLEVEL% equ 0 (
        echo   [OK] Startup shortcut removed
    ) else (
        echo   [WARNING] Could not delete startup shortcut
    )
) else (
    echo   [OK] Shortcut not found
)
echo.

echo ============================================
echo  Uninstallation Complete!
echo ============================================
echo.
echo The helper will not auto-start on next login.
echo.
echo Note: Application files are still in this folder:
echo   - mmg-helper.exe
echo   - terminal.json
echo   - ejournal.txt
echo.
echo To fully remove: Delete this entire folder.
echo.
echo Done. You can close this window.
pause
endlocal
