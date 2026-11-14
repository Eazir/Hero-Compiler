# CompiLab

> Simulador interactivo de un compilador aritmético (MiniArit) paso a paso en 7 fases hasta código binario y ejecución en máquina virtual.

## Estructura del Monorepo

```text
compilab/
  AGENTS.md                                             # Reglas y directrices de desarrollo
  Hoja de ruta — Simulador de compilador (CompiLab).md  # Fases F0-F10
  Plan de acción Back — CompiLab (Python).md            # Arquitectura del backend
  Plan de acción Front — CompiLab (React).md            # Arquitectura del frontend
  contract/
    fixtures/                                           # Fixtures JSON (fuente de verdad compartida)
      ok_basic.json                                     # Caso feliz (c = a + b * 2)
      err_semantic.json                                 # Error E-301 (variable no declarada)
      err_syntactic.json                                # Error E-201 (falta operando)
  backend/                                              # Python 3.11 + FastAPI
    compilab/
      api/                                              # main.py, routes.py, limits.py
      contract/                                         # models.py (Pydantic v2)
      compiler/                                         # errors, tracer, lexer, parser, semantic, ir,
                                                        # optimizer, assembler, encoder, vm, pipeline
    tests/                                              # contract/, api/, unit/, golden/, property/
    Dockerfile
    requirements.txt / requirements-dev.txt
    pyproject.toml
  frontend/                                             # React 18 + Vite + TypeScript estricto
    src/
      api/                                              # client.ts, schema.ts (Zod), mocks/ (MSW)
      domain/                                           # blocks, serialize, sourceMap, fixes, predictions
      state/                                            # Zustand stores
      features/                                         # editor, arena, result, error, game
      ui/                                               # Componentes base (Button, Panel, Chip, Block)
      i18n/es.ts                                        # Textos centralizados en español
      styles/tokens.css                                 # Variables y sistema de diseño
    Dockerfile
    nginx.conf
    package.json
  docker-compose.yml                                    # Orquestación con Docker
  run.sh / run.bat                                      # Invocadores automáticos
```

## Ejecución con Docker (Recomendado)

Para levantar el entorno completo (backend en `:8000` y frontend en `:5173`):

```bash
docker compose up --build
```

O usando los scripts:
- Linux / macOS: `./run.sh docker`
- Windows: `run.bat docker`

Acceso:
- **Frontend Web:** [http://localhost:5173](http://localhost:5173)
- **API Swagger / Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

## Ejecución en Desarrollo Local

### 1. Backend (Python 3.11+)

```bash
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

pip install -r requirements.txt -r requirements-dev.txt
uvicorn compilab.api.main:app --reload --port 8000
```

Pruebas del backend:
```bash
pytest -q
pytest --cov=compilab.compiler --cov-fail-under=90
ruff check .
mypy compilab
```

### 2. Frontend (Node.js 20+)

```bash
cd frontend
npm install
npm run dev
```

Pruebas del frontend:
```bash
npm test
npm run lint
```
