"""Pruebas unitarias completas del análisis semántico (F3 / BE-3)."""

from typing import Tuple

import pytest

from compilab.compiler.errors import CompileError
from compilab.compiler.lexer import tokenize
from compilab.compiler.parser import parse
from compilab.compiler.semantic import SemanticInfo, analyze
from compilab.compiler.tracer import Tracer


def run_semantic(src: str) -> Tuple[SemanticInfo, Tracer]:
    t = Tracer()
    tokens = tokenize(src, t)
    ast = parse(tokens, t)
    info = analyze(ast, t)
    return info, t


def test_uso_antes_de_definir() -> None:
    with pytest.raises(CompileError) as exc_info:
        run_semantic("a = d + 1")
    err = exc_info.value
    assert err.code == "E-301"
    assert err.span is not None
    assert err.span.col == 5
    assert len(err.fixes) > 0
    assert err.fixes[0]["kind"] == "insert_assignment"


def test_autoreferencia_sin_valor_previo() -> None:
    with pytest.raises(CompileError) as exc_info:
        run_semantic("a = a + 1")
    assert exc_info.value.code == "E-301"


def test_reasignacion_valida() -> None:
    info, _ = run_semantic("a = 1\na = a + 1")
    assert "a" in info.symbols
    assert info.symbols["a"].uses == 1


def test_variable_no_usada_genera_advertencia() -> None:
    info, _ = run_semantic("a = 5\nprint(1)")
    assert [w.code for w in info.warnings] == ["W-301"]


def test_caso_de_referencia_valido() -> None:
    src = "a = 5\nb = 3\nc = a + b * 2\nprint(c)"
    info, tracer = run_semantic(src)
    assert len(info.symbols) == 3
    assert info.symbols["a"].uses == 1
    assert info.symbols["b"].uses == 1
    assert info.symbols["c"].uses == 1
    assert len(info.warnings) == 0
    assert len(tracer.steps) > 0


def test_print_variable_no_declarada() -> None:
    with pytest.raises(CompileError) as exc_info:
        run_semantic("print(x)")
    assert exc_info.value.code == "E-301"
