import { describe, expect, test } from 'vitest';
import {
  MAX_FRAGMENTS,
  MAX_LINES,
  Program,
  assign,
  bin,
  canAdd,
  countFragments,
  n,
  neg,
  print,
  programWithFragments,
  programWithUndefinedD,
  v,
} from '../domain/blocks';
import { toSource } from '../domain/serialize';
import { pathAt } from '../domain/sourceMap';

describe('FE-2: Editor de bloques, límites ampliados y serialización', () => {
  const cases: [Program, string][] = [
    [[assign('c', bin('+', v('a'), bin('*', v('b'), n(2))))], 'c = a + b * 2'],
    [[assign('c', bin('*', bin('+', v('a'), v('b')), n(2)))], 'c = (a + b) * 2'],
    [[assign('c', bin('-', v('a'), bin('-', v('b'), n(1))))], 'c = a - (b - 1)'],
    [[print(neg(v('a')))], 'print(-a)'],
  ];

  test.each(cases)('serializa el caso %#', (program, text) => {
    expect(toSource(program).text).toBe(text);
  });

  test('el conteo de fragmentos para el ejemplo canónico suma 12', () => {
    const canonical = programWithFragments(12);
    expect(countFragments(canonical)).toBe(12);
  });

  test('rechaza agregar más allá del límite ampliado MAX_FRAGMENTS (36)', () => {
    expect(canAdd(programWithFragments(MAX_FRAGMENTS), 'num')).toEqual({
      ok: false,
      reason: 'MAX_FRAGMENTS',
    });
  });

  test('permite agregar fragmento cuando hay menos de MAX_FRAGMENTS', () => {
    expect(canAdd(programWithFragments(12), 'num')).toEqual({ ok: true });
  });

  test('rechaza una sentencia adicional al superar el límite ampliado MAX_LINES (20)', () => {
    const fourLines: Program = [
      assign('a', n(1)),
      assign('b', n(2)),
      assign('c', n(3)),
      assign('d', n(4)),
    ];
    expect(canAdd(fourLines, 'assign')).toEqual({ ok: true });

    const fullLines: Program = Array.from({ length: MAX_LINES }, (_, i) =>
      assign(`v${i}`, n(1))
    );
    expect(canAdd(fullLines, 'assign')).toEqual({
      ok: false,
      reason: 'MAX_LINES',
    });
  });

  test('el sourceMap ubica la variable d de la línea 3', () => {
    const { sourceMap } = toSource(programWithUndefinedD);
    expect(pathAt(sourceMap, { line: 3, col: 9 })).toEqual([
      2,
      'expr',
      'right',
      'left',
    ]);
  });
});
