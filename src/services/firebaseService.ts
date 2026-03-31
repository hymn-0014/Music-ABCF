import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Song, Setlist } from '../types';

export async function syncSongsToFirestore(songs: Song[]): Promise<void> {
  const batch = writeBatch(db);
  for (const song of songs) {
    batch.set(doc(db, 'songs', song.id), song);
  }
  await batch.commit();
}

export async function fetchSongsFromFirestore(): Promise<Song[]> {
  const snap = await getDocs(collection(db, 'songs'));
  return snap.docs.map((d) => d.data() as Song);
}

export async function syncSetlistsToFirestore(setlists: Setlist[]): Promise<void> {
  const batch = writeBatch(db);
  for (const sl of setlists) {
    batch.set(doc(db, 'setlists', sl.id), sl);
  }
  await batch.commit();
}

export async function fetchSetlistsFromFirestore(): Promise<Setlist[]> {
  const snap = await getDocs(collection(db, 'setlists'));
  return snap.docs.map((d) => d.data() as Setlist);
}