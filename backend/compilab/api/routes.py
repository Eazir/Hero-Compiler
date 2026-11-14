"""Rutas HTTP de la API de CompiLab."""
import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from compilab.contract.models import CompileRequest, CompileResponse

router = APIRouter(prefix="/api", tags=["compilab"])

FIXTURES_DIR = Path(__file__).resolve().parents[3] / "contract" / "fixtures"


def _load_fixture(filename: str) -> dict[str, Any]:
    fixture_path = FIXTURES_DIR / filename
    if not fixture_path.exists():
        # Fallback if executed from inside backend
        alt_path = Path("contract/fixtures") / filename
        if alt_path.exists():
            fixture_path = alt_path
        else:
            alt_path2 = Path("../contract/fixtures") / filename
            if alt_path2.exists():
                fixture_path = alt_path2
    return json.loads(fixture_path.read_text(encoding="utf-8"))


@router.get("/health")
def health() -> dict[str, str]:
    """Comprueba que el backend está vivo y funcionando."""
    return {"status": "ok"}


@router.post("/compile", response_model=CompileResponse)
def compile_code(req: CompileRequest) -> CompileResponse:
    """Compila un programa fuente y devuelve la traza de las 7 fases."""
    src = req.source.strip()

    # En F0 se devuelven fixtures correspondientes para desbloquear el desarrollo
    if "+ 2" in src or "+2" in src:
        data = _load_fixture("err_syntactic.json")
    elif "d" in src:
        data = _load_fixture("err_semantic.json")
    else:
        data = _load_fixture("ok_basic.json")

    return CompileResponse.model_validate(data)
