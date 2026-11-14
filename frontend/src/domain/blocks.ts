/**
 * Modelo de bloques del editor visual.
 * Estructura libre de React y dependencias de UI.
 */

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'neg'; operand: Expr }
  | { kind: 'bin'; op: '+' | '-' | '*'; left: Expr; right: Expr };

export type Stmt =
  | { kind: 'assign'; name: string; expr: Expr }
  | { kind: 'print'; expr: Expr };

export type Program = Stmt[];

export const num = (value: number): Expr => ({ kind: 'num', value });
export const v = (name: string): Expr => ({ kind: 'var', name });
export const neg = (operand: Expr): Expr => ({ kind: 'neg', operand });
export const bin = (op: '+' | '-' | '*', left: Expr, right: Expr): Expr => ({
  kind: 'bin',
  op,
  left,
  right,
});

export const assign = (name: string, expr: Expr): Stmt => ({ kind: 'assign', name, expr });
export const printStmt = (expr: Expr): Stmt => ({ kind: 'print', expr });
