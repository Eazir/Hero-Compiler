import { create } from 'zustand';
import {
  FragmentType,
  MAX_FRAGMENTS,
  Program,
  assign,
  bin,
  canAdd,
  countFragments,
  num,
  printStmt,
  programWithFragments,
  updateNodeAtPath,
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
  insertFragment: (type: FragmentType) => {
    ok: boolean;
    reason?: 'MAX_FRAGMENTS' | 'MAX_LINES';
  };
  updateNode: (path: BlockPath, replacement: any) => void;
  removeStatement: (index: number) => void;
  undo: () => void;
  canUndo: () => boolean;
  loadDefaultExample: () => void;
  reset: () => void;
}

const defaultExample = programWithFragments(12);

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

  insertFragment: (type: FragmentType) => {
    const currentProg = get().program;
    const check = canAdd(currentProg, type);
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }

    const prev = currentProg;
    const activeSlot = get().activeSlot;

    let nextProgram = [...currentProg];

    if (activeSlot && activeSlot.length > 0) {
      // Inserción en ranura activa
      if (type === 'num') {
        nextProgram = updateNodeAtPath(currentProg, activeSlot, num(42));
      } else if (type === 'var') {
        nextProgram = updateNodeAtPath(currentProg, activeSlot, v('x'));
      } else if (type === '+' || type === '-' || type === '*') {
        nextProgram = updateNodeAtPath(
          currentProg,
          activeSlot,
          bin(type, num(1), num(2))
        );
      }
    } else {
      // Inserción al final como sentencia o si es expresión nueva
      if (type === 'assign') {
        const nextVarName = String.fromCharCode(97 + (currentProg.length % 26));
        nextProgram.push(assign(nextVarName, num(1)));
      } else if (type === 'print') {
        nextProgram.push(printStmt(num(0)));
      } else if (type === 'num' || type === 'var' || type === '+' || type === '-' || type === '*') {
        // Si no hay ranura activa y se añade un fragmento de expresión,
        // se añade a la última sentencia o crea una nueva asignación si hay espacio
        if (currentProg.length > 0) {
          const lastIdx = currentProg.length - 1;
          const lastStmt = currentProg[lastIdx];
          if (type === 'num') {
            nextProgram = updateNodeAtPath(currentProg, [lastIdx, 'expr'], num(10));
          } else if (type === 'var') {
            nextProgram = updateNodeAtPath(currentProg, [lastIdx, 'expr'], v('y'));
          } else {
            nextProgram = updateNodeAtPath(
              currentProg,
              [lastIdx, 'expr'],
              bin(type, lastStmt.expr, num(2))
            );
          }
        } else {
          nextProgram.push(assign('x', num(1)));
        }
      }
    }

    // Verificar que el nuevo programa no sobrepase el límite estricto
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

  updateNode: (path: BlockPath, replacement: any) => {
    const currentProg = get().program;
    const nextProgram = updateNodeAtPath(currentProg, path, replacement);
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
