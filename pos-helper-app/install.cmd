@echo off
REM MMG POS Helper - Simple installer wrapper
REM This batch file launches the PowerShell installer

setlocal enabledelayedexpansion

echo.
echo ============================================
echo  MMG POS Helper Installer
echo ============================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Run PowerShell installer
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install-helper.ps1"

REM Exit with same code as PowerShell
exit /b %ERRORLEVEL%
