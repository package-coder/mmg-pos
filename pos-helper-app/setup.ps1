# MMG POS Helper - Automated Setup Script
# Run this from the pos-helper-app directory:
#   powershell -ExecutionPolicy Bypass -File setup.ps1

param(
    [switch]$Clean = $false,
    [switch]$Build = $false,
    [switch]$Run = $false
)

$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = @{
        "Info"    = "Cyan"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error"   = "Red"
    }
    Write-Host "[$Type] $Message" -ForegroundColor $color[$Type]
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

# Check Python installation
Write-Status "Checking Python installation..." "Info"
try {
    $pythonVersion = python --version 2>&1
    Write-Status "Found: $pythonVersion" "Success"
} catch {
    Write-Status "Python not found! Please install Python 3.10+ from https://www.python.org/downloads/" "Error"
    exit 1
}

# Get current directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Header "MMG POS Helper Setup"

# Step 1: Clean up old environment (if requested or if corrupted)
if ($Clean -or -not (Test-Path ".venv/Scripts/python.exe")) {
    Write-Status "Cleaning up old virtual environment..." "Warning"
    if (Test-Path ".venv") {
        Remove-Item -Recurse -Force ".venv" -ErrorAction SilentlyContinue
        Write-Status "Removed .venv" "Success"
    }

    if (Test-Path "__pycache__") {
        Remove-Item -Recurse -Force "__pycache__" -ErrorAction SilentlyContinue
    }

    if (Test-Path "helper/__pycache__") {
        Remove-Item -Recurse -Force "helper/__pycache__" -ErrorAction SilentlyContinue
    }

    Write-Status "Clean up complete" "Success"
}

# Step 2: Create virtual environment
Write-Header "Step 1: Creating Virtual Environment"
if (-not (Test-Path ".venv")) {
    Write-Status "Creating .venv..." "Info"
    python -m venv .venv
    Write-Status "Virtual environment created" "Success"
} else {
    Write-Status "Virtual environment already exists" "Info"
}

# Step 3: Activate virtual environment
Write-Status "Activating virtual environment..." "Info"
& ".venv/Scripts/Activate.ps1"
Write-Status "Virtual environment activated" "Success"

# Step 4: Upgrade pip
Write-Header "Step 2: Upgrading pip"
Write-Status "Upgrading pip..." "Info"
python -m pip install --upgrade pip -q
Write-Status "pip upgraded" "Success"

# Step 5: Install dependencies
Write-Header "Step 3: Installing Dependencies"
$requirementsFile = "helper/requirements.txt"

if (Test-Path $requirementsFile) {
    Write-Status "Installing packages from $requirementsFile..." "Info"
    pip install -r $requirementsFile
    Write-Status "Dependencies installed successfully" "Success"
} else {
    Write-Status "requirements.txt not found at $requirementsFile" "Error"
    exit 1
}

# Step 6: Verify installation
Write-Header "Step 4: Verifying Installation"
Write-Status "Testing imports..." "Info"
$testResult = python -c "
import sys
try:
    import websockets
    import escpos
    import serial
    import pytz
    print('OK')
except ImportError as e:
    print(f'FAIL: {e}')
    sys.exit(1)
"

if ($testResult -eq "OK") {
    Write-Status "All dependencies verified" "Success"
} else {
    Write-Status "Dependency verification failed: $testResult" "Error"
    exit 1
}

# Step 7: Test app imports
Write-Status "Testing app.py..." "Info"
$appTest = & python -c "
import sys
sys.path.insert(0, 'helper')
try:
    import app
    print('OK')
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
" 2>&1

if ($appTest -like "*OK*") {
    Write-Status "app.py loaded successfully" "Success"
} else {
    Write-Status "app.py test failed: $appTest" "Error"
    exit 1
}

# Step 8: Build executable (if requested)
if ($Build) {
    Write-Header "Step 5: Building Windows Executable"
    Write-Status "Installing PyInstaller..." "Info"
    pip install pyinstaller -q
    Write-Status "PyInstaller installed" "Success"

    Write-Status "Building mmg-helper.exe..." "Info"
    Set-Location helper
    pyinstaller mmg-helper.spec
    Set-Location ..

    if (Test-Path "helper/dist/mmg-helper.exe") {
        Write-Status "Build complete! Output: helper/dist/mmg-helper.exe" "Success"
    } else {
        Write-Status "Build failed" "Error"
        exit 1
    }
}

# Step 9: Run server (if requested)
if ($Run) {
    Write-Header "Starting WebSocket Server"
    Write-Status "Starting helper app on ws://localhost:9876..." "Info"
    Set-Location helper
    python app.py
} else {
    Write-Header "Setup Complete!"
    Write-Status "Virtual environment ready at: .venv" "Success"
    Write-Status "" "Info"
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run server:    cd helper && python app.py" -ForegroundColor White
    Write-Host "  2. Build exe:     powershell -File setup.ps1 -Build" -ForegroundColor White
    Write-Host "  3. Run & test:    powershell -File setup.ps1 -Run" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Status "Use -Clean flag to remove old environment: powershell -File setup.ps1 -Clean" "Info"
}

Write-Host ""
