@echo off
setlocal enabledelayedexpansion

REM =======================================================
REM MMG POS Helper - Modern Installer Launcher
REM Launches the PowerShell-based installation wizard
REM =======================================================

echo.
echo ============================================
echo  MMG POS Helper Installer
echo ============================================
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Check if SetupWizard.ps1 exists
if not exist "%SCRIPT_DIR%SetupWizard.ps1" (
    echo ERROR: SetupWizard.ps1 not found in %SCRIPT_DIR%
    echo.
    echo Please ensure Setup.bat and SetupWizard.ps1 are in the same folder.
    pause
    exit /b 1
)

REM Launch PowerShell wizard
REM The -ExecutionPolicy Bypass allows running the script
REM The -NoProfile keeps startup faster
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%SetupWizard.ps1" "%1"

exit /b %ERRORLEVEL%
