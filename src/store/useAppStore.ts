import { create } from 'zustand';
import { Song, Setlist, ModificationEntry, NotationMode, AccidentalPreference, SyncResult, SyncConfirmFn } from '../types';
import { songs as defaultSongs, setlists as defaultSetlists } from '../data/mockData';
import {
  // Tier 2 — shared cloud (explicit upload/download)
  syncSongsToFirestore,
  fetchSongsFromFirestore,
  syncSetlistsToFirestore,
  fetchSetlistsFromFirestore,
  uploadSingleSong,
  deleteSongFromFirestore,
  uploadSingleSetlist,
  deleteSetlistFromFirestore,
  fetchSongsByIds,
  // Tier 1 — personal auto-sync
  savePersonalSongs,
  loadPersonalSongs,
  savePersonalSetlists,
  loadPersonalSetlists,
  savePersonalSingleSong,
  deletePersonalSong,
  deletePersonalSetlist,
  savePersonalSingleSetlist,
} from '../services/firebaseService';

const THEME_PREF_KEY = 'musicabcf-theme-dark';
const SONG_TRANSPOSE_PREF_KEY = 'musicabcf-song-transpose-by-id';

const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(THEME_PREF_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
};

const persistDarkMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_PREF_KEY, String(enabled));
  } catch {
    // Ignore storage write failures and keep in-memory preference.
  }
};

const getInitialSongTransposeById = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SONG_TRANSPOSE_PREF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const cleaned: Record<string, number> = {};
    for (const [songId, value] of Object.entries(parsed)) {
      const n = typeof value === 'number' ? Math.round(value) : Number(value);
      if (!songId || !Number.isFinite(n) || n === 0) continue;
      cleaned[songId] = n;
    }
    return cleaned;
  } catch {
    return {};
  }
};

const persistSongTransposeById = (map: Record<string, number>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SONG_TRANSPOSE_PREF_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage write failures and keep in-memory preference.
  }
};

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
  songTransposeById: Record<string, number>;
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
  deleteSetlist: (id: string) => void;
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
  restorePersonalData: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
  smartPushToCloud: (confirm: SyncConfirmFn) => Promise<SyncResult>;
  smartPullFromCloud: (confirm: SyncConfirmFn) => Promise<SyncResult>;
  // setlist-level sync
  fetchCloudSetlists: () => Promise<Setlist[]>;
  uploadSetlist: (setlistId: string) => Promise<{ songsUploaded: number; warnings: string[] }>;
  downloadSetlist: (setlist: Setlist) => Promise<{ songsDownloaded: number; warnings: string[] }>;
}

const normalizeSong = (song: Song): Song => ({
  ...song,
  tempo: typeof song.tempo === 'number' ? Math.min(240, Math.max(40, Math.round(song.tempo))) : 90,
});

const compareSongsAlphabetically = (a: Song, b: Song): number => (
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }) ||
  a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base', numeric: true }) ||
  a.id.localeCompare(b.id, undefined, { sensitivity: 'base', numeric: true })
);

const prepareSongs = (songs: Song[]): Song[] => songs
  .map(normalizeSong)
  .sort(compareSongsAlphabetically);

const compareSetlistsByRecentFirst = (a: Setlist, b: Setlist): number => {
  const aTimestamp = a.lastModifiedAt ?? a.createdAt ?? '';
  const bTimestamp = b.lastModifiedAt ?? b.createdAt ?? '';
  return bTimestamp.localeCompare(aTimestamp) ||
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) ||
    a.id.localeCompare(b.id, undefined, { sensitivity: 'base', numeric: true });
};

const prepareSetlists = (setlists: Setlist[]): Setlist[] => [...setlists].sort(compareSetlistsByRecentFirst);

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

/** Compare lastModifiedAt timestamps. Returns positive if a is newer, negative if b is newer, 0 if equal/unknown */
const compareTimestamps = (a?: string, b?: string): number => {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  return ta - tb;
};

