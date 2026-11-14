"""Pruebas de endpoints de la API FastAPI."""
from compilab.api.routes import health, compile_code
from compilab.contract.models import CompileRequest


def test_health() -> None:
    res = health()
    assert res == {"status": "ok"}


def test_compile_devuelve_las_7_fases() -> None:
    res = compile_code(CompileRequest(source="a = 5\nprint(a)"))
    assert res.version == 1
    assert res.ok is True
    assert [p.id for p in res.phases] == [
        "lexical",
        "syntactic",
        "semantic",
        "ir",
        "optimization",
        "assembly",
        "binary",
    ]


def test_compile_error_semantico() -> None:
    res = compile_code(CompileRequest(source="a = d + 1"))
    assert res.ok is False
    assert res.error is not None
    assert res.error.code == "E-301"


def test_compile_error_sintactico() -> None:
    res = compile_code(CompileRequest(source="c = + 2"))
    assert res.ok is False
    assert res.error is not None
    assert res.error.code == "E-201"
