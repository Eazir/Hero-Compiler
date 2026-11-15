"""Pruebas unitarias completas de código intermedio (TAC) y optimización (F4 / BE-4)."""

import pytest

from compilab.compiler.errors import CompileError
from compilab.compiler.ir import lower
from compilab.compiler.lexer import tokenize
from compilab.compiler.optimizer import optimize
from compilab.compiler.parser import parse
from compilab.compiler.tracer import Tracer

PROGRAMA = "a = 5\nb = 3\nc = a + b * 2\nprint(c)"


def ir_text(src: str, optimize_on: bool) -> list[str]:
    t = Tracer()
    tokens = tokenize(src, t)
    ast = parse(tokens, t)
    tac = lower(ast, t)
    opt = optimize(tac, t, enabled=optimize_on)
    return [str(i) for i in opt]


def test_intermedio_sin_optimizar() -> None:
    assert ir_text(PROGRAMA, False) == [
        "a = 5",
        "b = 3",
        "t1 = b * 2",
        "t2 = a + t1",
        "c = t2",
        "print c",
    ]


def test_optimizado_queda_en_print_11() -> None:
    assert ir_text(PROGRAMA, True) == ["print 11"]


def test_desbordamiento_en_plegado() -> None:
    with pytest.raises(CompileError) as exc_info:
        ir_text("a = 100000 * 100000", True)
    assert exc_info.value.code == "E-401"


def test_negacion_unaria_en_tac() -> None:
    tac = ir_text("a = -5\nprint(a)", False)
    assert "t1 = -5" in tac or "a = -5" in tac
    opt = ir_text("a = -5\nprint(a)", True)
    assert opt == ["print -5"]


def test_con_optimize_false_se_conservan_las_instrucciones() -> None:
    res = ir_text(PROGRAMA, False)
    assert len(res) == 6
