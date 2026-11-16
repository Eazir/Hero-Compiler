"""Generador de código intermedio de tres direcciones (TAC) (F4 / BE-4).

Convierte el AST en una secuencia lineal de instrucciones de tres direcciones
utilizando temporales t1, t2, ...
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Union

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

Operand = Union[str, int]


@dataclass(frozen=True)
class TacInstr:
    op: str  # '=', '+', '-', '*', 'neg', 'print'
    dst: str | None
    a: Operand | None
    b: Operand | None = None
    from_node: str | None = None

    def __str__(self) -> str:
        if self.op == "print":
            return f"print {self.a}"
        if self.op == "=":
            return f"{self.dst} = {self.a}"
        if self.op == "neg":
            return f"{self.dst} = -{self.a}"
        return f"{self.dst} = {self.a} {self.op} {self.b}"

    def to_dict(self, index: int) -> dict[str, Any]:
        return {
            "index": index,
            "text": str(self),
            "op": self.op,
            "dst": self.dst,
            "a": self.a,
            "b": self.b,
            "fromNode": self.from_node,
        }


def lower(program: ProgramNode, tracer: Tracer) -> list[TacInstr]:
    """Genera instrucciones TAC a partir del AST del programa."""
    instructions: list[TacInstr] = []
    temp_counter = 1

    def new_temp() -> str:
        nonlocal temp_counter
        t = f"t{temp_counter}"
        temp_counter += 1
        return t

    def emit(instr: TacInstr, span: Span | None, node_id: str | None, explain: str) -> None:
        idx = len(instructions)
        instructions.append(instr)
        focus = Focus(span=span, nodeIds=[node_id] if node_id else [])
        tracer.step(
            title=f"Generar {instr}",
            explain=explain,
            focus=focus,
            ops=[{"op": "emit", "index": idx, "text": str(instr)}],
        )

    def lower_expr(expr: AstNode) -> Operand:
        if isinstance(expr, NumNode):
            return expr.value
        if isinstance(expr, VarNode):
            return expr.name
        if isinstance(expr, NegNode):
            arg = lower_expr(expr.operand)
            t = new_temp()
            instr = TacInstr(op="neg", dst=t, a=arg, b=None, from_node=expr.id)
            emit(
                instr,
                expr.span,
                expr.id,
                f"Cálculo de negación unaria en temporal {t}.",
            )
            return t
        if isinstance(expr, BinOpNode):
            left_val = lower_expr(expr.left)
            right_val = lower_expr(expr.right)
            t = new_temp()
            instr = TacInstr(op=expr.op, dst=t, a=left_val, b=right_val, from_node=expr.id)
            emit(
                instr,
                expr.span,
                expr.id,
                f"Operación '{expr.op}' asignada al temporal {t}.",
            )
            return t
        raise ValueError(f"Nodo de expresión desconocido: {expr}")

    for stmt in program.statements:
        if isinstance(stmt, AssignNode):
            if isinstance(stmt.expr, NumNode):
                instr = TacInstr(
                    op="=",
                    dst=stmt.name,
                    a=stmt.expr.value,
                    b=None,
                    from_node=stmt.id,
                )
                emit(
                    instr,
                    stmt.span,
                    stmt.id,
                    f"Asignación directa de constante a variable {stmt.name}.",
                )
            elif isinstance(stmt.expr, VarNode):
                instr = TacInstr(
                    op="=",
                    dst=stmt.name,
                    a=stmt.expr.name,
                    b=None,
                    from_node=stmt.id,
                )
                emit(
                    instr,
                    stmt.span,
                    stmt.id,
                    f"Copia de variable {stmt.expr.name} en {stmt.name}.",
                )
            else:
                expr_res = lower_expr(stmt.expr)
                instr = TacInstr(
                    op="=",
                    dst=stmt.name,
                    a=expr_res,
                    b=None,
                    from_node=stmt.id,
                )
                emit(
                    instr,
                    stmt.span,
                    stmt.id,
                    f"Asignación del resultado en {stmt.name}.",
                )

        elif isinstance(stmt, PrintNode):
            if isinstance(stmt.expr, NumNode):
                instr = TacInstr(
                    op="print",
                    dst=None,
                    a=stmt.expr.value,
                    b=None,
                    from_node=stmt.id,
                )
                emit(instr, stmt.span, stmt.id, "Instrucción de salida directa.")
            elif isinstance(stmt.expr, VarNode):
                instr = TacInstr(
                    op="print",
                    dst=None,
                    a=stmt.expr.name,
                    b=None,
                    from_node=stmt.id,
                )
                emit(
                    instr,
                    stmt.span,
                    stmt.id,
                    f"Instrucción de salida de variable {stmt.expr.name}.",
                )
            else:
                expr_res = lower_expr(stmt.expr)
                instr = TacInstr(
                    op="print",
                    dst=None,
                    a=expr_res,
                    b=None,
                    from_node=stmt.id,
                )
                emit(instr, stmt.span, stmt.id, "Instrucción de salida de expresión calculada.")

    return instructions
