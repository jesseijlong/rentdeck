#!/bin/bash
# update.sh — run this on your QNAP to pull the latest RentDeck code and rebuild.
# Usage:  sudo ./update.sh
set -e

cd "$(dirname "$0")"

echo "==> Pulling latest code from GitHub..."
git pull

echo "==> Rebuilding the image (this takes a few minutes)..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo "==> Done. Open http://<your-NAS-IP>:5000"
docker compose ps
