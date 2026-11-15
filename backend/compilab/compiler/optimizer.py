"""Optimizador de código intermedio TAC en 4 pasadas (F4 / BE-4).

Aplica plegado de constantes, propagación de constantes, propagación de copias
y eliminación de código muerto hasta alcanzar un punto fijo (máximo 8 vueltas).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from compilab.compiler.errors import CompileError
from compilab.compiler.ir import TacInstr
from compilab.compiler.tracer import Tracer

INT32_MIN = -2147483648
INT32_MAX = 2147483647


@dataclass(frozen=True)
class OptPassSummary:
    name: str
    changes: int

    def to_dict(self) -> dict[str, Any]:
        return {"name": self.name, "changes": self.changes}


@dataclass(frozen=True)
class OptResult:
    instructions: list[TacInstr]
    passes: list[OptPassSummary]

    def to_dict(self) -> dict[str, Any]:
        return {
            "instructions": [
                {"index": i, "text": str(instr)}
                for i, instr in enumerate(self.instructions)
            ],
            "passes": [p.to_dict() for p in self.passes],
        }


def optimize(
    instructions: list[TacInstr],
    tracer: Tracer,
    enabled: bool = True,
) -> list[TacInstr]:
    """Aplica las 4 pasadas de optimización sobre las instrucciones TAC."""
    if not enabled:
        return list(instructions)

    current_code = list(instructions)
    pass_summaries: dict[str, int] = {
        "constant_propagation": 0,
        "constant_folding": 0,
        "copy_propagation": 0,
        "dead_code_elimination": 0,
    }

    max_rounds = 8
    for _ in range(max_rounds):
        modified = False

        # 1. Propagación de constantes
        known_constants: dict[str, int] = {}
        new_code: list[TacInstr] = []
        prop_changes = 0

        for instr in current_code:
            new_a = instr.a
            new_b = instr.b

            if isinstance(instr.a, str) and instr.a in known_constants:
                new_a = known_constants[instr.a]
                prop_changes += 1
                tracer.step(
                    title=f"Propagación de constante '{instr.a}'",
                    explain=f"Se sustituye '{instr.a}' por su valor conocido {new_a}.",
                    ops=[{"op": "propagate", "var": instr.a, "val": new_a}],
                )

            if isinstance(instr.b, str) and instr.b in known_constants:
                new_b = known_constants[instr.b]
                prop_changes += 1
                tracer.step(
                    title=f"Propagación de constante '{instr.b}'",
                    explain=f"Se sustituye '{instr.b}' por su valor conocido {new_b}.",
                    ops=[{"op": "propagate", "var": instr.b, "val": new_b}],
                )

            updated = TacInstr(
                op=instr.op,
                dst=instr.dst,
                a=new_a,
                b=new_b,
                from_node=instr.from_node,
            )
            new_code.append(updated)

            # Si es asignación de constante, registrarla
            if updated.op == "=" and updated.dst and isinstance(updated.a, int):
                known_constants[updated.dst] = updated.a
            elif updated.dst and updated.dst in known_constants:
                # Si se reasigna a algo no constante, olvidar
                del known_constants[updated.dst]

        if prop_changes > 0:
            modified = True
            pass_summaries["constant_propagation"] += prop_changes
            current_code = new_code

        # 2. Plegado de constantes
        fold_code: list[TacInstr] = []
        fold_changes = 0

        for instr in current_code:
            folded = False
            result_val: int | None = None

            if instr.op == "neg" and isinstance(instr.a, int):
                result_val = -instr.a
                folded = True
            elif (
                instr.op in ("+", "-", "*")
                and isinstance(instr.a, int)
                and isinstance(instr.b, int)
            ):
                if instr.op == "+":
                    result_val = instr.a + instr.b
                elif instr.op == "-":
                    result_val = instr.a - instr.b
                elif instr.op == "*":
                    result_val = instr.a * instr.b
                folded = True

            if folded and result_val is not None:
                # Comprobación de rango 32 bits con signo
                if result_val < INT32_MIN or result_val > INT32_MAX:
                    tracer.step(
                        title="Desbordamiento aritmético en plegado",
                        explain=f"El cálculo excede el rango de 32 bits: {result_val}.",
                        ops=[{"op": "fail", "code": "E-401"}],
                    )
                    raise CompileError(
                        code="E-401",
                        kind="Aritmético",
                        phase="optimization",
                        message=(
                            f"Desbordamiento de entero de 32 bits en plegado de constantes: "
                            f"{result_val}"
                        ),
                        why=(
                            "El resultado de la operación constante excede el rango de "
                            "un entero de 32 bits con signo [-2147483648, 2147483647]."
                        ),
                        hint="Verifica las operaciones numéricas constantes para que no desborden.",
                    )

                fold_changes += 1
                expr_desc = (
                    f"{instr.a} {instr.op} {instr.b}"
                    if instr.b is not None
                    else f"-{instr.a}"
                )
                tracer.step(
                    title=f"Plegado de constantes: {expr_desc} = {result_val}",
                    explain=f"Se precalcula la operación constante a {result_val}.",
                    ops=[{"op": "fold", "expr": expr_desc, "result": result_val}],
                )
                fold_code.append(
                    TacInstr(
                        op="=",
                        dst=instr.dst,
                        a=result_val,
                        b=None,
                        from_node=instr.from_node,
                    )
                )
            else:
                fold_code.append(instr)

        if fold_changes > 0:
            modified = True
            pass_summaries["constant_folding"] += fold_changes
            current_code = fold_code

        # 3. Propagación de copias
        copy_map: dict[str, str] = {}
        copy_code: list[TacInstr] = []
        copy_changes = 0

        for instr in current_code:
            new_a = instr.a
            new_b = instr.b

            if isinstance(instr.a, str) and instr.a in copy_map:
                new_a = copy_map[instr.a]
                copy_changes += 1

            if isinstance(instr.b, str) and instr.b in copy_map:
                new_b = copy_map[instr.b]
                copy_changes += 1

            updated = TacInstr(
                op=instr.op,
                dst=instr.dst,
                a=new_a,
                b=new_b,
                from_node=instr.from_node,
            )
            copy_code.append(updated)

            if updated.op == "=" and updated.dst and isinstance(updated.a, str):
                copy_map[updated.dst] = updated.a
            elif updated.dst and updated.dst in copy_map:
                del copy_map[updated.dst]

        if copy_changes > 0:
            modified = True
            pass_summaries["copy_propagation"] += copy_changes
            current_code = copy_code

        # 4. Eliminación de código muerto
        # Una asignación a variable/temporal es muerta si su valor nunca se lee posteriormente
        used_vars: set[str] = set()
        for instr in current_code:
            if isinstance(instr.a, str):
                used_vars.add(instr.a)
            if isinstance(instr.b, str):
                used_vars.add(instr.b)

        dce_code: list[TacInstr] = []
        dce_changes = 0

        for instr in current_code:
            # Los print nunca se eliminan
            if instr.op == "print":
                dce_code.append(instr)
            elif instr.dst and instr.dst in used_vars:
                dce_code.append(instr)
            else:
                dce_changes += 1
                tracer.step(
                    title=f"Eliminación de código muerto: {instr}",
                    explain=f"La asignación a '{instr.dst}' nunca es leída en el programa.",
                    ops=[{"op": "remove", "var": instr.dst, "instr": str(instr)}],
                )

        if dce_changes > 0:
            modified = True
            pass_summaries["dead_code_elimination"] += dce_changes
            current_code = dce_code

        if not modified:
            break

    return current_code
