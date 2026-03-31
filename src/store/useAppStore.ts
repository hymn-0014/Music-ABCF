import { create } from 'zustand';
import { Song, Setlist, ModificationEntry, NotationMode, AccidentalPreference, SyncResult, SyncConfirmFn } from '../types';
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
  fetchSongsByIds,
} from '../services/firebaseService';

interface AppState {
  // auth
  uid: string | null;
  userEmail: string | null;
  setUid: (uid: string | null, email?: string | null) => void;
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
  // setlist-level sync
  fetchCloudSetlists: () => Promise<Setlist[]>;
  uploadSetlist: (setlistId: string) => Promise<{ songsUploaded: number }>;
  downloadSetlist: (setlist: Setlist) => Promise<{ songsDownloaded: number }>;
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

const useAppStore = create<AppState>((set, get) => ({
  uid: null,
  userEmail: null,
  setUid: (uid, email) => set({ uid, userEmail: email ?? null }),
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
  setSongs: (songs) => set({ songs: songs.map(normalizeSong) }),
  setSetlists: (newSetlists) => {
    const { uid, setlists: oldSetlists } = get();
    set({ setlists: newSetlists });
    if (!uid) return;
    const oldIds = new Set(oldSetlists.map((sl) => sl.id));
    const newIds = new Set(newSetlists.map((sl) => sl.id));
    // Upload new or changed setlists only
    for (const sl of newSetlists) {
      const old = oldSetlists.find((o) => o.id === sl.id);
      if (!old || stableJSON(old) !== stableJSON(sl)) {
        void uploadSingleSetlist(uid, sl).catch((e) => console.error('Setlist push failed:', e));
      }
    }
    // Delete only setlists that were actually removed locally
    for (const sl of oldSetlists) {
      if (!newIds.has(sl.id)) {
        void deleteSetlistFromFirestore(uid, sl.id).catch((e) => console.error('Setlist delete failed:', e));
      }
    }
  },
  updateSong: (id, updates) => {
    const { songs, userEmail } = get();
    const now = new Date().toISOString();
    const email = userEmail || 'unknown';
    set({ songs: songs.map((s) => {
      if (s.id !== id) return s;
      const entry: ModificationEntry = { userEmail: email, action: 'edited', timestamp: now };
      return { ...s, ...updates, lastModifiedBy: email, lastModifiedAt: now, modificationHistory: [...(s.modificationHistory || []), entry] };
    }) });
    void get().pushToCloud();
  },
  deleteSong: (id) => {
    const { songs, currentSongId, uid } = get();
    set({
      songs: songs.filter((s) => s.id !== id),
      currentSongId: currentSongId === id ? null : currentSongId,
    });
    if (uid) void deleteSongFromFirestore(uid, id).catch(e => console.error('Cloud delete failed:', e));
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
      if (songs.length > 0) set({ songs: songs.map(normalizeSong) });
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
    const idRemaps = new Map<string, string>(); // old local ID → new cloud ID

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
            if (localSong.id !== cloudSong.id) idRemaps.set(localSong.id, cloudSong.id);
            result.overwritten++;
          } else {
            result.skipped++;
          }
        } else if (localSong.id !== cloudSong.id) {
          // Content matches but IDs differ — align to cloud ID for setlist consistency
          const idx = newSongs.findIndex((s) => s.id === localSong.id);
          if (idx >= 0) newSongs[idx] = { ...newSongs[idx], id: cloudSong.id };
          idRemaps.set(localSong.id, cloudSong.id);
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

    // Remap song IDs in setlists so they reference the correct (cloud) IDs
    if (idRemaps.size > 0) {
      for (let i = 0; i < newSetlists.length; i++) {
        const remapped = newSetlists[i].songIds.map((id) => idRemaps.get(id) ?? id);
        if (remapped.some((id, j) => id !== newSetlists[i].songIds[j])) {
          newSetlists[i] = { ...newSetlists[i], songIds: remapped };
        }
      }
    }

    set({ songs: newSongs, setlists: newSetlists });
    return result;
  },

  fetchCloudSetlists: async (): Promise<Setlist[]> => {
    const { uid } = get();
    if (!uid) throw new Error('Not signed in');
    return fetchSetlistsFromFirestore(uid);
  },

  uploadSetlist: async (setlistId: string): Promise<{ songsUploaded: number }> => {
    const { uid, songs, setlists } = get();
    if (!uid) throw new Error('Not signed in');

    const setlist = setlists.find((sl) => sl.id === setlistId);
    if (!setlist) throw new Error('Setlist not found');

    // Remove any cloud setlist with the same name but different ID (cross-device dedup)
    const cloudSetlists = await fetchSetlistsFromFirestore(uid);
    const nameKey = setlist.name.trim().toLowerCase();
    for (const csl of cloudSetlists) {
      if (csl.id !== setlist.id && csl.name.trim().toLowerCase() === nameKey) {
        await deleteSetlistFromFirestore(uid, csl.id);
      }
    }

    // Upload the setlist itself
    await uploadSingleSetlist(uid, setlist);

    // Check which songs in the setlist are missing from cloud
    const cloudSongs = await fetchSongsFromFirestore(uid);
    const cloudSongIds = new Set(cloudSongs.map((s) => s.id));
    const cloudSongKeys = new Set(
      cloudSongs.map((s) => `${s.title.trim().toLowerCase()}::${s.artist.trim().toLowerCase()}`)
    );

    let songsUploaded = 0;
    for (const songId of setlist.songIds) {
      if (cloudSongIds.has(songId)) continue;
      const localSong = songs.find((s) => s.id === songId);
      if (!localSong) continue;
      const key = `${localSong.title.trim().toLowerCase()}::${localSong.artist.trim().toLowerCase()}`;
      if (cloudSongKeys.has(key)) continue; // same song by title+artist already in cloud
      await uploadSingleSong(uid, localSong);
      songsUploaded++;
    }

    return { songsUploaded };
  },

  downloadSetlist: async (cloudSetlist: Setlist): Promise<{ songsDownloaded: number }> => {
    const { uid, songs, setlists } = get();
    if (!uid) throw new Error('Not signed in');

    // Add or replace the setlist locally (match by ID or by name for cross-device sync)
    const nameKey = cloudSetlist.name.trim().toLowerCase();
    let existingIdx = setlists.findIndex((sl) => sl.id === cloudSetlist.id);
    if (existingIdx < 0) {
      existingIdx = setlists.findIndex((sl) => sl.name.trim().toLowerCase() === nameKey);
    }
    const newSetlists = [...setlists];
    if (existingIdx >= 0) {
      newSetlists[existingIdx] = cloudSetlist;
    } else {
      newSetlists.push(cloudSetlist);
    }

    // Download songs referenced in the setlist that we don't have locally
    const localSongIds = new Set(songs.map((s) => s.id));
    const localSongKeys = new Set(
      songs.map((s) => `${s.title.trim().toLowerCase()}::${s.artist.trim().toLowerCase()}`)
    );
    const missingSongIds = cloudSetlist.songIds.filter((id) => !localSongIds.has(id));

    let songsDownloaded = 0;
    const newSongs = [...songs];

    if (missingSongIds.length > 0) {
      const cloudSongs = await fetchSongsByIds(uid, missingSongIds);
      for (const cs of cloudSongs) {
        const key = `${cs.title.trim().toLowerCase()}::${cs.artist.trim().toLowerCase()}`;
        if (localSongKeys.has(key)) continue; // already have by title+artist
        newSongs.push(normalizeSong(cs));
        songsDownloaded++;
      }
    }

    set({ songs: newSongs, setlists: newSetlists });
    return { songsDownloaded };
  },
}));

export default useAppStore;

// Expose store for E2E testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__appStore = useAppStore;
}