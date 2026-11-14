import { create } from 'zustand';

export type GameMode = 'aprender' | 'reto' | 'sin juego';

interface GameState {
  xp: number;
  level: number;
  mode: GameMode;
  achievements: string[];
  addXp: (amount: number) => void;
  setMode: (mode: GameMode) => void;
}

const STORAGE_KEY = 'compilab_game_state';

function loadPersistedState(): { xp: number; level: number; mode: GameMode; achievements: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Modo seguro sin localStorage
  }
  return { xp: 0, level: 1, mode: 'aprender', achievements: [] };
}

function persistState(state: { xp: number; level: number; mode: GameMode; achievements: string[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // No-op
  }
}

const initial = loadPersistedState();

export const useGameStore = create<GameState>((set, get) => ({
  xp: initial.xp,
  level: initial.level,
  mode: initial.mode,
  achievements: initial.achievements,

  addXp: (amount: number) => {
    const currentXp = get().xp + amount;
    const currentLevel = Math.floor(currentXp / 100) + 1;
    const updated = { ...get(), xp: currentXp, level: currentLevel };
    set({ xp: currentXp, level: currentLevel });
    persistState(updated);
  },

  setMode: (mode: GameMode) => {
    set({ mode });
    persistState({ ...get(), mode });
  },
}));
