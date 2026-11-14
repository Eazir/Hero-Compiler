"""Punto de entrada principal de la aplicación FastAPI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from compilab.api.routes import router

app = FastAPI(
    title="CompiLab API",
    description="Simulador interactivo de un compilador aritmético",
    version="1.0.0",
)

# Configuración de CORS para desarrollo y Docker
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:80",
        "http://localhost",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
