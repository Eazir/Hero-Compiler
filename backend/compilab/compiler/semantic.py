"""Analizador semántico (F3)."""

from dataclasses import dataclass
from typing import Any

from compilab.compiler.parser import AstNode
from compilab.compiler.tracer import Tracer


@dataclass(frozen=True)
class SemanticInfo:
    symbols: list[dict[str, Any]]
    warnings: list[dict[str, Any]]


def analyze(ast: AstNode, tracer: Tracer) -> SemanticInfo:
    return SemanticInfo(symbols=[], warnings=[])
