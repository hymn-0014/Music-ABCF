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
  uploadSetlist: (setlistId: string) => Promise<{ songsUploaded: number; warnings: string[] }>;
  downloadSetlist: (setlist: Setlist) => Promise<{ songsDownloaded: number; warnings: string[] }>;
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
    set({ setlists: newSetlists });
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
  },
  deleteSong: (id) => {
    const { songs, currentSongId } = get();
    set({
      songs: songs.filter((s) => s.id !== id),
      currentSongId: currentSongId === id ? null : currentSongId,
    });
    // In shared mode we do NOT auto-delete from cloud — the song may be used
    // by other users' setlists. Cloud cleanup is done explicitly via sync.
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

    set({ songs: newSongs, setlists: newSetlists });
    return result;
  },

  fetchCloudSetlists: async (): Promise<Setlist[]> => {
    const { uid } = get();
    if (!uid) throw new Error('Not signed in');
    return fetchSetlistsFromFirestore(uid);
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

    set({ songs: newSongs, setlists: newSetlists });
    return { songsDownloaded, warnings };
  },
}));

export default useAppStore;

// Expose store for E2E testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__appStore = useAppStore;
}