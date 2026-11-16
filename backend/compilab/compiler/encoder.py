"""Codificador binario y decodificador de la arquitectura ISA CompiLab (F5 / BE-5).

Cada instrucción mide exactamente 8 bytes en formato little-endian:
[opcode: 1B, dst: 1B, src: 1B, reservado: 1B, imm32: 4B signed int]
"""

from __future__ import annotations

import struct
from typing import Any

from compilab.compiler.assembler import AsmInstr
from compilab.compiler.ir import TacInstr
from compilab.compiler.tracer import Tracer

OPCODE_TO_BYTE: dict[str, int] = {
    "LOAD": 0x01,
    "LOADI": 0x02,
    "STORE": 0x03,
    "ADD": 0x10,
    "SUB": 0x11,
    "MUL": 0x12,
    "NEG": 0x13,
    "PRINT": 0x20,
    "HALT": 0xFF,
}

BYTE_TO_OPCODE: dict[int, str] = {v: k for k, v in OPCODE_TO_BYTE.items()}

INSTR_FORMAT = "<BBBBi"
INSTR_SIZE = 8


def format_bytes_hex(raw: bytes) -> str:
    """Devuelve representación hexadecimal separada por espacios en minúscula."""
    return " ".join(f"{b:02x}" for b in raw)


def encode(instructions: list[AsmInstr], tracer: Tracer | None = None) -> bytes:
    """Codifica una lista de AsmInstr en bytes de 8 bytes por instrucción."""
    chunks: list[bytes] = []
    for idx, ins in enumerate(instructions):
        op_byte = OPCODE_TO_BYTE[ins.opcode]
        chunk = struct.pack(INSTR_FORMAT, op_byte, ins.dst, ins.src, 0, ins.imm)
        chunks.append(chunk)

        if tracer is not None:
            offset = idx * INSTR_SIZE
            hex_str = format_bytes_hex(chunk)
            tracer.step(
                title=f"Codificar {ins.text}",
                explain=(
                    f"Opcode 0x{op_byte:02X}, dst={ins.dst}, src={ins.src}, "
                    f"reservado=0, imm={ins.imm}."
                ),
                ops=[
                    {
                        "op": "encode",
                        "offset": offset,
                        "bytes": hex_str,
                        "asm": ins.text,
                    }
                ],
            )
    return b"".join(chunks)


def decode(data: bytes) -> list[AsmInstr]:
    """Decodifica un bloque de bytes en su lista de AsmInstr (roundtrip sin pérdida)."""
    if len(data) % INSTR_SIZE != 0:
        raise ValueError(f"Longitud de binario inválida: {len(data)} no es múltiplo de 8.")

    result: list[AsmInstr] = []
    count = len(data) // INSTR_SIZE
    for pc in range(count):
        chunk = data[pc * INSTR_SIZE : (pc + 1) * INSTR_SIZE]
        op_byte, dst, src, _res, imm = struct.unpack(INSTR_FORMAT, chunk)
        if op_byte not in BYTE_TO_OPCODE:
            raise ValueError(f"Opcode desconocido: 0x{op_byte:02x} en instrucción {pc}.")
        opcode = BYTE_TO_OPCODE[op_byte]
        result.append(AsmInstr(pc=pc, opcode=opcode, dst=dst, src=src, imm=imm, from_ir=None))
    return result


def build_binary_output(
    binary: bytes,
    asm_instrs: list[AsmInstr],
    ir_instrs: list[TacInstr],
) -> dict[str, Any]:
    """Construye el diccionario de salida para la fase binary."""
    rows: list[dict[str, Any]] = []
    for idx, ins in enumerate(asm_instrs):
        offset = idx * INSTR_SIZE
        chunk = binary[offset : offset + INSTR_SIZE]
        ir_text = (
            str(ir_instrs[ins.from_ir])
            if ins.from_ir is not None and 0 <= ins.from_ir < len(ir_instrs)
            else None
        )
        rows.append(
            {
                "offset": offset,
                "bytes": format_bytes_hex(chunk),
                "asm": ins.text,
                "ir": ir_text,
            }
        )
    return {
        "hex": format_bytes_hex(binary),
        "size": len(binary),
        "rows": rows,
    }
