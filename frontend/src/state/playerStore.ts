import { create } from 'zustand';
import { PhaseId } from '../api/schema';

interface PlayerState {
  activePhase: PhaseId;
  stepIndex: number;
  isPlaying: boolean;
  speed: number; // 0.5, 1, 2
  unlockedPhases: PhaseId[];

  setActivePhase: (phase: PhaseId) => void;
  setStepIndex: (step: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextStep: (totalSteps: number) => void;
  prevStep: () => void;
  skipToEnd: (totalSteps: number) => void;
  resetPhase: () => void;
  setSpeed: (speed: number) => void;
  unlockPhase: (phase: PhaseId) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  activePhase: 'lexical',
  stepIndex: 0,
  isPlaying: false,
  speed: 1,
  unlockedPhases: ['lexical', 'syntactic', 'semantic'],

  setActivePhase: (activePhase) =>
    set({ activePhase, stepIndex: 0, isPlaying: false }),

  setStepIndex: (stepIndex) => set({ stepIndex }),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  nextStep: (totalSteps) => {
    const { stepIndex, isPlaying } = get();
    if (stepIndex < totalSteps - 1) {
      set({ stepIndex: stepIndex + 1 });
    } else if (isPlaying) {
      set({ isPlaying: false });
    }
  },

  prevStep: () => {
    set((state) => ({
      stepIndex: Math.max(0, state.stepIndex - 1),
      isPlaying: false,
    }));
  },

  skipToEnd: (totalSteps) => {
    set({
      stepIndex: Math.max(0, totalSteps - 1),
      isPlaying: false,
    });
  },

  resetPhase: () => {
    set({ stepIndex: 0, isPlaying: false });
  },

  setSpeed: (speed) => set({ speed }),

  unlockPhase: (phase) => {
    const { unlockedPhases } = get();
    if (!unlockedPhases.includes(phase)) {
      set({ unlockedPhases: [...unlockedPhases, phase] });
    }
  },
}));
