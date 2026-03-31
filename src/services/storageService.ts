import { Song, Setlist } from '../types';

const KEYS = { SONGS: '@music_abcf_songs', SETLISTS: '@music_abcf_setlists' } as const;

export async function saveSongs(songs: Song[]): Promise<void> {
  localStorage.setItem(KEYS.SONGS, JSON.stringify(songs));
}

export async function loadSongs(): Promise<Song[]> {
  const raw = localStorage.getItem(KEYS.SONGS);
  return raw ? (JSON.parse(raw) as Song[]) : [];
}

export async function saveSetlists(setlists: Setlist[]): Promise<void> {
  localStorage.setItem(KEYS.SETLISTS, JSON.stringify(setlists));
}

export async function loadSetlists(): Promise<Setlist[]> {
  const raw = localStorage.getItem(KEYS.SETLISTS);
  return raw ? (JSON.parse(raw) as Setlist[]) : [];
}
