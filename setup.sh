#!/bin/bash
# setup.sh — ONE-TIME setup to convert your existing rental-deck folder into a
# GitHub checkout so future updates are just: sudo ./update.sh
# Run on your QNAP:  sudo bash setup.sh
set -e

REPO_URL="https://github.com/jesseijlong/rentdeck.git"
APP_DIR="/share/CACHEDEV1_DATA/Container/rental-deck"

cd "$APP_DIR"

echo "==> Stopping the current container (if running)..."
docker compose down 2>/dev/null || true

echo "==> Connecting this folder to GitHub..."
if [ -d .git ]; then
  echo "    (already a git repo — fetching latest)"
  git fetch origin master
  git reset --hard origin/master
else
  git init
  git remote add origin "$REPO_URL"
  git fetch origin master
  git reset --hard origin/master
fi

echo "==> Creating .env with your password (if missing)..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Created .env from .env.example"
  echo "    >> Edit it now to set your password:  nano .env"
fi

echo ""
echo "==> IMPORTANT: if .env was just created, edit it to set your password:"
echo "       nano $APP_DIR/.env"
echo "    then run the build:"
echo "       cd $APP_DIR && sudo docker compose build --no-cache && sudo docker compose up -d"
echo ""
echo "==> Your data in rentdeck-data/ was preserved (not touched)."
