# ---------- Build frontend ----------
FROM node:20-alpine AS fe
WORKDIR /app/frontend

# Set API base for build-time (the frontend will call /api/*)
ENV NEXT_PUBLIC_API_URL=/api

COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# Build static Next site and export to /app/frontend/out
# (Make sure package.json has "build": "next build" and "export": "next export")
RUN npm run build && npm run export

# ---------- Build backend ----------
FROM python:3.12-slim AS be
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && pip uninstall -y psycopg2-binary || true
COPY backend /app/backend

# ---------- Final image with Nginx + Uvicorn ----------
FROM debian:bookworm-slim

# system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Create app dirs
WORKDIR /app
RUN mkdir -p /var/log/supervisor

# Copy backend (Python env from build stage)
COPY --from=be /usr/local /usr/local
COPY --from=be /app/backend /app/backend

# Copy frontend static export to Nginx html
COPY --from=fe /app/frontend/out /usr/share/nginx/html

# Nginx & Supervisor config
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Koyeb will connect to this port
ENV PORT=8080
EXPOSE 8080

# Healthcheck for the process
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
