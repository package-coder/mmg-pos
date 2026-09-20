# UAT Deployment (Admin Instance)

Deploys the centralized admin/UAT instance of `mmg-pos` — same codebase as a
branch, running with `VITE_ROLE=admin` so POS/cashier routes are hidden and
centralized master-data routes (users, roles, packages, discounts, etc.) are
unlocked. Runs on a single AWS EC2 instance, plain HTTP (no TLS), deployed
from the `uat` branch.

(Originally set up on Lightsail for simplicity; moved to EC2 after a Lightsail
instance became unresponsive to SSH — and even to its own snapshot feature —
during a heavy `--no-cache` rebuild. EC2 gives real recovery options in that
situation: stop the instance without losing the EBS volume, detach/mount that
volume elsewhere to inspect it, or fall back to EC2 Instance Connect / Systems
Manager Session Manager when SSH itself is unresponsive. Lightsail doesn't
expose any of that.)

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
- **HTTP only, no auth on Mongo.** The EC2 security group is the only thing
  standing between the public internet and an unauthenticated MongoDB and a
  plaintext API. Restrict every rule to known IPs — see step 2.
- **No incremental sync.** `sync` mirrors entire collections every 20s
  (upstream) / 3 min (downstream), not just changed documents. Fine at UAT
  data volumes; don't read this setup as validating sync performance at scale.

---

## 1. Create the EC2 instance

1. EC2 console → **Launch instance** → Ubuntu Server 22.04 LTS AMI.
2. Instance type: **t3.medium** (4 GB RAM) — Docker + Mongo + Flask + Vite dev
   server, all built/pulled on one box, need real headroom. Don't go smaller
   than this; a 2 GB instance is what caused the earlier Lightsail box to hang
   under a `--no-cache` rebuild.
3. Key pair: create a new one (or reuse an existing one you already hold the
   `.pem` for) — this is what you'll SSH in with. Download it and
   `chmod 400 <keyname>.pem`.
