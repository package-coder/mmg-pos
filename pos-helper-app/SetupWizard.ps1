# MMG POS Helper Setup Wizard
# Modern PowerShell-based installer with GUI dialogs

param([string]$ExePath = $null)

$INSTALL_DIR = "C:\MMG-POS"
$EXE_NAME = "mmg-helper.exe"
$TERMINAL_JSON = "$INSTALL_DIR\terminal.json"
$STARTUP_LNK = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\MMG POS Helper.lnk"

function Show-Title {
    Clear-Host
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  MMG POS Helper - Installer" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Show-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Show-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-AdminPrivileges {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Find-HelperExe {
    param([string]$ProvidedPath)

    if ($ProvidedPath -and (Test-Path $ProvidedPath)) {
        return $ProvidedPath
    }

    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (Test-Path "$scriptDir\$EXE_NAME") {
        return "$scriptDir\$EXE_NAME"
    }

    if (Test-Path "$env:USERPROFILE\Downloads\$EXE_NAME") {
        return "$env:USERPROFILE\Downloads\$EXE_NAME"
    }

    if (Test-Path "$env:USERPROFILE\Desktop\$EXE_NAME") {
        return "$env:USERPROFILE\Desktop\$EXE_NAME"
    }

    return $null
}

function Show-FileDialog {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.InitialDirectory = $env:USERPROFILE
    $dialog.Filter = "Executable Files|mmg-helper.exe|All Files|*.*"
    $dialog.Title = "Locate mmg-helper.exe"

    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dialog.FileName
    }
    return $null
}

function Get-TerminalCredentials {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null
    [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "BIR Terminal Registration"
    $form.Width = 450
    $form.Height = 300
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    $form.BackColor = [System.Drawing.Color]::FromArgb(240, 240, 240)

    $labelTitle = New-Object System.Windows.Forms.Label
    $labelTitle.Text = "Enter your BIR Terminal Credentials"
    $labelTitle.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $labelTitle.Location = New-Object System.Drawing.Point(15, 15)
    $labelTitle.Size = New-Object System.Drawing.Size(410, 25)
    $form.Controls.Add($labelTitle)

    $labelInstructions = New-Object System.Windows.Forms.Label
    $labelInstructions.Text = "Leave blank to fill in later. Fields will show '---' on receipts until set."
    $labelInstructions.ForeColor = [System.Drawing.Color]::Gray
    $labelInstructions.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $labelInstructions.Location = New-Object System.Drawing.Point(15, 40)
    $labelInstructions.Size = New-Object System.Drawing.Size(410, 30)
    $labelInstructions.AutoSize = $true
    $form.Controls.Add($labelInstructions)

    $yPos = 75
    $fieldHeight = 25
    $spacer = 10

    $labelMin = New-Object System.Windows.Forms.Label
    $labelMin.Text = "Machine ID (MIN):"
    $labelMin.Location = New-Object System.Drawing.Point(15, $yPos)
    $labelMin.Size = New-Object System.Drawing.Size(120, $fieldHeight)
    $form.Controls.Add($labelMin)

    $textMin = New-Object System.Windows.Forms.TextBox
    $textMin.Location = New-Object System.Drawing.Point(150, $yPos)
    $textMin.Size = New-Object System.Drawing.Size(270, $fieldHeight)
    $textMin.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $form.Controls.Add($textMin)

    $yPos += $fieldHeight + $spacer

    $labelSN = New-Object System.Windows.Forms.Label
    $labelSN.Text = "Serial Number (SN):"
    $labelSN.Location = New-Object System.Drawing.Point(15, $yPos)
    $labelSN.Size = New-Object System.Drawing.Size(120, $fieldHeight)
    $form.Controls.Add($labelSN)

    $textSN = New-Object System.Windows.Forms.TextBox
    $textSN.Location = New-Object System.Drawing.Point(150, $yPos)
    $textSN.Size = New-Object System.Drawing.Size(270, $fieldHeight)
    $textSN.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $form.Controls.Add($textSN)

    $yPos += $fieldHeight + $spacer

    $labelPTU = New-Object System.Windows.Forms.Label
    $labelPTU.Text = "Permit to Use (PTU):"
    $labelPTU.Location = New-Object System.Drawing.Point(15, $yPos)
    $labelPTU.Size = New-Object System.Drawing.Size(120, $fieldHeight)
    $form.Controls.Add($labelPTU)

    $textPTU = New-Object System.Windows.Forms.TextBox
    $textPTU.Location = New-Object System.Drawing.Point(150, $yPos)
    $textPTU.Size = New-Object System.Drawing.Size(270, $fieldHeight)
    $textPTU.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $form.Controls.Add($textPTU)

    $yPos += $fieldHeight + $spacer + 15

    $buttonOK = New-Object System.Windows.Forms.Button
    $buttonOK.Text = "Continue"
    $buttonOK.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $buttonOK.Location = New-Object System.Drawing.Point(260, $yPos)
    $buttonOK.Size = New-Object System.Drawing.Size(75, 30)
    $buttonOK.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
    $buttonOK.ForeColor = [System.Drawing.Color]::White
    $buttonOK.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $form.Controls.Add($buttonOK)

    $buttonSkip = New-Object System.Windows.Forms.Button
    $buttonSkip.Text = "Skip"
    $buttonSkip.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $buttonSkip.Location = New-Object System.Drawing.Point(345, $yPos)
    $buttonSkip.Size = New-Object System.Drawing.Size(75, 30)
    $buttonSkip.BackColor = [System.Drawing.Color]::LightGray
    $buttonSkip.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $form.Controls.Add($buttonSkip)

    $result = $form.ShowDialog()

    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        return @{
            MIN = if ($textMin.Text) { $textMin.Text } else { "---" }
            SN = if ($textSN.Text) { $textSN.Text } else { "---" }
            PTU_NO = if ($textPTU.Text) { $textPTU.Text } else { "---" }
        }
    }
    return $null
}

