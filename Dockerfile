FROM node:20-alpine AS landing-builder
WORKDIR /build-landing
COPY landing/package*.json ./
RUN npm install
COPY landing/ ./
RUN npm run build

FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY fixtures/ ./fixtures/
COPY --from=frontend-builder /build/dist ./frontend/dist
COPY --from=landing-builder /build-landing/dist ./landing/dist

# Create storage directories
RUN mkdir -p /app/data /app/storage/audio

ENV PYTHONPATH=/app/backend
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
