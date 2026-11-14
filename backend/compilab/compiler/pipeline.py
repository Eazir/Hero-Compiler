"""Orquestador del pipeline del compilador."""
from compilab.contract.models import CompileResponse


def compile_source(source: str, optimize: bool = True) -> CompileResponse:
    """Ejecuta el pipeline completo de las 7 fases."""
    raise NotImplementedError("Implementado en F1-F5")
