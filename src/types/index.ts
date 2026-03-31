export interface ChordLyricLine {
  chords: string; // chord symbols spaced above words
  lyrics: string; // the lyric text
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string; // original key, e.g. "G"
  tempo: number;
  lines: ChordLyricLine[];
}

export interface Setlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: string; // ISO date
}

export type NotationMode = 'standard' | 'nashville';
export type AccidentalPreference = 'sharp' | 'flat';