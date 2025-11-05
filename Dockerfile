# ---------- Build frontend ----------
FROM node:18-alpine AS fe
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# Next.js 15: output: "export" makes `next build` write to /app/frontend/out
RUN npm run build
# ---------- Build backend ----------
FROM python:3.12-slim AS be
WORKDIR /app/backend
COPY backend/requirements.txt ./
# Install CPU-only PyTorch first (small & fast)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
      torch==2.4.1 torchvision==0.19.1 && \
    pip install --no-cache-dir -r requirements.txt

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
