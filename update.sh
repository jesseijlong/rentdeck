#!/bin/bash
# update.sh — run this on your QNAP to pull the latest RentDeck code and rebuild.
# Usage:  sudo ./update.sh
set -e
cd "$(dirname "$0")"

echo "==> Downloading latest code from GitHub..."
curl -fsSL https://github.com/jesseijlong/rentdeck/archive/refs/heads/master.tar.gz -o /tmp/rentdeck-latest.tar.gz

echo "==> Extracting (your .env and rentdeck-data are preserved)..."
# .env and rentdeck-data are not in the archive, so they're untouched.
tar -xzf /tmp/rentdeck-latest.tar.gz --strip-components=1 --no-same-owner
rm -f /tmp/rentdeck-latest.tar.gz

echo "==> Rebuilding the image (this takes a few minutes)..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo "==> Done. Open http://<your-NAS-IP>:5000"
docker compose ps
