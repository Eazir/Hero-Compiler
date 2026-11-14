import { create } from 'zustand';
import { Program, assign, bin, num, printStmt, v } from '../domain/blocks';

interface ProgramState {
  program: Program;
  fragmentCount: number;
  setProgram: (p: Program) => void;
  loadDefaultExample: () => void;
  reset: () => void;
}

const defaultExample: Program = [
  assign('a', num(5)),
  assign('b', num(3)),
  assign('c', bin('+', v('a'), bin('*', v('b'), num(2)))),
  printStmt(v('c')),
];

export const useProgramStore = create<ProgramState>((set) => ({
  program: defaultExample,
  fragmentCount: 8,

  setProgram: (program: Program) => set({ program }),
  loadDefaultExample: () => set({ program: defaultExample, fragmentCount: 8 }),
  reset: () => set({ program: [], fragmentCount: 0 }),
}));

