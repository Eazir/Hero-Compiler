import { Expr, Program, Stmt } from './blocks';
import { SourceMap } from './sourceMap';

export interface SerializeResult {
  text: string;
  sourceMap: SourceMap;
}

function precedence(op: '+' | '-' | '*'): number {
  if (op === '*') return 2;
  return 1;
}

function serializeExpr(expr: Expr, parentPrecedence = 0): string {
  switch (expr.kind) {
    case 'num':
      return String(expr.value);
    case 'var':
      return expr.name;
    case 'neg': {
      const inner = serializeExpr(expr.operand, 3);
      return `-${inner}`;
    }
    case 'bin': {
      const currentPrec = precedence(expr.op);
      const leftStr = serializeExpr(expr.left, currentPrec);
      // Asocia por la izquierda: el operando derecho necesita paréntesis si tiene la misma precedencia con '-' o '*'
      const rightPrec = expr.op === '-' ? currentPrec + 1 : currentPrec;
      const rightStr = serializeExpr(expr.right, rightPrec);
      const str = `${leftStr} ${expr.op} ${rightStr}`;
      if (currentPrec < parentPrecedence) {
        return `(${str})`;
      }
      return str;
    }
  }
}

function serializeStmt(stmt: Stmt): string {
  switch (stmt.kind) {
    case 'assign':
      return `${stmt.name} = ${serializeExpr(stmt.expr, 0)}`;
    case 'print':
      return `print(${serializeExpr(stmt.expr, 0)})`;
  }
}

export function toSource(program: Program): SerializeResult {
  const lines: string[] = [];
  const sourceMap: SourceMap = [];

  program.forEach((stmt, idx) => {
    const lineText = serializeStmt(stmt);
    const lineNum = idx + 1;
    sourceMap.push({
      span: { line: lineNum, col: 1, len: lineText.length },
      blockPath: `stmt[${idx}]`,
    });
    lines.push(lineText);
  });

  return {
    text: lines.join('\n'),
    sourceMap,
  };
}

