# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## System Overview

This is the **MMG Albay POS System** monorepo — a point-of-sale system for Medical Mission Group Multipurpose Cooperative-Albay (a healthcare clinic cooperative in the Philippines).

| Directory | Role | Tech |
|---|---|---|
| `mmg-app/` | Frontend SPA | React 18, Vite, MUI v5 |
| `pos-api/` | REST API + hardware proxy + data sync | Flask 3.0, MongoDB, Python |
| `pos-helper-app/` | Hardware bridge (WebSocket server) | Python, websockets, ESC/POS |

---

## Architecture

### Request / Data Flow

```
Browser (mmg-app)
    │
    ├──[HTTP/Axios]──► pos-api (Flask, :5100)
    │                      └── MongoDB (local or remote)
    │
    └──[WebSocket ws://localhost:9876]──► pos-helper-app/helper/app.py
                                              ├── ESC/POS Printer (TCP/IP, default 192.168.192.168)
                                              └── VFD Customer Display (serial COM3)
```

### pos-helper-app/helper — `helper/app.py`

A standalone Python `asyncio` WebSocket server that bridges the browser to physical hardware.

- Listens on `ws://localhost:9876`
- Routes JSON messages by `{ "device": "printer"|"display", "device_type": "..." }`
  - Printer types: `receipt`, `report`, `test`
  - Display types: `message`, `item`, `total`, `next`
- All blocking hardware calls use `asyncio.to_thread` to keep the event loop responsive
- `ReceiptWriter` is a context manager that opens `ejournal.txt` once per transaction and writes to both the file and ESC/POS printer simultaneously — journals to file even when the physical printer is offline

### mmg-app — `src/`

React 18 + Vite SPA. Key structural layers:

- **`src/api/`** — one Axios module per domain (`transaction.js`, `auth.js`, `print.js`, etc.) using a shared `server` axios instance from `api/index.js` that injects the JWT from `TokenStorage`
- **`src/providers/`** — three React Context providers:
  - `AuthProvider` — JWT auth, user object, selected branch (persisted in `localStorage`)
  - `PrinterProvider` — manages the WebSocket connection to `ws://localhost:9876`; exposes `usePrinter()` hook
  - `CashierReportProvider` — cashier shift state
- **`src/routes/`** — React Router v6; four route groups: `MainRoutes` (dashboard/admin), `PosRoutes` (cashier POS screen), `AuthRoutes` (login), `DefaultRoutes` (root redirect). All protected routes use `<AuthorizeRoute roles={[...]}>`.
- **`src/views/pages/PosPage/`** — the active transaction/cashier screen; most hardware interaction happens here via `usePrinter()`
- **`src/store/`** — Redux is used **only** for UI customization (theme). Server state is managed by React Query.
- All pages are lazy-loaded via `Loadable(lazy(...))`.

**Two print paths exist** — know which one you are touching:
1. `usePrinter()` from `PrinterProvider` → WebSocket to helper app (current approach for POS screen)
2. `src/api/print.js` (`Print()`, `PrintReport()`) → HTTP to the proxy `/print` and `/print-report` (legacy, kept for compatibility)

### pos-api — root files + subdirectories

Flask 3.0 REST API backed by MongoDB (PyMongo).

- Entry point: `app.py` — registers ~60+ Blueprints
- `app/routes/<domain>/<action>.py` — each CRUD action is its own file (e.g., `app/routes/transaction/create.py`)
- `app/blueprints/` — grouped blueprints for larger sub-systems
- `app/cas_app/` — Cooperative Accounting System sub-application (inventory, purchase orders, chart of accounts, journal entries) sharing the same Flask process
- `app/database/config.py` — imports all MongoDB collections as module-level globals; imported directly by route files
- `app/middlewares/token_validator.py` — JWT validation as `@app.before_request`; excluded paths include `/login`, `/booking/create`, `/branches`
- `app/config.py` — reads `APP_ENV`; valid values: `local-development`, `development`, `internal-production`, `production`
- `proxy/app.py` — Flask reverse proxy (port 5001) that forwards requests to the local server; also has legacy HTTP print/display endpoints
- `sync/app.py` — scheduled background process syncing MongoDB between local and remote (every 20s upstream, every 3 min downstream)
- `docker-compose.yml` — five services: `app` (React, :8000), `server` (Flask, :8001), `proxy` (:8002), `sync`, `mongo` (:8003)

---

## Deployment Strategy

### Two-Tier: Internal LAN + Staging/Cloud

```
┌─────────────────────────────────────────┐        ┌──────────────────────────────┐
│  INTERNAL (LAN)                         │        │  STAGING / CLOUD             │
│                                         │        │                              │
│  Cashier (browser)                      │        │  Admin / Reports (browser)   │
│       │                                 │        │       │                      │
│       ▼                                 │        │       ▼                      │
│  Local Flask API ──► Local MongoDB      │──sync──►  Cloud MongoDB (read-only)  │
│                           │             │        │                              │
│                      [_sync field       │        │  Staging mmg-app             │
│                       on each doc]      │        │  (no cashier/write access)   │
└─────────────────────────────────────────┘        └──────────────────────────────┘
```

**Internal (LAN)** is the production environment where all sales happen. The Flask API and MongoDB run on a single LAN server. Cashiers access the POS through the browser over the local network — this works fully offline if internet goes down.

**Staging/Cloud** is a read-only view of the same data hosted remotely. Its purpose is reporting and cloud backup. It never generates transactions.

### Sync Strategy — Embedded `_sync` Field (Outbox Pattern)