const useAppStore = create<AppState>((set, get) => ({
  uid: null,
  userEmail: null,
  setUid: (uid, email) => set({ uid, userEmail: email ?? null }),
  songs: prepareSongs(defaultSongs),
  setlists: prepareSetlists(defaultSetlists),
  currentSongId: null,
  currentSetlistId: null,
  songTransposeById: getInitialSongTransposeById(),
  transpose: 0,
  notation: 'standard',
  accidental: 'sharp',
  tempo: 90,
  metronomeEnabled: false,
  autoScrollEnabled: false,
  autoScrollSpeed: 30,
  darkMode: getInitialDarkMode(),
  setSongs: (songs) => {
    const normalizedSongs = prepareSongs(songs);
    const validSongIds = new Set(normalizedSongs.map((s) => s.id));
    const prevTransposeById = get().songTransposeById;
    const nextTransposeById = Object.fromEntries(
      Object.entries(prevTransposeById).filter(([songId]) => validSongIds.has(songId)),
    );

    set({ songs: normalizedSongs, songTransposeById: nextTransposeById });
    persistSongTransposeById(nextTransposeById);
    // Auto-sync to personal cloud
    const { uid } = get();
    if (uid) savePersonalSongs(uid, normalizedSongs).catch((e) => console.warn('Personal song sync failed:', e));
  },
  setSetlists: (newSetlists) => {
    const preparedSetlists = prepareSetlists(newSetlists);
    set({ setlists: preparedSetlists });
    // Auto-sync to personal cloud
    const { uid } = get();
    if (uid) savePersonalSetlists(uid, preparedSetlists).catch((e) => console.warn('Personal setlist sync failed:', e));
  },
  updateSong: (id, updates) => {
    const { songs, userEmail, uid } = get();
    const now = new Date().toISOString();
    const email = userEmail || 'unknown';
    const updatedSongs = prepareSongs(songs.map((s) => {
      if (s.id !== id) return s;
      const entry: ModificationEntry = { userEmail: email, action: 'edited', timestamp: now };
      return { ...s, ...updates, lastModifiedBy: email, lastModifiedAt: now, modificationHistory: [...(s.modificationHistory || []), entry] };
    }));
    set({ songs: updatedSongs });
    // Auto-sync updated song to personal cloud
    const updatedSong = updatedSongs.find((s) => s.id === id);
    if (uid && updatedSong) savePersonalSingleSong(uid, updatedSong).catch((e) => console.warn('Personal song sync failed:', e));
  },
  deleteSong: (id) => {
    const { songs, currentSongId, songTransposeById, uid } = get();
    const { [id]: _, ...nextSongTransposeById } = songTransposeById;
    set({
      songs: songs.filter((s) => s.id !== id),
      currentSongId: currentSongId === id ? null : currentSongId,
      songTransposeById: nextSongTransposeById,
    });
    persistSongTransposeById(nextSongTransposeById);
    // Auto-delete from personal cloud
    if (uid) deletePersonalSong(uid, id).catch((e) => console.warn('Personal song delete failed:', e));
    // In shared mode we do NOT auto-delete from shared cloud — the song may be used
    // by other users' setlists. Shared cloud cleanup is done explicitly via sync.
  },
  deleteSetlist: (id) => {
    const { setlists, currentSetlistId, uid } = get();
    set({
      setlists: setlists.filter((sl) => sl.id !== id),
      currentSetlistId: currentSetlistId === id ? null : currentSetlistId,
    });
    // Auto-delete from personal cloud only — NOT from shared cloud
    if (uid) deletePersonalSetlist(uid, id).catch((e) => console.warn('Personal setlist delete failed:', e));
  },
  setCurrentSongId: (id) => {
    const { songs, songTransposeById } = get();
    const songTempo = songs.find((song) => song.id === id)?.tempo ?? 90;
    const savedTranspose = id ? (songTransposeById[id] ?? 0) : 0;
    set({
      currentSongId: id,
      transpose: savedTranspose,
      tempo: songTempo,
      metronomeEnabled: false,
      autoScrollEnabled: false,
    });
  },
  setCurrentSetlistId: (id) => set({ currentSetlistId: id }),
  setTranspose: (n) => {
    const { currentSongId, songTransposeById } = get();
    if (!currentSongId) {
      set({ transpose: n });
      return;
    }

    const normalized = Math.round(n);
    const nextSongTransposeById = { ...songTransposeById };
    if (normalized === 0) {
      // 0 means original key, so we don't persist an offset entry.
      delete nextSongTransposeById[currentSongId];
    } else {
      nextSongTransposeById[currentSongId] = normalized;
    }

    set({
      transpose: normalized,
      songTransposeById: nextSongTransposeById,
    });
    persistSongTransposeById(nextSongTransposeById);
  },
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
  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode;
    persistDarkMode(next);
    return { darkMode: next };
  }),

  /**
   * Tier 1: Restore personal data from users/{uid}/… on login.
   * This is the user's own backup — always auto-restored silently.
   */
  restorePersonalData: async () => {
    const { uid } = get();
    if (!uid) return;
    try {
      const [personalSongs, personalSetlists] = await Promise.all([
        loadPersonalSongs(uid),
        loadPersonalSetlists(uid),
      ]);
      if (personalSongs.length > 0) {
        set({ songs: prepareSongs(personalSongs) });
      }
      if (personalSetlists.length > 0) {
        set({ setlists: prepareSetlists(personalSetlists) });
      }
    } catch (e) {
      console.error('Personal data restore failed:', e);
    }
  },

  /**
   * Tier 2 pull: Download from shared cloud (songs/, setlists/).
   * Only called explicitly via Settings → Download from Cloud.
   * Merges: adds missing songs/setlists; does NOT delete local-only items.
   */
  pullFromCloud: async () => {
    const { uid } = get();
    if (!uid) return;
    try {
      const [cloudSongs, cloudSetlists] = await Promise.all([
        fetchSongsFromFirestore(uid),
        fetchSetlistsFromFirestore(uid),
      ]);
      const { songs, setlists } = get();

      // Merge cloud songs with local — add new, don't remove existing
      if (cloudSongs.length > 0) {
        const localById = new Map(songs.map((s) => [s.id, s]));
        const merged = [...songs];
        for (const cs of cloudSongs) {
          if (!localById.has(cs.id)) {
            merged.push(cs);
          }
        }
        set({ songs: prepareSongs(merged) });
      }

      // Merge cloud setlists with local
      if (cloudSetlists.length > 0) {
        const localById = new Map(setlists.map((sl) => [sl.id, sl]));
        const merged = [...setlists];
        for (const csl of cloudSetlists) {
          if (!localById.has(csl.id)) {
            merged.push(csl);
          }
        }
        set({ setlists: prepareSetlists(merged) });
      }
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
      overwritten: 0, skipped: 0, warnings: [],
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
          const tsDiff = compareTimestamps(song.lastModifiedAt, cloudSong.lastModifiedAt);
          if (tsDiff < 0) {
            // Cloud is newer — protect it
            result.skipped++;
            result.warnings.push(`"${song.title}" skipped: cloud version is newer (${cloudSong.lastModifiedAt ? new Date(cloudSong.lastModifiedAt).toLocaleString() : 'unknown'})`);
            continue;
          }
          const shouldOverwrite = await confirmFn(
            'Duplicate Song',
            `"${song.title}" by ${song.artist} already exists in cloud with different content.\n\nLocal modified: ${song.lastModifiedAt ? new Date(song.lastModifiedAt).toLocaleString() : 'unknown'}\nCloud modified: ${cloudSong.lastModifiedAt ? new Date(cloudSong.lastModifiedAt).toLocaleString() : 'unknown'}\n\nOverwrite the cloud version with your local version?`,
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
          const tsDiff = compareTimestamps(setlist.lastModifiedAt, cloudSetlist.lastModifiedAt);
          if (tsDiff < 0) {
            // Cloud is newer — protect it
            result.skipped++;
            result.warnings.push(`Setlist "${setlist.name}" skipped: cloud version is newer`);
            continue;
          }
          const shouldOverwrite = await confirmFn(
            'Duplicate Setlist',
            `Setlist "${setlist.name}" already exists in cloud with different songs.\n\nLocal modified: ${setlist.lastModifiedAt ? new Date(setlist.lastModifiedAt).toLocaleString() : 'unknown'}\nCloud modified: ${cloudSetlist.lastModifiedAt ? new Date(cloudSetlist.lastModifiedAt).toLocaleString() : 'unknown'}\n\nOverwrite the cloud version?`,
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
      overwritten: 0, skipped: 0, warnings: [],
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
            `"${cloudSong.title}" by ${cloudSong.artist} exists locally with different content.\n\nLocal modified: ${localSong.lastModifiedAt ? new Date(localSong.lastModifiedAt).toLocaleString() : 'unknown'}\nCloud modified: ${cloudSong.lastModifiedAt ? new Date(cloudSong.lastModifiedAt).toLocaleString() : 'unknown'}\n\nOverwrite your local version with the cloud version?`,
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
            `Setlist "${cloudSetlist.name}" exists locally with different songs.\n\nLocal modified: ${localSetlist.lastModifiedAt ? new Date(localSetlist.lastModifiedAt).toLocaleString() : 'unknown'}\nCloud modified: ${cloudSetlist.lastModifiedAt ? new Date(cloudSetlist.lastModifiedAt).toLocaleString() : 'unknown'}\n\nOverwrite your local version with the cloud version?`,
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

    set({ songs: prepareSongs(newSongs), setlists: prepareSetlists(newSetlists) });
    // Persist merged data to personal cloud
    if (uid) {
      savePersonalSongs(uid, prepareSongs(newSongs)).catch((e) => console.warn('Personal song sync failed:', e));
      savePersonalSetlists(uid, prepareSetlists(newSetlists)).catch((e) => console.warn('Personal setlist sync failed:', e));
    }
    return result;
  },

  fetchCloudSetlists: async (): Promise<Setlist[]> => {
    const { uid } = get();
    if (!uid) throw new Error('Not signed in');
    return prepareSetlists(await fetchSetlistsFromFirestore(uid));
  },

  uploadSetlist: async (setlistId: string): Promise<{ songsUploaded: number; warnings: string[] }> => {
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

    // Ensure cloud has the latest versions of all songs referenced by this setlist.
    // This avoids stale chord/content data across devices.
    const cloudSongs = await fetchSongsFromFirestore(uid);
    const cloudSongById = new Map(cloudSongs.map((s) => [s.id, s] as const));

    let songsUploaded = 0;
    const warnings: string[] = [];
    for (const songId of setlist.songIds) {
      const localSong = songs.find((s) => s.id === songId);
      if (!localSong) continue;

      const cloudSong = cloudSongById.get(songId);
      if (!cloudSong) {
        // Not in cloud yet — upload
        await uploadSingleSong(uid, localSong);
        cloudSongById.set(songId, localSong);
        songsUploaded++;
      } else if (!songsContentEqual(localSong, cloudSong)) {
        // Content differs — check timestamps
        const tsDiff = compareTimestamps(localSong.lastModifiedAt, cloudSong.lastModifiedAt);
        if (tsDiff < 0) {
          // Cloud is newer — don't overwrite
          warnings.push(`"${localSong.title}" skipped: cloud version is newer (${cloudSong.lastModifiedAt ? new Date(cloudSong.lastModifiedAt).toLocaleString() : 'unknown'})`);
        } else {
          // Local is newer or same age — upload
          await uploadSingleSong(uid, localSong);
          cloudSongById.set(songId, localSong);
          songsUploaded++;
        }
      }
    }

    // Upload setlist after songs so all referenced song IDs exist in cloud.
    await uploadSingleSetlist(uid, setlist);

    return { songsUploaded, warnings };
  },

  downloadSetlist: async (cloudSetlist: Setlist): Promise<{ songsDownloaded: number; warnings: string[] }> => {
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

    // Fetch all songs referenced by this setlist and refresh local copies as needed.
    // This keeps chord edits in sync even when song IDs already exist locally.
    const referencedSongIds = [...new Set(cloudSetlist.songIds)];

    let songsDownloaded = 0;
    const warnings: string[] = [];
    const newSongs = [...songs];

    if (referencedSongIds.length > 0) {
      const cloudSongs = await fetchSongsByIds(uid, referencedSongIds);
      const fetchedIds = new Set(cloudSongs.map((s) => s.id));

      // Warn about songs referenced by setlist but missing from cloud
      for (const id of referencedSongIds) {
        if (!fetchedIds.has(id)) {
          const localSong = newSongs.find((s) => s.id === id);
          warnings.push(`"${localSong?.title || id}" is in the setlist but missing from cloud`);
        }
      }

      for (const cs of cloudSongs) {
        const idx = newSongs.findIndex((s) => s.id === cs.id);
        if (idx < 0) {
          newSongs.push(normalizeSong(cs));
          songsDownloaded++;
          continue;
        }

        if (!songsContentEqual(newSongs[idx], cs)) {
          newSongs[idx] = normalizeSong(cs);
          songsDownloaded++;
        }
      }
    }

    set({ songs: prepareSongs(newSongs), setlists: prepareSetlists(newSetlists) });
    // Persist downloaded data to personal cloud
    if (uid) {
      savePersonalSongs(uid, prepareSongs(newSongs)).catch((e) => console.warn('Personal song sync failed:', e));
      savePersonalSetlists(uid, prepareSetlists(newSetlists)).catch((e) => console.warn('Personal setlist sync failed:', e));
    }
    return { songsDownloaded, warnings };
  },
}));

export default useAppStore;

// Expose store for E2E testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__appStore = useAppStore;
}