"""Máquina virtual de ejecución para ISA CompiLab (F5 / BE-5).

Ejecuta el binario de 8 bytes por instrucción con 8 registros (R0-R7),
memoria lineal de variables, límite de 1000 pasos (E-503) y detección de
desbordamiento aritmético de 32 bits en tiempo de ejecución (E-402).
"""

from __future__ import annotations

from dataclasses import dataclass

from compilab.compiler.encoder import decode
from compilab.compiler.errors import CompileError
from compilab.contract.models import RunResult, RunStep

INT32_MIN = -2_147_483_648
INT32_MAX = 2_147_483_647


@dataclass(frozen=True)
class VmState:
    registers: list[int]
    pc: int


def _check_overflow(value: int, step_idx: int, asm_text: str) -> int:
    if value < INT32_MIN or value > INT32_MAX:
        raise CompileError(
            code="E-402",
            kind="arithmetic",
            phase="binary",
            message=(
                f"Desbordamiento aritmético en ejecución durante '{asm_text}': "
                f"resultado {value} fuera del rango de 32 bits."
            ),
            why="Los registros de la máquina virtual almacenan enteros de 32 bits con signo.",
            hint="Reduce la magnitud de los valores operados para no superar 2,147,483,647.",
            span=None,
            step_index=step_idx,
        )
    return value


def run(binary: bytes, max_steps: int = 1000) -> RunResult:
    """Ejecuta el código binario en la VM y retorna stdout, exitCode y pasos."""
    if not binary:
        return RunResult(stdout=[], exitCode=0, steps=[])

    instructions = decode(binary)
    registers: list[int] = [0] * 8
    memory: dict[int, int] = {}
    stdout: list[str] = []
    steps: list[RunStep] = []

    pc = 0
    step_count = 0

    while 0 <= pc < len(instructions):
        if step_count >= max_steps:
            raise CompileError(
                code="E-503",
                kind="limit",
                phase="binary",
                message=f"Límite de pasos de ejecución excedido ({max_steps} pasos).",
                why=(
                    "La máquina virtual detiene programas que superan "
                    "el máximo de ciclos permitidos."
                ),
                hint="Simplifica el programa para que requiera menos instrucciones.",
                span=None,
                step_index=step_count,
            )

        ins = instructions[pc]
        step_count += 1

        if ins.opcode == "LOAD":
            registers[ins.dst] = memory.get(ins.imm, 0)
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "LOADI":
            registers[ins.dst] = _check_overflow(ins.imm, step_count - 1, ins.text)
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "STORE":
            memory[ins.imm] = registers[ins.src]
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "ADD":
            res = registers[ins.dst] + registers[ins.src]
            registers[ins.dst] = _check_overflow(res, step_count - 1, ins.text)
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "SUB":
            res = registers[ins.dst] - registers[ins.src]
            registers[ins.dst] = _check_overflow(res, step_count - 1, ins.text)
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "MUL":
            res = registers[ins.dst] * registers[ins.src]
            registers[ins.dst] = _check_overflow(res, step_count - 1, ins.text)
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "NEG":
            res = -registers[ins.dst]
            registers[ins.dst] = _check_overflow(res, step_count - 1, ins.text)
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "PRINT":
            stdout.append(str(registers[ins.dst]))
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            pc += 1
        elif ins.opcode == "HALT":
            steps.append(RunStep(pc=pc, asm=ins.text, registers=list(registers)))
            break
        else:
            pc += 1

    return RunResult(stdout=stdout, exitCode=0, steps=steps)
