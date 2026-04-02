import { collection, getDocs, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Song, Setlist, AdminUser, AdminStats } from '../types';

/** The very first admin — seeded automatically if the config doc doesn't exist yet */
const INITIAL_ADMIN_EMAIL = 'hymn.0014@gmail.com';

/** Check if a user email is in the admins list */
export async function checkIsAdmin(email: string): Promise<boolean> {
  try {
    const ref = doc(db, 'config', 'admins');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // Seed the initial admin on first check
      if (email.toLowerCase() === INITIAL_ADMIN_EMAIL) {
        await setDoc(ref, { emails: [INITIAL_ADMIN_EMAIL] });
        return true;
      }
      return false;
    }
    const data = snap.data();
    const emails: string[] = data?.emails ?? [];
    return emails.some((e) => e.toLowerCase() === email.toLowerCase());
  } catch (e) {
    console.error('Admin check failed:', e);
    return false;
  }
}

/** Fetch all songs from the shared cloud collection */
export async function fetchAllCloudSongs(): Promise<Song[]> {
  const snap = await getDocs(collection(db, 'songs'));
  return snap.docs.map((d) => d.data() as Song);
}

/** Fetch all setlists from the shared cloud collection */
export async function fetchAllCloudSetlists(): Promise<Setlist[]> {
  const snap = await getDocs(collection(db, 'setlists'));
  return snap.docs.map((d) => d.data() as Setlist);
}

/** Delete a song from shared cloud */
export async function deleteCloudSong(songId: string): Promise<void> {
  await deleteDoc(doc(db, 'songs', songId));
}

/** Delete a setlist from shared cloud */
export async function deleteCloudSetlist(setlistId: string): Promise<void> {
  await deleteDoc(doc(db, 'setlists', setlistId));
}

/** Derive unique users from song/setlist modification data */
export function deriveUsers(songs: Song[], setlists: Setlist[]): AdminUser[] {
  const userMap = new Map<string, AdminUser>();

  for (const song of songs) {
    const email = song.lastModifiedBy;
    if (!email) continue;
    const existing = userMap.get(email);
    if (existing) {
      existing.songsCount++;
      if (song.lastModifiedAt && (!existing.lastActive || song.lastModifiedAt > existing.lastActive)) {
        existing.lastActive = song.lastModifiedAt;
      }
    } else {
      userMap.set(email, {
        uid: email, // use email as identifier since we derive from data
        email,
        songsCount: 1,
        setlistsCount: 0,
        lastActive: song.lastModifiedAt,
      });
    }
  }

  for (const setlist of setlists) {
    const email = setlist.lastModifiedBy;
    if (!email) continue;
    const existing = userMap.get(email);
    if (existing) {
      existing.setlistsCount++;
      if (setlist.lastModifiedAt && (!existing.lastActive || setlist.lastModifiedAt > existing.lastActive)) {
        existing.lastActive = setlist.lastModifiedAt;
      }
    } else {
      userMap.set(email, {
        uid: email,
        email,
        songsCount: 0,
        setlistsCount: 1,
        lastActive: setlist.lastModifiedAt,
      });
    }
  }

  return Array.from(userMap.values()).sort((a, b) => {
    if (a.lastActive && b.lastActive) return b.lastActive.localeCompare(a.lastActive);
    if (a.lastActive) return -1;
    if (b.lastActive) return 1;
    return a.email.localeCompare(b.email);
  });
}

/** Compute basic stats */
export function computeStats(songs: Song[], setlists: Setlist[], users: AdminUser[]): AdminStats {
  return {
    totalSongs: songs.length,
    totalSetlists: setlists.length,
    totalUsers: users.length,
  };
}

/** Export all data as a JSON blob for backup */
export function exportDataAsJson(songs: Song[], setlists: Setlist[]): string {
  return JSON.stringify({ songs, setlists, exportedAt: new Date().toISOString() }, null, 2);
}

/** Add an email to the admin list */
export async function addAdmin(email: string): Promise<void> {
  const ref = doc(db, 'config', 'admins');
  const snap = await getDoc(ref);
  const emails: string[] = snap.exists() ? (snap.data()?.emails ?? []) : [];
  const normalised = email.toLowerCase();
  if (!emails.some((e) => e.toLowerCase() === normalised)) {
    await setDoc(ref, { emails: [...emails, normalised] });
  }
}

/** Remove an email from the admin list */
export async function removeAdmin(email: string): Promise<void> {
  const ref = doc(db, 'config', 'admins');
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const emails: string[] = snap.data()?.emails ?? [];
  const normalised = email.toLowerCase();
  await setDoc(ref, { emails: emails.filter((e) => e.toLowerCase() !== normalised) });
}
