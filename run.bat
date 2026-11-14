@echo off
echo ==================================================
echo           CompiLab - Invocador Unificado          
echo ==================================================

if "%1"=="docker" goto run_docker
if "%1"=="--docker" goto run_docker

echo Iniciando en modo local...

echo [1/2] Levantando Backend FastAPI en segundo plano...
start "CompiLab Backend" cmd /k "cd backend && if not exist .venv python -m venv .venv && call .venv\Scripts\activate.bat && pip install -r requirements.txt && uvicorn compilab.api.main:app --reload --port 8000"

echo [2/2] Levantando Frontend React + Vite...
start "CompiLab Frontend" cmd /k "cd frontend && if not exist node_modules call npm.cmd install && call npm.cmd run dev"

echo -> Backend:  http://localhost:8000/docs
echo -> Frontend: http://localhost:5173
goto end

:run_docker
echo Levantando con Docker Compose...
docker compose up --build
goto end

:end
