import { create } from 'zustand';
import { Song, Setlist, NotationMode, AccidentalPreference, SyncResult, SyncConfirmFn } from '../types';
import { songs as defaultSongs, setlists as defaultSetlists } from '../data/mockData';
import {
  syncSongsToFirestore,
  fetchSongsFromFirestore,
  syncSetlistsToFirestore,
  fetchSetlistsFromFirestore,
  uploadSingleSong,
  deleteSongFromFirestore,
  uploadSingleSetlist,
  deleteSetlistFromFirestore,
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
  updateSong: (id: string, updates: Partial<Omit<Song, 'id'>>) => void;
  deleteSong: (id: string) => void;
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
  smartPushToCloud: (confirm: SyncConfirmFn) => Promise<SyncResult>;
  smartPullFromCloud: (confirm: SyncConfirmFn) => Promise<SyncResult>;
}

const normalizeSong = (song: Song): Song => ({
  ...song,
  tempo: typeof song.tempo === 'number' ? Math.min(240, Math.max(40, Math.round(song.tempo))) : 90,
});

/** Stable JSON for comparison — sort keys so field ordering from Firestore doesn't matter */
const stableJSON = (obj: unknown): string =>
  JSON.stringify(obj, (_, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v).sort().reduce<Record<string, unknown>>((acc, k) => { acc[k] = (v as Record<string, unknown>)[k]; return acc; }, {});
    }
    return v;
  });

