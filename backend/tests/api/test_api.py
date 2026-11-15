"""Pruebas de endpoints de la API FastAPI."""

import pytest

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
    # La fase léxica es real
    lexical = res.phases[0]
    assert lexical.status == "ok"
    assert lexical.output is not None
    assert len(lexical.output["tokens"]) >= 5

    # La fase sintáctica es real
    syntactic = res.phases[1]
    assert syntactic.status == "ok"
    assert syntactic.output is not None
    assert "ast" in syntactic.output


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


@pytest.mark.parametrize(
    "source, code, line, col",
    [
        ("c = + 2", "E-201", 1, 5),
        ("c = 1 +", "E-201", 1, 8),
        ("c = (1 + 2", "E-202", 1, 11),
        ("c 5", "E-203", 1, 3),
        ("5 = a", "E-204", 1, 1),
        ("print c", "E-205", 1, 7),
    ],
)
def test_compile_errores_sintacticos_e2xx(source: str, code: str, line: int, col: int) -> None:
    res = compile_code(CompileRequest(source=source))
    assert res.ok is False
    assert res.error is not None
    assert res.error.code == code
    assert res.error.span is not None
    assert (res.error.span.line, res.error.span.col) == (line, col)
    assert res.phases[0].status == "ok"
    assert res.phases[1].status == "error"
    assert res.phases[2].status == "skipped"


def test_compile_error_semantico() -> None:
    res = compile_code(CompileRequest(source="a = d + 1"))
    assert res.ok is False
    assert res.error is not None
    assert res.error.code == "E-301"
