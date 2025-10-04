# Image Captioning – Monorepo

Full-stack app for captioning images with a small TorchScript model, guest sessions, and user accounts.
- **Frontend**: Next.js + TypeScript + shadcn/ui
- **Backend**: FastAPI + SQLModel (SQLite) + PyTorch (TorchScript)
- **Auth**: Guest token (cookie) + Bearer token; guest history is kept 24h and merged on sign-in.

## Repo Structure
