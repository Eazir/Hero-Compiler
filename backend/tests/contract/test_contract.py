"""Pruebas de validación de contrato para todas las fixtures compartidas."""
import json
import pathlib
import pytest
from compilab.contract.models import CompileResponse

FIXTURES_DIR = pathlib.Path(__file__).resolve().parents[3] / "contract" / "fixtures"
FIXTURES = sorted(FIXTURES_DIR.glob("*.json"))


@pytest.mark.parametrize("path", FIXTURES, ids=lambda p: p.stem)
def test_fixture_cumple_el_esquema(path: pathlib.Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    validated = CompileResponse.model_validate(data)
    assert validated.version == 1
    assert len(validated.phases) == 7
