# Satu image: build frontend, lalu FastAPI menyajikan API + berkas statis.

FROM node:24-alpine AS web
WORKDIR /app
COPY shared ./shared
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY shared ./shared
COPY backend ./backend
COPY --from=web /app/frontend/dist ./frontend/dist
RUN useradd --create-home rambu && mkdir -p /data && chown rambu /data
USER rambu
ENV RAMBU_DATABASE_URL=sqlite:////data/rambu.db RAMBU_KEYS_DIR=/data/keys
EXPOSE 8000
# PORT diisi platform (Render, Railway, dsb.); bawaan 8000.
CMD ["sh", "-c", "python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
