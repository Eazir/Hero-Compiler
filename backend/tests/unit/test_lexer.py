"""Pruebas unitarias completas del analizador léxico (F1 / BE-1)."""

import pytest

from compilab.compiler.errors import CompileError
from compilab.compiler.lexer import TokenType, tokenize
from compilab.compiler.tracer import Tracer


def kinds(src: str) -> list[tuple[str, str]]:
    toks = tokenize(src, Tracer())
    return [(t.type.name, t.lexeme) for t in toks if t.type.name not in ("NEWLINE", "EOF")]


@pytest.mark.parametrize(
    "src, esperado",
    [
        ("a = 5", [("ID", "a"), ("ASSIGN", "="), ("NUM", "5")]),
        (
            "c = a + b * 2",
            [
                ("ID", "c"),
                ("ASSIGN", "="),
                ("ID", "a"),
                ("PLUS", "+"),
                ("ID", "b"),
                ("STAR", "*"),
                ("NUM", "2"),
            ],
        ),
        ("print(c)", [("PRINT", "print"), ("LPAREN", "("), ("ID", "c"), ("RPAREN", ")")]),
        ("printer = 1", [("ID", "printer"), ("ASSIGN", "="), ("NUM", "1")]),
        (
            "x = -(1 - y)",
            [
                ("ID", "x"),
                ("ASSIGN", "="),
                ("MINUS", "-"),
                ("LPAREN", "("),
                ("NUM", "1"),
                ("MINUS", "-"),
                ("ID", "y"),
                ("RPAREN", ")"),
            ],
        ),
        (
            "total_1 = 42\nprint(total_1)",
            [
                ("ID", "total_1"),
                ("ASSIGN", "="),
                ("NUM", "42"),
                ("PRINT", "print"),
                ("LPAREN", "("),
                ("ID", "total_1"),
                ("RPAREN", ")"),
            ],
        ),
        ("_temp = 0", [("ID", "_temp"), ("ASSIGN", "="), ("NUM", "0")]),
        (
            "(a + b) * (c - d)",
            [
                ("LPAREN", "("),
                ("ID", "a"),
                ("PLUS", "+"),
                ("ID", "b"),
                ("RPAREN", ")"),
                ("STAR", "*"),
                ("LPAREN", "("),
                ("ID", "c"),
                ("MINUS", "-"),
                ("ID", "d"),
                ("RPAREN", ")"),
            ],
        ),
        (
            "x = 10\r\ny = 20",
            [
                ("ID", "x"),
                ("ASSIGN", "="),
                ("NUM", "10"),
                ("ID", "y"),
                ("ASSIGN", "="),
                ("NUM", "20"),
            ],
        ),
    ],
)
def test_tokens(src: str, esperado: list[tuple[str, str]]) -> None:
    assert kinds(src) == esperado


@pytest.mark.parametrize(
    "src, codigo, linea, col",
    [
        ("a = @", "E-101", 1, 5),
        ("a = 3b", "E-102", 1, 5),
        ("a = 2147483648", "E-103", 1, 5),
        ("a = 1\nb = #", "E-101", 2, 5),
        ("x = 100var", "E-102", 1, 5),
        ("z = 9999999999", "E-103", 1, 5),
        ("!x = 1", "E-101", 1, 1),
    ],
)
def test_errores_lexicos(src: str, codigo: str, linea: int, col: int) -> None:
    with pytest.raises(CompileError) as exc_info:
        tokenize(src, Tracer())
    err = exc_info.value
    assert err.span is not None
    assert (err.code, err.span.line, err.span.col) == (codigo, linea, col)


def test_criterio_c_igual_a_mas_b_por_dos() -> None:
    toks = tokenize("c = a + b * 2", Tracer())
    # 7 tokens visibles + NEWLINE + EOF = 9 tokens
    assert len(toks) == 9
    visible = [t for t in toks if t.type not in (TokenType.NEWLINE, TokenType.EOF)]
    assert len(visible) == 7
    assert toks[-2].type == TokenType.NEWLINE
    assert toks[-1].type == TokenType.EOF


def test_print_es_palabra_reservada_y_printer_es_id() -> None:
    t_print = tokenize("print", Tracer())
    assert t_print[0].type == TokenType.PRINT
    t_printer = tokenize("printer", Tracer())
    assert t_printer[0].type == TokenType.ID


def test_literal_maximo_es_valido() -> None:
    assert kinds("a = 2147483647")[-1] == ("NUM", "2147483647")


def test_la_traza_tiene_un_paso_por_token() -> None:
    t = Tracer()
    tokenize("a = 5", t)
    token_ops = [o for s in t.steps for o in s.ops if o.get("op") == "token"]
    assert len(token_ops) == 3


def test_error_registra_fail_en_traza() -> None:
    t = Tracer()
    with pytest.raises(CompileError) as exc_info:
        tokenize("a = @", t)
    assert exc_info.value.code == "E-101"
    assert len(t.steps) > 0
    last_step = t.steps[-1]
    assert len(last_step.ops) > 0
    assert last_step.ops[0]["op"] == "fail"
    assert last_step.ops[0]["code"] == "E-101"


def test_tokenize_sin_tracer_explicito() -> None:
    toks = tokenize("a = 5")
    assert len(toks) == 5
    assert toks[0].lexeme == "a"
