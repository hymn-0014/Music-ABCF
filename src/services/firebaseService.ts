import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Song, Setlist } from '../types';

function userSongsCol(uid: string) {
  return collection(db, 'users', uid, 'songs');
}

function userSetlistsCol(uid: string) {
  return collection(db, 'users', uid, 'setlists');
}

export async function syncSongsToFirestore(uid: string, songs: Song[]): Promise<void> {
  const batch = writeBatch(db);
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
  const batch = writeBatch(db);
  for (const sl of setlists) {
    batch.set(doc(db, 'users', uid, 'setlists', sl.id), sl);
  }
  await batch.commit();
}

export async function fetchSetlistsFromFirestore(uid: string): Promise<Setlist[]> {
  const snap = await getDocs(userSetlistsCol(uid));
  return snap.docs.map((d) => d.data() as Setlist);
}