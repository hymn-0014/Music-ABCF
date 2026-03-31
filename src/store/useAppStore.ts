import { create } from 'zustand';
import { Song, Setlist, NotationMode, AccidentalPreference } from '../types';
import { songs as defaultSongs, setlists as defaultSetlists } from '../data/mockData';
import {
  syncSongsToFirestore,
  fetchSongsFromFirestore,
  syncSetlistsToFirestore,
  fetchSetlistsFromFirestore,
} from '../services/firebaseService';

interface AppState {
  // auth
  uid: string | null;
  setUid: (uid: string | null) => void;
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
  // cloud sync
  pullFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
}

const useAppStore = create<AppState>((set, get) => ({
  uid: null,
  setUid: (uid) => set({ uid }),
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

  pullFromCloud: async () => {
    const { uid } = get();
    if (!uid) return;
    try {
      const [songs, setlists] = await Promise.all([
        fetchSongsFromFirestore(uid),
        fetchSetlistsFromFirestore(uid),
      ]);
      if (songs.length > 0) set({ songs });
      if (setlists.length > 0) set({ setlists });
    } catch (e) {
      console.error('Cloud pull failed:', e);
    }
  },

  pushToCloud: async () => {
    const { uid, songs, setlists } = get();
    if (!uid) return;
    try {
      await Promise.all([
        syncSongsToFirestore(uid, songs),
        syncSetlistsToFirestore(uid, setlists),
      ]);
    } catch (e) {
      console.error('Cloud push failed:', e);
    }
  },
}));

export default useAppStore;