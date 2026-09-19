# UAT Deployment (Admin Instance)

Deploys the centralized admin/UAT instance of `mmg-pos` — same codebase as a
branch, running with `VITE_ROLE=admin` so POS/cashier routes are hidden and
centralized master-data routes (users, roles, packages, discounts, etc.) are
unlocked. Runs on a single AWS Lightsail box, plain HTTP (no TLS), deployed
from the `uat` branch.

Related files:
- [`docker-compose.uat.yml`](../docker-compose.uat.yml) — the stack definition
- [`scripts/deploy-uat.sh`](../scripts/deploy-uat.sh) — pull + redeploy script, run on the box
- [`mmg-app/src/routes/PosRoutes.jsx`](../mmg-app/src/routes/PosRoutes.jsx) / [`MainRoutes.jsx`](../mmg-app/src/routes/MainRoutes.jsx) — where `VITE_ROLE` is enforced

## Known limitations

- **Frontend-only restriction.** `VITE_ROLE=admin` hides POS routes and unlocks
  master-data routes in the React app only. Nothing stops a direct API call to
  a POS/transaction endpoint on this instance's backend — there is currently
  no server-side role/permission enforcement anywhere in `pos-api` (any valid
  JWT can hit any endpoint). Treat this as a UI convenience, not a security
  boundary, until backend enforcement is built.
- **HTTP only, no auth on Mongo.** The Lightsail firewall is the only thing
  standing between the public internet and an unauthenticated MongoDB and a
  plaintext API. Restrict every firewall rule to known IPs — see step 2.
- **No incremental sync.** `sync` mirrors entire collections every 20s
  (upstream) / 3 min (downstream), not just changed documents. Fine at UAT
  data volumes; don't read this setup as validating sync performance at scale.

---

## 1. Create the Lightsail instance

1. Lightsail console → **Create instance** → Linux/Unix → **OS Only** → Ubuntu 22.04.
2. Plan: 2 GB RAM (Docker + Mongo + Flask + Vite dev server need headroom).
3. Once created: **Networking** tab → attach a **static IP**, so the address
   survives stop/start.

## 2. Configure the firewall

Networking tab → Firewall rules → add:

| Port | Purpose |
|---|---|
| `80` | Frontend (browser) |
| `8001` | Flask API direct (debug only) |
| `8002` | Proxy — API entry point for the browser |
| `8003` | MongoDB — needed so a branch server's `sync` can reach this instance |
| `22` | SSH (present by default) |

For every rule, use **"Restrict to IP address"** with your and your team's
known public IPs — not "Anywhere." Port `8003` in particular has zero
authentication; leaving it open to `0.0.0.0/0` means anyone who finds it has
full read/write access to UAT's database.

## 3. SSH in and install Docker

```bash
ssh ubuntu@<lightsail-static-ip>
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker $USER
# log out and back in for the group change to take effect
```

## 4. Clone the repo and set secrets

The repo is private, so cloning needs a deploy key or personal access token
configured on the box first.

```bash
git clone git@github.com:package-coder/mmg-pos.git
cd mmg-pos
git checkout uat
cp pos-api/.env.example pos-api/.env
```

Edit `pos-api/.env`:
- Set `JWT_SECRET_KEY` to a real random secret (e.g. `openssl rand -hex 32`) — do **not** reuse a branch's or production's secret.
- Leave `REMOTE_DATABASE_URL` as the placeholder. This instance is the top of the sync hierarchy — it has nothing further upstream to sync to. `sync` will crash-loop on this placeholder, which is harmless (see the main [CLAUDE.md](../CLAUDE.md)).

## 5. Deploy

```bash
./scripts/deploy-uat.sh
```

Defaults to the `uat` branch. This pulls the branch, verifies `pos-api/.env`
exists, and runs `docker-compose -f docker-compose.uat.yml up --build -d`.

## 6. Seed the database

```bash
docker-compose -f docker-compose.uat.yml exec server python seed.py
```

Creates the default admin/cashier users and a default branch. Override the
admin password with `SEED_PASSWORD=<password>` before this command if needed.

## 7. Verify

Open `http://<lightsail-ip>` in a browser (no port needed — the frontend runs
on 80 in this compose file) and confirm:
- Login works with the seeded admin account.
- No POS menu item is visible, and navigating to `/pos` directly redirects to `/404`.
- `dashboard/users`, `dashboard/packages`, `dashboard/discounts`, etc. are reachable.

## 8. Point a branch's `sync` at this instance (optional, for testing sync)

On a local/branch machine running the normal `docker-compose.yml` stack, set
in its `pos-api/.env`:

```
REMOTE_DATABASE_URL=mongodb://<lightsail-ip>:8003
```

No `VITE_ROLE` needs to be set on a branch — it's undefined there by default,
which is not `'admin'`, so POS stays fully visible and master-data routes stay
hidden, per [`PosGuard`/`AdminOnlyRoute`](../mmg-app/src/routes/MainRoutes.jsx).

---

## Redeploying after new commits

Push changes to the `uat` branch, then on the Lightsail box:

```bash
cd mmg-pos
./scripts/deploy-uat.sh
```

This is currently manual (SSH + script). GitHub Actions auto-deploy on push
was discussed but not yet built.

## Alternative: build locally, push, pull on Lightsail

`deploy-uat.sh` builds images **on the box itself**, from source pulled via
git. If the 2 GB Lightsail box is too slow/cramped to build there (Vite +
Flask + Mongo images all at once), build on your own machine instead and push
the finished images to Docker Hub, then have Lightsail just pull and run them
— no build step on the box at all.

[`scripts/deploy-uat-build-local.sh`](../scripts/deploy-uat-build-local.sh)
automates this end to end — it runs from **your machine**, not the box, and
does the build/push locally then SSHes in to pull and restart:

```bash
docker login   # once, if not already logged in locally

./scripts/deploy-uat-build-local.sh ubuntu@<lightsail-ip> uat
```

It never touches your SSH key or Docker Hub credentials directly — it just
shells out to `docker` and `ssh` using whatever's already configured in your
environment. `docker login` also needs to have been run on the box itself at
least once (same account, or a read-only access token), since the script's
remote half runs `docker-compose pull`.

Notes:
- `mongo` is a public image (`mongo:7`) — `docker-compose pull` fetches it from
  Docker Hub the same way regardless of which flow you use; no push needed for it.
- Images pushed to `chrisn0tdev/*` on Docker Hub are only as private as that
  Docker Hub repo's visibility setting — since this is a healthcare POS
  codebase, make sure those repos are **private**, not public, before pushing.
- This flow and `deploy-uat.sh` are two different ways to get the same stack
  running — don't mix them in the same deploy (e.g. don't `git reset --hard`
  via the script and then separately `docker-compose pull` expecting it to
  matter; `pull` only replaces images, `up --build` only rebuilds from local
  source, they don't need each other).