4. Storage: bump the root volume to at least 20 GB (default 8 GB fills up fast
   once you're pulling multiple images plus a Mongo data volume).
5. After launch: **Elastic IPs** (left sidebar) → **Allocate Elastic IP
   address** → **Associate** it with this instance, so the address survives a
   stop/start (unlike the instance's default public IP, which changes).

## 2. Configure the security group

On the instance's **Security** tab → click the security group → **Edit
inbound rules** → add:

| Port | Purpose |
|---|---|
| `80` | Frontend (browser) |
| `8001` | Flask API — the browser calls this directly (no proxy on this instance) |
| `8003` | MongoDB — needed so a branch server's `sync` can reach this instance |
| `22` | SSH |

For every rule, set the source to **"My IP"** or a specific CIDR for you and
your team — not `0.0.0.0/0`. Port `8003` in particular has zero
authentication; leaving it open to the world means anyone who finds it has
full read/write access to UAT's database.

## 3. SSH in and install Docker

```bash
ssh -i <keyname>.pem ubuntu@<elastic-ip>
sudo apt update && sudo apt install -y git
```

Install Docker and the **Compose v2 plugin** — not the old `docker-compose`
apt package (`apt install docker-compose`), which is Docker's deprecated v1.
v1 fails silently on images with multi-platform manifests (the exact issue
hit during setup — see the `platform: linux/amd64` note in
`docker-compose.uat.yml`), swallowing the real error behind a vague
"must be built from source" warning instead of the actual manifest mismatch:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
# log out and back in for the group change to take effect
```

Use `docker compose` (space) everywhere below, not `docker-compose` (hyphen) —
that's the v2 plugin's command form.

## 4. Clone the repo and set secrets

The repo is private, so cloning needs a deploy key or personal access token
configured on the box first.

```bash
git clone https://github.com/package-coder/mmg-pos.git
cd mmg-pos
git checkout uat
cp pos-api/.env.example pos-api/.env
```

Edit `pos-api/.env`:
- Set `JWT_SECRET_KEY` to a real random secret (e.g. `openssl rand -hex 32`) — do **not** reuse a branch's or production's secret.
- Leave `REMOTE_DATABASE_URL` as the placeholder. This instance is the top of the sync hierarchy — it has nothing further upstream to sync to. `sync` logs "client unavailable" and skips each cycle cleanly on this placeholder — no crash, no restart loop (see the main [CLAUDE.md](../CLAUDE.md)).

## 5. Deploy

```bash
./scripts/deploy-uat.sh
```

Defaults to the `uat` branch. This pulls the branch, verifies `pos-api/.env`
exists, and runs `docker compose -f docker-compose.uat.yml up --build -d`.

## 6. Seed the database

```bash
docker compose -f docker-compose.uat.yml exec server python seed.py
```

Creates the default admin/cashier users and a default branch. Override the
admin password with `SEED_PASSWORD=<password>` before this command if needed.

## 7. Verify

Open `http://<elastic-ip>` in a browser (no port needed — the frontend runs
on 80 in this compose file) and confirm:
- Login works with the seeded admin account.
- No POS menu item is visible, and navigating to `/pos` directly redirects to `/404`.
- `dashboard/users`, `dashboard/packages`, `dashboard/discounts`, etc. are reachable.

## 8. Point a branch's `sync` at this instance (optional, for testing sync)

On a local/branch machine running the normal `docker-compose.yml` stack, set
in its `pos-api/.env`:

```
REMOTE_DATABASE_URL=mongodb://<elastic-ip>:8003
```

No `VITE_ROLE` needs to be set on a branch — it's undefined there by default,
which is not `'admin'`, so POS stays fully visible and master-data routes stay
hidden, per [`PosGuard`/`AdminOnlyRoute`](../mmg-app/src/routes/MainRoutes.jsx).

---

## Redeploying after new commits

Push changes to the `uat` branch, then on the EC2 box:

```bash
cd mmg-pos
./scripts/deploy-uat.sh
```

This is currently manual (SSH + script). GitHub Actions auto-deploy on push
was discussed but not yet built.

## Alternative: build locally, push, pull on the box

`deploy-uat.sh` builds images **on the box itself**, from source pulled via
git. If building there is too slow/cramped, build on your own machine instead
and push the finished images to Docker Hub, then have the box just pull and
run them — no build step on the box at all. Note: if your machine is Apple
Silicon (ARM64) and the box is a standard x86_64 EC2 instance, this is also
what you want to avoid the "no matching manifest for linux/amd64" error —
`docker-compose.uat.yml` already pins `platform: linux/amd64` on every built
service so this is safe regardless of which machine builds them.

[`scripts/deploy-uat-build-local.sh`](../scripts/deploy-uat-build-local.sh)
automates this end to end — it runs from **your machine**, not the box, and
does the build/push locally then SSHes in to pull and restart.

### One-time local setup

The script just calls plain `ssh "$REMOTE"` with no `-i` flag, so your SSH
client needs to already know which key to use for this host.

1. **Move the instance's `.pem` key out of any git repo**, into `~/.ssh/`,
   and lock down its permissions (SSH refuses to use a key readable by
   anyone but you):
   ```bash
   mv ~/Downloads/<keyname>.pem ~/.ssh/<keyname>.pem
   chmod 400 ~/.ssh/<keyname>.pem
   ```
   `*.pem` and `*.ppk` are gitignored in this repo, but that's a safety net —
   never place a key inside the repo directory to begin with.

2. **Register the host in `~/.ssh/config`** (create the file if it doesn't
   exist) so a plain `ssh ubuntu@<ip>` — exactly what the script calls —
   just works, without needing to modify the script:
   ```
   Host <elastic-ip>
     User ubuntu
     IdentityFile ~/.ssh/<keyname>.pem
   ```

3. `docker login` locally, if not already logged in.

### Redeploying

Once the setup above is done, every subsequent redeploy is one command from
the repo root on your machine:

```bash
./scripts/deploy-uat-build-local.sh ubuntu@<elastic-ip> uat
```

This builds all four images, pushes them to Docker Hub, SSHes in, pulls the
fresh images, restarts the containers, and prunes old images — no manual SSH
session needed unless something's broken and you need to debug directly
(`docker ps`, `docker logs <container>`, `df -h`, `docker system df`, etc.).

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
