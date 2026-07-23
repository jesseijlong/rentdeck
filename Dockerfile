# syntax=docker/dockerfile:1

# ---- Stage 1: build the app (frontend + server bundle) ----
FROM node:20-bookworm AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: install production deps (native modules compile here) ----
# Uses the full debian image so python3 / make / g++ are available for
# better-sqlite3 native compilation. Building this stage ON the QNAP
# guarantees the binary matches the NAS CPU (ARM or Intel).
FROM node:20-bookworm AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Stage 3: slim runtime image ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# tini handles signal forwarding so the server shuts down cleanly
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist          ./dist
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_PATH=/app/data/data.db

EXPOSE 5000

# data.db lives in the persistent volume at /app/data. If it doesn't exist
# yet, the app creates a fresh one on startup (tables auto-created).
CMD ["sh", "-c", "mkdir -p /app/data && exec tini -- node dist/index.cjs"]
