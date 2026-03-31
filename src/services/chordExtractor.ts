import { ChordLyricLine } from '../types';
import { parseChordSheet } from '../utils/chordParser';

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
];

/**
 * Fetch a URL through CORS proxies (needed for web).
 * Tries direct fetch first, then falls back to proxies.
 */
async function fetchWithCorsProxy(url: string): Promise<string | null> {
  // Try direct fetch first
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.length > 100) return text;
    }
  } catch {
    // CORS blocked — expected on web, try proxies
  }

  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url));
      if (res.ok) {
        const text = await res.text();
        if (text.length > 100) return text;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Extract chords from a URL that has a chord sheet.
 * Uses CORS proxies for cross-origin requests on web.
 */
export async function fetchChordsFromUrl(url: string): Promise<{
  title: string;
  artist: string;
  key: string;
  lines: ChordLyricLine[];
} | null> {
  const html = await fetchWithCorsProxy(url);
  if (!html) return null;
  return extractChordsFromHtml(html);
}

/**
 * Extract structured chord data from raw HTML content.
 * Supports multiple common chord site formats.
 */
function extractChordsFromHtml(html: string): {
  title: string;
  artist: string;
  key: string;
  lines: ChordLyricLine[];
} | null {
  let rawText: string | null = null;

  // Strategy 1: <pre> blocks (Ultimate Guitar, many chord sites)
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    rawText = stripHtmlTags(preMatch[1]);
  }

  // Strategy 2: Look for chord-specific class names used by popular sites
  if (!rawText) {
    const chordProMatch = html.match(/<div[^>]*class="[^"]*(?:chord-pro|chordpro|chord-sheet|chords-text|song-sheet|lyrics-content|ugm-b-tab--content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (chordProMatch) {
      rawText = stripHtmlTags(chordProMatch[1]);
    }
  }

  // Strategy 3: Look for spans with data-name attribute (Ultimate Guitar modern format)
  if (!rawText) {
    const ugSpans = html.match(/<span[^>]*data-name="[^"]*"[^>]*>[^<]*<\/span>/gi);
    if (ugSpans && ugSpans.length > 0) {
      // UG uses span elements inline in tab content — grab the whole tab container
      const tabContent = html.match(/<div[^>]*class="[^"]*js-store[^"]*"[^>]*data-content="([^"]*)"/i);
      if (tabContent) {
        try {
          const decoded = tabContent[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'");
          const data = JSON.parse(decoded);
          const tabText = data?.store?.page?.data?.tab_view?.wiki_tab?.content;
          if (tabText) {
            rawText = tabText.replace(/\[ch\](.*?)\[\/ch\]/g, '$1').replace(/\[tab\]|\[\/tab\]/g, '');
          }
        } catch {
          // JSON parse failed, continue to next strategy
        }
      }
    }
  }

  // Strategy 4: Any reasonably large text block that contains chord patterns
  if (!rawText) {
    const bodyText = stripHtmlTags(
      (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) ?? [null, html])[1]
    );
    // Check if the stripped text has chord-like content
    const chordLineCount = bodyText.split('\n').filter(line => {
      const tokens = line.trim().split(/\s+/);
      return tokens.length > 0 && tokens.length <= 20 &&
        tokens.every(t => /^[A-G][#b]?[a-z0-9/()]*$/.test(t));
    }).length;
    if (chordLineCount >= 2) {
      rawText = bodyText;
    }
  }

  if (!rawText) return null;

  const lines = parseChordSheet(rawText);
  if (lines.length === 0) return null;

  // Extract title from <title> tag
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const pageTitle = titleMatch ? stripHtmlTags(titleMatch[1]).trim() : '';
  const { title, artist } = parseTitleArtist(pageTitle);

  // Detect key from first chord
  const firstChord = lines.find((l) => l.chords.trim())?.chords.trim().split(/\s+/)[0] ?? '';
  const keyMatch = firstChord.match(/^([A-G][#b]?)/);
  const key = keyMatch ? keyMatch[1] : 'C';

  return { title, artist, key, lines };
}

/**
 * Parse chords directly from pasted text.
 */
export function parseChordsFromText(text: string, songTitle: string = '', songArtist: string = ''): {
  title: string;
  artist: string;
  key: string;
  lines: ChordLyricLine[];
} | null {
  // Handle [ch]...[/ch] tags from Ultimate Guitar copy-paste
  let cleaned = text
    .replace(/\[ch\](.*?)\[\/ch\]/g, '$1')
    .replace(/\[tab\]|\[\/tab\]/g, '');

  const lines = parseChordSheet(cleaned);
  if (lines.length === 0) return null;

  const firstChord = lines.find((l) => l.chords.trim())?.chords.trim().split(/\s+/)[0] ?? '';
  const keyMatch = firstChord.match(/^([A-G][#b]?)/);
  const key = keyMatch ? keyMatch[1] : 'C';

  return { title: songTitle || 'Untitled', artist: songArtist || 'Unknown', key, lines };
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function parseTitleArtist(pageTitle: string): { title: string; artist: string } {
  // Remove common suffixes
  const clean = pageTitle
    .replace(/\s*[-–—|]\s*(?:Chords|Tab|Tabs|Lyrics|Ultimate Guitar|Chordie|E-Chords).*$/i, '')
    .trim();

  const dashSplit = clean.split(/\s[-–—]\s/);
  if (dashSplit.length >= 2) {
    return { title: dashSplit[0].trim(), artist: dashSplit[1].trim() };
  }
  const bySplit = clean.split(/\sby\s/i);
  if (bySplit.length >= 2) {
    return { title: bySplit[0].trim(), artist: bySplit[1].trim() };
  }
  return { title: clean || 'Untitled', artist: 'Unknown' };
}
