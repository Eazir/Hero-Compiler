"""Modelos Pydantic v2 del contrato JSON v1 entre backend y frontend."""
from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

PhaseId = Literal[
    "lexical",
    "syntactic",
    "semantic",
    "ir",
    "optimization",
    "assembly",
    "binary",
]

PhaseStatus = Literal["ok", "error", "skipped"]

EXPECTED_PHASE_ORDER: list[PhaseId] = [
    "lexical",
    "syntactic",
    "semantic",
    "ir",
    "optimization",
    "assembly",
    "binary",
]


class Span(BaseModel):
    """Rango en el código fuente (posiciones 1-based)."""
    model_config = ConfigDict(extra="allow")

    line: int
    col: int
    len: int


class Focus(BaseModel):
    """Elemento a enfocar/resaltar en la interfaz."""
    model_config = ConfigDict(extra="allow")

    span: Optional[Span] = None
    nodeIds: list[str] = Field(default_factory=list)


class Step(BaseModel):
    """Un paso atómico dentro de una fase para el reproductor."""
    model_config = ConfigDict(extra="allow")

    i: int
    title: str
    explain: str
    focus: Optional[Focus] = None
    ops: list[dict[str, Any]] = Field(default_factory=list)


class PhaseResult(BaseModel):
    """Resultado y traza de una de las 7 fases."""
    model_config = ConfigDict(extra="allow")

    id: PhaseId
    name: str
    status: PhaseStatus
    summary: str = ""
    steps: list[Step] = Field(default_factory=list)
    output: Optional[dict[str, Any]] = None


class Executable(BaseModel):
    """Representación del ejecutable binario resultante."""
    model_config = ConfigDict(extra="allow")

    hex: str
    size: int


class RunStep(BaseModel):
    """Paso de ejecución de la máquina virtual."""
    model_config = ConfigDict(extra="allow")

    pc: int
    asm: str
    registers: list[int]


class RunResult(BaseModel):
    """Resultado de la ejecución del binario en la VM."""
    model_config = ConfigDict(extra="allow")

    stdout: list[str] = Field(default_factory=list)
    exitCode: int = 0
    steps: list[RunStep] = Field(default_factory=list)


class Fix(BaseModel):
    """Sugerencia de corrección estructurada para el editor de bloques."""
    model_config = ConfigDict(extra="allow")

    label: str
    kind: str


class ErrorInfo(BaseModel):
    """Información completa de error de compilación o ejecución."""
    model_config = ConfigDict(extra="allow")

    code: str
    kind: str
    phase: str
    message: str
    why: str
    hint: str
    span: Optional[Span] = None
    stepIndex: int = 0
    fixes: list[dict[str, Any]] = Field(default_factory=list)


class Meta(BaseModel):
    """Metadatos de la compilación."""
    model_config = ConfigDict(extra="allow")

    sourceLength: int
    lineCount: int
    elapsedMs: float = 0.0


class CompileRequest(BaseModel):
    """Cuerpo de petición para POST /api/compile."""
    model_config = ConfigDict(extra="forbid")

    source: str
    optimize: bool = True


class CompileResponse(BaseModel):
    """Respuesta canónica de POST /api/compile (esquema v1)."""
    model_config = ConfigDict(extra="allow")

    version: int = 1
    ok: bool
    phases: list[PhaseResult]
    executable: Optional[Executable] = None
    run: Optional[RunResult] = None
    error: Optional[ErrorInfo] = None
    meta: Optional[Meta] = None

    @field_validator("phases")
    @classmethod
    def validate_phases_order(cls, phases: list[PhaseResult]) -> list[PhaseResult]:
        if len(phases) != 7:
            raise ValueError(f"phases debe contener exactamente 7 fases, contiene {len(phases)}")
        actual_order = [p.id for p in phases]
        if actual_order != EXPECTED_PHASE_ORDER:
            raise ValueError(
                f"El orden de las fases debe ser {EXPECTED_PHASE_ORDER}, recibido: {actual_order}"
            )
        return phases
