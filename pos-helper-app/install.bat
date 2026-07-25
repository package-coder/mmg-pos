@echo off
setlocal enabledelayedexpansion

REM MMG POS Helper - Setup (No Installation Required)
REM Simply creates startup shortcut and terminal.json in current folder

set SCRIPT_DIR=%~dp0
set EXE_NAME=mmg-helper.exe
set EXE_PATH=%SCRIPT_DIR%%EXE_NAME%
set TERMINAL_JSON=%SCRIPT_DIR%terminal.json
set STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMG POS Helper.lnk

echo.
echo ============================================
echo  MMG POS Helper - Setup
echo ============================================
echo.

REM Check for admin privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if %ERRORLEVEL% neq 0 (
    echo.
    echo WARNING: This setup requires administrator privileges.
    echo Attempting to elevate...
    echo.

    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" 2>nul
    if %ERRORLEVEL% equ 0 exit /b 0

    echo ERROR: Could not elevate to administrator. Please run as administrator.
    pause
    exit /b 1
)

echo Setup location: %SCRIPT_DIR%
echo.

REM Check if mmg-helper.exe exists
if not exist "%EXE_PATH%" (
    echo ERROR: %EXE_NAME% not found in %SCRIPT_DIR%
    echo.
    echo Make sure mmg-helper.exe is in the same folder as this script.
    pause
    exit /b 1
)

echo [OK] Found %EXE_NAME%
echo.

REM Setup terminal.json if not exists
if exist "%TERMINAL_JSON%" (
    echo [OK] terminal.json already exists
) else (
    echo Creating terminal.json with defaults...
    (
        echo {
        echo   "MIN": "000-000000-0",
        echo   "SN": "S/N0000000000",
        echo   "PTU_NO": "PTU-000000000000"
        echo }
    ) > "%TERMINAL_JSON%"
    echo [OK] Created terminal.json
    echo.
    echo Edit terminal.json with your BIR credentials:
    echo   MIN: Machine Identification Number
    echo   SN: Serial Number
    echo   PTU_NO: Permit to Use Number
)

echo.

REM Create Windows Startup shortcut
echo Setting up auto-start on login...
powershell -NoProfile -Command "^
    $ws = New-Object -ComObject WScript.Shell; ^
    $s = $ws.CreateShortcut('%STARTUP_LNK%'); ^
    $s.TargetPath = '%EXE_PATH%'; ^
    $s.WorkingDirectory = '%SCRIPT_DIR%'; ^
    $s.WindowStyle = 7; ^
    $s.Description = 'MMG POS Hardware Bridge'; ^
    $s.Save()" 2>nul

echo [OK] Auto-start registered
echo.

REM Summary
echo ============================================
echo  Setup Complete!
echo ============================================
echo.
echo Location: %SCRIPT_DIR%
echo Startup: Enabled (next login)
echo.
echo Files:
echo   - %EXE_NAME% (the application)
echo   - terminal.json (your BIR credentials)
echo   - ejournal.txt (transaction log, created on first use)
echo.

REM Start helper now
echo Starting helper now...
start "" "%EXE_PATH%"

echo.
echo Helper should start in a new window.
echo You can close this window.
pause
endlocal
