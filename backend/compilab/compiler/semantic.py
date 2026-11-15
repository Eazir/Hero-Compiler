"""Analizador semántico para MiniArit (F3 / BE-3).

Verifica la tabla de símbolos, alcance por línea, uso de variables antes de definición
(E-301), y genera advertencias para variables declaradas pero no usadas (W-301).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from compilab.compiler.errors import CompileError
from compilab.compiler.parser import (
    AssignNode,
    AstNode,
    BinOpNode,
    NegNode,
    NumNode,
    PrintNode,
    ProgramNode,
    VarNode,
)
from compilab.compiler.tracer import Tracer
from compilab.contract.models import Focus, Span


@dataclass
class Symbol:
    name: str
    type: str = "int"
    line: int = 1
    uses: int = 0
    literal: int | None = None

    def to_dict(self) -> dict[str, Any]:
        res: dict[str, Any] = {
            "name": self.name,
            "type": self.type,
            "line": self.line,
            "uses": self.uses,
        }
        if self.literal is not None:
            res["literal"] = self.literal
        return res


@dataclass
class SemanticWarning:
    code: str
    message: str
    line: int
    col: int
    len: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "line": self.line,
            "col": self.col,
            "len": self.len,
        }


@dataclass(frozen=True)
class SemanticInfo:
    symbols: dict[str, Symbol]
    warnings: list[SemanticWarning]

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbols": [s.to_dict() for s in self.symbols.values()],
            "warnings": [w.to_dict() for w in self.warnings],
        }


def analyze(program: ProgramNode, tracer: Tracer) -> SemanticInfo:
    """Ejecuta el análisis semántico sobre el AST del programa."""
    symbols: dict[str, Symbol] = {}
    warnings: list[SemanticWarning] = []

    def check_expr(expr: AstNode) -> None:
        if isinstance(expr, VarNode):
            if expr.name not in symbols:
                # Paso de búsqueda fallida
                tracer.step(
                    title=f"Búsqueda de '{expr.name}'",
                    explain=(
                        f"Se intenta leer la variable '{expr.name}' pero no existe "
                        "en la tabla de símbolos."
                    ),
                    focus=Focus(
                        span=Span(
                            line=expr.span.line,
                            col=expr.span.col,
                            len=expr.span.len,
                        ),
                        nodeIds=[expr.id],
                    ),
                    ops=[
                        {"op": "lookup", "name": expr.name, "line": expr.span.line, "found": False},
                        {
                            "op": "fail",
                            "code": "E-301",
                            "message": f"La variable '{expr.name}' no fue declarada",
                        },
                    ],
                )
                raise CompileError(
                    code="E-301",
                    kind="Semántico",
                    phase="semantic",
                    message=f"La variable '{expr.name}' no está declarada ni inicializada",
                    why=(
                        "En MiniArit, toda variable debe asignarse en una línea anterior "
                        "antes de ser leída."
                    ),
                    hint=(
                        f"Define '{expr.name} = valor' en una línea previa antes "
                        f"de usarla en la expresión."
                    ),
                    span=Span(
                        line=expr.span.line,
                        col=expr.span.col,
                        len=expr.span.len,
                    ),
                    step_index=max(0, len(tracer.steps) - 1),
                    fixes=[
                        {
                            "label": f"Declarar {expr.name} antes",
                            "kind": "insert_assignment",
                            "name": expr.name,
                            "line": expr.span.line,
                        }
                    ],
                )

            # Variable encontrada con éxito
            symbols[expr.name].uses += 1
            tracer.step(
                title=f"Verificar uso de '{expr.name}'",
                explain=(
                    f"Variable '{expr.name}' fue declarada previamente en línea "
                    f"{symbols[expr.name].line} antes de usarse."
                ),
                focus=Focus(
                    span=Span(
                        line=expr.span.line,
                        col=expr.span.col,
                        len=expr.span.len,
                    ),
                    nodeIds=[expr.id],
                ),
                ops=[
                    {
                        "op": "lookup",
                        "name": expr.name,
                        "line": expr.span.line,
                        "found": True,
                    }
                ],
            )

        elif isinstance(expr, BinOpNode):
            check_expr(expr.left)
            check_expr(expr.right)
        elif isinstance(expr, NegNode):
            check_expr(expr.operand)
        elif isinstance(expr, NumNode):
            pass

    for stmt in program.statements:
        if isinstance(stmt, AssignNode):
            # 1. Evaluar primero el lado derecho para detectar uso antes de asignar
            check_expr(stmt.expr)

            # 2. Registrar en la tabla de símbolos
            literal_val = stmt.expr.value if isinstance(stmt.expr, NumNode) else None
            if stmt.name in symbols:
                prev_uses = symbols[stmt.name].uses
                symbols[stmt.name] = Symbol(
                    name=stmt.name,
                    type="int",
                    line=stmt.span.line,
                    uses=prev_uses,
                    literal=literal_val,
                )
            else:
                symbols[stmt.name] = Symbol(
                    name=stmt.name,
                    type="int",
                    line=stmt.span.line,
                    uses=0,
                    literal=literal_val,
                )

            tracer.step(
                title=f"Declarar variable '{stmt.name}'",
                explain=(
                    f"Se registra '{stmt.name}' en la tabla de símbolos en línea {stmt.span.line}."
                ),
                focus=Focus(
                    span=Span(
                        line=stmt.span.line,
                        col=stmt.span.col,
                        len=len(stmt.name),
                    ),
                    nodeIds=[stmt.id],
                ),
                ops=[{"op": "declare", "name": stmt.name, "line": stmt.span.line, "type": "int"}],
            )

        elif isinstance(stmt, PrintNode):
            check_expr(stmt.expr)

    # Comprobación de variables declaradas y nunca leídas (W-301)
    for sym in symbols.values():
        if sym.uses == 0:
            warnings.append(
                SemanticWarning(
                    code="W-301",
                    message=f"La variable '{sym.name}' fue declarada pero nunca se lee.",
                    line=sym.line,
                    col=1,
                    len=len(sym.name),
                )
            )

    return SemanticInfo(symbols=symbols, warnings=warnings)
