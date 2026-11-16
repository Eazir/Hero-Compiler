"""Orquestador del pipeline del compilador CompiLab / Hero-Compiler.

Ejecuta las fases en orden canónico:
lexical -> syntactic -> semantic -> ir -> optimization -> assembly -> binary,
seguido de la ejecución en la máquina virtual (VM).
Si alguna fase lanza CompileError, se conservan sus pasos, se marca con status 'error',
las fases subsiguientes quedan en status 'skipped', y se retorna ok=False con ErrorInfo.
"""

from __future__ import annotations

import time

from compilab.compiler.assembler import AsmInstr, assemble
from compilab.compiler.encoder import build_binary_output, encode, format_bytes_hex
from compilab.compiler.errors import CompileError
from compilab.compiler.ir import TacInstr, lower
from compilab.compiler.lexer import Token, tokenize
from compilab.compiler.optimizer import optimize as optimize_tac
from compilab.compiler.parser import ProgramNode, parse
from compilab.compiler.semantic import SemanticInfo, analyze
from compilab.compiler.tracer import Tracer
from compilab.compiler.vm import run as run_vm
from compilab.contract.models import (
    EXPECTED_PHASE_ORDER,
    CompileResponse,
    Executable,
    Meta,
    PhaseId,
    PhaseResult,
    RunResult,
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
    """Ejecuta el pipeline completo de 7 fases y la máquina virtual."""
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

    # 3. Fase semántica
    sem_tracer = Tracer()
    semantic_info: SemanticInfo
    try:
        semantic_info = analyze(ast, sem_tracer)
        phases[2] = PhaseResult(
            id="semantic",
            name="Análisis semántico",
            status="ok",
            summary=(
                f"{len(semantic_info.symbols)} variable(s) declarada(s), "
                f"{len(semantic_info.warnings)} advertencia(s)"
            ),
            steps=sem_tracer.get_steps(),
            output=semantic_info.to_dict(),
        )
    except CompileError as err:
        phases[2] = PhaseResult(
            id="semantic",
            name="Análisis semántico",
            status="error",
            summary=f"Fallo semántico: {err.message}",
            steps=sem_tracer.get_steps(),
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

    # 4. Fase de código intermedio (TAC)
    ir_tracer = Tracer()
    ir_instrs: list[TacInstr]
    try:
        ir_instrs = lower(ast, ir_tracer)
        phases[3] = PhaseResult(
            id="ir",
            name="Código intermedio",
            status="ok",
            summary=f"{len(ir_instrs)} instrucciones TAC generadas",
            steps=ir_tracer.get_steps(),
            output={
                "instructions": [
                    {"index": i, "text": str(ins)} for i, ins in enumerate(ir_instrs)
                ]
            },
        )
    except CompileError as err:
        phases[3] = PhaseResult(
            id="ir",
            name="Código intermedio",
            status="error",
            summary=f"Fallo en código intermedio: {err.message}",
            steps=ir_tracer.get_steps(),
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

    # 5. Fase de optimización
    opt_tracer = Tracer()
    opt_instrs: list[TacInstr]
    try:
        opt_instrs = optimize_tac(ir_instrs, opt_tracer, enabled=optimize)
        before_count = len(ir_instrs)
        after_count = len(opt_instrs)
        summary = (
            f"Reducido de {before_count} a {after_count} instrucción(es)"
            if optimize
            else f"Optimización desactivada ({after_count} instrucciones conservadas)"
        )
        phases[4] = PhaseResult(
            id="optimization",
            name="Optimización",
            status="ok",
            summary=summary,
            steps=opt_tracer.get_steps(),
            output={
                "instructions": [
                    {"index": i, "text": str(ins)} for i, ins in enumerate(opt_instrs)
                ]
            },
        )
    except CompileError as err:
        phases[4] = PhaseResult(
            id="optimization",
            name="Optimización",
            status="error",
            summary=f"Fallo en optimización: {err.message}",
            steps=opt_tracer.get_steps(),
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

    # 6. Fase de ensamblador
    asm_tracer = Tracer()
    asm_instrs: list[AsmInstr]
    try:
        asm_instrs = assemble(opt_instrs, asm_tracer)
        phases[5] = PhaseResult(
            id="assembly",
            name="Generación de ensamblador",
            status="ok",
            summary=f"{len(asm_instrs)} instrucciones ensamblador con registros asignados",
            steps=asm_tracer.get_steps(),
            output={
                "instructions": [ins.to_dict() for ins in asm_instrs],
            },
        )
    except CompileError as err:
        phases[5] = PhaseResult(
            id="assembly",
            name="Generación de ensamblador",
            status="error",
            summary=f"Fallo en ensamblador: {err.message}",
            steps=asm_tracer.get_steps(),
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

    # 7. Fase de binario y ejecución en VM
    bin_tracer = Tracer()
    binary_data: bytes
    run_res: RunResult
    try:
        binary_data = encode(asm_instrs, bin_tracer)
        bin_output = build_binary_output(binary_data, asm_instrs, opt_instrs)
        phases[6] = PhaseResult(
            id="binary",
            name="Generación de binario",
            status="ok",
            summary=f"{len(binary_data)} bytes codificados en formato ISA CompiLab",
            steps=bin_tracer.get_steps(),
            output=bin_output,
        )
        run_res = run_vm(binary_data)
    except CompileError as err:
        phases[6] = PhaseResult(
            id="binary",
            name="Generación de binario",
            status="error",
            summary=f"Fallo en binario/ejecución: {err.message}",
            steps=bin_tracer.get_steps(),
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
        executable=Executable(hex=format_bytes_hex(binary_data), size=len(binary_data)),
        run=run_res,
        error=None,
        meta=Meta(sourceLength=len(source), lineCount=line_count, elapsedMs=elapsed_ms),
    )