function Create-TerminalJson {
    param([hashtable]$Credentials)

    $json = @{
        MIN = $Credentials.MIN
        SN = $Credentials.SN
        PTU_NO = $Credentials.PTU_NO
    } | ConvertTo-Json

    $json | Out-File -FilePath $TERMINAL_JSON -Encoding UTF8 -Force
}

function Create-StartupShortcut {
    try {
        $ws = New-Object -ComObject WScript.Shell
        $shortcut = $ws.CreateShortcut($STARTUP_LNK)
        $shortcut.TargetPath = "$INSTALL_DIR\$EXE_NAME"
        $shortcut.WorkingDirectory = $INSTALL_DIR
        $shortcut.WindowStyle = 7
        $shortcut.Description = "MMG POS Hardware Bridge"
        $shortcut.Save()
        return $true
    }
    catch {
        Show-Error "Failed to create startup shortcut: $_"
        return $false
    }
}

function Get-FileSize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-Item $Path).Length
        if ($size -gt 1MB) {
            return "{0:N1} MB" -f ($size / 1MB)
        } elseif ($size -gt 1KB) {
            return "{0:N1} KB" -f ($size / 1KB)
        }
        return "$size bytes"
    }
    return "N/A"
}

# MAIN FLOW
Show-Title

if (-not (Test-AdminPrivileges)) {
    Show-Error "This installer requires administrator privileges."
    Show-Info "Attempting to elevate..."
    $args = if ($ExePath) { "-ExePath '$ExePath'" } else { "" }
    $cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File '$PSCommandPath' $args"
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File '$PSCommandPath' $args" -Verb RunAs -Wait
    exit 0
}

Show-Success "Running as administrator"
Write-Host ""

$exePath = Find-HelperExe -ProvidedPath $ExePath

if (-not $exePath) {
    Show-Info "mmg-helper.exe not found in default locations."
    Show-Info "Please browse to select the file..."
    $exePath = Show-FileDialog
}

if (-not $exePath -or -not (Test-Path $exePath)) {
    Show-Error "Installation cancelled - mmg-helper.exe not found."
    pause
    exit 1
}

Show-Success "Found mmg-helper.exe"
Write-Host "   Location: $exePath"
Write-Host "   Size: $(Get-FileSize $exePath)"
Write-Host ""

Show-Info "Creating installation directory..."
if (-not (Test-Path $INSTALL_DIR)) {
    try {
        New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
        Show-Success "Created $INSTALL_DIR"
    }
    catch {
        Show-Error "Failed to create $INSTALL_DIR : $_"
        pause
        exit 1
    }
}
Write-Host ""

Show-Info "Copying executable..."
try {
    Copy-Item -Path $exePath -Destination "$INSTALL_DIR\$EXE_NAME" -Force
    Show-Success "Installed to $INSTALL_DIR\$EXE_NAME"
}
catch {
    Show-Error "Failed to copy file: $_"
    pause
    exit 1
}
Write-Host ""

Show-Info "BIR Terminal Registration (optional)"

if (Test-Path $TERMINAL_JSON) {
    Write-Host "   terminal.json already exists - skipping"
} else {
    $credentials = Get-TerminalCredentials
    if ($credentials) {
        Create-TerminalJson -Credentials $credentials
        Show-Success "Created terminal.json"
        Write-Host "   MIN: $($credentials.MIN)"
        Write-Host "   SN: $($credentials.SN)"
        Write-Host "   PTU: $($credentials.PTU_NO)"
    } else {
        Write-Host "   Skipped (can edit later)"
        Create-TerminalJson -Credentials @{ MIN = "---"; SN = "---"; PTU_NO = "---" }
    }
}
Write-Host ""

Show-Info "Setting up auto-start..."
if (Create-StartupShortcut) {
    Show-Success "Helper will auto-start on Windows login"
} else {
    Write-Host "   Could not create auto-start shortcut (not critical)"
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Installation Directory: $INSTALL_DIR"
Write-Host "  Executable: $INSTALL_DIR\$EXE_NAME"
Write-Host "  Terminal Config: $TERMINAL_JSON"
Write-Host "  Auto-Start: Enabled"
Write-Host ""

Show-Info "Starting MMG POS Helper now..."
Write-Host ""

try {
    Start-Process -FilePath "$INSTALL_DIR\$EXE_NAME"
    Show-Success "Helper started successfully"
    Write-Host ""
    Write-Host "[OK] Setup complete! You can close this window."
    Write-Host ""
    Start-Sleep -Seconds 2
}
catch {
    Show-Error "Could not start helper: $_"
    Show-Info "You can start it manually from: $INSTALL_DIR\$EXE_NAME"
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
