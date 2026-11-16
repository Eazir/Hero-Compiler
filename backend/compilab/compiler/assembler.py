"""Generador de código ensamblador y asignador de registros (F5 / BE-5).

Traduce las instrucciones de código intermedio (TAC) al conjunto de instrucciones
de la máquina objetivo (ISA CompiLab) con 8 registros (R0-R7) y celdas de memoria
para variables de usuario.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from compilab.compiler.errors import CompileError
from compilab.compiler.ir import Operand, TacInstr
from compilab.compiler.tracer import Tracer

MAX_REGISTERS = 8


@dataclass(frozen=True)
class AsmInstr:
    pc: int
    opcode: str
    dst: int = 0
    src: int = 0
    imm: int = 0
    from_ir: int | None = None

    @property
    def text(self) -> str:
        if self.opcode == "LOAD":
            return f"LOAD R{self.dst}, [{self.imm}]"
        if self.opcode == "LOADI":
            return f"LOADI R{self.dst}, {self.imm}"
        if self.opcode == "STORE":
            return f"STORE [{self.imm}], R{self.src}"
        if self.opcode in ("ADD", "SUB", "MUL"):
            return f"{self.opcode} R{self.dst}, R{self.src}"
        if self.opcode == "NEG":
            return f"NEG R{self.dst}"
        if self.opcode == "PRINT":
            return f"PRINT R{self.dst}"
        if self.opcode == "HALT":
            return "HALT"
        return f"{self.opcode} R{self.dst}, R{self.src}, {self.imm}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "pc": self.pc,
            "text": self.text,
            "opcode": self.opcode,
            "dst": self.dst,
            "src": self.src,
            "imm": self.imm,
            "fromIr": self.from_ir,
        }


def _is_temp(name: str) -> bool:
    return name.startswith("t") and name[1:].isdigit()


def assemble(instructions: list[TacInstr], tracer: Tracer) -> list[AsmInstr]:
    """Traduce instrucciones TAC a ensamblador ISA CompiLab con asignación de R0..R7."""
    asm_list: list[AsmInstr] = []
    free_regs: list[int] = list(range(MAX_REGISTERS))
    temp_regs: dict[str, int] = {}
    var_addrs: dict[str, int] = {}

    # Determinar el último índice de uso de cada temporal
    last_use: dict[str, int] = {}
    for idx, instr in enumerate(instructions):
        for op_val in (instr.a, instr.b):
            if isinstance(op_val, str) and _is_temp(op_val):
                last_use[op_val] = idx

    def get_var_addr(name: str) -> int:
        if name not in var_addrs:
            var_addrs[name] = len(var_addrs)
        return var_addrs[name]

    def alloc_reg(step_idx: int) -> int:
        if not free_regs:
            raise CompileError(
                code="E-502",
                kind="limit",
                phase="assembly",
                message="Agotamiento de registros: se requieren más de 8 registros simultáneos.",
                why=(
                    "La máquina objetivo dispone únicamente de 8 registros "
                    "de propósito general (R0 a R7)."
                ),
                hint="Simplifica la expresión o divídela en asignaciones intermedias.",
                span=None,
                step_index=step_idx,
            )
        free_regs.sort()
        return free_regs.pop(0)

    def free_reg(reg: int) -> None:
        if reg not in free_regs:
            free_regs.append(reg)
            free_regs.sort()

    def emit(
        opcode: str,
        dst: int = 0,
        src: int = 0,
        imm: int = 0,
        from_ir: int | None = None,
    ) -> AsmInstr:
        ins = AsmInstr(
            pc=len(asm_list),
            opcode=opcode,
            dst=dst,
            src=src,
            imm=imm,
            from_ir=from_ir,
        )
        asm_list.append(ins)
        return ins

    def load_operand(val: Operand, ir_idx: int) -> tuple[int, bool]:
        """Carga un operando en un registro y devuelve (reg, es_temporal_efimero)."""
        if isinstance(val, int):
            r = alloc_reg(ir_idx)
            ins = emit("LOADI", dst=r, src=0, imm=val, from_ir=ir_idx)
            tracer.step(
                title=f"Cargar constante en R{r}",
                explain=f"{ins.text} carga el valor inmediato {val} en R{r}.",
                ops=[{"op": "alloc", "reg": f"R{r}"}, {"op": "emit", "asm": ins.text}],
            )
            return r, True

        if _is_temp(val):
            if val in temp_regs:
                r = temp_regs[val]
                is_last = last_use.get(val, -1) <= ir_idx
                if is_last:
                    del temp_regs[val]
                return r, is_last
            # En caso de temporal no registrado previamente
            r = alloc_reg(ir_idx)
            ins = emit("LOADI", dst=r, src=0, imm=0, from_ir=ir_idx)
            return r, True

        # Variable de usuario en memoria
        addr = get_var_addr(val)
        r = alloc_reg(ir_idx)
        ins = emit("LOAD", dst=r, src=0, imm=addr, from_ir=ir_idx)
        tracer.step(
            title=f"Cargar variable '{val}' en R{r}",
            explain=f"{ins.text} lee la variable '{val}' desde la celda [{addr}].",
            ops=[{"op": "alloc", "reg": f"R{r}"}, {"op": "emit", "asm": ins.text}],
        )
        return r, True

    for ir_idx, instr in enumerate(instructions):
        if instr.op == "print":
            assert instr.a is not None
            reg, ephemeral = load_operand(instr.a, ir_idx)
            ins = emit("PRINT", dst=reg, src=0, imm=0, from_ir=ir_idx)
            tracer.step(
                title=f"Imprimir desde R{reg}",
                explain=f"{ins.text} envía el contenido de R{reg} a la salida estándar.",
                ops=[{"op": "emit", "asm": ins.text}],
            )
            if ephemeral:
                free_reg(reg)

        elif instr.op == "=":
            assert instr.dst is not None and instr.a is not None
            reg, ephemeral = load_operand(instr.a, ir_idx)
            if _is_temp(instr.dst):
                if not ephemeral:
                    dst_reg = alloc_reg(ir_idx)
                    # Copiar sumando 0 o usando registro
                    temp_regs[instr.dst] = dst_reg
                else:
                    temp_regs[instr.dst] = reg
                    if last_use.get(instr.dst, -1) < ir_idx:
                        del temp_regs[instr.dst]
                        free_reg(reg)
            else:
                addr = get_var_addr(instr.dst)
                ins = emit("STORE", dst=0, src=reg, imm=addr, from_ir=ir_idx)
                tracer.step(
                    title=f"Guardar R{reg} en '{instr.dst}'",
                    explain=f"{ins.text} almacena R{reg} en la celda [{addr}] ('{instr.dst}').",
                    ops=[{"op": "emit", "asm": ins.text}, {"op": "free", "reg": f"R{reg}"}],
                )
                if ephemeral:
                    free_reg(reg)

        elif instr.op == "neg":
            assert instr.dst is not None and instr.a is not None
            reg, ephemeral = load_operand(instr.a, ir_idx)
            if not ephemeral:
                # Necesitamos no sobrescribir un temporal que se usa después
                new_r = alloc_reg(ir_idx)
                emit("LOADI", dst=new_r, src=0, imm=0, from_ir=ir_idx)
                ins = emit("SUB", dst=new_r, src=reg, imm=0, from_ir=ir_idx)
                target_reg = new_r
            else:
                ins = emit("NEG", dst=reg, src=0, imm=0, from_ir=ir_idx)
                target_reg = reg
            tracer.step(
                title=f"Negar valor en R{target_reg}",
                explain=f"{ins.text} invierte el signo en R{target_reg}.",
                ops=[{"op": "emit", "asm": ins.text}],
            )
            if _is_temp(instr.dst):
                if last_use.get(instr.dst, -1) > ir_idx:
                    temp_regs[instr.dst] = target_reg
                else:
                    free_reg(target_reg)
            else:
                addr = get_var_addr(instr.dst)
                st = emit("STORE", dst=0, src=target_reg, imm=addr, from_ir=ir_idx)
                tracer.step(
                    title=f"Guardar R{target_reg} en '{instr.dst}'",
                    explain=f"{st.text} almacena el resultado en [{addr}].",
                    ops=[{"op": "emit", "asm": st.text}],
                )
                free_reg(target_reg)

        elif instr.op in ("+", "-", "*"):
            assert instr.dst is not None and instr.a is not None and instr.b is not None
            reg_a, eph_a = load_operand(instr.a, ir_idx)
            reg_b, eph_b = load_operand(instr.b, ir_idx)
            op_map = {"+": "ADD", "-": "SUB", "*": "MUL"}
            asm_op = op_map[instr.op]

            if eph_a:
                dst_reg = reg_a
            else:
                dst_reg = alloc_reg(ir_idx)
                emit("LOADI", dst=dst_reg, src=0, imm=0, from_ir=ir_idx)
                emit("ADD", dst=dst_reg, src=reg_a, imm=0, from_ir=ir_idx)

            ins = emit(asm_op, dst=dst_reg, src=reg_b, imm=0, from_ir=ir_idx)
            if eph_b and reg_b != dst_reg:
                free_reg(reg_b)

            tracer.step(
                title=f"Operación {asm_op} en R{dst_reg}",
                explain=f"{ins.text} calcula el resultado en R{dst_reg}.",
                ops=[{"op": "emit", "asm": ins.text}],
            )

            if _is_temp(instr.dst):
                if last_use.get(instr.dst, -1) > ir_idx:
                    temp_regs[instr.dst] = dst_reg
                else:
                    free_reg(dst_reg)
            else:
                addr = get_var_addr(instr.dst)
                st = emit("STORE", dst=0, src=dst_reg, imm=addr, from_ir=ir_idx)
                tracer.step(
                    title=f"Guardar R{dst_reg} en '{instr.dst}'",
                    explain=f"{st.text} almacena R{dst_reg} en [{addr}].",
                    ops=[{"op": "emit", "asm": st.text}],
                )
                free_reg(dst_reg)

    halt_ins = emit("HALT", dst=0, src=0, imm=0, from_ir=None)
    tracer.step(
        title="Terminar ejecución",
        explain="HALT finaliza el programa con código 0.",
        ops=[{"op": "emit", "asm": halt_ins.text}],
    )
    return asm_list
