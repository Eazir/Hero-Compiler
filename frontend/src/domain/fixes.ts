import { Expr, Program, Stmt, assign } from './blocks';

export interface InsertAssignmentFix {
  kind: 'insert_assignment';
  label?: string;
  name: string;
  value: number;
  beforeLine: number;
}

export interface ReplaceVariableFix {
  kind: 'replace_variable';
  label?: string;
  line: number;
  from: string;
  to: string;
}

export type StructuredFix =
  | InsertAssignmentFix
  | ReplaceVariableFix
  | { kind: string; label?: string; [key: string]: unknown };

function replaceVarInExpr(expr: Expr, fromName: string, toName: string): Expr {
  switch (expr.kind) {
    case 'num':
      return expr;
    case 'var':
      return expr.name === fromName ? { kind: 'var', name: toName } : expr;
    case 'neg':
      return { kind: 'neg', operand: replaceVarInExpr(expr.operand, fromName, toName) };
    case 'bin':
      return {
        kind: 'bin',
        op: expr.op,
        left: replaceVarInExpr(expr.left, fromName, toName),
        right: replaceVarInExpr(expr.right, fromName, toName),
      };
  }
}

export function applyFix(program: Program, fix: StructuredFix): Program {
  if (fix.kind === 'insert_assignment') {
    const f = fix as InsertAssignmentFix;
    const newStmt: Stmt = assign(f.name, { kind: 'num', value: f.value ?? 4 });
    const insertIdx = Math.max(0, Math.min(program.length, (f.beforeLine ?? 1) - 1));
    const updated = [...program];
    updated.splice(insertIdx, 0, newStmt);
    return updated;
  }

  if (fix.kind === 'replace_variable') {
    const f = fix as ReplaceVariableFix;
    const stmtIdx = (f.line ?? 1) - 1;
    if (stmtIdx < 0 || stmtIdx >= program.length) return program;
    const updated = [...program];
    const targetStmt = updated[stmtIdx];
    updated[stmtIdx] = {
      ...targetStmt,
      expr: replaceVarInExpr(targetStmt.expr, f.from, f.to),
    };
    return updated;
  }

  return program;
}
