# Image Captioning - Monorepo

Full-stack app for captioning images with a small TorchScript model, guest sessions, and user accounts.
- Frontend: Next.js + TypeScript + shadcn/ui
- Backend: FastAPI + SQLModel (SQLite by default) + PyTorch (TorchScript)
- Auth: Guest token (cookie) + Bearer token; guest history kept 24h and merged on sign-in.

## Repo Structure
- backend/ - FastAPI API, auth, inference, database
- frontend/ - Next.js UI
- model/ - notebooks, artifacts, training data
- scripts/ - Postgres bootstrap for container runtime
- Dockerfile, nginx.conf, supervisord.conf - container build and runtime

## Live Demo
- UI: https://imagecaption.sahilkhadtare.com
- API: https://imagecaption.sahilkhadtare.com/api

## Quick Start (local)
1) Backend
- Follow `backend/README.md`.

2) Frontend
- Follow `frontend/README.md`.

## Model Artifacts
The backend needs TorchScript artifacts to run inference. Use the files in `model/artifacts` and copy them into `backend/artifacts`, or set `MODEL_TS`, `VOCAB_JSON`, and `CONFIG_JSON` to point to them.

See `model/README.md` for details.

## Docker (optional)
The Docker image builds the frontend as static assets and runs the backend behind nginx. If you use the container, make sure `backend/artifacts` is present in the build context or set artifact environment variables at runtime.

```bash
docker build -t image-caption .
docker run -p 8080:8080 image-caption
```

- UI: http://localhost:8080
- API: http://localhost:8080/api
