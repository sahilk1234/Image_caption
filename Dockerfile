# ---------- Build frontend ----------
FROM node:18-alpine AS fe
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# Build a static Next.js app (App Router is fine)
RUN npm run build

# ---------- Build backend ----------
FROM python:3.11-slim AS be
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---------- Final image with Nginx + Uvicorn ----------
FROM debian:bookworm-slim
# system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create app dirs
WORKDIR /app
RUN mkdir -p /var/log/supervisor

# Copy backend virtualenv/site-packages
COPY --from=be /usr/local /usr/local
COPY backend /app/backend

# Copy frontend static build to Nginx html
# Next.js outputs to .next; for static export use "next build" + "next export".
# If you use next export:
#   - add "export": "next export" in package.json, then RUN npm run export
#   - and change copy to: COPY --from=fe /app/frontend/out /usr/share/nginx/html
# If you serve Next's .next directly, use next start (needs node). To keep single process,
# we’ll serve static export. So prefer "next export".
COPY --from=fe /app/frontend/out /usr/share/nginx/html

# Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Supervisor to run both nginx and uvicorn
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Koyeb sets $PORT for the public listener; Nginx must listen on it
ENV PORT=8080
EXPOSE 8080

# Healthcheck (optional; Koyeb also has its own)
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fsS http://127.0.0.1:$PORT/healthz || exit 1

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
