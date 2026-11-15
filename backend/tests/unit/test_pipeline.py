"""Pruebas del orquestador del pipeline en F1."""

from compilab.compiler.pipeline import compile_source


def test_pipeline_compile_source_valido() -> None:
    res = compile_source("a = 5\nprint(a)")
    assert res.ok is True
    assert res.phases[0].id == "lexical"
    assert res.phases[0].status == "ok"
    assert res.phases[0].output is not None
    tokens = res.phases[0].output["tokens"]
    assert len(tokens) >= 5


def test_pipeline_compile_source_error_lexico() -> None:
    res = compile_source("a = @")
    assert res.ok is False
    assert res.phases[0].status == "error"
    assert res.error is not None
    assert res.error.code == "E-101"
    assert res.phases[1].status == "skipped"
