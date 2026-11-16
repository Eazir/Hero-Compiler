"""Rutas HTTP de la API de Hero-Compiler (CompiLab)."""

from typing import Any

from fastapi import APIRouter

from compilab.compiler.pipeline import compile_source
from compilab.contract.models import CompileRequest, CompileResponse

router = APIRouter(prefix="/api", tags=["compilab"])


@router.get("/health")
def health() -> dict[str, str]:
    """Comprueba que el backend está vivo y funcionando."""
    return {"status": "ok"}


@router.get("/examples")
def get_examples() -> list[dict[str, Any]]:
    """Devuelve 6 programas de ejemplo (3 válidos y 3 con error) para F6."""
    return [
        {
            "id": "ok_canonical",
            "title": "Caso Canónico Optimizable",
            "kind": "valid",
            "source": "a = 5\nb = 3\nc = a + b * 2\nprint(c)",
        },
        {
            "id": "ok_negation",
            "title": "Precedencia y Menos Unario",
            "kind": "valid",
            "source": "x = 10\ny = -x + 4 * 6\nprint(y)",
        },
        {
            "id": "ok_chain",
            "title": "Cadena de Variables",
            "kind": "valid",
            "source": "a = 4\nb = a * 3\nc = b - 2\nprint(c)",
        },
        {
            "id": "err_lexical",
            "title": "Error Léxico (E-101)",
            "kind": "error",
            "source": "a = 5 @ 2\nprint(a)",
        },
        {
            "id": "err_syntactic",
            "title": "Error Sintáctico (E-201)",
            "kind": "error",
            "source": "c = + 2\nprint(c)",
        },
        {
            "id": "err_semantic",
            "title": "Error Semántico (E-301)",
            "kind": "error",
            "source": "a = 5\nb = 3\nc = a + d * 2\nprint(c)",
        },
    ]


@router.post("/compile", response_model=CompileResponse)
def compile_code(req: CompileRequest) -> CompileResponse:
    """Compila un programa fuente ejecutando las 7 fases reales y la VM."""
    return compile_source(req.source, optimize=req.optimize)
