# GrabPic v1 (Local-First)

This repository now contains a parallel migration to a monorepo architecture while preserving the legacy prototype:

- Legacy prototype (unchanged): `server.js`, `face_match_local.py`
- New backend: `backend/` (FastAPI + PostgreSQL + pgvector + worker queue)
- New frontend: `frontend/` (Next.js App Router + TypeScript + Tailwind)
- Local orchestration: `infra/docker-compose.yml`

## Core Flow

1. Photographer creates an event with a public Google Drive folder link.
2. Backend queues sync job and processes photos/faces asynchronously.
3. Guest opens event link, enters guest code, uploads selfie.
4. Worker matches selfie to best face cluster and returns photos.

## Run Locally with Docker

1. Set `backend/.env.example` values (especially `GOOGLE_DRIVE_API_KEY`).
2. Run:

```bash
cd infra
docker compose up --build
```

3. Open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1/health`

## Root-First Entrypoints

If you want everything runnable from project root (without `cd backend` or `cd infra`):

```bash
docker compose up -d --build
```

PowerShell helpers:

```powershell
./start_grabpic.ps1
./stop_grabpic.ps1
```

Python helpers from root:

```bash
python run_migrations.py
python run_api.py
python run_worker.py
```

## Backend API

Base path: `/api/v1`

- `POST /auth/login` (no `/api/v1` prefix)
- `POST /events`
- `PATCH /events/{event_id}`
- `DELETE /events/{event_id}`
- `GET /events/{event_id}/photos`
- `GET /events/{event_id}/guests`
- `GET /events/{event_id}`
- `POST /events/{event_id}/resync`
- `GET /jobs/{job_id}`
- `POST /jobs/{job_id}/cancel`
- `POST /guest/events/resolve`
- `POST /guest/events/{event_id}/join`
- `POST /guest/matches`
- `GET /guest/matches/{query_id}`
- `GET /admin/users`
- `PATCH /admin/users/{user_id}/role`
- `GET /admin/stats`
- `GET /health`

## Local RBAC (Dev Mode)

Local hardcoded auth is enabled only when:

```env
APP_ENV=local
```

### Login Example

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@grabpic.com","password":"password123"}'
```

### Local Users

- `superadmin@grabpic.com` / `password123` -> `SUPER_ADMIN`
- `studio1@grabpic.com` / `password123` -> `PHOTOGRAPHER`
- `studio2@grabpic.com` / `password123` -> `PHOTOGRAPHER`
- `guest1@grabpic.com` / `password123` -> `GUEST`
- `guest2@grabpic.com` / `password123` -> `GUEST`

### Permissions

- `SUPER_ADMIN`: full access, list users, change roles, global stats, all events.
- `PHOTOGRAPHER`: create/update/delete own events, run sync, view own event photos and guest list.
- `GUEST`: join events, upload selfie, view only their own matched results.

## Testing

Backend tests:

```bash
cd backend
pytest
```

Frontend e2e tests:

```bash
cd frontend
npm run test:e2e
```
