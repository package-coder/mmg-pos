# pos-helper-app

Standalone Python WebSocket server that bridges the POS browser (mmg-app) to physical hardware on each cashier workstation. Runs locally on every cashier PC — not in Docker.

## Architecture

```
Browser (mmg-app)
    └──[WebSocket ws://localhost:9876]──► helper/app.py
                                              ├── ESC/POS Printer (TCP/IP)
                                              └── VFD Customer Display (serial COM3)
```

- `ReceiptWriter` — context manager that opens `ejournal.txt` once per transaction and writes to both the file and the printer simultaneously. Journals even when the printer is offline.
- All blocking hardware calls use `asyncio.to_thread` — the WebSocket event loop stays responsive during long print jobs.
- `ejournal.txt` is written next to the running executable (or next to `app.py` in dev).

---

## WebSocket API

All messages are JSON. Send to `ws://localhost:9876`, receive a JSON response.

### Printer

```json
{ "device": "printer", "device_type": "receipt", "transaction": { ... }, "settings": { "url": "192.168.192.168" } }
{ "device": "printer", "device_type": "report",  "type": "X_REPORT"|"Z_REPORT", ... }
{ "device": "printer", "device_type": "test",    "message": "TEST PRINT", "settings": { "url": "..." } }
```

### Display

```json
{ "device": "display", "device_type": "message" }
{ "device": "display", "device_type": "item",    "name": "...", "price": 0.00 }
{ "device": "display", "device_type": "total",   "total": 0.00 }
{ "device": "display", "device_type": "next" }
```

### Terminal info (BIR credentials for this workstation)

```json
{ "device": "terminal", "device_type": "info" }
// returns: { "MIN": "123-456789-0", "SN": "S/N0000012345", "PTU_NO": "PTU-000000000001" }
```

### Responses

| Outcome | Response |
|---|---|
| Success | `{ "message": "Printed successfully" }` |
| Printer offline, journaled | `{ "message": "Journaled successfully (printer unavailable)", "error": "..." }` |
| Error | `{ "error": "..." }` |

---

## BIR Terminal Credentials

BIR issues a **MIN**, **SN**, and **PTU No** per cashier terminal. These are stored in `terminal.json` in the same folder as the executable — one file per workstation, never in the database.

**`terminal.json` format:**
```json
{
  "MIN": "123-456789-0",
  "SN": "S/N0000012345",
  "PTU_NO": "PTU-000000000001"
}
```

The helper reads this at startup and prints these values on every receipt and report. Edit the file and restart the helper to update credentials — no redeployment needed.

`terminal.json.example` is included as a template.

---

## Development Setup

```bash
cd pos-helper-app/helper
python -m venv ../.venv
source ../.venv/Scripts/activate    # Windows; use ../.venv/bin/activate on Linux
pip install -r requirements.txt
python app.py                        # WebSocket server on ws://localhost:9876
```

Tests (from `pos-helper-app/`):
```bash
python test_fix.py
python test_async.py
python test_journaling.py
python test_refactor.py
```

---

## Workstation Distribution (Production)

pos-helper-app is distributed to cashier workstations as a single Windows executable built with PyInstaller. No Python required on the workstation.

### Build (run once, on any Windows machine with Python)

```bash
cd pos-helper-app/helper
pip install pyinstaller
pyinstaller mmg-helper.spec
# Output: dist/mmg-helper.exe
```

### Install on a cashier workstation

Copy to a USB drive or network share:
```
mmg-helper.exe
install.bat
```

Double-click `install.bat` on the workstation. It will:
1. Copy `mmg-helper.exe` → `C:\MMG-POS\`
2. Prompt for BIR terminal credentials (MIN, SN, PTU No) and write `terminal.json`
3. Create a Windows Startup shortcut so the helper auto-starts on every login
4. Launch the helper immediately

To update credentials later, edit `C:\MMG-POS\terminal.json` directly and restart the helper.

---

## Hardware

- **Receipt Printer**: Epson TM-series ESC/POS over TCP/IP. Default IP `192.168.192.168`; override via `settings.url` in the WebSocket message.
- **VFD Customer Display**: RS-232 serial, hardcoded to `COM3` on Windows. Uses `\x0C` (form feed) to clear the 2×20 character display.
- Printer failure is non-fatal — `ReceiptWriter` catches errors and completes the journal write.
