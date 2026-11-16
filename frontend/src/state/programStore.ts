import { create } from 'zustand';
import {
  Expr,
  FragmentType,
  MAX_FRAGMENTS,
  MAX_LINES,
  Program,
  Stmt,
  assign,
  bin,
  canAdd,
  countFragments,
  getNodeAtPath,
  neg,
  num,
  printStmt,
  programWithFragments,
  updateNodeAtPath,
  updateStmtName,
  v,
} from '../domain/blocks';
import { BlockPath } from '../domain/sourceMap';

export interface HeroMission {
  id: string;
  title: string;
  desc: string;
  program: Program;
}

export const HERO_MISSIONS: HeroMission[] = [
  {
    id: 'canonical',
    title: 'Misión 1: El Caso Canónico',
    desc: 'a = 5, b = 3, c = a + b * 2, print(c) → Optimiza a 24 bytes',
    program: programWithFragments(12),
  },
  {
    id: 'negation',
    title: 'Misión 2: Precedencia y Negación',
    desc: 'x = 10, y = -x + 4 * 6, print(y) → Prueba menos unario y *',
    program: [
      assign('x', num(10)),
      assign('y', bin('+', neg(v('x')), bin('*', num(4), num(6)))),
      printStmt(v('y')),
    ],
  },
  {
    id: 'chain',
    title: 'Misión 3: Cadena de Variables',
    desc: 'a = 4, b = a * 3, c = b - 2, print(c) → Propagación en cascada',
    program: [
      assign('a', num(4)),
      assign('b', bin('*', v('a'), num(3))),
      assign('c', bin('-', v('b'), num(2))),
      printStmt(v('c')),
    ],
  },
  {
    id: 'associativity',
    title: 'Misión 4: Asociatividad Izquierda',
    desc: 'p = 20 - 5 - 3, print(p) → Evalúa (20 - 5) - 3 = 12',
    program: [
      assign('p', bin('-', bin('-', num(20), num(5)), num(3))),
      printStmt(v('p')),
    ],
  },
];

interface ProgramState {
  program: Program;
  history: Program[];
  fragmentCount: number;
  lineCount: number;
  activeSlot: BlockPath | null;

  setActiveSlot: (slot: BlockPath | null) => void;
  setProgram: (p: Program) => void;
  insertFragment: (
    type: FragmentType,
    targetSlot?: BlockPath | null
  ) => {
    ok: boolean;
    reason?: 'MAX_FRAGMENTS' | 'MAX_LINES';
  };
  updateNode: (path: BlockPath, replacement: Expr | Stmt) => void;
  updateVariableName: (index: number, name: string) => void;
  removeStatement: (index: number) => void;
  moveStatement: (index: number, direction: 'up' | 'down') => void;
  duplicateStatement: (index: number) => { ok: boolean; reason?: 'MAX_FRAGMENTS' | 'MAX_LINES' };
  toggleStatementKind: (index: number) => void;
  swapBinaryOperands: (path: BlockPath) => void;
  unwrapExpr: (path: BlockPath) => void;
  loadMission: (missionId: string) => void;
  undo: () => void;
  canUndo: () => boolean;
  loadDefaultExample: () => void;
  reset: () => void;
}

const defaultExample = programWithFragments(12);

function getNextVarName(prog: Program): string {
  const used = new Set<string>();
  for (const stmt of prog) {
    if (stmt.kind === 'assign') used.add(stmt.name);
  }
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(97 + i);
    if (!used.has(ch)) return ch;
  }
  return `v${prog.length + 1}`;
}

