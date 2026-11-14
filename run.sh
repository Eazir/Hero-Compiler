#!/usr/bin/env bash
set -e

echo "=================================================="
echo "          CompiLab - Invocador Unificado          "
echo "=================================================="

MODE="${1:-dev}"

if [ "$MODE" = "docker" ] || [ "$MODE" = "--docker" ]; then
    echo "Levantando con Docker Compose..."
    docker compose up --build
    exit 0
fi

echo "Iniciando en modo desarrollo local..."

# 1. Backend
echo "[1/2] Iniciando Backend FastAPI..."
cd backend
if [ ! -d ".venv" ]; then
    echo "Creando entorno virtual Python..."
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt -r requirements-dev.txt
uvicorn compilab.api.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 2. Frontend
echo "[2/2] Iniciando Frontend React + Vite..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Instalando paquetes npm..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT INT TERM

echo ""
echo "-> Backend corriendo en:  http://localhost:8000/docs"
echo "-> Frontend corriendo en: http://localhost:5173"
echo "Presiona Ctrl+C para detener ambos servicios."
wait