/** Compare two songs' content (lines, tempo, key) ignoring field order and whitespace differences */
const songsContentEqual = (a: Song, b: Song): boolean => {
  if (Math.round(a.tempo ?? 90) !== Math.round(b.tempo ?? 90)) return false;
  if ((a.key ?? '').trim() !== (b.key ?? '').trim()) return false;
  if (a.lines.length !== b.lines.length) return false;
  return stableJSON(a.lines) === stableJSON(b.lines);
};

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
  updateSong: (id, updates) => {
    const { songs } = get();
    set({ songs: songs.map((s) => (s.id === id ? { ...s, ...updates } : s)) });
    void get().pushToCloud();
  },
  deleteSong: (id) => {
    const { songs, currentSongId } = get();
    set({
      songs: songs.filter((s) => s.id !== id),
      currentSongId: currentSongId === id ? null : currentSongId,
    });
    void get().pushToCloud();
  },
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
      throw e;
    }
  },

  smartPushToCloud: async (confirmFn: SyncConfirmFn): Promise<SyncResult> => {
    const { uid, songs, setlists } = get();
    if (!uid) throw new Error('Not signed in');

    const result: SyncResult = {
      songsUploaded: 0, songsDownloaded: 0,
      setlistsUploaded: 0, setlistsDownloaded: 0,
      overwritten: 0, skipped: 0,
    };

    const [cloudSongs, cloudSetlists] = await Promise.all([
      fetchSongsFromFirestore(uid),
      fetchSetlistsFromFirestore(uid),
    ]);

    // Build cloud lookup by title+artist
    const cloudSongMap = new Map<string, Song>();
    for (const s of cloudSongs) {
      cloudSongMap.set(`${s.title.trim().toLowerCase()}::${s.artist.trim().toLowerCase()}`, s);
    }

    for (const song of songs) {
      const key = `${song.title.trim().toLowerCase()}::${song.artist.trim().toLowerCase()}`;
      const cloudSong = cloudSongMap.get(key);

      if (!cloudSong) {
        await uploadSingleSong(uid, song);
        result.songsUploaded++;
      } else {
        if (!songsContentEqual(song, cloudSong)) {
          const shouldOverwrite = await confirmFn(
            'Duplicate Song',
            `"${song.title}" by ${song.artist} already exists in cloud with different content.\n\nOverwrite the cloud version with your local version?`,
          );
          if (shouldOverwrite) {
            if (cloudSong.id !== song.id) {
              await deleteSongFromFirestore(uid, cloudSong.id);
            }
            await uploadSingleSong(uid, song);
            result.overwritten++;
          } else {
            result.skipped++;
          }
        }
      }
    }

    // Setlists
    const cloudSetlistMap = new Map<string, Setlist>();
    for (const sl of cloudSetlists) {
      cloudSetlistMap.set(sl.name.trim().toLowerCase(), sl);
    }

    for (const setlist of setlists) {
      const key = setlist.name.trim().toLowerCase();
      const cloudSetlist = cloudSetlistMap.get(key);

      if (!cloudSetlist) {
        await uploadSingleSetlist(uid, setlist);
        result.setlistsUploaded++;
      } else {
        const songIdsMatch = JSON.stringify(cloudSetlist.songIds) === JSON.stringify(setlist.songIds);
        if (!songIdsMatch) {
          const shouldOverwrite = await confirmFn(
            'Duplicate Setlist',
            `Setlist "${setlist.name}" already exists in cloud with different songs.\n\nOverwrite the cloud version?`,
          );
          if (shouldOverwrite) {
            if (cloudSetlist.id !== setlist.id) {
              await deleteSetlistFromFirestore(uid, cloudSetlist.id);
            }
            await uploadSingleSetlist(uid, setlist);
            result.overwritten++;
          } else {
            result.skipped++;
          }
        }
      }
    }

    return result;
  },

  smartPullFromCloud: async (confirmFn: SyncConfirmFn): Promise<SyncResult> => {
    const { uid } = get();
    if (!uid) throw new Error('Not signed in');

    const result: SyncResult = {
      songsUploaded: 0, songsDownloaded: 0,
      setlistsUploaded: 0, setlistsDownloaded: 0,
      overwritten: 0, skipped: 0,
    };

    const [cloudSongs, cloudSetlists] = await Promise.all([
      fetchSongsFromFirestore(uid),
      fetchSetlistsFromFirestore(uid),
    ]);

    const { songs, setlists } = get();

    // Build local lookup by title+artist
    const localSongMap = new Map<string, Song>();
    for (const s of songs) {
      localSongMap.set(`${s.title.trim().toLowerCase()}::${s.artist.trim().toLowerCase()}`, s);
    }

    const newSongs = [...songs];

    for (const cloudSong of cloudSongs) {
      const key = `${cloudSong.title.trim().toLowerCase()}::${cloudSong.artist.trim().toLowerCase()}`;
      const localSong = localSongMap.get(key);

      if (!localSong) {
        newSongs.push(normalizeSong(cloudSong));
        result.songsDownloaded++;
      } else {
        if (!songsContentEqual(localSong, cloudSong)) {
          const shouldOverwrite = await confirmFn(
            'Duplicate Song',
            `"${cloudSong.title}" by ${cloudSong.artist} exists locally with different content.\n\nOverwrite your local version with the cloud version?`,
          );
          if (shouldOverwrite) {
            const idx = newSongs.findIndex((s) => s.id === localSong.id);
            if (idx >= 0) newSongs[idx] = normalizeSong(cloudSong);
            result.overwritten++;
          } else {
            result.skipped++;
          }
        }
      }
    }

    // Setlists
    const localSetlistMap = new Map<string, Setlist>();
    for (const sl of setlists) {
      localSetlistMap.set(sl.name.trim().toLowerCase(), sl);
    }

    const newSetlists = [...setlists];

    for (const cloudSetlist of cloudSetlists) {
      const key = cloudSetlist.name.trim().toLowerCase();
      const localSetlist = localSetlistMap.get(key);

      if (!localSetlist) {
        newSetlists.push(cloudSetlist);
        result.setlistsDownloaded++;
      } else {
        const songIdsMatch = JSON.stringify(localSetlist.songIds) === JSON.stringify(cloudSetlist.songIds);
        if (!songIdsMatch) {
          const shouldOverwrite = await confirmFn(
            'Duplicate Setlist',
            `Setlist "${cloudSetlist.name}" exists locally with different songs.\n\nOverwrite your local version with the cloud version?`,
          );
          if (shouldOverwrite) {
            const idx = newSetlists.findIndex((sl) => sl.id === localSetlist.id);
            if (idx >= 0) newSetlists[idx] = cloudSetlist;
            result.overwritten++;
          } else {
            result.skipped++;
          }
        }
      }
    }

    set({ songs: newSongs, setlists: newSetlists });
    return result;
  },
}));

export default useAppStore;