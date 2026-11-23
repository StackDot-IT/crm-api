# StackDot CRM — Deployment Guide

The CRM ships as two Docker images on Docker Hub, run on the server with Docker Compose:

| Image | Built from | What it is |
|---|---|---|
| `jeeejagani/crm-api` | `crm-api` repo (`Dockerfile`) | Express + Prisma API. Applies pending DB migrations on start. |
| `jeeejagani/crm-web` | `crm-web` repo (`Dockerfile`) | Vite build served by nginx. Proxies `/api` and `/socket.io` to the API. |

Each image is tagged `latest` (current `main`) and `sha-<commit>` (for rollbacks).

The stack (`deploy/docker-compose.yml` in this repo) runs three containers: `postgres`, `crm-api`, `crm-web`.
Only `crm-web` is published on the host (port `WEB_PORT`, default 80). The API and database stay on the internal Docker network.

```
browser ──► crm-web (nginx :80) ──/api, /socket.io──► crm-api (:5000) ──► postgres (:5432, volume pgdata)
```

---

## Deploying (day to day)

Merge or push to `main` in either repo. GitHub Actions builds the image, pushes it to Docker Hub, and redeploys that service on the server.

- `crm-api` push → API image rebuilt → server pulls it, restarts `crm-api`, migrations run automatically.
- `crm-web` push → web image rebuilt → server pulls it, restarts `crm-web`.

To deploy without a code change (e.g. a redeploy), go to **GitHub → Actions → "Build, Push & Deploy" → Run workflow** on `main`.

Each deploy waits for the container's health check and fails the run (printing the container logs) if it doesn't come up.

---

## One-time setup

### 1. Docker Hub

1. Create an access token: Docker Hub → Account settings → Personal access tokens → *Read & Write*.
2. Repositories `crm-api` and `crm-web` are created on first push. **New Docker Hub repositories are public by default** — set them to private in the repository settings if the source should not be pullable by anyone.

### 2. Server

Requirements: Docker Engine with the Compose v2 plugin (`docker compose version` must work — the old `docker-compose` v1 binary is not supported).

```bash
mkdir -p /home/sddev/stackdot-crm && cd /home/sddev/stackdot-crm
```

Copy two files into that folder (from this repo):

- `deploy/docker-compose.yml` → `docker-compose.yml`
- `deploy/.env.example` → `.env`, then edit it:

```bash
# generate each secret separately
openssl rand -hex 32
```

| Variable | Set to |
|---|---|
| `CLIENT_URL` | The exact URL users open, e.g. `http://192.168.1.38` or `https://crm.example.com` |
| `WEB_PORT` | Host port for the web UI (80, or another free port) |
| `COOKIE_SECURE` | `true` only if `CLIENT_URL` is `https://`. With `true` over plain http, users get logged out on every page reload. |
| `POSTGRES_PASSWORD` | Letters and digits only (it is embedded in a URL) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` | Separate random values. Don't change `ENCRYPTION_KEY` after go-live — saved SMTP passwords become unreadable. |

Start the stack and load the baseline data:

```bash
docker login -u jeeejagani          # only needed if the repositories are private
docker compose pull
docker compose up -d
docker compose exec crm-api npx prisma db seed   # first deploy only; safe to re-run
```

Log in at `CLIENT_URL` with `superadmin@gmail.com` / `superadmin123`, then **change that password immediately**.

### 3. GitHub (both `crm-api` and `crm-web` repos)

Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | `jeeejagani` |
| `DOCKERHUB_TOKEN` | the Docker Hub access token |
| `SERVER_HOST` | server IP / hostname |
| `SERVER_USERNAME` | SSH user (e.g. `sddev`) |
| `SERVER_SSH_KEY` | private SSH key for that user (recommended), **or** |
| `SERVER_PASSWORD` | SSH password |
| `SERVER_PORT` | optional, defaults to 22 |

Optional **variables** (same page, *Variables* tab):

| Variable | Default |
|---|---|
| `DEPLOY_PATH` | `/home/sddev/stackdot-crm` |
| `DOCKERHUB_NAMESPACE` | `jeeejagani` |
| `VITE_API_BASE_URL` (crm-web only) | `/api` |

The `crm-api` workflow also uploads `deploy/docker-compose.yml` to the server on every deploy, so edit the compose file in this repo, not on the server. The server's `.env` is never overwritten.

---

## Manual deploy (without GitHub Actions)

From a machine with both repos checked out side by side:

```bash
docker login -u jeeejagani

docker build --pull -t jeeejagani/crm-api:latest ./crm-api
docker build --pull -t jeeejagani/crm-web:latest ./crm-web
docker push jeeejagani/crm-api:latest
docker push jeeejagani/crm-web:latest
```

Then on the server:

```bash
cd /home/sddev/stackdot-crm
docker compose pull
docker compose up -d
```

---

## Rollback

Every CI build is also tagged `sha-<short commit>` (see Docker Hub → Tags). On the server, set the tag in `.env` and restart:

```bash
# .env
API_TAG=sha-1a2b3c4
WEB_TAG=latest
```

```bash
docker compose up -d
```

Set it back to `latest` once the fix is deployed. Note: rolling the API back does not undo database migrations that the newer version applied.

---

## Operations

```bash
docker compose ps                      # status + health
docker compose logs -f crm-api         # API logs (also crm-web, postgres)
docker compose restart crm-api

# Database backup / restore
docker compose exec -T postgres pg_dump -U crm crm | gzip > crm-$(date +%F).sql.gz
gunzip -c crm-2026-01-31.sql.gz | docker compose exec -T postgres psql -U crm crm

# Open a psql shell
docker compose exec postgres psql -U crm crm
```

Container logs are capped at 3 × 10 MB per service. Database data lives in the `stackdot-crm_pgdata` volume — `docker compose down` keeps it; `docker compose down -v` **deletes it**.

### Troubleshooting

| Symptom | Check |
|---|---|
| Users are logged out on every refresh | `COOKIE_SECURE=true` while serving over http → set `false`, `docker compose up -d` |
| `crm-api` restarting | `docker compose logs crm-api` — usually a failed migration or wrong DB password |
| `pull access denied` on the server | Repos are private → `docker login -u jeeejagani` on the server (CI does this automatically) |
