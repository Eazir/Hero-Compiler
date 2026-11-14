"""Analizador semántico (F3)."""
from dataclasses import dataclass
from compilab.compiler.parser import AstNode
from compilab.compiler.tracer import Tracer


@dataclass(frozen=True)
class SemanticInfo:
    symbols: list[dict]
    warnings: list[dict]


def analyze(ast: AstNode, tracer: Tracer) -> SemanticInfo:
    return SemanticInfo(symbols=[], warnings=[])