export const useProgramStore = create<ProgramState>((set, get) => ({
  program: defaultExample,
  history: [],
  fragmentCount: countFragments(defaultExample),
  lineCount: defaultExample.length,
  activeSlot: null,

  setActiveSlot: (slot: BlockPath | null) => set({ activeSlot: slot }),

  setProgram: (program: Program) => {
    const prev = get().program;
    set({
      history: [...get().history, prev],
      program,
      fragmentCount: countFragments(program),
      lineCount: program.length,
    });
  },

  insertFragment: (type: FragmentType, targetSlot?: BlockPath | null) => {
    const currentProg = get().program;
    const check = canAdd(currentProg, type);
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }

    const prev = currentProg;
    const slot = targetSlot !== undefined ? targetSlot : get().activeSlot;
    let nextProgram = [...currentProg];

    if (slot && slot.length > 0) {
      const existing = getNodeAtPath(currentProg, slot);

      if (type === '+' || type === '-' || type === '*') {
        if (
          existing &&
          'kind' in existing &&
          existing.kind !== 'assign' &&
          existing.kind !== 'print'
        ) {
          nextProgram = updateNodeAtPath(
            currentProg,
            slot,
            bin(type, existing as Expr, num(2))
          );
        } else {
          nextProgram = updateNodeAtPath(
            currentProg,
            slot,
            bin(type, num(1), num(2))
          );
        }
      } else if (type === 'neg') {
        if (
          existing &&
          'kind' in existing &&
          existing.kind !== 'assign' &&
          existing.kind !== 'print'
        ) {
          nextProgram = updateNodeAtPath(currentProg, slot, neg(existing as Expr));
        } else {
          nextProgram = updateNodeAtPath(currentProg, slot, neg(num(1)));
        }
      } else if (type === 'num') {
        nextProgram = updateNodeAtPath(currentProg, slot, num(42));
      } else if (type === 'var') {
        nextProgram = updateNodeAtPath(currentProg, slot, v('x'));
      } else if (type === 'assign' || type === 'print') {
        const stmtIdx = typeof slot[0] === 'number' ? slot[0] : parseInt(slot[0], 10);
        if (currentProg.length >= MAX_LINES) {
          return { ok: false, reason: 'MAX_LINES' };
        }
        const newStmt: Stmt =
          type === 'assign'
            ? assign(getNextVarName(currentProg), num(1))
            : printStmt(v(getNextVarName(currentProg)));
        nextProgram.splice(stmtIdx + 1, 0, newStmt);
      }
    } else {
      if (type === 'assign') {
        if (currentProg.length >= MAX_LINES) {
          return { ok: false, reason: 'MAX_LINES' };
        }
        nextProgram.push(assign(getNextVarName(currentProg), num(1)));
      } else if (type === 'print') {
        if (currentProg.length >= MAX_LINES) {
          return { ok: false, reason: 'MAX_LINES' };
        }
        const lastAssign = [...currentProg].reverse().find((s) => s.kind === 'assign');
        const printVar = lastAssign && lastAssign.kind === 'assign' ? lastAssign.name : 'x';
        nextProgram.push(printStmt(v(printVar)));
      } else if (type === '+' || type === '-' || type === '*') {
        if (currentProg.length > 0) {
          const lastIdx = currentProg.length - 1;
          const lastStmt = currentProg[lastIdx];
          nextProgram = updateNodeAtPath(
            currentProg,
            [lastIdx, 'expr'],
            bin(type, lastStmt.expr, num(2))
          );
        } else {
          nextProgram.push(assign(getNextVarName(currentProg), bin(type, num(1), num(2))));
        }
      } else if (type === 'neg') {
        if (currentProg.length > 0) {
          const lastIdx = currentProg.length - 1;
          const lastStmt = currentProg[lastIdx];
          nextProgram = updateNodeAtPath(
            currentProg,
            [lastIdx, 'expr'],
            neg(lastStmt.expr)
          );
        } else {
          nextProgram.push(assign(getNextVarName(currentProg), neg(num(1))));
        }
      } else if (type === 'num' || type === 'var') {
        if (currentProg.length < MAX_LINES) {
          nextProgram.push(
            assign(getNextVarName(currentProg), type === 'num' ? num(42) : v('x'))
          );
        } else {
          const lastIdx = currentProg.length - 1;
          const lastStmt = currentProg[lastIdx];
          nextProgram = updateNodeAtPath(
            currentProg,
            [lastIdx, 'expr'],
            bin('+', lastStmt.expr, type === 'num' ? num(42) : v('x'))
          );
        }
      }
    }

    if (countFragments(nextProgram) > MAX_FRAGMENTS) {
      return { ok: false, reason: 'MAX_FRAGMENTS' };
    }

    set({
      history: [...get().history, prev],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
      activeSlot: null,
    });

    return { ok: true };
  },

  updateNode: (path: BlockPath, replacement: Expr | Stmt) => {
    const currentProg = get().program;
    const nextProgram = updateNodeAtPath(currentProg, path, replacement);
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
    });
  },

  updateVariableName: (index: number, name: string) => {
    const currentProg = get().program;
    const nextProgram = updateStmtName(currentProg, index, name);
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
    });
  },

  removeStatement: (index: number) => {
    const currentProg = get().program;
    const nextProgram = currentProg.filter((_, i) => i !== index);
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
      activeSlot: null,
    });
  },

  moveStatement: (index: number, direction: 'up' | 'down') => {
    const currentProg = get().program;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentProg.length) return;
    const nextProgram = [...currentProg];
    const [item] = nextProgram.splice(index, 1);
    nextProgram.splice(targetIdx, 0, item);
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
      activeSlot: null,
    });
  },

  duplicateStatement: (index: number) => {
    const currentProg = get().program;
    if (currentProg.length >= MAX_LINES) {
      return { ok: false, reason: 'MAX_LINES' };
    }
    const stmt = currentProg[index];
    if (!stmt) return { ok: true };
    const clone: Stmt =
      stmt.kind === 'assign'
        ? assign(getNextVarName(currentProg), JSON.parse(JSON.stringify(stmt.expr)))
        : printStmt(JSON.parse(JSON.stringify(stmt.expr)));
    const nextProgram = [...currentProg];
    nextProgram.splice(index + 1, 0, clone);
    if (countFragments(nextProgram) > MAX_FRAGMENTS) {
      return { ok: false, reason: 'MAX_FRAGMENTS' };
    }
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
      activeSlot: null,
    });
    return { ok: true };
  },

  toggleStatementKind: (index: number) => {
    const currentProg = get().program;
    const stmt = currentProg[index];
    if (!stmt) return;
    const nextProgram = [...currentProg];
    if (stmt.kind === 'assign') {
      nextProgram[index] = printStmt(stmt.expr);
    } else {
      nextProgram[index] = assign(getNextVarName(currentProg), stmt.expr);
    }
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
    });
  },

  swapBinaryOperands: (path: BlockPath) => {
    const currentProg = get().program;
    const node = getNodeAtPath(currentProg, path);
    if (!node || !('kind' in node) || node.kind !== 'bin') return;
    const nextProgram = updateNodeAtPath(
      currentProg,
      path,
      bin(node.op, node.right, node.left)
    );
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
    });
  },

  unwrapExpr: (path: BlockPath) => {
    const currentProg = get().program;
    const node = getNodeAtPath(currentProg, path);
    if (!node || !('kind' in node)) return;
    let inner: Expr | null = null;
    if (node.kind === 'neg') inner = node.operand;
    if (node.kind === 'bin') inner = node.left;
    if (!inner) return;
    const nextProgram = updateNodeAtPath(currentProg, path, inner);
    set({
      history: [...get().history, currentProg],
      program: nextProgram,
      fragmentCount: countFragments(nextProgram),
      lineCount: nextProgram.length,
      activeSlot: null,
    });
  },

  loadMission: (missionId: string) => {
    const found = HERO_MISSIONS.find((m) => m.id === missionId);
    if (!found) return;
    const clone: Program = JSON.parse(JSON.stringify(found.program));
    set({
      history: [...get().history, get().program],
      program: clone,
      fragmentCount: countFragments(clone),
      lineCount: clone.length,
      activeSlot: null,
    });
  },

  undo: () => {
    const history = get().history;
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      program: previous,
      fragmentCount: countFragments(previous),
      lineCount: previous.length,
      activeSlot: null,
    });
  },

  canUndo: () => get().history.length > 0,

  loadDefaultExample: () => {
    const ex = programWithFragments(12);
    set({
      history: [...get().history, get().program],
      program: ex,
      fragmentCount: countFragments(ex),
      lineCount: ex.length,
      activeSlot: null,
    });
  },

  reset: () => {
    set({
      history: [...get().history, get().program],
      program: [],
      fragmentCount: 0,
      lineCount: 0,
      activeSlot: null,
    });
  },
}));
