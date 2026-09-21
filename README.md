# MMG Albay POS System — Single Demo Machine Setup

This guide walks through setting up the complete MMG Albay Point-of-Sale system on a single machine for demo, testing, or local development.

## Overview

The system has three main components:
- **mmg-app** (React frontend) — runs on port 8000
- **pos-api** (Flask backend + MongoDB) — API on port 5100, proxy on 8002
- **pos-helper-app** (Hardware bridge) — WebSocket server on port 9999 for printer/display control

All run locally on the same machine for demo purposes.

> Setting up a real branch register instead? Skip to [Setting Up a New Branch POS Station](#setting-up-a-new-branch-pos-station).

## Prerequisites

- **Docker & Docker Compose** — [Install here](https://www.docker.com/products/docker-desktop)
- **Python 3.9+** — for the hardware bridge app
- **Git** — to clone the repository
- **Disk space** — ~2GB for Docker images + MongoDB
- **Ports available** — 8000, 8001, 8002, 8003, 5100, 9999 (check `netstat` if issues)

## Quick Start

### 1. Clone & Navigate

```bash
git clone <repo-url> mmg-pos
cd mmg-pos
```

### 2. Configure Environment

```bash
cp .env.example pos-api/.env
```

Edit `pos-api/.env`:
```
APP_ENV=local-development
JWT_SECRET_KEY=demo-secret-key-12345
LOCAL_DATABASE_URL=mongodb://localhost:27017
REMOTE_DATABASE_URL=mongodb+srv://user:pass@cloud.mongodb.net/pos
DATABASE=pos
PORT=5100
HOST=0.0.0.0
```

For demo, you can leave `REMOTE_DATABASE_URL` as-is — sync won't work, but POS is fully functional offline.

### 3. Start Docker Services

```bash
docker-compose up --build
```

**Wait for this message in the logs:**
```
server_1  | Running on http://0.0.0.0:5100/
```

This means the Flask API is ready. Leave this terminal open.

### 4. Seed the Database (First Time Only)

Open a **new terminal** in the same directory:

```bash
docker-compose exec server python seed.py
```

This creates:
- Default branch: **Albay**
- Admin role
- Admin user with credentials:
  - Username: `admin`
  - Password: `admin123`

You'll see:
```
✓ Branch seeded
✓ Roles seeded
✓ Admin user created
```

### 5. Start the Hardware Bridge (pos-helper-app)

Open another **new terminal**:

```bash
cd pos-helper-app/helper

# Create Python virtual environment
python -m venv ../.venv

# Activate it
source ../.venv/bin/activate        # macOS/Linux
# OR
..\.venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Start the WebSocket server
python app.py
```

You should see:
```
WebSocket server running on ws://localhost:9999
```

### 6. Open the App

Open your browser and go to:
```
http://localhost:8000
```

**Login with:**
- Username: `admin`
- Password: `admin123`

You're in! The dashboard should load.

---

## Verify Everything Works

### ✅ Checklist

- [ ] Frontend loads at `http://localhost:8000`
- [ ] Login succeeds → redirects to dashboard
- [ ] Docker logs show no errors (`docker-compose logs`)
- [ ] pos-helper-app terminal shows "WebSocket server running"
- [ ] Browser DevTools (F12) → Network tab shows WebSocket connection (ws://localhost:9999) with status 101

### 🔍 Check Individual Services

```bash
# View all service logs
docker-compose logs -f

# Just Flask API
docker-compose logs -f server

# Just MongoDB
docker-compose logs -f mongo

# Frontend (if running separately)
docker-compose logs -f app
```

---

## Testing Hardware Integration (Optional)

If you have a receipt printer (Epson ESC/POS) connected:

1. **Check printer IP** — default is `192.168.192.168`
   - Modify in pos-helper-app settings if different

2. **Print a test receipt** from the POS screen:
   - Go to POS page
   - Add items to cart
   - Click "Print Test" or complete a transaction
   - Receipt should print

If printer is offline, the receipt is still **journaled to file** (`ejournal.txt`) even if printing fails — this is by design.

---

## Database Access

### View MongoDB Data (Debug)

MongoDB runs in Docker on port 8003. You can connect with a GUI tool:

```
mongodb://localhost:8003/pos
```

Or use the Mongo CLI:

```bash
docker-compose exec mongo mongosh
> use pos
> db.users.find().pretty()
> db.transactions.find().pretty()
```

### Reset Database

```bash
# Stop and remove MongoDB container
docker-compose down mongo

# Restart (fresh database)
docker-compose up --build mongo

# Re-seed
docker-compose exec server python seed.py
```

---

## Common Issues

### Port Already in Use

If you see `Address already in use`:

```bash
# macOS/Linux — kill process on port
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

Or change ports in `docker-compose.yml`:
```yaml
services:
  app:
    ports:
      - "8001:5173"  # Change 8001 to another port
```

### Docker Container Won't Start

```bash
# Check logs
docker-compose logs server

# Rebuild from scratch
docker-compose down -v  # removes volumes
docker-compose up --build
```

### pos-helper-app Can't Connect to Printer

The default printer IP is `192.168.192.168`. If your printer has a different IP:

1. Find your printer's IP (check printer menu → Network Settings)
2. Edit the WebSocket message when calling print:
   ```javascript
   {
     "device": "printer",
     "device_type": "receipt",
     "settings": { "url": "192.168.1.100" }  // your printer IP
   }
   ```

### WebSocket Connection Fails

Check that pos-helper-app is running:
```bash
cd pos-helper-app/helper
python app.py
```

Should show:
```
WebSocket server running on ws://localhost:9999
```

If not, check:
- Python version (`python --version` should be 3.9+)
- Dependencies installed (`pip list | grep websockets`)

---

## Stopping Everything

```bash
# Stop all services
docker-compose down

# Stop but keep data
docker-compose stop

# Stop and remove everything (data lost)
docker-compose down -v
```

pos-helper-app: Press `Ctrl+C` in its terminal.

---

## Project Structure

```
mmg-pos/
├── mmg-app/                 ← React frontend (Vite)
│   ├── src/
│   │   ├── pages/          ← Page components
│   │   ├── api/            ← Axios modules (transaction, auth, print, etc.)
│   │   ├── providers/      ← React Context (Auth, Printer, CashierReport)
│   │   └── routes/         ← React Router config
│   └── package.json
│
├── pos-api/                 ← Flask backend
│   ├── app.py              ← Entry point
│   ├── app/
│   │   ├── routes/         ← HTTP endpoints
│   │   ├── features/       ← New features (service/repo/models)
│   │   ├── repositories/   ← Database access layer
│   │   ├── database/       ← MongoDB config & indexes
│   │   └── middlewares/    ← JWT validation, etc.
│   ├── proxy/              ← Reverse proxy (port 8002)
│   ├── sync/               ← Sync service (branch ↔ cloud)
│   ├── seed.py             ← Database seeder
│   └── requirements.txt
│
├── pos-helper-app/         ← Hardware bridge (WebSocket)
│   ├── helper/
│   │   ├── app.py          ← WebSocket server
│   │   ├── tray.py         ← Tray icon, Settings form, log viewer
│   │   ├── config.py       ← config.json loader
│   │   ├── requirements.txt
│   │   └── mmg-helper.spec ← PyInstaller config (for .exe build)
│   ├── installer/          ← Inno Setup script for cashier workstations
│   └── build-installer.ps1 ← Builds MMG-Helper-Setup.exe
│
├── docker-compose.yml      ← All services (local dev)
├── CLAUDE.md               ← Architecture & detailed docs
├── README.md               ← This file
└── .env.example            ← Template for pos-api/.env
```

---

## Key Commands

```bash
# Start everything
docker-compose up --build

# View logs
docker-compose logs -f

# Seed database (first time only)
docker-compose exec server python seed.py

# Run tests (pos-api)
cd pos-api && python -m pytest

# Reset everything
docker-compose down -v && docker-compose up --build

# Stop without removing data
docker-compose stop

# Frontend only (if you want to work on React separately)
cd mmg-app && npm install && npm start  # runs on :5173
```

---

## Next Steps

- **Edit a transaction** → go to POS page, add items, complete
- **View reports** → go to Reports section (X-Report, Z-Report)
- **Change settings** → theme, branch selection (stored in localStorage)
- **Add products** → Admin → Product Management (if available)
- **Check API** → directly at `http://localhost:8001` (Flask) or `http://localhost:8002` (proxy)

---

## Setting Up a New Branch POS Station

A real branch has two parts, set up separately:

- **Branch server** — one per branch. A machine on the branch LAN running the Docker stack (frontend, API, proxy, MongoDB, sync). Cashiers open the app in a browser pointed at it.
- **Cashier workstations** — one per register. Each runs the **helper** (a Windows installer, *not* Docker) that talks to that PC's receipt printer and customer display, and holds that terminal's own BIR credentials.

Everything in this section is for a real, live branch. For a throwaway demo, use the Quick Start above.

### Before you start — collect these

| Item | Where it comes from |
|---|---|
| Central MongoDB URL (`REMOTE_DATABASE_URL`) | Whoever runs the central/UAT server. The branch **copies** its users, branches and products from central — it never creates its own, so this is required. |
| Per-terminal **MIN**, **SN**, **PTU No** | The BIR permit for each register. Every terminal has its own; never share or reuse them. |
| Receipt printer IP (default `192.168.192.168`) and customer-display COM port (default `COM3`) | The hardware at that register. |

### Part A — Branch server (once per branch)

Needs Docker, Git and `curl`, and ports 8000–8003 free. Give the machine a fixed LAN IP.

1. **Clone the repo**
   ```bash
   git clone <repo-url> mmg-pos && cd mmg-pos
   ```
2. **Run the setup script.** It asks for the central MongoDB URL, generates a JWT secret, writes `pos-api/.env`, builds and starts the stack, seeds it from central and checks it tallies:
   ```bash
   ./scripts/setup-pos-station.sh
   ```
   It finishes by printing the URL cashiers should open (`http://<server-ip>:8000`).

   <details><summary>Or do the same steps by hand</summary>

   ```bash
   cp .env.example pos-api/.env        # then set JWT_SECRET_KEY and REMOTE_DATABASE_URL; keep APP_ENV=internal-production
   docker-compose up --build -d
   docker-compose exec server python seed.py                    # prints "Bootstrapping lookup data from central"
   docker-compose exec sync python reconcile.py --verify        # must end with "TALLY OK"
   ```
   </details>
3. **Open the firewall** so cashier PCs can reach this machine on **8000** (app) and **8002** (API proxy).
4. **Log in** with an account from central — a branch's users are copied down from central, so the `admin`/`admin123` and `cashier`/`cashier123` seeder defaults only exist on a database seeded standalone. If you do see those, change them before anyone uses it.
5. **Check sync** — `docker-compose logs --tail 20 sync` should show `[upstream-sync] ... failed=0`.

### Part B — Each cashier workstation

1. **Build or obtain the installer** (once, on a build machine with Inno Setup):
   ```powershell
   cd pos-helper-app
   .\build-installer.ps1        # produces installer\Output\MMG-Helper-Setup.exe
   ```
   Optionally put a `branch-defaults.ini` next to it to prefill the fields shared by the whole branch (printer IP, COM port).
2. **Run `MMG-Helper-Setup.exe` as administrator** on the cashier PC. The wizard asks for **MIN, SN, PTU No**, the printer IP, the display COM port and a **provider password** (min 8 characters; it locks the tray's Settings and Logs window), then installs to `C:\MMG-POS\`, adds a startup shortcut and writes `C:\MMG-POS\config.json`.
   For a scripted install: `MMG-Helper-Setup.exe /VERYSILENT /MIN="..." /SN="..." /PTU="..." /PRINTER=192.168.x.x /COM=COM3 /ADMINPW="..."` (without `/ADMINPW`, Settings and Logs is left unlocked). Precedence per field: command-line switch, then `branch-defaults.ini`, then the built-in default.
3. **Confirm the helper is running** — a tray icon appears; right-click → **Test Print** should print a test slip. Credentials can be corrected later from the tray icon's **Settings and Logs** (Save and Restart).
4. **Open the app** in the browser at `http://<branch-server-ip>:8000`, sign in, and pick the branch.
5. **Do a real checkout.** It reads this terminal's PTU from the helper at the moment of sale, so the first sale proves the whole chain (browser → helper → printer, and the invoice sequence for this PTU starting at 000001).

Repeat Part B for every register.

### Things to know

- **Checkout is blocked if the helper can't be reached** — by design, so a sale never gets issued without a real terminal PTU. Check the tray icon and `C:\MMG-POS\helper.log`.
- **Invoice numbers are per PTU (per terminal)**, not per branch or cashier. Two registers each start at 000001; that is correct.
- **Leave Dev Test Mode off** (Settings) on real registers — it mocks the terminal and PTU. It is off by default.
- **Never create test data on a live station.** Sync is running and pushes transactions to central. For automated tests against a stack with sync running, set `"isLocal": true` on the transaction payload so it is never pushed.
- Database wipes and re-seeding are covered in `pos-api/SEEDING.md`.

---

## For Production / Cloud Deployment

See `CLAUDE.md` for:
- Multi-branch deployment (one server per branch + shared staging)
- Sync strategy (branch ↔ cloud MongoDB)
- Environment variables for production
- CI/CD setup

---

## Support

For issues, bugs, or questions:
- Check `CLAUDE.md` for architecture details
- Review Docker logs: `docker-compose logs`
- Verify all ports are available and not blocked by firewall
- Ensure Python 3.9+ is installed for pos-helper-app

---

**Happy testing! 🎉**
