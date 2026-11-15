import { Program, Stmt, assign } from './blocks';

export interface InsertAssignmentFix {
  kind: 'insert_assignment';
  name: string;
  value: number;
  beforeLine: number;
}

export interface ReplaceVariableFix {
  kind: 'replace_variable';
  line: number;
  from: string;
  to: string;
}

export type StructuredFix = InsertAssignmentFix | ReplaceVariableFix | { kind: string; [key: string]: unknown };

export function applyFix(program: Program, fix: StructuredFix): Program {
  if (fix.kind === 'insert_assignment') {
    const f = fix as InsertAssignmentFix;
    const newStmt: Stmt = assign(f.name, { kind: 'num', value: f.value });
    const insertIdx = Math.max(0, f.beforeLine - 1);
    const updated = [...program];
    updated.splice(insertIdx, 0, newStmt);
    return updated;
  }
  return program;
}

