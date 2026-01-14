############################
# ---------- Frontend ----------
############################
FROM node:18-alpine AS fe
WORKDIR /app/frontend

ENV NODE_OPTIONS=--max_old_space_size=4096

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./

# Frontend calls API via /api
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN NODE_ENV=production npm run build


############################
# ---------- Backend ----------
############################
FROM python:3.11-slim AS be
WORKDIR /app

# Install git + git-lfs
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    git-lfs \
 && git lfs install \
 && rm -rf /var/lib/apt/lists/*

# Install python deps
COPY backend/requirements.txt /app/backend/requirements.txt
WORKDIR /app/backend

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.4.1 torchvision==0.19.1 \
 && pip install --no-cache-dir -r requirements.txt

# Copy backend source (includes LFS pointer files)
WORKDIR /app
COPY backend /app/backend

# 🔴 CRITICAL: pull real LFS files (models >180MB)
RUN cd /app/backend && git lfs pull


############################
# ---------- Final Runtime ----------
############################
FROM python:3.11-slim
WORKDIR /app

ENV PORT=8080

# Runtime packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    ca-certificates \
    postgresql \
    postgresql-contrib \
 && rm -rf /var/lib/apt/lists/*

# Copy Python + backend
COPY --from=be /usr/local /usr/local
COPY --from=be /app/backend /app/backend

# Copy built frontend (static UI)
COPY --from=fe /app/frontend/out /usr/share/nginx/html

# Configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY scripts/start-postgres.sh /app/scripts/start-postgres.sh
RUN chmod +x /app/scripts/start-postgres.sh

# Postgres data
ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p "$PGDATA" && chown -R postgres:postgres /var/lib/postgresql

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

CMD ["/usr/bin/supervisord","-n","-c","/etc/supervisor/conf.d/supervisord.conf"]
