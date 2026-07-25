# pos-helper-app Setup & Installation Guide

This guide covers installing and running the MMG POS Helper application on your workstation.

## Quick Start

### For Existing Setups (Cleanup & Reinstall)

If you already have an old installation or virtual environment, follow these steps to clean up and reinstall:

```bash
cd pos-helper-app

# 1. Remove old virtual environment (if it exists)
rmdir /s /q .venv

# 2. Create fresh virtual environment
python -m venv .venv

# 3. Activate virtual environment
.venv\Scripts\activate

# 4. Install dependencies
pip install --upgrade pip
pip install -r helper/requirements.txt

# 5. Test the installation
cd helper
python -c "import app; print('✓ Setup successful!')"
cd ..

# 6. Run the helper
cd helper
python app.py
```

---

## Installation Steps (Detailed)

### Step 1: Clean Up Old Installation

If you have an existing `.venv` or old Python environment:

```bash
cd pos-helper-app

# Remove old virtual environment
rmdir /s /q .venv

# Optional: Remove old Python cache
rmdir /s /q __pycache__
rmdir /s /q helper/__pycache__
```

### Step 2: Create Virtual Environment

```bash
# From pos-helper-app directory
python -m venv .venv
```

This creates an isolated Python environment for this project.

### Step 3: Activate Virtual Environment

**Windows (Command Prompt):**
```bash
.venv\Scripts\activate
```

**Windows (PowerShell):**
```bash
.venv\Scripts\Activate.ps1
```

**Windows (Git Bash):**
```bash
source .venv/Scripts/activate
```

You should see `(.venv)` prefix in your terminal prompt.

### Step 4: Install Dependencies

```bash
pip install --upgrade pip
pip install -r helper/requirements.txt
```

This installs all required packages:
- `websockets` — WebSocket server for browser communication
- `python-escpos` — Receipt printer control (ESC/POS)
- `pyserial` — Serial communication for VFD display
- `pytz` — Timezone handling
- And supporting libraries (Pillow, qrcode, barcode, etc.)

### Step 5: Verify Installation

```bash
cd helper
python -c "import app; print('✓ All dependencies loaded successfully')"
```

Expected output:
```
Terminal config loaded — MIN: ---, SN: ---, PTU: ---
✓ All dependencies loaded successfully
```

---

## Running the Helper

### Development Mode

```bash
cd pos-helper-app/helper
python app.py
```

Output should show:
```
Terminal config loaded — MIN: ---, SN: ---, PTU: ---
...server listening on ws://localhost:9876
```

The WebSocket server is now listening and ready for connections from the browser.

### Production Mode (Windows Executable)

For deploying to cashier workstations, build a standalone `.exe`:

```bash
cd pos-helper-app/helper

# Install PyInstaller
pip install pyinstaller

# Build executable
pyinstaller mmg-helper.spec

# Output: dist/mmg-helper.exe
```

Then use `install.bat` to deploy to workstations:

```bash
# Copy these files to workstations (USB or network share):
#   - dist/mmg-helper.exe
#   - ../install.bat

# On workstation, run:
install.bat
```

The installer will:
1. Create `C:\MMG-POS\` directory
2. Prompt for BIR terminal credentials (MIN, SN, PTU No)
3. Save credentials to `C:\MMG-POS\terminal.json`
4. Create Windows Startup shortcut for auto-start on login
5. Launch the helper immediately

---

## Troubleshooting

### Issue: "python: command not found"

**Solution:** Install Python 3.10+ from https://www.python.org/downloads/

Make sure to check **"Add Python to PATH"** during installation.

### Issue: "No module named 'websockets'" or other import errors

**Solution:** Ensure virtual environment is activated and dependencies installed:

```bash
.venv\Scripts\activate
pip install -r helper/requirements.txt
```

### Issue: "Permission denied" when creating `.venv`

**Solution:** Run Command Prompt or PowerShell as Administrator.

### Issue: Printer not found / Connection timeout

The helper will still work and journal to file. Check:
1. Printer IP address (default: `192.168.192.168`)
2. Printer is powered on and connected to network
3. Network connectivity between workstation and printer

Output will show: `"Journaled successfully (printer unavailable)"`

### Issue: VFD Display not responding

Serial display requires:
- Cable connected to `COM3` (Windows) or `/dev/ttyACM1` (Linux)
- Correct baudrate: 9600
- Verify COM port in Device Manager

Display is optional — receipts will still print.

### Issue: "ModuleNotFoundError" during PyInstaller build

**Solution:** Ensure all imports in `app.py` match `mmg-helper.spec` hidden imports.

Update `mmg-helper.spec` if adding new packages:

```python
hiddenimports=[
    'websockets',
    'escpos',
    'serial',
    # ... add new modules here
]
```

---

## Files & Directories

```
pos-helper-app/
├── .venv/                    # Virtual environment (created after pip install)
├── helper/
│   ├── app.py               # Main WebSocket server
│   ├── requirements.txt      # Python dependencies
│   ├── mmg-helper.spec       # PyInstaller configuration
│   ├── ejournal.txt          # Electronic receipt journal (auto-created)
│   └── terminal.json         # BIR credentials (auto-created)
├── install.bat               # Workstation installer script
└── SETUP.md                  # This file
```

### Key Files Explained

**requirements.txt** — Lists all Python packages needed. Never edit manually; use `pip freeze > requirements.txt` if updating.

**mmg-helper.spec** — PyInstaller build configuration. Update `hiddenimports` when adding new dependencies.

**ejournal.txt** — Append-only log of every receipt printed. One line per transaction. Created automatically.

**terminal.json** — BIR terminal credentials (MIN, SN, PTU No). Created by installer or manually.

---

## Common Commands

```bash
# Activate virtual environment
.venv\Scripts\activate

# Run WebSocket server
cd helper && python app.py

# Run tests
python test_fix.py
python test_async.py
python test_journaling.py

# Update dependencies (after adding new packages)
pip freeze > helper/requirements.txt

# Deactivate virtual environment
deactivate
```

---

## Architecture

```
Browser (mmg-app)
    │
    └──[WebSocket ws://localhost:9876]──► pos-helper-app (this server)
                                             ├── Receipt Printer (TCP/IP 192.168.192.168)
                                             └── VFD Display (Serial COM3)
```

The helper bridges the browser to physical hardware:
- **Receipt Printer:** ESC/POS over TCP/IP (configurable IP)
- **VFD Display:** RS-232 serial (hardcoded to COM3)
- **Electronic Journal:** Append-only file `ejournal.txt`

---

## Next Steps

1. **Development:** Run `python helper/app.py` and test in browser
2. **Testing:** Run test scripts to verify hardware interfaces
3. **Deployment:** Build `mmg-helper.exe` and use `install.bat` for workstations
4. **Operations:** Monitor `ejournal.txt` for transaction records

---

## Support

For issues or questions:
1. Check **Troubleshooting** section above
2. Review `ejournal.txt` for error messages
3. Check hardware connections (printer IP, serial cable)
4. Verify BIR terminal credentials in `terminal.json`

---

*Last updated: 2026-07-26*
