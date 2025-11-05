# ---------- Build frontend ----------
FROM node:18-alpine AS fe
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# Next 15: with `output: "export"` only `next build` is needed; output -> /app/frontend/out
RUN npm run build

# ---------- Build backend wheels/site-packages ----------
FROM python:3.11-slim AS be
WORKDIR /app/backend
# (optional) system deps if you ever need them:
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./
# Use CPU wheels for torch to keep the image smaller/portable on Koyeb
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
      torch==2.4.1 torchvision==0.19.1 \
 && pip install --no-cache-dir -r requirements.txt

# ---------- Final image: keep same Python base to match glibc ----------
FROM python:3.11-slim
WORKDIR /app
ENV PORT=8080

# system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy Python from build stage (ensures ABI/glibc match)
COPY --from=be /usr/local /usr/local
# App code
COPY backend /app/backend

# Frontend static export
COPY --from=fe /app/frontend/out /usr/share/nginx/html

# Nginx and Supervisor configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080

# Optional container healthcheck (Koyeb can also do HTTP checks)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

CMD ["/usr/bin/supervisord","-n","-c","/etc/supervisor/conf.d/supervisord.conf"]
