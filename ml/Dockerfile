# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

LABEL maintainer="ecoVolt-finder Team"
LABEL description="ecoVolt-finder ML / Data / Maps FastAPI Service"

# ── System deps ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /service

# ── Python deps ───────────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
COPY app/     ./app/
COPY routers/ ./routers/

# ── Contract example payloads (read at startup for stub responses) ─────────────
# The contracts/ dir is mounted at /contracts relative to this service in the
# docker-compose setup. For standalone builds, we copy a snapshot here.
COPY ../contracts/examples/ ./contracts/examples/

# ── Runtime config ────────────────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LOG_FORMAT=json \
    HOST=0.0.0.0 \
    PORT=8000

EXPOSE 8000

# ── Health check ──────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# ── Entrypoint ────────────────────────────────────────────────────────────────
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
