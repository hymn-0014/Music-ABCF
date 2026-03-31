import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, Setlist } from '../types';

const KEYS = { SONGS: '@music_abcf_songs', SETLISTS: '@music_abcf_setlists' } as const;

export async function saveSongs(songs: Song[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SONGS, JSON.stringify(songs));
}

export async function loadSongs(): Promise<Song[]> {
  const raw = await AsyncStorage.getItem(KEYS.SONGS);
  return raw ? (JSON.parse(raw) as Song[]) : [];
}

export async function saveSetlists(setlists: Setlist[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETLISTS, JSON.stringify(setlists));
}

export async function loadSetlists(): Promise<Setlist[]> {
  const raw = await AsyncStorage.getItem(KEYS.SETLISTS);
  return raw ? (JSON.parse(raw) as Setlist[]) : [];
}
