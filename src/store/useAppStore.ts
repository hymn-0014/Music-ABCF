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
  tempo: number;
  metronomeEnabled: boolean;
  autoScrollEnabled: boolean;
  autoScrollSpeed: number;
  darkMode: boolean;
  // actions
  setSongs: (songs: Song[]) => void;
  setSetlists: (setlists: Setlist[]) => void;
  setCurrentSongId: (id: string | null) => void;
  setCurrentSetlistId: (id: string | null) => void;
  setTranspose: (n: number) => void;
  setNotation: (m: NotationMode) => void;
  setAccidental: (p: AccidentalPreference) => void;
  setTempo: (tempo: number) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  setAutoScrollEnabled: (enabled: boolean) => void;
  setAutoScrollSpeed: (speed: number) => void;
  toggleDarkMode: () => void;
  // cloud sync
  pullFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
}

const normalizeSong = (song: Song): Song => ({
  ...song,
  tempo: typeof song.tempo === 'number' ? Math.min(240, Math.max(40, Math.round(song.tempo))) : 90,
});

const mergeSongs = (baseSongs: Song[], incomingSongs: Song[]): Song[] => {
  const merged = [...baseSongs.map(normalizeSong)];
  const existingKeys = new Set(
    merged.map((song) => `${song.title.trim().toLowerCase()}::${song.artist.trim().toLowerCase()}`),
  );

  incomingSongs.map(normalizeSong).forEach((song) => {
    const key = `${song.title.trim().toLowerCase()}::${song.artist.trim().toLowerCase()}`;
    if (!existingKeys.has(key)) {
      merged.push(song);
      existingKeys.add(key);
    }
  });

  return merged;
};

const useAppStore = create<AppState>((set, get) => ({
  uid: null,
  setUid: (uid) => set({ uid }),
  songs: defaultSongs.map(normalizeSong),
  setlists: defaultSetlists,
  currentSongId: null,
  currentSetlistId: null,
  transpose: 0,
  notation: 'standard',
  accidental: 'sharp',
  tempo: 90,
  metronomeEnabled: false,
  autoScrollEnabled: false,
  autoScrollSpeed: 30,
  darkMode: true,
  setSongs: (songs) => set({ songs: mergeSongs(defaultSongs, songs) }),
  setSetlists: (setlists) => set({ setlists }),
  setCurrentSongId: (id) => {
    const songTempo = get().songs.find((song) => song.id === id)?.tempo ?? 90;
    set({
      currentSongId: id,
      transpose: 0,
      tempo: songTempo,
      metronomeEnabled: false,
      autoScrollEnabled: false,
    });
  },
  setCurrentSetlistId: (id) => set({ currentSetlistId: id }),
  setTranspose: (n) => set({ transpose: n }),
  setNotation: (m) => set({ notation: m }),
  setAccidental: (p) => set({ accidental: p }),
  setTempo: (tempo) => {
    const normalizedTempo = Math.min(240, Math.max(40, Math.round(tempo)));
    const { currentSongId, songs } = get();

    set({
      tempo: normalizedTempo,
      songs: currentSongId
        ? songs.map((song) => (
            song.id === currentSongId
              ? { ...song, tempo: normalizedTempo }
              : song
          ))
        : songs,
    });
  },
  setMetronomeEnabled: (enabled) => set({ metronomeEnabled: enabled }),
  setAutoScrollEnabled: (enabled) => set({ autoScrollEnabled: enabled }),
  setAutoScrollSpeed: (speed) => set({ autoScrollSpeed: Math.min(120, Math.max(10, Math.round(speed))) }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  pullFromCloud: async () => {
    const { uid } = get();
    if (!uid) return;
    try {
      const [songs, setlists] = await Promise.all([
        fetchSongsFromFirestore(uid),
        fetchSetlistsFromFirestore(uid),
      ]);
      if (songs.length > 0) set({ songs: mergeSongs(defaultSongs, songs) });
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