import { Expr, Program, Stmt } from './blocks';
import { BlockPath, SourceMap } from './sourceMap';

export interface SerializeResult {
  text: string;
  sourceMap: SourceMap;
}

function precedence(op: '+' | '-' | '*'): number {
  if (op === '*') return 2;
  return 1;
}

interface SerializeState {
  lineNum: number;
  col: number;
  sourceMap: SourceMap;
}

function serializeExprWithMap(
  expr: Expr,
  state: SerializeState,
  path: BlockPath,
  parentPrecedence: number
): string {
  const startCol = state.col;
  const needsParens =
    expr.kind === 'bin' && precedence(expr.op) < parentPrecedence;

  if (needsParens) {
    state.col += 1; // '('
  }

  let innerText = '';

  switch (expr.kind) {
    case 'num': {
      const s = String(expr.value);
      state.col += s.length;
      innerText = s;
      break;
    }
    case 'var': {
      const s = expr.name;
      state.col += s.length;
      innerText = s;
      break;
    }
    case 'neg': {
      state.col += 1; // '-'
      const operandPath = [...path, 'operand'];
      const operandText = serializeExprWithMap(
        expr.operand,
        state,
        operandPath,
        3
      );
      innerText = `-${operandText}`;
      break;
    }
    case 'bin': {
      const currentPrec = precedence(expr.op);
      const leftPath = [...path, 'left'];
      const leftStr = serializeExprWithMap(
        expr.left,
        state,
        leftPath,
        currentPrec
      );

      state.col += 3; // ' + ' (espacio, operador, espacio)

      const rightPrec = expr.op === '-' ? currentPrec + 1 : currentPrec;
      const rightPath = [...path, 'right'];
      const rightStr = serializeExprWithMap(
        expr.right,
        state,
        rightPath,
        rightPrec
      );

      innerText = `${leftStr} ${expr.op} ${rightStr}`;
      break;
    }
  }

  if (needsParens) {
    state.col += 1; // ')'
    innerText = `(${innerText})`;
  }

  state.sourceMap.push({
    span: {
      line: state.lineNum,
      col: startCol,
      len: innerText.length,
    },
    path,
  });

  return innerText;
}

function serializeStmtWithMap(
  stmt: Stmt,
  idx: number,
  sourceMap: SourceMap
): string {
  const lineNum = idx + 1;
  const state: SerializeState = { lineNum, col: 1, sourceMap };

  let stmtText = '';
  if (stmt.kind === 'assign') {
    const prefix = `${stmt.name} = `;
    state.col += prefix.length;
    const exprText = serializeExprWithMap(stmt.expr, state, [idx, 'expr'], 0);
    stmtText = `${prefix}${exprText}`;
  } else if (stmt.kind === 'print') {
    const prefix = 'print(';
    state.col += prefix.length;
    const exprText = serializeExprWithMap(stmt.expr, state, [idx, 'expr'], 0);
    state.col += 1; // ')'
    stmtText = `${prefix}${exprText})`;
  }

  sourceMap.push({
    span: {
      line: lineNum,
      col: 1,
      len: stmtText.length,
    },
    path: [idx],
  });

  return stmtText;
}

export function toSource(program: Program): SerializeResult {
  const lines: string[] = [];
  const sourceMap: SourceMap = [];

  program.forEach((stmt, idx) => {
    const lineText = serializeStmtWithMap(stmt, idx, sourceMap);
    lines.push(lineText);
  });

  return {
    text: lines.join('\n'),
    sourceMap,
  };
}
