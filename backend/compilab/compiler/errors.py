"""Definición de errores de compilación y catálogo de códigos."""
from __future__ import annotations

from typing import Any, Optional
from compilab.contract.models import ErrorInfo, Span


class CompileError(Exception):
    """Excepción lanzada por cualquier fase del compilador ante un error de usuario."""

    def __init__(
        self,
        code: str,
        kind: str,
        phase: str,
        message: str,
        why: str,
        hint: str,
        span: Optional[Span] = None,
        step_index: int = 0,
        fixes: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.kind = kind
        self.phase = phase
        self.message = message
        self.why = why
        self.hint = hint
        self.span = span
        self.step_index = step_index
        self.fixes = fixes or []

    def to_error_info(self) -> ErrorInfo:
        return ErrorInfo(
            code=self.code,
            kind=self.kind,
            phase=self.phase,
            message=self.message,
            why=self.why,
            hint=self.hint,
            span=self.span,
            stepIndex=self.step_index,
            fixes=self.fixes,
        )
