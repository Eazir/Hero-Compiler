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
  num,
  printStmt,
  programWithFragments,
  updateNodeAtPath,
  updateStmtName,
  v,
} from '../domain/blocks';
import { BlockPath } from '../domain/sourceMap';

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
      // Inserción dirigida a una ranura o nodo específico
      const existing = getNodeAtPath(currentProg, slot);

      if (type === '+' || type === '-' || type === '*') {
        if (
          existing &&
          'kind' in existing &&
          existing.kind !== 'assign' &&
          existing.kind !== 'print'
        ) {
          // Envuelve la expresión existente como operando izquierdo (ej. 'b' -> 'b * 2')
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
      } else if (type === 'num') {
        nextProgram = updateNodeAtPath(currentProg, slot, num(42));
      } else if (type === 'var') {
        nextProgram = updateNodeAtPath(currentProg, slot, v('x'));
      } else if (type === 'assign' || type === 'print') {
        // Si se suelta una sentencia sobre una línea existente, insertar a continuación
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
      // Inserción sin ranura (soltado en el lienzo o pulsado en la paleta)
      if (type === 'assign') {
        if (currentProg.length >= MAX_LINES) {
          return { ok: false, reason: 'MAX_LINES' };
        }
        nextProgram.push(assign(getNextVarName(currentProg), num(1)));
      } else if (type === 'print') {
        if (currentProg.length >= MAX_LINES) {
          return { ok: false, reason: 'MAX_LINES' };
        }
        // Usar la última variable declarada si existe
        const lastAssign = [...currentProg].reverse().find((s) => s.kind === 'assign');
        const printVar = lastAssign && lastAssign.kind === 'assign' ? lastAssign.name : 'x';
        nextProgram.push(printStmt(v(printVar)));
      } else if (type === '+' || type === '-' || type === '*') {
        // Envolver la última expresión si existe
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
      } else if (type === 'num' || type === 'var') {
        // Si hay espacio para otra sentencia, crea asignación con ese valor;
        // si no, envuelve la última expresión
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

    // Verificar que el nuevo programa no sobrepase el límite estricto de 12 fragmentos
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
