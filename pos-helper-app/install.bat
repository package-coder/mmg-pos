@echo off
setlocal enabledelayedexpansion

set INSTALL_DIR=C:\MMG-POS
set EXE_NAME=mmg-helper.exe
set STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMG POS Helper.lnk

echo ============================================
echo  MMG POS Helper - Workstation Installer
echo ============================================
echo.

:: Check for admin privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if %ERRORLEVEL% neq 0 (
    echo.
    echo WARNING: This installer requires administrator privileges.
    echo Attempting to elevate...
    echo.

    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" 2>nul
    if %ERRORLEVEL% equ 0 exit /b 0

    echo ERROR: Could not elevate to administrator. Please run this script as administrator.
    pause
    exit /b 1
)

:: Search for mmg-helper.exe dynamically
setlocal enabledelayedexpansion
set EXE_PATH=

:: Check common locations first
if exist "%~dp0%EXE_NAME%" (
    set "EXE_PATH=%~dp0%EXE_NAME%"
    goto exe_found
)

if exist "%USERPROFILE%\Downloads\%EXE_NAME%" (
    set "EXE_PATH=%USERPROFILE%\Downloads\%EXE_NAME%"
    goto exe_found
)

if exist "%USERPROFILE%\Desktop\%EXE_NAME%" (
    set "EXE_PATH=%USERPROFILE%\Desktop\%EXE_NAME%"
    goto exe_found
)

:: If not found, prompt user for manual path
:exe_not_found
echo.
echo %EXE_NAME% not found in common locations.
echo.
echo You can either:
echo   1. Copy mmg-helper.exe to the same folder as this installer, or
echo   2. Enter the full path to mmg-helper.exe manually
echo.
set /p EXE_PATH="Enter path to mmg-helper.exe (or press Ctrl+C to cancel): "

if not defined EXE_PATH goto exe_not_found
if not exist "!EXE_PATH!" (
    echo ERROR: File not found at: !EXE_PATH!
    goto exe_not_found
)

:exe_found
echo Found %EXE_NAME% at: !EXE_PATH!
echo.

:: Copy exe
echo Installing %EXE_NAME% to %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%" 2>nul
    if errorlevel 1 (
        echo ERROR: Cannot create %INSTALL_DIR%. Check disk permissions and available space.
        pause
        exit /b 1
    )
)

echo Source size:
for %%A in ("!EXE_PATH!") do echo   %%~zA bytes

copy /Y "!EXE_PATH!" "%INSTALL_DIR%\%EXE_NAME%" 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Failed to copy %EXE_NAME% to %INSTALL_DIR%.
    echo Possible causes:
    echo   - Permission denied (run as administrator)
    echo   - Disk full or read-only
    echo   - Source file in use
    echo.
    echo Source: !EXE_PATH!
    echo Destination: %INSTALL_DIR%\%EXE_NAME%
    pause
    exit /b 1
)
echo Successfully installed to %INSTALL_DIR%\%EXE_NAME%

:: BIR terminal credentials
set TERMINAL_JSON=%INSTALL_DIR%\terminal.json
if exist "%TERMINAL_JSON%" (
    echo terminal.json already exists — skipping. Edit %TERMINAL_JSON% manually if needed.
) else (
    echo.
    echo ============================================
    echo  BIR Terminal Registration
    echo ============================================
    echo  Enter the BIR credentials for THIS workstation.
    echo  Leave blank to fill in later ^(receipts will show --- until set^).
    echo.
    set /p TERMINAL_MIN="  Machine Identification Number (MIN): "
    set /p TERMINAL_SN="  Serial Number (SN): "
    set /p TERMINAL_PTU="  Permit to Use No (PTU No): "
    echo.

    if not defined TERMINAL_MIN set TERMINAL_MIN=---
    if not defined TERMINAL_SN set TERMINAL_SN=---
    if not defined TERMINAL_PTU set TERMINAL_PTU=---

    (
        echo {
        echo   "MIN": "!TERMINAL_MIN!",
        echo   "SN": "!TERMINAL_SN!",
        echo   "PTU_NO": "!TERMINAL_PTU!"
        echo }
    ) > "%TERMINAL_JSON%"
    echo terminal.json created at %TERMINAL_JSON%
)

:: Create Windows Startup shortcut (auto-start on login)
echo Registering auto-start on login...
powershell -NoProfile -Command "^
    $ws = New-Object -ComObject WScript.Shell; ^
    $s = $ws.CreateShortcut('%STARTUP_LNK%'); ^
    $s.TargetPath = '%INSTALL_DIR%\%EXE_NAME%'; ^
    $s.WorkingDirectory = '%INSTALL_DIR%'; ^
    $s.WindowStyle = 7; ^
    $s.Description = 'MMG POS Hardware Bridge'; ^
    $s.Save()"

echo.
echo Installation complete!
echo   Installed to : %INSTALL_DIR%\%EXE_NAME%
echo   Terminal config : %TERMINAL_JSON%
echo   Auto-starts  : on Windows login
echo.
echo Starting helper now...
start "" "%INSTALL_DIR%\%EXE_NAME%"

echo.
echo Done. You can close this window.
pause
endlocal
