"""Analizador sintáctico descendente recursivo de MiniArit (F2 / BE-2).

Construye un AST tipado e inmutable (@dataclass(frozen=True)) con identificadores de nodo
estables (n1, n2...), registrando trazas de reglas, shifts, nodos y aristas en el Tracer.
Genera los errores sintácticos E-201 a E-205 con ubicación precisa (línea y columna).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from compilab.compiler.errors import CompileError
from compilab.compiler.lexer import Token, TokenType
from compilab.compiler.tracer import Tracer
from compilab.contract.models import Focus, Span

# ---------------------------------------------------------------------------
# Nodos del AST
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AstNode:
    """Clase base inmutable para todos los nodos del AST."""

    id: str
    kind: str
    span: Span

    def to_dict(self) -> dict[str, Any]:
        raise NotImplementedError


@dataclass(frozen=True)
class ExprNode(AstNode):
    """Nodo base de expresión."""

    pass


@dataclass(frozen=True)
class NumNode(ExprNode):
    """Literal numérico entero."""

    value: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "num",
            "value": self.value,
            "label": str(self.value),
            "span": {"line": self.span.line, "col": self.span.col, "len": self.span.len},
            "children": [],
        }


@dataclass(frozen=True)
class VarNode(ExprNode):
    """Referencia a una variable."""

    name: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "var",
            "name": self.name,
            "label": self.name,
            "span": {"line": self.span.line, "col": self.span.col, "len": self.span.len},
            "children": [],
        }


@dataclass(frozen=True)
class NegNode(ExprNode):
    """Menos unario (-factor)."""

    operand: ExprNode

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "neg",
            "label": "-",
            "operand": self.operand.to_dict(),
            "span": {"line": self.span.line, "col": self.span.col, "len": self.span.len},
            "children": [self.operand.to_dict()],
        }


@dataclass(frozen=True)
class BinOpNode(ExprNode):
    """Operación binaria (+, -, *)."""

    op: str
    left: ExprNode
    right: ExprNode

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "binop",
            "op": self.op,
            "label": self.op,
            "left": self.left.to_dict(),
            "right": self.right.to_dict(),
            "span": {"line": self.span.line, "col": self.span.col, "len": self.span.len},
            "children": [self.left.to_dict(), self.right.to_dict()],
        }


@dataclass(frozen=True)
class StmtNode(AstNode):
    """Nodo base de sentencia."""

    pass


@dataclass(frozen=True)
class AssignNode(StmtNode):
    """Sentencia de asignación: id = expr."""

    name: str
    expr: ExprNode

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "assign",
            "name": self.name,
            "expr": self.expr.to_dict(),
            "span": {"line": self.span.line, "col": self.span.col, "len": self.span.len},
            "children": [self.expr.to_dict()],
        }


@dataclass(frozen=True)
class PrintNode(StmtNode):
    """Sentencia de impresión: print(expr)."""

    expr: ExprNode

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "print",
            "expr": self.expr.to_dict(),
            "span": {"line": self.span.line, "col": self.span.col, "len": self.span.len},
            "children": [self.expr.to_dict()],
        }


@dataclass(frozen=True)
class ProgramNode(AstNode):
    """Nodo raíz del programa con la lista de sentencias."""

    statements: list[StmtNode]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": "program",
            "span": {"line": self.span.line, "col": self.span.col, "len": self.span.len},
            "children": [s.to_dict() for s in self.statements],
        }


# ---------------------------------------------------------------------------
# S-Expressions (para pruebas, depuración y verificación de precedencia)
# ---------------------------------------------------------------------------


def to_sexpr(node: AstNode) -> str:
    """Convierte el AST a representación s-expression canónica."""
    if isinstance(node, ProgramNode):
        if len(node.statements) == 1:
            return to_sexpr(node.statements[0])
        return f"(program {' '.join(to_sexpr(s) for s in node.statements)})"
    if isinstance(node, AssignNode):
        return f"(assign {node.name} {to_sexpr(node.expr)})"
    if isinstance(node, PrintNode):
        return f"(print {to_sexpr(node.expr)})"
    if isinstance(node, BinOpNode):
        return f"({node.op} {to_sexpr(node.left)} {to_sexpr(node.right)})"
    if isinstance(node, NegNode):
        return f"(neg {to_sexpr(node.operand)})"
    if isinstance(node, NumNode):
        return str(node.value)
    if isinstance(node, VarNode):
        return node.name
    return ""


# ---------------------------------------------------------------------------
# Parser descendente recursivo
# ---------------------------------------------------------------------------


class _Parser:
    def __init__(self, tokens: list[Token], tracer: Optional[Tracer] = None) -> None:
        self.tokens = tokens
        self.tracer = tracer
        self.pos = 0
        self._node_counter = 0

    def _next_id(self) -> str:
        self._node_counter += 1
        return f"n{self._node_counter}"

    def _peek(self) -> Token:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        last = self.tokens[-1] if self.tokens else Token(TokenType.EOF, "", 1, 1)
        return Token(TokenType.EOF, "", last.line, last.col)

    def _advance(self) -> Token:
        tok = self._peek()
        if self.pos < len(self.tokens):
            self.pos += 1
        if self.tracer is not None and tok.type != TokenType.EOF:
            self.tracer.step(
                title=f"Consumir token {tok.type.name} '{tok.lexeme}'",
                explain=f"Avanza el cursor tras procesar '{tok.lexeme}'.",
                focus=Focus(span=Span(line=tok.line, col=tok.col, len=max(1, len(tok.lexeme)))),
                ops=[{"op": "shift", "token": tok.type.name, "lexeme": tok.lexeme}],
            )
        return tok

    def _fail(self, code: str, message: str, why: str, hint: str, tok: Token) -> None:
        span = Span(line=tok.line, col=tok.col, len=max(1, len(tok.lexeme)))
        if self.tracer is not None:
            self.tracer.step(
                title=f"Error sintáctico {code}",
                explain=message,
                focus=Focus(span=span),
                ops=[{"op": "fail", "code": code, "message": message}],
            )
        raise CompileError(
            code=code,
            kind="syntactic",
            phase="syntactic",
            message=message,
            why=why,
            hint=hint,
            span=span,
            step_index=len(self.tracer.steps) - 1 if self.tracer else 0,
        )

    def parse_program(self) -> ProgramNode:
        statements: list[StmtNode] = []
        start_tok = self._peek()

        while self._peek().type != TokenType.EOF:
            # Ignorar saltos de línea vacíos
            if self._peek().type == TokenType.NEWLINE:
                self._advance()
                continue
            stmt = self.parse_statement()
            statements.append(stmt)

        prog_span = Span(
            line=start_tok.line,
            col=start_tok.col,
            len=max(1, len(self.tokens)),
        )
        prog_id = "root"
        prog_node = ProgramNode(id=prog_id, kind="program", statements=statements, span=prog_span)

        if self.tracer is not None:
            self.tracer.step(
                title="Programa construido",
                explain=f"Se construyó el AST completo con {len(statements)} sentencia(s).",
                focus=Focus(span=prog_span, nodeIds=[prog_id]),
                ops=[{"op": "node", "id": prog_id, "kind": "program", "label": "program"}],
            )
        return prog_node

    def parse_statement(self) -> StmtNode:
        tok = self._peek()

        # 1. Asignación: ID = expr
        if tok.type == TokenType.ID:
            return self.parse_assign()

        # 2. Imprimir: print(expr)
        if tok.type == TokenType.PRINT:
            return self.parse_print()

        # 3. Error E-204: no empieza con ID ni PRINT
        self._fail(
            code="E-204",
            message=(
                f"La línea no empieza con un identificador ni 'print' (se encontró '{tok.lexeme}')"
            ),
            why="En MiniArit cada instrucción debe ser una asignación 'x = expr' o 'print(expr)'.",
            hint="Inicia la instrucción con el nombre de una variable o con la palabra 'print'.",
            tok=tok,
        )
        raise AssertionError("Inalcanzable tras _fail")

    def parse_assign(self) -> AssignNode:
        id_tok = self._advance()
        assign_id = self._next_id()

        # Verificar '='
        eq_tok = self._peek()
        if eq_tok.type != TokenType.ASSIGN:
            self._fail(
                code="E-203",
                message=(
                    f"Se esperaba '=' después de '{id_tok.lexeme}', pero llegó '{eq_tok.lexeme}'"
                ),
                why="En una asignación, el identificador debe ir seguido inmediatamente por '='.",
                hint="Agrega el signo '=' entre la variable y la expresión.",
                tok=eq_tok,
            )

        self._advance()  # Consumir '='
        expr = self.parse_expr()

        # Consumir NEWLINE o fin de entrada
        next_tok = self._peek()
        if next_tok.type == TokenType.NEWLINE:
            self._advance()

        span = Span(
            line=id_tok.line,
            col=id_tok.col,
            len=max(1, (expr.span.col + expr.span.len) - id_tok.col),
        )
        node = AssignNode(id=assign_id, kind="assign", name=id_tok.lexeme, expr=expr, span=span)

        if self.tracer is not None:
            self.tracer.step(
                title=f"Asignación '{id_tok.lexeme} = ...'",
                explain=f"Regla de asignación para la variable '{id_tok.lexeme}'.",
                focus=Focus(span=span, nodeIds=[assign_id, expr.id]),
                ops=[
                    {
                        "op": "node",
                        "id": assign_id,
                        "kind": "assign",
                        "label": f"{id_tok.lexeme} =",
                    },
                    {"op": "edge", "parent": assign_id, "child": expr.id},
                ],
            )
        return node

    def parse_print(self) -> PrintNode:
        print_tok = self._advance()
        print_id = self._next_id()

        lparen_tok = self._peek()
        if lparen_tok.type != TokenType.LPAREN:
            self._fail(
                code="E-205",
                message=f"'print' sin paréntesis (se encontró '{lparen_tok.lexeme}')",
                why=(
                    "La función print requiere que su argumento esté entre paréntesis:"
                    " print(expr)."
                ),
                hint="Envuelve la expresión a imprimir entre paréntesis: print(...).",
                tok=lparen_tok,
            )

        self._advance()  # Consumir '('
        expr = self.parse_expr()

        rparen_tok = self._peek()
        if rparen_tok.type != TokenType.RPAREN:
            self._fail(
                code="E-202",
                message=f"Paréntesis sin cerrar en print (se encontró '{rparen_tok.lexeme}')",
                why="Todo paréntesis de apertura '(' debe tener su correspondiente cierre ')'.",
                hint="Agrega ')' para cerrar la llamada a print.",
                tok=rparen_tok,
            )

        self._advance()  # Consumir ')'

        # Consumir NEWLINE si hay
        if self._peek().type == TokenType.NEWLINE:
            self._advance()

        span = Span(
            line=print_tok.line,
            col=print_tok.col,
            len=max(1, (rparen_tok.col + 1) - print_tok.col),
        )
        node = PrintNode(id=print_id, kind="print", expr=expr, span=span)

        if self.tracer is not None:
            self.tracer.step(
                title="Llamada a print",
                explain="Regla de impresión print(expr).",
                focus=Focus(span=span, nodeIds=[print_id, expr.id]),
                ops=[
                    {"op": "node", "id": print_id, "kind": "print", "label": "print"},
                    {"op": "edge", "parent": print_id, "child": expr.id},
                ],
            )
        return node

    def parse_expr(self) -> ExprNode:
        """expr = term { ( "+" | "-" ) term } (asociatividad por la izquierda)."""
        left = self.parse_term()

        while self._peek().type in (TokenType.PLUS, TokenType.MINUS):
            op_tok = self._advance()
            right = self.parse_term()
            bin_id = self._next_id()
            span = Span(
                line=left.span.line,
                col=left.span.col,
                len=max(1, (right.span.col + right.span.len) - left.span.col),
            )
            node = BinOpNode(
                id=bin_id,
                kind="binop",
                op=op_tok.lexeme,
                left=left,
                right=right,
                span=span,
            )
            if self.tracer is not None:
                self.tracer.step(
                    title=f"Operación '{op_tok.lexeme}'",
                    explain=f"Operación binaria {left.id} {op_tok.lexeme} {right.id}.",
                    focus=Focus(span=span, nodeIds=[bin_id, left.id, right.id]),
                    ops=[
                        {"op": "node", "id": bin_id, "kind": "binop", "label": op_tok.lexeme},
                        {"op": "edge", "parent": bin_id, "child": left.id},
                        {"op": "edge", "parent": bin_id, "child": right.id},
                    ],
                )
            left = node

        return left

    def parse_term(self) -> ExprNode:
        """term = factor { "*" factor } (asociatividad por la izquierda, mayor precedencia)."""
        left = self.parse_factor()

        while self._peek().type == TokenType.STAR:
            self._advance()
            right = self.parse_factor()
            bin_id = self._next_id()
            span = Span(
                line=left.span.line,
                col=left.span.col,
                len=max(1, (right.span.col + right.span.len) - left.span.col),
            )
            node = BinOpNode(
                id=bin_id,
                kind="binop",
                op="*",
                left=left,
                right=right,
                span=span,
            )
            if self.tracer is not None:
                self.tracer.step(
                    title="Multiplicación '*'",
                    explain=(
                        "Multiplicación agrupada primero por tener mayor precedencia que '+' y '-'"
                        "."
                    ),
                    focus=Focus(span=span, nodeIds=[bin_id, left.id, right.id]),
                    ops=[
                        {"op": "node", "id": bin_id, "kind": "binop", "label": "*"},
                        {"op": "edge", "parent": bin_id, "child": left.id},
                        {"op": "edge", "parent": bin_id, "child": right.id},
                    ],
                )
            left = node

        return left

    def parse_factor(self) -> ExprNode:
        """factor = NUM | ID | "(" expr ")" | "-" factor."""
        tok = self._peek()

        # 1. Constante numérica
        if tok.type == TokenType.NUM:
            self._advance()
            node_id = self._next_id()
            span = Span(line=tok.line, col=tok.col, len=len(tok.lexeme))
            return NumNode(id=node_id, kind="num", value=int(tok.lexeme), span=span)

        # 2. Variable
        if tok.type == TokenType.ID:
            self._advance()
            node_id = self._next_id()
            span = Span(line=tok.line, col=tok.col, len=len(tok.lexeme))
            return VarNode(id=node_id, kind="var", name=tok.lexeme, span=span)

        # 3. Menos unario: - factor
        if tok.type == TokenType.MINUS:
            minus_tok = self._advance()
            operand = self.parse_factor()
            neg_id = self._next_id()
            span = Span(
                line=minus_tok.line,
                col=minus_tok.col,
                len=max(1, (operand.span.col + operand.span.len) - minus_tok.col),
            )
            return NegNode(id=neg_id, kind="neg", operand=operand, span=span)

        # 4. Paréntesis: ( expr )
        if tok.type == TokenType.LPAREN:
            self._advance()
            expr = self.parse_expr()
            rparen_tok = self._peek()
            if rparen_tok.type != TokenType.RPAREN:
                self._fail(
                    code="E-202",
                    message=(
                        f"Paréntesis sin cerrar: se esperaba ')' pero llegó '{rparen_tok.lexeme}'"
                    ),
                    why="Se abrió un paréntesis '(' pero nunca fue cerrado.",
                    hint="Agrega ')' para cerrar la expresión agrupada.",
                    tok=rparen_tok,
                )
            self._advance()  # Consumir ')'
            return expr

        # 5. Error E-201: Falta de operando
        self._fail(
            code="E-201",
            message=f"Falta un operando en la expresión (se encontró '{tok.lexeme}')",
            why=(
                "El operador requiere operandos válidos (número, variable o expresión entre"
                " paréntesis)."
            ),
            hint="Coloca un número, variable o expresión válida.",
            tok=tok,
        )
        raise AssertionError("Inalcanzable tras _fail")


def parse(tokens: list[Token], tracer: Optional[Tracer] = None) -> ProgramNode:
    """Función pura que analiza una secuencia de tokens y retorna el AST ProgramNode."""
    parser = _Parser(tokens, tracer)
    return parser.parse_program()
