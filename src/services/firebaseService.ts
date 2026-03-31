import { collection, getDocs, writeBatch, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Song, Setlist } from '../types';

// =====================================================================
// TIER 1 — Personal auto-sync (users/{uid}/…)
// Silently saves/restores per-user data so nothing is lost on refresh.
// =====================================================================

export async function savePersonalSongs(uid: string, songs: Song[]): Promise<void> {
  const batch = writeBatch(db);
  // Overwrite entire personal collection
  for (const song of songs) {
    batch.set(doc(db, 'users', uid, 'songs', song.id), song);
  }
  await batch.commit();
}

export async function loadPersonalSongs(uid: string): Promise<Song[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'songs'));
  return snap.docs.map((d) => d.data() as Song);
}

export async function savePersonalSetlists(uid: string, setlists: Setlist[]): Promise<void> {
  const batch = writeBatch(db);
  for (const sl of setlists) {
    batch.set(doc(db, 'users', uid, 'setlists', sl.id), sl);
  }
  await batch.commit();
}

export async function loadPersonalSetlists(uid: string): Promise<Setlist[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'setlists'));
  return snap.docs.map((d) => d.data() as Setlist);
}

export async function savePersonalSingleSong(uid: string, song: Song): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'songs', song.id), song);
}

export async function deletePersonalSong(uid: string, songId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'songs', songId));
}

export async function savePersonalSingleSetlist(uid: string, setlist: Setlist): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'setlists', setlist.id), setlist);
}

export async function deletePersonalSetlist(uid: string, setlistId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'setlists', setlistId));
}

// =====================================================================
// TIER 2 — Shared cloud (songs/, setlists/)
// Only written to when the user explicitly clicks Upload / Sync.
// All registered users can read from here.
// =====================================================================

const sharedSongsCol = () => collection(db, 'songs');
const sharedSetlistsCol = () => collection(db, 'setlists');

/**
 * Push local songs to the shared cloud collection.
 * Upsert only — never delete songs that other users may own.
 */
export async function syncSongsToFirestore(_uid: string, songs: Song[]): Promise<void> {
  const batch = writeBatch(db);
  for (const song of songs) {
    batch.set(doc(db, 'songs', song.id), song);
  }
  await batch.commit();
}

export async function fetchSongsFromFirestore(_uid: string): Promise<Song[]> {
  const snap = await getDocs(sharedSongsCol());
  return snap.docs.map((d) => d.data() as Song);
}

/**
 * Push local setlists to the shared cloud collection.
 * Upsert only — never delete setlists other users may own.
 */
export async function syncSetlistsToFirestore(_uid: string, setlists: Setlist[]): Promise<void> {
  const batch = writeBatch(db);
  for (const sl of setlists) {
    batch.set(doc(db, 'setlists', sl.id), sl);
  }
  await batch.commit();
}

export async function fetchSetlistsFromFirestore(_uid: string): Promise<Setlist[]> {
  const snap = await getDocs(sharedSetlistsCol());
  return snap.docs.map((d) => d.data() as Setlist);
}

export async function uploadSingleSong(_uid: string, song: Song): Promise<void> {
  await setDoc(doc(db, 'songs', song.id), song);
}

export async function deleteSongFromFirestore(_uid: string, songId: string): Promise<void> {
  await deleteDoc(doc(db, 'songs', songId));
}

export async function uploadSingleSetlist(_uid: string, setlist: Setlist): Promise<void> {
  await setDoc(doc(db, 'setlists', setlist.id), setlist);
}

export async function deleteSetlistFromFirestore(_uid: string, setlistId: string): Promise<void> {
  await deleteDoc(doc(db, 'setlists', setlistId));
}

/** Fetch specific songs by their IDs from the shared collection */
export async function fetchSongsByIds(_uid: string, songIds: string[]): Promise<Song[]> {
  if (songIds.length === 0) return [];
  const snap = await getDocs(sharedSongsCol());
  const idSet = new Set(songIds);
  return snap.docs.filter((d) => idSet.has(d.id)).map((d) => d.data() as Song);
}