import { ChordLyricLine } from '../types';
import { parseChordSheet } from '../utils/chordParser';

/**
 * Extract chords from a URL that returns a chord sheet in plain text.
 * Works with any page that has chord/lyric content — no video link required.
 * Falls back to a CORS proxy for cross-origin requests on web.
 */
export async function fetchChordsFromUrl(url: string): Promise<{
  title: string;
  artist: string;
  key: string;
  lines: ChordLyricLine[];
} | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    return extractChordsFromHtml(html);
  } catch {
    return null;
  }
}

/**
 * Extract structured chord data from raw HTML content.
 * Looks for <pre> blocks commonly used by chord sites.
 */
function extractChordsFromHtml(html: string): {
  title: string;
  artist: string;
  key: string;
  lines: ChordLyricLine[];
} | null {
  // Try <pre> tags first (most chord sites wrap content in <pre>)
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  const rawText = preMatch ? stripHtmlTags(preMatch[1]) : null;

  if (!rawText) return null;

  const lines = parseChordSheet(rawText);
  if (lines.length === 0) return null;

  // Try to extract title from <title> tag
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const pageTitle = titleMatch ? stripHtmlTags(titleMatch[1]).trim() : '';

  // Attempt to split "Song - Artist" or "Song by Artist" from page title
  const { title, artist } = parseTitleArtist(pageTitle);

  // Detect key from first chord in the sheet
  const firstChord = lines.find((l) => l.chords.trim())?.chords.trim().split(/\s+/)[0] ?? '';
  const keyMatch = firstChord.match(/^([A-G][#b]?)/);
  const key = keyMatch ? keyMatch[1] : 'C';

  return { title, artist, key, lines };
}

/**
 * Parse chords directly from pasted text (no URL needed).
 * User can paste a chord sheet and get structured data.
 */
export function parseChordsFromText(text: string, songTitle: string = '', songArtist: string = ''): {
  title: string;
  artist: string;
  key: string;
  lines: ChordLyricLine[];
} | null {
  const lines = parseChordSheet(text);
  if (lines.length === 0) return null;

  const firstChord = lines.find((l) => l.chords.trim())?.chords.trim().split(/\s+/)[0] ?? '';
  const keyMatch = firstChord.match(/^([A-G][#b]?)/);
  const key = keyMatch ? keyMatch[1] : 'C';

  return { title: songTitle || 'Untitled', artist: songArtist || 'Unknown', key, lines };
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function parseTitleArtist(pageTitle: string): { title: string; artist: string } {
  // Common patterns: "Song Title - Artist Name", "Song Title by Artist Name"
  const dashSplit = pageTitle.split(/\s[-–—]\s/);
  if (dashSplit.length >= 2) {
    return { title: dashSplit[0].trim(), artist: dashSplit[1].trim() };
  }
  const bySplit = pageTitle.split(/\sby\s/i);
  if (bySplit.length >= 2) {
    return { title: bySplit[0].trim(), artist: bySplit[1].trim() };
  }
  return { title: pageTitle || 'Untitled', artist: 'Unknown' };
}
