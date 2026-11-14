"""Generación de código intermedio (TAC) (F4)."""
from dataclasses import dataclass
from compilab.compiler.parser import AstNode
from compilab.compiler.semantic import SemanticInfo
from compilab.compiler.tracer import Tracer


@dataclass(frozen=True)
class TacInstr:
    index: int
    text: str


def lower(ast: AstNode, sem: SemanticInfo, tracer: Tracer) -> list[TacInstr]:
    return []
