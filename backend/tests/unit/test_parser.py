"""Pruebas unitarias completas del analizador sintáctico (F2 / BE-2)."""

import pytest

from compilab.compiler.errors import CompileError
from compilab.compiler.lexer import tokenize
from compilab.compiler.parser import parse, to_sexpr
from compilab.compiler.tracer import Tracer


def sexpr(src: str) -> str:
    tokens = tokenize(src, Tracer())
    ast = parse(tokens, Tracer())
    return to_sexpr(ast)


@pytest.mark.parametrize(
    "src, esperado",
    [
        ("c = a + b * 2", "(assign c (+ a (* b 2)))"),
        ("c = (a + b) * 2", "(assign c (* (+ a b) 2))"),
        ("c = a - b - 1", "(assign c (- (- a b) 1))"),
        ("c = -a * 2", "(assign c (* (neg a) 2))"),
        ("print(1 + 2)", "(print (+ 1 2))"),
        ("x = -(-y)", "(assign x (neg (neg y)))"),
        ("c = (a + b) * (c - d)", "(assign c (* (+ a b) (- c d)))"),
        (
            "a = 5\nb = 3\nprint(a + b)",
            "(program (assign a 5) (assign b 3) (print (+ a b)))",
        ),
    ],
)
def test_ast(src: str, esperado: str) -> None:
    assert sexpr(src) == esperado


@pytest.mark.parametrize(
    "src, codigo, linea, col",
    [
        ("c = + 2", "E-201", 1, 5),
        ("c = 1 +", "E-201", 1, 8),
        ("c = (1 + 2", "E-202", 1, 11),
        ("c 5", "E-203", 1, 3),
        ("5 = a", "E-204", 1, 1),
        ("print c", "E-205", 1, 7),
    ],
)
def test_errores_sintacticos(src: str, codigo: str, linea: int, col: int) -> None:
    with pytest.raises(CompileError) as exc_info:
        sexpr(src)
    err = exc_info.value
    assert err.span is not None
    assert (err.code, err.span.line, err.span.col) == (codigo, linea, col)


def test_ids_estables() -> None:
    a = parse(tokenize("c = a + b * 2", Tracer()), Tracer())
    b = parse(tokenize("c = a + b * 2", Tracer()), Tracer())
    assert a == b


def test_traza_sintactica_registra_nodos_y_aristas() -> None:
    tracer = Tracer()
    tokens = tokenize("c = a + b * 2", Tracer())
    parse(tokens, tracer)

    ops = [op for step in tracer.steps for op in step.ops]
    node_ops = [op for op in ops if op.get("op") == "node"]
    edge_ops = [op for op in ops if op.get("op") == "edge"]

    assert len(node_ops) > 0
    assert len(edge_ops) > 0


def test_ast_to_dict_serializa_correctamente() -> None:
    tokens = tokenize("a = 5", Tracer())
    ast = parse(tokens, Tracer())
    data = ast.to_dict()

    assert data["kind"] == "program"
    assert "children" in data
    assert len(data["children"]) == 1
    assert data["children"][0]["kind"] == "assign"
    assert data["children"][0]["name"] == "a"
