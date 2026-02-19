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

- `POST /events`
- `GET /events/{event_id}`
- `POST /events/{event_id}/resync`
- `GET /jobs/{job_id}`
- `POST /guest/events/resolve`
- `POST /guest/matches`
- `GET /guest/matches/{query_id}`
- `GET /health`

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
