export interface ChordLyricLine {
  chords: string; // chord symbols spaced above words
  lyrics: string; // the lyric text
}

export interface ModificationEntry {
  userEmail: string;
  action: string; // e.g. "created", "edited", "added song", "removed song", "reordered"
  timestamp: string; // ISO date
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string; // original key, e.g. "G"
  tempo: number;
  lines: ChordLyricLine[];
  lastModifiedBy?: string; // email of last user who modified
  lastModifiedAt?: string; // ISO date
  modificationHistory?: ModificationEntry[];
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: string; // ISO date
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  modificationHistory?: ModificationEntry[];
}

export type NotationMode = 'standard' | 'nashville';
export type AccidentalPreference = 'sharp' | 'flat';

export interface SyncResult {
  songsUploaded: number;
  songsDownloaded: number;
  setlistsUploaded: number;
  setlistsDownloaded: number;
  overwritten: number;
  skipped: number;
}

export type SyncConfirmFn = (title: string, message: string) => Promise<boolean>;