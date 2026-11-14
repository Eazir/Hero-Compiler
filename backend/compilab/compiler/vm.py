"""Máquina virtual de ejecución (F5/F7)."""
from dataclasses import dataclass
from compilab.contract.models import RunResult


@dataclass(frozen=True)
class VmState:
    registers: list[int]
    pc: int


def run(binary: bytes, max_steps: int = 1000) -> RunResult:
    return RunResult(stdout=[], exitCode=0, steps=[])
