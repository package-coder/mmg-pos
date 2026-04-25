# POS Helper App

This service acts as a bridge between the POS frontend and hardware peripherals (receipt printer, line display). It handles websocket requests to print receipts, reports, and update the customer display.

## Recent Updates & Refactoring

A significant refactoring was completed to improve performance, reliability, and robustness.

### Key Changes

1.  **Decoupled Electronic Journaling**
    *   **Behavior**: Transactions are now consistently recorded in `ejournal.txt` even if the physical printer is offline, out of paper, or disconnected.
    *   **Benefit**: Ensures zero data loss for transaction logs.

2.  **Performance Optimization (ReceiptWriter)**
    *   **Change**: Introduced a `ReceiptWriter` class that maintains a single open file handle for the duration of a transaction.
    *   **Impact**: Reduced file I/O operations from ~80 opens/closes per receipt to just 1. This eliminated a 2-3 second delay during printing.

3.  **Non-Blocking I/O**
    *   **Change**: All printer and display operations are now executed in separate threads using `asyncio.to_thread`.
    *   **Impact**: The main Websocket event loop remains unblocked, ensuring the app stays responsive to heartbeats and new connections even during long print jobs.

4.  **Debouncing (Duplicate Prevention)**
    *   **Logic**: If a print request for the exact same transaction (same invoice number) is received within 2 seconds of the previous one, it is ignored.
    *   **Benefit**: Prevent accidental double-printing due to double-clicks or network retries.

5.  **Error Propagation**
    *   **Feature**: Detailed error messages are now returned to the caller.
    *   **Response**:
        *   Success: `{ "message": "Printed successfully" }`
        *   Printer Error: `{ "message": "Journaled successfully (printer unavailable)", "error": "Printer connection error..." }`

6.  **Connection Logic Fixes**
    *   **Fix**: The printer printer connection logic was updated to correctly use the IP address provided in the client settings, rather than a hardcoded default.

## Usage

Run the helper application:
```bash
python helper/app.py
```

The websocket server listens on `localhost:9876`.

### API Example (JSON over Websocket)

**Print Receipt:**
```json
{
  "device": "printer",
  "type": "receipt",
  "settings": { "url": "192.168.1.100" },
  "transaction": { ... }
}
```
