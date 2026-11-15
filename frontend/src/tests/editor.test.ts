import { describe, expect, test } from 'vitest';
import {
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

describe('FE-2: Editor de bloques, límites y serialización', () => {
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

  test('rechaza el fragmento 13', () => {
    expect(canAdd(programWithFragments(12), 'num')).toEqual({
      ok: false,
      reason: 'MAX_FRAGMENTS',
    });
  });

  test('permite agregar fragmento cuando hay menos de 12', () => {
    expect(canAdd(programWithFragments(10), 'num')).toEqual({ ok: true });
  });

  test('rechaza una 9na sentencia por superar el límite de 8 líneas', () => {
    const eightLines: Program = [
      assign('a', n(1)),
      assign('b', n(2)),
      assign('c', n(3)),
      assign('d', n(4)),
    ];
    // Con 4 líneas está ok
    expect(canAdd(eightLines, 'assign')).toEqual({ ok: true });

    // Armar 8 líneas
    const fullEightLines: Program = [
      assign('a', n(1)),
      assign('b', n(1)),
      assign('c', n(1)),
      assign('d', n(1)),
      assign('e', n(1)),
      assign('f', n(1)),
      assign('g', n(1)),
      assign('h', n(1)),
    ];
    expect(canAdd(fullEightLines, 'assign')).toEqual({
      ok: false,
      reason: 'MAX_LINES',
    });
  });

  test('el sourceMap ubica la variable d de la línea 3', () => {
    // a = 5 / b = 3 / c = a + d * 2
    const { sourceMap } = toSource(programWithUndefinedD);
    expect(pathAt(sourceMap, { line: 3, col: 9 })).toEqual([
      2,
      'expr',
      'right',
      'left',
    ]);
  });
});

