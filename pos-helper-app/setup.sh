#!/bin/bash
# MMG POS Helper - Automated Setup Script (Git Bash / POSIX)
# Run this from the pos-helper-app directory:
#   bash setup.sh
#   bash setup.sh --clean
#   bash setup.sh --run
#   bash setup.sh --build

set -e

CLEAN=false
BUILD=false
RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean) CLEAN=true; shift ;;
        --build) BUILD=true; shift ;;
        --run) RUN=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function status_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

function status_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function status_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function status_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Check Python installation
status_info "Checking Python installation..."
if ! command -v python &> /dev/null; then
    status_error "Python not found! Please install Python 3.10+"
    exit 1
fi

PYTHON_VERSION=$(python --version)
status_success "Found: $PYTHON_VERSION"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

print_header "MMG POS Helper Setup"

# Step 1: Clean up old environment (if requested)
if [ "$CLEAN" = true ] || [ ! -f ".venv/Scripts/python.exe" ] && [ ! -f ".venv/bin/python" ]; then
    status_warning "Cleaning up old virtual environment..."
    if [ -d ".venv" ]; then
        rm -rf .venv
        status_success "Removed .venv"
    fi

    if [ -d "__pycache__" ]; then
        rm -rf __pycache__
    fi

    if [ -d "helper/__pycache__" ]; then
        rm -rf helper/__pycache__
    fi

    status_success "Clean up complete"
fi

# Step 2: Create virtual environment
print_header "Step 1: Creating Virtual Environment"
if [ ! -d ".venv" ]; then
    status_info "Creating .venv..."
    python -m venv .venv
    status_success "Virtual environment created"
else
    status_info "Virtual environment already exists"
fi

# Step 3: Activate virtual environment
status_info "Activating virtual environment..."
source .venv/bin/activate
status_success "Virtual environment activated"

# Step 4: Upgrade pip
print_header "Step 2: Upgrading pip"
status_info "Upgrading pip..."
python -m pip install --upgrade pip -q
status_success "pip upgraded"

# Step 5: Install dependencies
print_header "Step 3: Installing Dependencies"
REQUIREMENTS_FILE="helper/requirements.txt"

if [ -f "$REQUIREMENTS_FILE" ]; then
    status_info "Installing packages from $REQUIREMENTS_FILE..."
    pip install -r "$REQUIREMENTS_FILE"
    status_success "Dependencies installed successfully"
else
    status_error "requirements.txt not found at $REQUIREMENTS_FILE"
    exit 1
fi

# Step 6: Verify installation
print_header "Step 4: Verifying Installation"
status_info "Testing imports..."
TEST_RESULT=$(python -c "
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
" 2>&1)

if [ "$TEST_RESULT" = "OK" ]; then
    status_success "All dependencies verified"
else
    status_error "Dependency verification failed: $TEST_RESULT"
    exit 1
fi

# Step 7: Test app imports
status_info "Testing app.py..."
APP_TEST=$(python -c "
import sys
sys.path.insert(0, 'helper')
try:
    import app
    print('OK')
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
" 2>&1)

if [[ "$APP_TEST" == *"OK"* ]]; then
    status_success "app.py loaded successfully"
else
    status_error "app.py test failed: $APP_TEST"
    exit 1
fi

# Step 8: Build executable (if requested)
if [ "$BUILD" = true ]; then
    print_header "Step 5: Building Windows Executable"
    status_info "Installing PyInstaller..."
    pip install pyinstaller -q
    status_success "PyInstaller installed"

    status_info "Building mmg-helper.exe..."
    cd helper
    pyinstaller mmg-helper.spec
    cd ..

    if [ -f "helper/dist/mmg-helper.exe" ]; then
        status_success "Build complete! Output: helper/dist/mmg-helper.exe"
    else
        status_error "Build failed"
        exit 1
    fi
fi

# Step 9: Run server (if requested)
if [ "$RUN" = true ]; then
    print_header "Starting WebSocket Server"
    status_info "Starting helper app on ws://localhost:9876..."
    cd helper
    python app.py
else
    print_header "Setup Complete!"
    status_success "Virtual environment ready at: .venv"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Run server:    cd helper && python app.py"
    echo "  2. Build exe:     bash setup.sh --build"
    echo "  3. Run & test:    bash setup.sh --run"
    echo ""
    status_info "Use --clean flag to remove old environment: bash setup.sh --clean"
fi

echo ""
