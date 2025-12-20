# ---------- Build frontend ----------
FROM node:18-alpine AS fe
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# ---------- Build backend wheels/site-packages ----------
FROM python:3.11-slim AS be
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ---------- Final image ----------
FROM python:3.11-slim
WORKDIR /app
ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor curl ca-certificates \
      postgresql postgresql-contrib \
  && rm -rf /var/lib/apt/lists/*

# Copy Python deps
COPY --from=be /usr/local /usr/local

# App code
COPY backend /app/backend

# Frontend static export
COPY --from=fe /app/frontend/out /usr/share/nginx/html

# Nginx and Supervisor configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Postgres init/start script
COPY start-postgres.sh /usr/local/bin/start-postgres.sh
RUN chmod +x /usr/local/bin/start-postgres.sh

# Data mount (attach Koyeb Volume here)
RUN mkdir -p /data/postgres && chown -R postgres:postgres /data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

CMD ["/usr/bin/supervisord","-n","-c","/etc/supervisor/conf.d/supervisord.conf"]
