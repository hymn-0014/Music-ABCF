import { AccidentalPreference } from '../types';

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_INDEX: Record<string, number> = {};
SHARP_NOTES.forEach((n, i) => { NOTE_TO_INDEX[n] = i; });
FLAT_NOTES.forEach((n, i) => { NOTE_TO_INDEX[n] = i; });

// Nashville number system: numbers relative to the key
const NASHVILLE_NUMBERS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

function noteIndex(note: string): number {
  const idx = NOTE_TO_INDEX[note];
  return idx !== undefined ? idx : -1;
}

export function transposeChord(chord: string, semitones: number, pref: AccidentalPreference = 'sharp'): string {
  const notes = pref === 'sharp' ? SHARP_NOTES : FLAT_NOTES;
  // Handle slash chords: transpose both root and bass note
  const slashIdx = chord.indexOf('/');
  if (slashIdx > 0) {
    const rootPart = chord.substring(0, slashIdx);
    const bassPart = chord.substring(slashIdx + 1);
    return transposeChord(rootPart, semitones, pref) + '/' + transposeChord(bassPart, semitones, pref);
  }
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;
  const [, root, suffix] = match;
  const idx = noteIndex(root);
  if (idx === -1) return chord;
  const newIdx = (idx + semitones % 12 + 12) % 12;
  return notes[newIdx] + suffix;
}

export function transposeLine(chordLine: string, semitones: number, pref: AccidentalPreference = 'sharp'): string {
  return chordLine.replace(/[A-G][#b]?[a-z0-9]*(?:\/[A-G][#b]?)?/g, (match) => transposeChord(match, semitones, pref));
}

export function chordToNashville(chord: string, keyRoot: string): string {
  // Handle slash chords: convert both root and bass note
  const slashIdx = chord.indexOf('/');
  if (slashIdx > 0) {
    const rootPart = chord.substring(0, slashIdx);
    const bassPart = chord.substring(slashIdx + 1);
    return chordToNashville(rootPart, keyRoot) + '/' + chordToNashville(bassPart, keyRoot);
  }
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;
  const [, root, suffix] = match;
  const rootIdx = noteIndex(root);
  const keyIdx = noteIndex(keyRoot);
  if (rootIdx === -1 || keyIdx === -1) return chord;
  const interval = (rootIdx - keyIdx + 12) % 12;
  return NASHVILLE_NUMBERS[interval] + suffix;
}

export function nashvilleLineFromChords(chordLine: string, keyRoot: string): string {
  return chordLine.replace(/[A-G][#b]?[a-z0-9]*(?:\/[A-G][#b]?)?/g, (match) => chordToNashville(match, keyRoot));
}