Every write operation (transaction create/update, etc.) embeds a `_sync` field directly on the document:

```json
{
  "_id": "...",
  "invoiceNumber": 1234,
  "...",
  "_sync": { "status": "pending", "synced_at": null, "attempts": 0 }
}
```

The sync service polls `{ "_sync.status": "pending" }`, pushes the document to the cloud MongoDB (stripping `_sync` before insert), then marks it `synced` locally.

**Why this approach over a separate `sync_queue` collection:**
A separate queue requires two MongoDB writes per transaction (the document + the queue entry). On a standalone MongoDB (no replica set), these two writes cannot be wrapped in a transaction — a crash between them leaves the document unqueued and it silently never reaches staging. Embedding `_sync` on the document makes it a single atomic write, eliminating the split-brain risk entirely.

**Known limitations to be aware of:**
- **Stale staging window**: Staging data lags behind internal by up to the sync interval (~20s). Reports on staging may not reflect the last few minutes of transactions. This is acceptable for end-of-day reporting but not for real-time views.
- **Deletes are not propagated**: If a transaction is hard-deleted locally (not just status-changed to `cancelled`), the delete does not reach staging. The system should prefer status changes over hard deletes for any document that participates in sync.
- **Downstream sync must not overwrite `_sync`**: The existing downstream sync (cloud → local for lookup tables like users, branches, products) must explicitly exclude the `_sync` field when upserting to avoid clobbering the local sync state.

### Staging mmg-app
A separate instance of the mmg-app (or a dedicated `APP_ENV=staging` mode) pointing to the cloud MongoDB. Write endpoints on the API are either disabled or the staging app never exposes cashier/POS routes — only dashboard/reports routes are accessible.

---

## Commands

### Docker (full stack — run from monorepo root)
```bash
# First-time setup: copy the example env and fill in secrets
cp .env.example pos-api/.env

# Internal LAN deployment (local MongoDB, all services)
docker-compose up --build

# Production / cloud deployment (remote MongoDB)
docker-compose -f docker-compose.prod.yml up --build

# Rebuild a single service
docker-compose up --build server

# View logs
docker-compose logs -f server
docker-compose logs -f proxy
```

Port map when using `docker-compose.yml`:
| Service | Host port | Purpose |
|---|---|---|
| app (frontend) | 8000 | Browser entry point |
| proxy | 8002 | API entry point for browser |
| server (Flask) | 8001 | Direct API (debug) |
| mongo | 8003 | MongoDB (debug) |

### mmg-app (local dev)
```bash
cd mmg-app
npm install
npm start            # dev server (env-cmd + vite) on :5173
npm run build
npm run lint
npm run lint:fix
npm run prettier
```

### pos-api (local dev)
```bash
cd pos-api
python -m venv .venv
source .venv/Scripts/activate   # Windows; use .venv/bin/activate on Linux
pip install -r requirements.txt
python app.py                   # Flask dev server on :5100
```

### pos-helper-app (always runs locally — not in Docker)
```bash
cd pos-helper-app/helper
python -m venv ../.venv
source ../.venv/Scripts/activate
pip install -r requirements.txt
python app.py                   # WebSocket server on ws://localhost:9876

# Tests (from pos-helper-app/)
python test_fix.py
python test_async.py
python test_journaling.py
python test_refactor.py
```

---

## Environment Variables

### pos-api `.env`
```
APP_ENV=local-development        # local-development | development | internal-production | production
JWT_SECRET_KEY=...
LOCAL_DATABASE_URL=mongodb://localhost:27017
REMOTE_DATABASE_URL=mongodb+srv://...
DATABASE=pos
PORT=5100
HOST=0.0.0.0
LOCAL_SERVER_URL=http://server:5000    # used by proxy container
CLOUD_SERVER_URL=...                   # used by proxy (currently unused)
```

### mmg-app `.env`
```
VITE_APP_ENV=development               # development | production | internal-production
VITE_APP_SERVER_PORT=5100              # used in dev; builds baseURL from window.location.hostname
VITE_APP_SERVER_URL=http://...         # used in production mode only
VITE_APP_BASE_NAME=/
```

---

## Key Domain Concepts

- **Transaction** — a sale with items, discounts, tender, and status (`completed`, `cancelled`, `refunded`, `on-hold`)
- **Invoice Number** — sequential counter stored in `counters` collection; zero-padded to 6 digits on receipts
- **X-Report** — per-cashier shift summary (time-in to time-out)
- **Z-Report** — end-of-day summary across all cashiers; includes accumulated sales, discount breakdown, cash drawer count
- **Electronic Journal** (`ejournal.txt`) — append-only flat-file log of every non-reprint receipt; written by the helper app even when printer is offline
- **Member Discounts** — tied to `memberType` (`senior_citizen`, `pwd`, `naac`, `solo_parent`); triggers the ID/Signature block on receipts
- **Branch** — selected per user session in `localStorage`; scopes data throughout the frontend
- **CAS** — Cooperative Accounting System within `pos-api`; separate concern from POS (inventory, suppliers, purchase orders, accounting)

---

## Hardware

- **Receipt Printer**: Epson TM-series ESC/POS over TCP/IP. IP is configurable via the `settings.url` field in the WebSocket message (default: `192.168.192.168`).
- **VFD Customer Display**: RS-232 serial, `COM3` on Windows / `/dev/ttyACM1` on Linux. Uses `\x0C` (form feed) to clear the 2×20 character display.
- Printer failure is non-fatal — `ReceiptWriter` catches errors and completes the journal write; response returns `"message": "Journaled successfully (printer unavailable)"`.
