# ---------- Build frontend ----------
FROM node:18-alpine AS fe
WORKDIR /app/frontend

# Prevent memory issues in CI
ENV NODE_OPTIONS=--max_old_space_size=4096
ENV NODE_ENV=production

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./

# If your frontend expects env vars, provide safe defaults
# (adjust names if needed)
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

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

# Copy backend source (NO git / lfs here)
WORKDIR /app
COPY backend /app/backend

# ---------- Final runtime ----------
FROM python:3.11-slim
WORKDIR /app

ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor curl ca-certificates \
      postgresql postgresql-contrib \
 && rm -rf /var/lib/apt/lists/*

# Copy python + deps
COPY --from=be /usr/local /usr/local
COPY --from=be /app/backend /app/backend

# Frontend static output
COPY --from=fe /app/frontend/out /usr/share/nginx/html

# Configs + scripts
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY scripts/start-postgres.sh /app/scripts/start-postgres.sh
RUN chmod +x /app/scripts/start-postgres.sh

ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p "$PGDATA" && chown -R postgres:postgres /var/lib/postgresql

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

CMD ["/usr/bin/supervisord","-n","-c","/etc/supervisor/conf.d/supervisord.conf"]
