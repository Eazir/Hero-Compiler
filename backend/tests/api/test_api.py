"""Pruebas de endpoints de la API FastAPI."""

from compilab.api.routes import compile_code, health
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
    # La fase léxica es real y tiene los tokens correspondientes
    lexical = res.phases[0]
    assert lexical.status == "ok"
    assert lexical.output is not None
    tokens = lexical.output["tokens"]
    assert len(tokens) >= 5


def test_compile_error_lexico_e101() -> None:
    res = compile_code(CompileRequest(source="a = @"))
    assert res.ok is False
    assert res.error is not None
    assert res.error.code == "E-101"
    assert res.error.span is not None
    assert res.error.span.line == 1
    assert res.error.span.col == 5
    assert res.phases[0].status == "error"
    assert res.phases[1].status == "skipped"


def test_compile_error_lexico_e102() -> None:
    res = compile_code(CompileRequest(source="a = 3b"))
    assert res.ok is False
    assert res.error is not None
    assert res.error.code == "E-102"
    assert res.error.span is not None
    assert res.error.span.line == 1
    assert res.error.span.col == 5


def test_compile_error_lexico_e103() -> None:
    res = compile_code(CompileRequest(source="a = 2147483648"))
    assert res.ok is False
    assert res.error is not None
    assert res.error.code == "E-103"
    assert res.error.span is not None
    assert res.error.span.line == 1
    assert res.error.span.col == 5


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
