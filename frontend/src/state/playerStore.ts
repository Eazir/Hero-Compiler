import { create } from 'zustand';
import { PhaseId } from '../api/schema';

interface PlayerState {
  currentPhase: PhaseId;
  currentStep: number;
  isPlaying: boolean;
  speed: number;
  setPhase: (phase: PhaseId) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentPhase: 'lexical',
  currentStep: 0,
  isPlaying: false,
  speed: 1,

  setPhase: (currentPhase) => set({ currentPhase, currentStep: 0, isPlaying: false }),
  setStep: (currentStep) => set({ currentStep }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setSpeed: (speed) => set({ speed }),
}));

