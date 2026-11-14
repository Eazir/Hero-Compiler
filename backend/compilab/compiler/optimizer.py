"""Optimizador de código intermedio (F4)."""
from dataclasses import dataclass
from compilab.compiler.ir import TacInstr
from compilab.compiler.tracer import Tracer


@dataclass(frozen=True)
class OptResult:
    instructions: list[TacInstr]
    passes: list[dict]


def optimize(instructions: list[TacInstr], tracer: Tracer) -> OptResult:
    return OptResult(instructions=instructions, passes=[])
