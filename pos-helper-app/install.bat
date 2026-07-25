@echo off
setlocal

set INSTALL_DIR=C:\MMG-POS
set EXE_NAME=mmg-helper.exe
set STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MMG POS Helper.lnk

echo ============================================
echo  MMG POS Helper - Workstation Installer
echo ============================================
echo.

:: Search for mmg-helper.exe dynamically
set EXE_PATH=
if exist "%~dp0%EXE_NAME%" (
    set EXE_PATH=%~dp0%EXE_NAME%
) else if exist "%USERPROFILE%\Downloads\%EXE_NAME%" (
    set EXE_PATH=%USERPROFILE%\Downloads\%EXE_NAME%
) else if exist "%USERPROFILE%\Desktop\%EXE_NAME%" (
    set EXE_PATH=%USERPROFILE%\Desktop\%EXE_NAME%
) else (
    for /r "%USERPROFILE%" %%F in (%EXE_NAME%) do (
        set EXE_PATH=%%F
        goto found_exe
    )
)

:found_exe
if not defined EXE_PATH (
    echo ERROR: %EXE_NAME% not found.
    echo Searched in:
    echo   - Current directory
    echo   - Downloads folder
    echo   - Desktop
    echo   - User home directory
    echo.
    echo Please ensure mmg-helper.exe is accessible or place it in one of the above locations.
    pause
    exit /b 1
)

echo Found %EXE_NAME% at: %EXE_PATH%

:: Create install directory
if not exist "%INSTALL_DIR%" (
    echo Creating %INSTALL_DIR%...
    mkdir "%INSTALL_DIR%"
)

:: Copy exe
echo Installing %EXE_NAME% to %INSTALL_DIR%...
copy /Y "%EXE_PATH%" "%INSTALL_DIR%\%EXE_NAME%" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy %EXE_NAME% to %INSTALL_DIR%.
    pause
    exit /b 1
)

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
    powershell -NoProfile -Command ^
        "$cfg = [ordered]@{ MIN = '%TERMINAL_MIN%'; SN = '%TERMINAL_SN%'; PTU_NO = '%TERMINAL_PTU%' }; ^
         $cfg | ConvertTo-Json | Set-Content -Path '%TERMINAL_JSON%' -Encoding utf8"
    echo terminal.json created at %TERMINAL_JSON%
)

:: Create Windows Startup shortcut (auto-start on login)
echo Registering auto-start on login...
powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; ^
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
