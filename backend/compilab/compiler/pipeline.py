"""Orquestador del pipeline del compilador CompiLab.

Ejecuta las fases en orden canónico:
lexical -> syntactic -> semantic -> ir -> optimization -> assembly -> binary.
Si alguna fase lanza CompileError, se conservan sus pasos, se marca con status 'error',
las fases subsiguientes quedan en status 'skipped', y se retorna ok=False con ErrorInfo.
"""

from __future__ import annotations

import time

from compilab.compiler.errors import CompileError
from compilab.compiler.lexer import Token, tokenize
from compilab.compiler.parser import ProgramNode, parse
from compilab.compiler.tracer import Tracer
from compilab.contract.models import (
    EXPECTED_PHASE_ORDER,
    CompileResponse,
    Meta,
    PhaseId,
    PhaseResult,
)


def _init_phases() -> list[PhaseResult]:
    names: dict[PhaseId, str] = {
        "lexical": "Análisis léxico",
        "syntactic": "Análisis sintáctico",
        "semantic": "Análisis semántico",
        "ir": "Código intermedio",
        "optimization": "Optimización",
        "assembly": "Generación de ensamblador",
        "binary": "Generación de binario",
    }
    return [
        PhaseResult(id=pid, name=names[pid], status="skipped", summary="", steps=[], output=None)
        for pid in EXPECTED_PHASE_ORDER
    ]


def compile_source(source: str, optimize: bool = True) -> CompileResponse:
    """Ejecuta el pipeline de compilación.

    En F2 ejecuta el análisis léxico y el análisis sintáctico reales.
    Si ocurre un error léxico o sintáctico, detiene el pipeline en esa fase
    y devuelve la respuesta tipada de error.
    """
    start_time = time.perf_counter()
    phases = _init_phases()
    line_count = len(source.splitlines()) if source else 0

    # 1. Fase léxica
    lex_tracer = Tracer()
    tokens: list[Token] = []
    try:
        tokens = tokenize(source, lex_tracer)
        phases[0] = PhaseResult(
            id="lexical",
            name="Análisis léxico",
            status="ok",
            summary=f"{len(tokens)} tokens identificados",
            steps=lex_tracer.get_steps(),
            output={
                "tokens": [
                    {"type": t.type.name, "lexeme": t.lexeme, "line": t.line, "col": t.col}
                    for t in tokens
                ]
            },
        )
    except CompileError as err:
        phases[0] = PhaseResult(
            id="lexical",
            name="Análisis léxico",
            status="error",
            summary=f"Fallo léxico: {err.message}",
            steps=lex_tracer.get_steps(),
            output=None,
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return CompileResponse(
            version=1,
            ok=False,
            phases=phases,
            executable=None,
            run=None,
            error=err.to_error_info(),
            meta=Meta(sourceLength=len(source), lineCount=line_count, elapsedMs=elapsed_ms),
        )

    # 2. Fase sintáctica
    syn_tracer = Tracer()
    ast: ProgramNode
    try:
        ast = parse(tokens, syn_tracer)
        phases[1] = PhaseResult(
            id="syntactic",
            name="Análisis sintáctico",
            status="ok",
            summary=f"Árbol AST construido con {len(ast.statements)} sentencia(s)",
            steps=syn_tracer.get_steps(),
            output={"ast": ast.to_dict()},
        )
    except CompileError as err:
        phases[1] = PhaseResult(
            id="syntactic",
            name="Análisis sintáctico",
            status="error",
            summary=f"Fallo sintáctico: {err.message}",
            steps=syn_tracer.get_steps(),
            output=None,
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return CompileResponse(
            version=1,
            ok=False,
            phases=phases,
            executable=None,
            run=None,
            error=err.to_error_info(),
            meta=Meta(sourceLength=len(source), lineCount=line_count, elapsedMs=elapsed_ms),
        )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    return CompileResponse(
        version=1,
        ok=True,
        phases=phases,
        executable=None,
        run=None,
        error=None,
        meta=Meta(sourceLength=len(source), lineCount=line_count, elapsedMs=elapsed_ms),
    )
