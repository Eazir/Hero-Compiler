"""Rutas HTTP de la API de Hero-Compiler (CompiLab)."""

from fastapi import APIRouter

from compilab.compiler.pipeline import compile_source
from compilab.contract.models import CompileRequest, CompileResponse

router = APIRouter(prefix="/api", tags=["compilab"])


@router.get("/health")
def health() -> dict[str, str]:
    """Comprueba que el backend está vivo y funcionando."""
    return {"status": "ok"}


@router.post("/compile", response_model=CompileResponse)
def compile_code(req: CompileRequest) -> CompileResponse:
    """Compila un programa fuente ejecutando las 7 fases reales y la VM."""
    return compile_source(req.source, optimize=req.optimize)
