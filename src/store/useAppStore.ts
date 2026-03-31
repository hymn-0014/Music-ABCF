import { create } from 'zustand';
import { Song, Setlist, NotationMode, AccidentalPreference } from '../types';
import { songs as defaultSongs, setlists as defaultSetlists } from '../data/mockData';

interface AppState {
  // data
  songs: Song[];
  setlists: Setlist[];
  // viewer state
  currentSongId: string | null;
  currentSetlistId: string | null;
  transpose: number;
  notation: NotationMode;
  accidental: AccidentalPreference;
  darkMode: boolean;
  // actions
  setSongs: (songs: Song[]) => void;
  setSetlists: (setlists: Setlist[]) => void;
  setCurrentSongId: (id: string | null) => void;
  setCurrentSetlistId: (id: string | null) => void;
  setTranspose: (n: number) => void;
  setNotation: (m: NotationMode) => void;
  setAccidental: (p: AccidentalPreference) => void;
  toggleDarkMode: () => void;
}

const useAppStore = create<AppState>((set) => ({
  songs: defaultSongs,
  setlists: defaultSetlists,
  currentSongId: null,
  currentSetlistId: null,
  transpose: 0,
  notation: 'standard',
  accidental: 'sharp',
  darkMode: false,
  setSongs: (songs) => set({ songs }),
  setSetlists: (setlists) => set({ setlists }),
  setCurrentSongId: (id) => set({ currentSongId: id, transpose: 0 }),
  setCurrentSetlistId: (id) => set({ currentSetlistId: id }),
  setTranspose: (n) => set({ transpose: n }),
  setNotation: (m) => set({ notation: m }),
  setAccidental: (p) => set({ accidental: p }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
}));

export default useAppStore;