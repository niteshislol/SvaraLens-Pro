# SvaraLens Pro — Deployment & Operations Guide

## 1. System Requirements

- **Operating System:** Linux (Ubuntu 20.04+), macOS (Apple Silicon or Intel), or Windows (WSL2 recommended).
- **Python:** 3.10, 3.11, or 3.12+ (tested up to Python 3.15).
- **Node.js:** 18.x or 20.x LTS.
- **Audio Codec Libraries:** FFmpeg 4.4+ (`ffmpeg` and `ffprobe` in `$PATH`).
- **RAM / CPU:** Minimum 4 GB RAM, 2 CPU cores (8 GB recommended for concurrent DSP framing).

---

## 2. Environment Configuration

Copy the sample environment file and configure credentials:

```bash
cp .env.example .env
```

### Essential Environment Variables

```ini
# Core Configuration
SVARALENS_ENV=development
SVARALENS_HOST=0.0.0.0
SVARALENS_PORT=8000
DATABASE_URL=sqlite:///./data/svaralens.db

# Gnani.ai / Vachana API Credentials
GNANI_API_KEY=vach_your_api_key_here
GNANI_BASE_URL=https://api.vachana.ai

# Execution Mode: set to false to use live Gnani synthesis and transcription
GNANI_USE_MOCK=false

# Acoustic DSP Thresholds
CLIPPING_AMPLITUDE_THRESHOLD=0.99
SILENCE_TOP_DB=35.0
SILENCE_INTERNAL_GAP_SECONDS=1.2
SILENCE_LEADING_SECONDS=1.5
TRUNCATION_TAIL_RMS_DBFS_THRESHOLD=-40.0
TRUNCATION_TAIL_ENERGY_RATIO_THRESHOLD=0.50
```

---

## 3. Local Development Setup

### 3.1 Backend Setup

```bash
# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install Python dependencies
pip install -r backend/requirements.txt

# 3. Seed initial evaluation scenarios (30-case Indic corpus)
PYTHONPATH=backend python3 scripts/demo_data.py

# 4. Start Uvicorn development server
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The FastAPI OpenAPI documentation is available at `http://localhost:8000/docs`.

### 3.2 Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite dev server with proxy to :8000
npm run dev
```

The frontend will be accessible at `http://localhost:5173`.

---

## 4. Production Single-Process Deployment

In production, FastAPI can directly serve the compiled React SPA static assets:

```bash
# 1. Compile frontend assets
cd frontend
npm run build
cd ..

# 2. Run high-performance production server
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 5. Containerized Deployment (Docker)

### 5.1 Dockerfile
A multi-stage Dockerfile is provided at the repository root:

```dockerfile
# Stage 1: Build React UI
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with FFmpeg
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY scripts/ /app/scripts/
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

ENV PYTHONPATH=/app/backend
ENV GNANI_USE_MOCK=false
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.2 Build & Run Docker Container

```bash
# Build the image
docker build -t svaralens-pro:latest .

# Run container with mounted data volume
docker run -d \
  -p 8000:8000 \
  --name svaralens-pro \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  svaralens-pro:latest
```

---

## 6. Health Checks & Monitoring

SvaraLens exposes two monitoring endpoints:
- `GET /health`: Comprehensive status including Gnani connectivity, execution mode (`LIVE` vs `MOCK`), database scenario count, and active capsule count.
- `GET /api/analytics/suite/{id}`: Live quality gating analytics for deployment pipelines.
