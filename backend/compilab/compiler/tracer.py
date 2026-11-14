"""Módulo de rastreo y registro de pasos de cada fase."""

from __future__ import annotations

from typing import Any, Optional

from compilab.contract.models import Focus, Step

DEFAULT_MAX_STEPS: int = 200


class Tracer:
    """Registrador determinista de pasos para una fase del compilador."""

    def __init__(self, max_steps: int = DEFAULT_MAX_STEPS) -> None:
        self.max_steps = max_steps
        self.steps: list[Step] = []

    def step(
        self,
        title: str,
        explain: str,
        ops: Optional[list[dict[str, Any]]] = None,
        focus: Optional[Focus] = None,
    ) -> None:
        """Registra un nuevo paso en la traza si no ha superado el límite."""
        if len(self.steps) >= self.max_steps:
            return
        step_idx = len(self.steps)
        self.steps.append(
            Step(
                i=step_idx,
                title=title,
                explain=explain,
                ops=ops or [],
                focus=focus,
            )
        )

    def get_steps(self) -> list[Step]:
        return list(self.steps)
