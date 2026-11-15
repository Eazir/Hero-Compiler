export interface SourceSpan {
  line: number;
  col: number;
  len: number;
}

export type BlockPath = (string | number)[];

export interface SourceMapEntry {
  span: SourceSpan;
  path: BlockPath;
}

export type SourceMap = SourceMapEntry[];

/**
 * Devuelve la ruta del bloque más específico (menor span.len)
 * que contiene la posición (line, col).
 */
export function pathAt(
  sourceMap: SourceMap,
  pos: { line: number; col: number }
): BlockPath | null {
  const matches = sourceMap.filter((entry) => {
    if (entry.span.line !== pos.line) return false;
    return pos.col >= entry.span.col && pos.col < entry.span.col + entry.span.len;
  });

  if (matches.length === 0) return null;

  // Ordenar de menor a mayor longitud (el más anidado/específico primero)
  matches.sort((a, b) => a.span.len - b.span.len);
  return matches[0].path;
}
