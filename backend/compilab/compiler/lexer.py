"""Analizador léxico (F1).

Convierte el código fuente de MiniArit en una secuencia de tokens con posición exacta
(línea y columna 1-based) y registra cada decisión en el Tracer.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto
from typing import Optional

from compilab.compiler.errors import CompileError
from compilab.compiler.tracer import Tracer
from compilab.contract.models import Focus, Span

INT32_MAX = 2_147_483_647


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


def tokenize(source: str, tracer: Optional[Tracer] = None) -> list[Token]:
    """Recorre el texto con un autómata de un carácter de anticipación.

    Reconoce NUM, ID, PRINT, ASSIGN, PLUS, MINUS, STAR, LPAREN, RPAREN, NEWLINE y EOF.
    Lanza CompileError ante caracteres inválidos (E-101), identificadores mal formados (E-102)
    o números fuera de rango de 32 bits (E-103).
    """
    if tracer is None:
        tracer = Tracer()

    tokens: list[Token] = []
    i = 0
    n = len(source)
    line = 1
    col = 1

    def emit_token_step(
        token_type: TokenType, lexeme: str, tok_line: int, tok_col: int, explain: str
    ) -> None:
        if tracer is not None:
            tracer.step(
                title=f"Token {token_type.name} '{lexeme}'",
                explain=explain,
                focus=Focus(span=Span(line=tok_line, col=tok_col, len=len(lexeme)), nodeIds=[]),
                ops=[
                    {
                        "op": "token",
                        "type": token_type.name,
                        "lexeme": lexeme,
                        "line": tok_line,
                        "col": tok_col,
                    }
                ],
            )

    while i < n:
        ch = source[i]

        # 1. Espacios en blanco y tabulaciones (se ignoran)
        if ch in (" ", "\t"):
            i += 1
            col += 1
            continue

        # 2. Salto de línea (\r\n o \n)
        if ch == "\r" and i + 1 < n and source[i + 1] == "\n":
            tokens.append(Token(TokenType.NEWLINE, "\n", line, col))
            i += 2
            line += 1
            col = 1
            continue
        elif ch == "\n":
            tokens.append(Token(TokenType.NEWLINE, "\n", line, col))
            i += 1
            line += 1
            col = 1
            continue

        # 3. Operadores y delimitadores
        if ch == "=":
            emit_token_step(TokenType.ASSIGN, "=", line, col, "'=' operador de asignación.")
            tokens.append(Token(TokenType.ASSIGN, "=", line, col))
            i += 1
            col += 1
            continue

        if ch == "+":
            emit_token_step(TokenType.PLUS, "+", line, col, "'+' operador aritmético de suma.")
            tokens.append(Token(TokenType.PLUS, "+", line, col))
            i += 1
            col += 1
            continue

        if ch == "-":
            emit_token_step(
                TokenType.MINUS, "-", line, col, "'-' operador aritmético de resta o menos unario."
            )
            tokens.append(Token(TokenType.MINUS, "-", line, col))
            i += 1
            col += 1
            continue

        if ch == "*":
            emit_token_step(
                TokenType.STAR, "*", line, col, "'*' operador aritmético de multiplicación."
            )
            tokens.append(Token(TokenType.STAR, "*", line, col))
            i += 1
            col += 1
            continue

        if ch == "(":
            emit_token_step(
                TokenType.LPAREN, "(", line, col, "'(' delimitador de apertura de expresión."
            )
            tokens.append(Token(TokenType.LPAREN, "(", line, col))
            i += 1
            col += 1
            continue

        if ch == ")":
            emit_token_step(
                TokenType.RPAREN, ")", line, col, "')' delimitador de cierre de expresión."
            )
            tokens.append(Token(TokenType.RPAREN, ")", line, col))
            i += 1
            col += 1
            continue

        # 4. Números
        if ch.isdigit():
            start_i = i
            start_line = line
            start_col = col

            while i < n and source[i].isdigit():
                i += 1
                col += 1

            # Detección de E-102: número pegado a letras (ej: 3b, 10x)
            if i < n and (source[i].isalpha() or source[i] == "_"):
                while i < n and (source[i].isalnum() or source[i] == "_"):
                    i += 1
                    col += 1
                bad_lexeme = source[start_i:i]
                span = Span(line=start_line, col=start_col, len=len(bad_lexeme))
                if tracer is not None:
                    tracer.step(
                        title="Identificador mal formado",
                        explain=(
                            f"El lexema '{bad_lexeme}' comienza con un dígito numérico seguido de"
                            " letras."
                        ),
                        focus=Focus(span=span, nodeIds=[]),
                        ops=[
                            {
                                "op": "fail",
                                "code": "E-102",
                                "message": (
                                    "Identificador no puede comenzar con un dígito"
                                    f" ('{bad_lexeme}')"
                                ),
                            }
                        ],
                    )
                raise CompileError(
                    code="E-102",
                    kind="lexical",
                    phase="lexical",
                    message=f"Identificador no puede comenzar con un dígito ('{bad_lexeme}')",
                    why=(
                        "Los identificadores deben comenzar con una letra o guion bajo, y los"
                        " números no pueden contener letras."
                    ),
                    hint="Separa el número del identificador con un operador o espacio.",
                    span=span,
                    step_index=len(tracer.steps) - 1 if tracer else 0,
                )

            lexeme = source[start_i:i]
            # Detección de E-103: literal fuera de rango de 32 bits con signo
            num_val = int(lexeme)
            if num_val > INT32_MAX:
                span = Span(line=start_line, col=start_col, len=len(lexeme))
                if tracer is not None:
                    tracer.step(
                        title="Literal fuera de rango de 32 bits",
                        explain=(
                            f"El valor '{lexeme}' es mayor que el límite positivo de 32 bits"
                            f" ({INT32_MAX})."
                        ),
                        focus=Focus(span=span, nodeIds=[]),
                        ops=[
                            {
                                "op": "fail",
                                "code": "E-103",
                                "message": (
                                    f"El número '{lexeme}' excede el límite de 32 bits con signo"
                                ),
                            }
                        ],
                    )
                raise CompileError(
                    code="E-103",
                    kind="lexical",
                    phase="lexical",
                    message=f"El número '{lexeme}' excede el límite de 32 bits con signo",
                    why=f"MiniArit solo soporta enteros con signo de 32 bits (máximo {INT32_MAX}).",
                    hint=f"Usa un valor entero menor o igual a {INT32_MAX}.",
                    span=span,
                    step_index=len(tracer.steps) - 1 if tracer else 0,
                )

            emit_token_step(
                TokenType.NUM,
                lexeme,
                start_line,
                start_col,
                f"Constante numérica entera '{lexeme}'.",
            )
            tokens.append(Token(TokenType.NUM, lexeme, start_line, start_col))
            continue

        # 5. Identificadores y palabras reservadas
        if ch.isalpha() or ch == "_":
            start_i = i
            start_line = line
            start_col = col

            while i < n and (source[i].isalnum() or source[i] == "_"):
                i += 1
                col += 1

            lexeme = source[start_i:i]
            if lexeme == "print":
                emit_token_step(
                    TokenType.PRINT,
                    "print",
                    start_line,
                    start_col,
                    "'print' es una palabra reservada, no un identificador.",
                )
                tokens.append(Token(TokenType.PRINT, "print", start_line, start_col))
            else:
                emit_token_step(
                    TokenType.ID,
                    lexeme,
                    start_line,
                    start_col,
                    f"Identificador '{lexeme}' en línea {start_line}, columna {start_col}.",
                )
                tokens.append(Token(TokenType.ID, lexeme, start_line, start_col))
            continue

        # 6. Carácter inválido no reconocido (E-101)
        invalid_char = ch
        span = Span(line=line, col=col, len=1)
        if tracer is not None:
            tracer.step(
                title=f"Carácter inválido '{invalid_char}'",
                explain=f"El carácter '{invalid_char}' no pertenece al alfabeto de MiniArit.",
                focus=Focus(span=span, nodeIds=[]),
                ops=[
                    {
                        "op": "fail",
                        "code": "E-101",
                        "message": f"Carácter no válido '{invalid_char}'",
                    }
                ],
            )
        raise CompileError(
            code="E-101",
            kind="lexical",
            phase="lexical",
            message=f"Carácter no válido '{invalid_char}'",
            why=(
                "MiniArit solo acepta números, identificadores, print, operadores (+, -, *)"
                " y paréntesis."
            ),
            hint="Elimina o reemplaza el carácter no reconocido.",
            span=span,
            step_index=len(tracer.steps) - 1 if tracer else 0,
        )

    # 7. Finalización: si hay tokens y el último no fue NEWLINE, emitir NEWLINE antes de EOF
    if tokens and tokens[-1].type != TokenType.NEWLINE:
        tokens.append(Token(TokenType.NEWLINE, "\n", line, col))

    tokens.append(Token(TokenType.EOF, "", line, col))
    return tokens
