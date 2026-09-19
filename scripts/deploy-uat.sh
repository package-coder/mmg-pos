#!/usr/bin/env bash
# Runs ON the UAT Lightsail box (invoked manually, or via SSH from CI) to pull
# the latest code and redeploy the docker-compose.uat.yml stack.
#
# Usage: ./scripts/deploy-uat.sh [branch]
#   branch defaults to "uat"

set -euo pipefail

BRANCH="${1:-uat}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# mmg-app's Dockerfile has no USER directive, so vite/yarn run as root inside
# the container. Since ./mmg-app is bind-mounted, files that process touches
# come back owned by root, which then blocks `git reset --hard` below (run as
# the regular SSH user) with "Permission denied" on the next deploy.
sudo chown -R "$(id -u):$(id -g)" "$REPO_DIR"

echo "==> Pulling $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

if [ ! -f pos-api/.env ]; then
  echo "ERROR: pos-api/.env is missing. Copy pos-api/.env.example, fill in" >&2
  echo "JWT_SECRET_KEY and other secrets, then re-run this script." >&2
  exit 1
fi

echo "==> Rebuilding and restarting the UAT stack"
docker compose -f docker-compose.uat.yml up --build -d

echo "==> Pruning dangling images"
docker image prune -f

echo "==> Done. Current containers:"
docker compose -f docker-compose.uat.yml ps
