import { collection, getDocs, writeBatch, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Song, Setlist } from '../types';

function userSongsCol(uid: string) {
  return collection(db, 'users', uid, 'songs');
}

function userSetlistsCol(uid: string) {
  return collection(db, 'users', uid, 'setlists');
}

export async function syncSongsToFirestore(uid: string, songs: Song[]): Promise<void> {
  const snap = await getDocs(userSongsCol(uid));
  const localIds = new Set(songs.map((s) => s.id));
  const batch = writeBatch(db);
  // Delete cloud songs not present locally
  for (const d of snap.docs) {
    if (!localIds.has(d.id)) batch.delete(d.ref);
  }
  // Write all local songs
  for (const song of songs) {
    batch.set(doc(db, 'users', uid, 'songs', song.id), song);
  }
  await batch.commit();
}

export async function fetchSongsFromFirestore(uid: string): Promise<Song[]> {
  const snap = await getDocs(userSongsCol(uid));
  return snap.docs.map((d) => d.data() as Song);
}

export async function syncSetlistsToFirestore(uid: string, setlists: Setlist[]): Promise<void> {
  const snap = await getDocs(userSetlistsCol(uid));
  const localIds = new Set(setlists.map((sl) => sl.id));
  const batch = writeBatch(db);
  // Delete cloud setlists not present locally
  for (const d of snap.docs) {
    if (!localIds.has(d.id)) batch.delete(d.ref);
  }
  // Write all local setlists
  for (const sl of setlists) {
    batch.set(doc(db, 'users', uid, 'setlists', sl.id), sl);
  }
  await batch.commit();
}

export async function fetchSetlistsFromFirestore(uid: string): Promise<Setlist[]> {
  const snap = await getDocs(userSetlistsCol(uid));
  return snap.docs.map((d) => d.data() as Setlist);
}

export async function uploadSingleSong(uid: string, song: Song): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'songs', song.id), song);
}

export async function deleteSongFromFirestore(uid: string, songId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'songs', songId));
}

export async function uploadSingleSetlist(uid: string, setlist: Setlist): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'setlists', setlist.id), setlist);
}

export async function deleteSetlistFromFirestore(uid: string, setlistId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'setlists', setlistId));
}

/** Fetch specific songs by their IDs */
export async function fetchSongsByIds(uid: string, songIds: string[]): Promise<Song[]> {
  if (songIds.length === 0) return [];
  const snap = await getDocs(userSongsCol(uid));
  const idSet = new Set(songIds);
  return snap.docs.filter((d) => idSet.has(d.id)).map((d) => d.data() as Song);
}