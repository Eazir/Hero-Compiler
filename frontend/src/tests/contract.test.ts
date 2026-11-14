import { describe, it, expect } from 'vitest';
import okBasic from '../../../contract/fixtures/ok_basic.json';
import errSemantic from '../../../contract/fixtures/err_semantic.json';
import errSyntactic from '../../../contract/fixtures/err_syntactic.json';
import { CompileResponse } from '../api/schema';
import { assign, bin, num, v, printStmt } from '../domain/blocks';
import { toSource } from '../domain/serialize';

describe('Validación de Contrato v1 (Zod)', () => {
  it('la fixture válida cumple el esquema', () => {
    const parsed = CompileResponse.safeParse(okBasic);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ok).toBe(true);
      expect(parsed.data.phases).toHaveLength(7);
      expect(parsed.data.phases[0].id).toBe('lexical');
      expect(parsed.data.phases[6].id).toBe('binary');
    }
  });

  it('la fixture de error semántico cumple el esquema', () => {
    const parsed = CompileResponse.safeParse(errSemantic);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error?.code).toBe('E-301');
      expect(parsed.data.phases).toHaveLength(7);
    }
  });

  it('la fixture de error sintáctico cumple el esquema', () => {
    const parsed = CompileResponse.safeParse(errSyntactic);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error?.code).toBe('E-201');
      expect(parsed.data.phases).toHaveLength(7);
    }
  });

  it('rechaza una respuesta sin fases', () => {
    const bad = { ...okBasic, phases: undefined };
    expect(CompileResponse.safeParse(bad).success).toBe(false);
  });

  it('rechaza una respuesta con fases en orden incorrecto', () => {
    const bad = {
      ...okBasic,
      phases: [...okBasic.phases].reverse(),
    };
    expect(CompileResponse.safeParse(bad).success).toBe(false);
  });
});

describe('Serializador de bloques a MiniArit', () => {
  it('serializa expresión sin paréntesis innecesarios: c = a + b * 2', () => {
    const program = [
      assign('c', bin('+', v('a'), bin('*', v('b'), num(2)))),
    ];
    const { text } = toSource(program);
    expect(text).toBe('c = a + b * 2');
  });

  it('conserva paréntesis cuando la precedencia lo exige: c = (a + b) * 2', () => {
    const program = [
      assign('c', bin('*', bin('+', v('a'), v('b')), num(2))),
    ];
    const { text } = toSource(program);
    expect(text).toBe('c = (a + b) * 2');
  });

  it('serializa print con variable', () => {
    const program = [printStmt(v('c'))];
    const { text } = toSource(program);
    expect(text).toBe('print(c)');
  });
});

