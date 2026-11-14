FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requerimientos e instalar
COPY backend/requirements.txt backend/requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Copiar fixtures de contrato y código backend
COPY contract /contract
COPY backend/compilab /app/compilab
COPY backend/tests /app/tests
COPY backend/pyproject.toml /app/

# Variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "compilab.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
