#!/usr/bin/env bash
# Builds the UAT images on YOUR machine, pushes them to Docker Hub, then SSHes
# into the Lightsail box to pull and restart the stack. No build happens on
# the box itself — see docs/uat-deployment.md ("Alternative: build locally,
# push, pull on Lightsail") for why you might want this over deploy-uat.sh.
#
# Requires: `docker login` already done locally, and SSH access to the box
# already working (key/agent set up in your normal ~/.ssh — this script never
# touches your credentials, it just shells out to `ssh`).
#
# Usage: ./scripts/deploy-uat-build-local.sh <user@host> [branch]
#   branch defaults to "uat"

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <user@host> [branch]" >&2
  echo "Example: $0 ubuntu@203.0.113.10 uat" >&2
  exit 1
fi

REMOTE="$1"
BRANCH="${2:-uat}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Building images locally"
docker-compose -f docker-compose.uat.yml build

echo "==> Pushing images to Docker Hub"
docker-compose -f docker-compose.uat.yml push

echo "==> Deploying on $REMOTE"
ssh "$REMOTE" bash -s <<EOF
  set -euo pipefail
  cd mmg-pos
  # mmg-app's Dockerfile has no USER directive, so vite/yarn run as root inside
  # the container. Since ./mmg-app is bind-mounted, files that process touches
  # come back owned by root, which then blocks the git reset below.
  sudo chown -R "\$(id -u):\$(id -g)" .
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"

  if [ ! -f pos-api/.env ]; then
    echo "ERROR: pos-api/.env is missing on the remote box." >&2
    exit 1
  fi

  echo "--> Pulling images"
  docker-compose -f docker-compose.uat.yml pull

  echo "--> Restarting stack"
  docker-compose -f docker-compose.uat.yml up -d

  echo "--> Pruning dangling images"
  docker image prune -f

  docker-compose -f docker-compose.uat.yml ps
EOF

echo "==> Done."
