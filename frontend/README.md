# Image Captioning - Frontend (Next.js + TypeScript + shadcn/ui)

UI for uploading images, generating captions, and browsing history.
Backed by a FastAPI server that supports guest mode (24h history) and accounts. Guest history is merged on sign-in.

## Features
- Upload image -> get caption (TorchScript model on backend)
- Guest session (no signup) with 24h history
- Sign in / register -> merge guest history automatically
- History grid with thumbnails (served by backend /images/{id})
- UI built with shadcn/ui, Tailwind, lucide icons
- Small auth helpers in src/lib

## Requirements
- Node.js 18+
- Backend running at http://127.0.0.1:8000

## Setup
```bash
cd frontend
pnpm i           # or: npm i / yarn
```

Configure the API base URL:
```
# .env.local already exists; update if needed
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Run the dev server:
```
pnpm dev         # or: npm run dev / yarn dev
# open http://localhost:3000
```

## Build
```bash
pnpm build
pnpm export      # outputs /out for static hosting
```

## Environment
- NEXT_PUBLIC_API_URL - API base URL (local: http://127.0.0.1:8000, production: /api)
