/**
 * Modelo de bloques del editor visual (CompiLab).
 * Estructura pura, libre de React y dependencias de UI.
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

export const MAX_FRAGMENTS = 36;
export const MAX_LINES = 20;

// Constructores de expresiones
export const num = (value: number): Expr => ({ kind: 'num', value });
export const n = num;

export const v = (name: string): Expr => ({ kind: 'var', name });
export const varExpr = v;

export const neg = (operand: Expr): Expr => ({ kind: 'neg', operand });

export const bin = (op: '+' | '-' | '*', left: Expr, right: Expr): Expr => ({
  kind: 'bin',
  op,
  left,
  right,
});

// Constructores de sentencias
export const assign = (name: string, expr: Expr): Stmt => ({
  kind: 'assign',
  name,
  expr,
});

export const printStmt = (expr: Expr): Stmt => ({ kind: 'print', expr });
export const print = printStmt;

/**
 * Conteo determinista de fragmentos en el programa.
 * Cada bloque interactivo cuenta como 1 fragmento:
 * - assign: 1 (cabecera/asignación) + fragmentos de su expresión
 * - print: 1 (cabecera print) + fragmentos de su expresión
 * - num / var: 1
 * - neg: 1 + fragmentos de su operando
 * - bin: 1 (el operador) + fragmentos de izq + fragmentos de der
 */
export function countExprFragments(expr: Expr): number {
  switch (expr.kind) {
    case 'num':
    case 'var':
      return 1;
    case 'neg':
      return 1 + countExprFragments(expr.operand);
    case 'bin':
      return 1 + countExprFragments(expr.left) + countExprFragments(expr.right);
  }
}

export function countStmtFragments(stmt: Stmt): number {
  return 1 + countExprFragments(stmt.expr);
}

export function countFragments(program: Program): number {
  return program.reduce((acc, stmt) => acc + countStmtFragments(stmt), 0);
}

export type FragmentType =
  | 'assign'
  | 'print'
  | 'var'
  | 'num'
  | '+'
  | '-'
  | '*'
  | 'neg';

export interface CanAddResult {
  ok: boolean;
  reason?: 'MAX_FRAGMENTS' | 'MAX_LINES';
}

/**
 * Verifica si es posible agregar un fragmento al programa respetando los límites.
 */
export function canAdd(program: Program, fragmentType: FragmentType): CanAddResult {
  const isStatement = fragmentType === 'assign' || fragmentType === 'print';
  if (isStatement && program.length >= MAX_LINES) {
    return { ok: false, reason: 'MAX_LINES' };
  }

  const currentFragments = countFragments(program);
  if (currentFragments >= MAX_FRAGMENTS) {
    return { ok: false, reason: 'MAX_FRAGMENTS' };
  }

  return { ok: true };
}

/**
 * Genera un programa válido con exactamente `count` fragmentos.
 */
export function programWithFragments(count: number): Program {
  if (count <= 0) return [];
  if (count === 1) {
    // Caso límite: assign sin expresión completa (no habitual) o sentencia mínima
    return [assign('a', num(0))];
  }
  if (count === 12) {
    return [
      assign('a', num(5)), // 2
      assign('b', num(3)), // 2
      assign('c', bin('+', v('a'), bin('*', v('b'), num(2)))), // 6
      printStmt(v('c')), // 2
    ];
  }

  // Construcción progresiva para cualquier count <= 12
  const program: Program = [];
  let remaining = count;

  let varIdx = 0;
  while (remaining >= 2) {
    const varName = String.fromCharCode(97 + (varIdx % 26));
    varIdx++;
    if (remaining === 2) {
      program.push(assign(varName, num(1))); // 2
      remaining -= 2;
    } else if (remaining === 3) {
      program.push(assign(varName, neg(num(1)))); // 3
      remaining -= 3;
    } else if (remaining >= 4) {
      program.push(assign(varName, bin('+', num(1), num(2)))); // 4
      remaining -= 4;
    }
  }

  return program;
}

/**
 * Programa de referencia con variable 'd' indefinida en la línea 3.
 * a = 5
 * b = 3
 * c = a + d * 2
 */
export const programWithUndefinedD: Program = [
  assign('a', num(5)),
  assign('b', num(3)),
  assign('c', bin('+', v('a'), bin('*', v('d'), num(2)))),
];

/**
 * Actualiza un nodo en la ruta especificada de forma inmutable.
 */
export function updateNodeAtPath(
  program: Program,
  path: (string | number)[],
  replacement: Expr | Stmt
): Program {
  if (path.length === 0) return program;

  const [stmtIdxRaw, ...rest] = path;
  const stmtIdx = typeof stmtIdxRaw === 'number' ? stmtIdxRaw : parseInt(stmtIdxRaw, 10);
  if (stmtIdx < 0 || stmtIdx >= program.length) return program;

  const newProgram = [...program];
  if (rest.length === 0) {
    newProgram[stmtIdx] = replacement as Stmt;
    return newProgram;
  }

  function updateExpr(expr: Expr, subPath: (string | number)[]): Expr {
    if (subPath.length === 0) return replacement as Expr;
    const [head, ...tail] = subPath;

    if (head === 'operand' && expr.kind === 'neg') {
      return { ...expr, operand: updateExpr(expr.operand, tail) };
    }
    if (expr.kind === 'bin') {
      if (head === 'left') {
        return { ...expr, left: updateExpr(expr.left, tail) };
      }
      if (head === 'right') {
        return { ...expr, right: updateExpr(expr.right, tail) };
      }
    }
    return replacement as Expr;
  }

  const currentStmt = newProgram[stmtIdx];
  if (rest[0] === 'expr') {
    const exprPath = rest.slice(1);
    if (exprPath.length === 0) {
      newProgram[stmtIdx] = { ...currentStmt, expr: replacement as Expr };
    } else {
      newProgram[stmtIdx] = {
        ...currentStmt,
        expr: updateExpr(currentStmt.expr, exprPath),
      };
    }
  }

  return newProgram;
}

/**
 * Obtiene el nodo (Expr o Stmt) ubicado en la ruta especificada.
 */
export function getNodeAtPath(
  program: Program,
  path: (string | number)[]
): Expr | Stmt | null {
  if (path.length === 0) return null;
  const [stmtIdxRaw, ...rest] = path;
  const stmtIdx = typeof stmtIdxRaw === 'number' ? stmtIdxRaw : parseInt(stmtIdxRaw, 10);
  if (stmtIdx < 0 || stmtIdx >= program.length) return null;

  const stmt = program[stmtIdx];
  if (rest.length === 0) return stmt;

  if (rest[0] === 'expr') {
    let curr: Expr = stmt.expr;
    for (let i = 1; i < rest.length; i++) {
      const part = rest[i];
      if (curr.kind === 'neg' && part === 'operand') {
        curr = curr.operand;
      } else if (curr.kind === 'bin') {
        if (part === 'left') curr = curr.left;
        else if (part === 'right') curr = curr.right;
        else return null;
      } else {
        return null;
      }
    }
    return curr;
  }
  return null;
}

/**
 * Modifica el nombre de la variable de una asignación en el índice indicado.
 */
export function updateStmtName(
  program: Program,
  index: number,
  newName: string
): Program {
  if (index < 0 || index >= program.length) return program;
  const stmt = program[index];
  if (stmt.kind !== 'assign') return program;
  const next = [...program];
  next[index] = { ...stmt, name: newName };
  return next;
}

