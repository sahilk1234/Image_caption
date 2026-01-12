# ---------- Build frontend ----------
FROM node:18-alpine AS fe
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# ---------- Build backend (Python deps) ----------
FROM python:3.11-slim AS be
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      git git-lfs \
 && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt

WORKDIR /app/backend
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
      torch==2.4.1 torchvision==0.19.1 \
 && pip install --no-cache-dir -r requirements.txt

WORKDIR /app
COPY . /app
RUN if [ -d /app/.git ]; then git lfs install && git lfs pull; else echo "No .git directory; skipping git lfs pull"; fi

# ---------- Final runtime ----------
FROM python:3.11-slim
WORKDIR /app

# Koyeb should expose 8080 -> nginx listens on 8080
ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor curl ca-certificates \
      postgresql postgresql-contrib \
 && rm -rf /var/lib/apt/lists/*

# Copy python + deps from builder
COPY --from=be /usr/local /usr/local
COPY --from=be /app/backend /app/backend

# Frontend static output
COPY --from=fe /app/frontend/out /usr/share/nginx/html

# Configs + scripts
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY scripts/start-postgres.sh /app/scripts/start-postgres.sh
RUN chmod +x /app/scripts/start-postgres.sh

# Postgres data dir (IMPORTANT: mount a volume here on Koyeb if you want persistence)
ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p "$PGDATA" && chown -R postgres:postgres /var/lib/postgresql

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

CMD ["/usr/bin/supervisord","-n","-c","/etc/supervisor/conf.d/supervisord.conf"]
