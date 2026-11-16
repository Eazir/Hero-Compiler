"""Pruebas unitarias para ensamblador, codificador binario y VM (F5 / BE-5)."""

from __future__ import annotations

import pytest

from compilab.compiler.assembler import AsmInstr, assemble
from compilab.compiler.encoder import decode, encode
from compilab.compiler.errors import CompileError
from compilab.compiler.ir import TacInstr
from compilab.compiler.pipeline import compile_source
from compilab.compiler.tracer import Tracer
from compilab.compiler.vm import run


def test_print_11_se_codifica_en_24_bytes() -> None:
    """Criterio F5: print 11 genera LOADI R0, 11 / PRINT R0 / HALT (24 bytes)."""
    tac = [TacInstr(op="print", dst=None, a=11)]
    asm = assemble(tac, Tracer())
    assert [ins.text for ins in asm] == ["LOADI R0, 11", "PRINT R0", "HALT"]

    binary = encode(asm, Tracer())
    assert len(binary) == 24


def test_decode_encode_roundtrip() -> None:
    """Criterio F5: decode(encode(p)) == p sin pérdida."""
    program = [
        AsmInstr(pc=0, opcode="LOADI", dst=0, src=0, imm=5),
        AsmInstr(pc=1, opcode="LOADI", dst=1, src=0, imm=6),
        AsmInstr(pc=2, opcode="ADD", dst=0, src=1, imm=0),
        AsmInstr(pc=3, opcode="PRINT", dst=0, src=0, imm=0),
        AsmInstr(pc=4, opcode="HALT", dst=0, src=0, imm=0),
    ]
    binary = encode(program)
    decoded = decode(binary)
    assert decoded == program


def test_ejecucion_caso_referencia_stdout_11() -> None:
    """Criterio F5: El caso de referencia produce stdout=['11'] y exitCode=0."""
    source = "a = 5\nb = 3\nc = a + b * 2\nprint(c)"
    res = compile_source(source, optimize=True)
    assert res.ok is True
    assert res.executable is not None
    assert res.executable.size == 24
    assert res.run is not None
    assert res.run.stdout == ["11"]
    assert res.run.exitCode == 0

    # También sin optimización debe dar exactamente ['11']
    res_unopt = compile_source(source, optimize=False)
    assert res_unopt.ok is True
    assert res_unopt.run is not None
    assert res_unopt.run.stdout == ["11"]


def test_desbordamiento_en_vm_lanza_e402() -> None:
    """Criterio F5: Desbordamiento aritmético en ejecución (VM) lanza E-402."""
    program = [
        AsmInstr(pc=0, opcode="LOADI", dst=0, src=0, imm=2_000_000_000),
        AsmInstr(pc=1, opcode="LOADI", dst=1, src=0, imm=1_000_000_000),
        AsmInstr(pc=2, opcode="ADD", dst=0, src=1, imm=0),
        AsmInstr(pc=3, opcode="HALT", dst=0, src=0, imm=0),
    ]
    binary = encode(program)
    with pytest.raises(CompileError) as exc_info:
        run(binary)
    assert exc_info.value.code == "E-402"


def test_limite_pasos_1000_lanza_e503() -> None:
    """Criterio F5: Exceder el límite de pasos de la VM lanza E-503."""
    program = [
        AsmInstr(pc=i, opcode="LOADI", dst=0, src=0, imm=1) for i in range(10)
    ] + [AsmInstr(pc=10, opcode="HALT", dst=0, src=0, imm=0)]
    binary = encode(program)
    with pytest.raises(CompileError) as exc_info:
        run(binary, max_steps=5)
    assert exc_info.value.code == "E-503"


def test_agotamiento_registros_lanza_e502() -> None:
    """Criterio F5: Exceder los 8 registros disponibles lanza E-502."""
    # Crear 9 temporales vivos simultáneamente (t1..t9 usados más adelante)
    tac: list[TacInstr] = [
        TacInstr(op="+", dst=f"t{i}", a=1, b=2) for i in range(1, 10)
    ] + [
        TacInstr(op="+", dst=f"t{10 + i}", a=f"t{i}", b=1) for i in range(1, 10)
    ]
    with pytest.raises(CompileError) as exc_info:
        assemble(tac, Tracer())
    assert exc_info.value.code == "E-502"
