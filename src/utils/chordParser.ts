import { ChordLyricLine } from '../types';

/**
 * Parse a raw chord-sheet string into structured ChordLyricLine pairs.
 * Input format: alternating chord lines (start with spaces or chord tokens)
 * and lyric lines.  A chord line is detected when every non-whitespace
 * token matches a chord pattern.
 */
const CHORD_RE = /^[A-G][#b]?[a-z0-9/]*$/;

function isChordLine(line: string): boolean {
  if (line.trim() === '') return false;
  const tokens = line.trim().split(/\s+/);
  return tokens.every((t) => CHORD_RE.test(t));
}

export function parseChordSheet(raw: string): ChordLyricLine[] {
  const lines = raw.split('\n');
  const result: ChordLyricLine[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isChordLine(lines[i])) {
      const chords = lines[i];
      const lyrics = i + 1 < lines.length && !isChordLine(lines[i + 1]) ? lines[i + 1] : '';
      result.push({ chords, lyrics });
      i += lyrics ? 2 : 1;
    } else if (lines[i].trim() !== '') {
      result.push({ chords: '', lyrics: lines[i] });
      i++;
    } else {
      i++;
    }
  }
  return result;
}