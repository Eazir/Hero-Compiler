import { create } from 'zustand';
import { CompileResponse } from '../api/schema';
import { compile as apiCompile } from '../api/client';

export type CompileStatus = 'idle' | 'loading' | 'done' | 'failed';

interface CompileState {
  status: CompileStatus;
  trace: CompileResponse | null;
  errorMessage: string | null;
  compileSource: (source: string, optimize?: boolean) => Promise<CompileResponse | null>;
  reset: () => void;
  setTrace: (trace: CompileResponse) => void;
}

export const useCompileStore = create<CompileState>((set) => ({
  status: 'idle',
  trace: null,
  errorMessage: null,

  compileSource: async (source: string, optimize = true) => {
    set({ status: 'loading', errorMessage: null });
    try {
      const response = await apiCompile(source, optimize);
      set({ status: response.ok ? 'done' : 'failed', trace: response });
      return response;
    } catch (err: any) {
      set({ status: 'failed', errorMessage: err.message || 'Error de compilación' });
      return null;
    }
  },

  reset: () => set({ status: 'idle', trace: null, errorMessage: null }),
  setTrace: (trace: CompileResponse) => set({ status: trace.ok ? 'done' : 'failed', trace }),
}));
