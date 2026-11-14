"""Analizador léxico (F1)."""
from dataclasses import dataclass
from enum import Enum, auto
from compilab.compiler.tracer import Tracer


class TokenType(Enum):
    NUM = auto()
    ID = auto()
    PRINT = auto()
    ASSIGN = auto()
    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    LPAREN = auto()
    RPAREN = auto()
    NEWLINE = auto()
    EOF = auto()


@dataclass(frozen=True)
class Token:
    type: TokenType
    lexeme: str
    line: int
    col: int


def tokenize(source: str, tracer: Tracer) -> list[Token]:
    """Tokeniza el código fuente generando un paso por token en la traza."""
    # Implementación base para F0
    return []
