"""Analizador sintáctico (F2)."""
from dataclasses import dataclass
from typing import Any
from compilab.compiler.lexer import Token
from compilab.compiler.tracer import Tracer


@dataclass(frozen=True)
class AstNode:
    id: str
    kind: str
    data: dict[str, Any]


def parse(tokens: list[Token], tracer: Tracer) -> AstNode:
    return AstNode(id="root", kind="program", data={})
