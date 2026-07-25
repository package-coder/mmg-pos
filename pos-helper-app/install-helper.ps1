# MMG POS Helper Installer
# Run with: powershell -ExecutionPolicy Bypass -File install-helper.ps1

$ErrorActionPreference = "Stop"
$InstallDir = "C:\MMG-POS"
$SourceDir = (Get-Location).Path

Write-Host "MMG POS Helper Installer" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "Elevating to administrator..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Create directory
Write-Host "Creating $InstallDir..." -ForegroundColor Green
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallDir\helper" -Force | Out-Null

# Copy helper files
Write-Host "Copying helper files..." -ForegroundColor Green
Get-ChildItem "$SourceDir\helper\*.py" | ForEach-Object {
    Copy-Item $_ "$InstallDir\helper\" -Force
    Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
}

# Copy requirements.txt
if (Test-Path "$SourceDir\helper\requirements.txt") {
    Copy-Item "$SourceDir\helper\requirements.txt" "$InstallDir\helper\" -Force
    Write-Host "  ✓ requirements.txt" -ForegroundColor Green
}

# Get BIR credentials
Write-Host "`n=== BIR Terminal Registration ===" -ForegroundColor Cyan
Write-Host "Enter the BIR credentials for this workstation."
Write-Host "Leave blank to set later (receipts will show --- until set).`n"

$MIN = Read-Host "Machine Identification Number (MIN)"
$SN = Read-Host "Serial Number (SN)"
$PTU = Read-Host "Permit to Use No (PTU No)"

# Create terminal.json
$terminal = @{
    MIN = if ($MIN) { $MIN } else { "---" }
    SN = if ($SN) { $SN } else { "---" }
    PTU_NO = if ($PTU) { $PTU } else { "---" }
} | ConvertTo-Json

Set-Content -Path "$InstallDir\helper\terminal.json" -Value $terminal -Encoding utf8
Write-Host "`n✓ terminal.json created" -ForegroundColor Green

# Create startup shortcut
Write-Host "Creating startup shortcut..." -ForegroundColor Green
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\MMG POS Helper.lnk")
$shortcut.TargetPath = (Get-Command python).Source
$shortcut.Arguments = "`"$InstallDir\helper\app.py`""
$shortcut.WorkingDirectory = "$InstallDir\helper"
$shortcut.WindowStyle = 7
$shortcut.Description = "MMG POS Hardware Bridge"
$shortcut.Save()
Write-Host "✓ Startup shortcut created" -ForegroundColor Green

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Installation Complete!               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Installed to    : $InstallDir" -ForegroundColor Green
Write-Host "  Terminal config : $InstallDir\helper\terminal.json" -ForegroundColor Green
Write-Host "  Auto-start      : Enabled" -ForegroundColor Green
Write-Host ""
Write-Host "Starting helper for testing..." -ForegroundColor Cyan
Write-Host ""

# Test run
$helperPath = Join-Path $InstallDir "helper"
Push-Location $helperPath
python app.py
