export interface SourceSpan {
  line: number;
  col: number;
  len: number;
}

export interface SourceMapEntry {
  span: SourceSpan;
  blockPath: string;
}

export type SourceMap = SourceMapEntry[];
