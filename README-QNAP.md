## Privacy note

This package's `data.db` contains your real tenant and property data (names,
phones, lease info). Keep the zip and the `rentdeck-data` folder private — don't
share or upload them anywhere public. The app itself has no login screen, so
keep it on your LAN or behind Tailscale; never forward port 5000 to the
internet. A password gate can be added if you want — just ask.

---

# RentDeck — QNAP NAS Deployment Guide

RentDeck packaged as a Docker container for your QNAP NAS. Your current data
(7 properties, 12 maintenance records, tenants) is baked in as a seed and
loads automatically on first start. After that, data persists on a Docker
volume so it survives container updates and NAS reboots.

## What's included

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: compiles the app + native SQLite module for your NAS's CPU |
| `docker-compose.yml` | One-command deploy with persistent storage and auto-restart |
| `.dockerignore` | Keeps the image lean (excludes node_modules, build artifacts, WAL files) |
| `data.db` | Seed database with your current data (loaded only on first start) |

## Prerequisites on the QNAP

1. **Container Station** installed (QNAP's Docker manager). Open App Center and
   install "Container Station" (or "Container Station 3" on newer firmware).
   Most Intel and ARM QNAP models support it.

2. **Enough storage**: the image is ~400 MB; allow 1 GB free.

## Step 1 — Copy this folder to your NAS

Copy the entire `rental-deck` folder to your NAS, e.g. into a share like:
```
/Container/rental-deck/
```
You can do this via File Station (drag-drop upload), SMB, or SCP. Make sure
these files are inside it: `Dockerfile`, `docker-compose.yml`, `.dockerignore`,
`data.db`, `package.json`, `package-lock.json`, plus the `client/`, `server/`,
`shared/`, `script/` folders.

## Step 2 — Build the image ON the NAS

Building on the NAS itself (rather than on your PC) is important: it lets the
SQLite native module compile for the NAS's exact CPU (Intel or ARM).

Open Container Station → **Container Station** → left menu **"Images"** →
**"Build"** (or "Create image"):

- **Image name**: `rentdeck:latest`
- **Path / Dockerfile location**: point to your `rental-deck` folder, e.g.
  `/Container/rental-deck/`
- Click **Build**. This takes 5–15 minutes the first time (downloads Node,
  installs deps, builds the app). Wait for it to finish.

Alternatively, via SSH on the NAS:
```bash
cd /share/Container/rental-deck
docker build -t rentdeck:latest .
```

## Step 3 — Run it with docker-compose

Via SSH on the NAS, in the `rental-deck` folder:
```bash
cd /share/Container/rental-deck
docker compose up -d
```
This starts RentDeck in the background, maps port 5000, creates the persistent
data volume, and sets it to auto-restart with the NAS.

If your QNAP's `docker compose` isn't available, use `docker-compose` (older
Container Station) or create the container through the Container Station UI:
- Image: `rentdeck:latest`
- Port mapping: host `5000` → container `5000`
- Volume: create a volume named `rentdeck-data` mounted at `/app/data`

## Step 4 — Open RentDeck

On any device on the same network, open:
```
http://<NAS-IP>:5000
```
Find your NAS IP in QNAP's Network & File Services settings (e.g. `192.168.1.50`).

All your properties, maintenance records, and tenants should already be there.

## Accessing it away from home

The app works on any device on your local network. For secure remote access,
pick ONE of these (don't expose port 5000 directly to the internet):

- **Tailscale** (recommended, easiest): install on the NAS and your phone/laptop,
  then open `http://<NAS-tailscale-name>:5000` from anywhere.
- **QNAP CloudLink / myQNAPCloud**: QNAP's built-in remote access.
- **Reverse proxy** with HTTPS via the QNAP Reverse Proxy feature (Control Panel →
  Applications → Reverse Proxy).

## Backing up your data

Your live database lives in the `rentdeck-data` folder next to your
`docker-compose.yml` (as `data.db` inside the container's `/app/data`). Because
it's a visible bind mount, you can browse and copy it straight from File
Station:
```
/Container/rental-deck/rentdeck-data/data.db
```
Or via SSH:
```bash
cp /share/Container/rental-deck/rentdeck-data/data.db /share/Container/rentdeck-backup-$(date +%F).db
```
Do this periodically — it's your single source of truth.

## Updating the app

When you get an updated `rental-deck` folder:
1. Copy the new files to the NAS folder (overwrite).
2. Rebuild: `docker compose build`
3. Restart: `docker compose up -d`

Your data is untouched — it lives in the volume, separate from the image. The
seed database only loads on the very first start (when the volume is empty).

## Troubleshooting

- **"better-sqlite3" / native module error**: you likely built the image on a
  different CPU architecture than the NAS. Build the image ON the NAS itself
  (Step 2). If building via SSH on the NAS still fails, ensure Container Station
  has enough RAM allocated (≥ 2 GB).
- **Port 5000 already in use**: change the host port in `docker-compose.yml`,
  e.g. `"5080:5000"`, then reopen on the new port.
- **Lost data after update**: you removed the `rentdeck-data` folder. Never
  delete it — that's where your database lives. If you did, restore from your
  latest backup (see Backing up).
- **View logs**: `docker logs rentdeck` (or Container Station → Containers →
  rentdeck → Logs).

## Security note

This build has no login screen. Anyone who can reach port 5000 on your network
can view/edit the data (including tenant PII). Keep it behind your LAN, use
Tailscale for remote access, and don't expose the port publicly. A password
gate can be added if you want — just ask.
