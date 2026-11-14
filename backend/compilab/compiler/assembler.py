"""Generador de código ensamblador (F5)."""
from dataclasses import dataclass
from compilab.compiler.ir import TacInstr
from compilab.compiler.tracer import Tracer


@dataclass(frozen=True)
class AsmInstr:
    pc: int
    text: str


def assemble(instructions: list[TacInstr], tracer: Tracer) -> list[AsmInstr]:
    return []
