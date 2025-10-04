# Image Captioning – Frontend (Next.js + TypeScript + shadcn/ui)

UI for uploading images, generating captions, and browsing history.
Backed by a FastAPI server that supports **guest mode** (24h history) and **accounts** (history persists). Guest history is merged into your account on sign-in.

## ✨ Features
- Upload image → get caption (TorchScript model on backend)
- Guest session (no signup) with 24h history
- Sign in / Register → merge guest history automatically
- History grid with thumbnails (served by backend `/images/{id}`)
- Clean UI with shadcn/ui, Tailwind, lucide icons
- Small `useAuth` hook + cookie/localStorage token helpers

## 🚀 Getting Started

### 1) Prereqs
- Backend running at `http://127.0.0.1:8000` (see repo’s root/`backend` README)

### 2) Install & Run
```bash
# from /frontend
pnpm i           # or: npm i / yarn
cp .env.local.example .env.local  # if you have an example file
# ensure it points to your backend:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

pnpm dev         # or: npm run dev / yarn dev
# open http://localhost:3000
