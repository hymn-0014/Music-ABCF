import React, { useEffect, useRef, useState } from 'react';
import { ChordLyricLine, NotationMode, AccidentalPreference } from '../types';
import { transposeLine, nashvilleLineFromChords } from '../utils/chordTranspose';

interface LyricsViewerProps {
  lines: ChordLyricLine[];
  transpose: number;
  songKey: string;
  notation: NotationMode;
  accidental: AccidentalPreference;
  autoScrollEnabled: boolean;
  autoScrollSpeed: number;
  editMode?: boolean;
  lineToggleButtonsEnabled?: boolean;
  columns?: 1 | 2;
  viewMode?: 'all' | 'chords' | 'lyrics';
  sectionJumpEnabled?: boolean;
  sectionJumpSide?: 'left' | 'right';
  sectionJumpAutoHide?: boolean;
  onLinesChange?: (newLines: ChordLyricLine[]) => void;
}

const CHORD_COLOR = '#4FC3F7';
const SECTION_PATTERN = /^\[.*\]$/;
const SECTION_KEYWORD_PATTERN = /^(?:intro|verse|chorus|refrain|bridge|pre[\s-]?chorus|post[\s-]?chorus|interlude|instrumental|tag|hook|outro|ending|coda)$/i;

interface SectionInfo {
  label: string;
  short: string;
}

const sectionAbbreviations: Record<string, string> = {
  intro: 'I',
  verse: 'V',
  chorus: 'C',
  refrain: 'R',
  bridge: 'B',
  prechorus: 'PC',
  postchorus: 'POC',
  interlude: 'IN',
  instrumental: 'INST',
  tag: 'T',
  hook: 'H',
  outro: 'O',
  ending: 'END',
  coda: 'CODA',
};

function parseSectionInfo(text: string): SectionInfo | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/^\[\s*/, '')
    .replace(/\s*\]$/, '')
    .replace(/[:.\-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  const sectionMatch = normalized.match(/^([A-Za-z][A-Za-z\s-]*?)(?:\s+(\d+|[ivxIVX]+|[A-Za-z]))?(?:\s*[xX]\s*\d+)?$/);
  if (!sectionMatch) return null;

  const sectionName = sectionMatch[1].trim();
  if (!SECTION_KEYWORD_PATTERN.test(sectionName)) return null;

  const suffix = sectionMatch[2] ? sectionMatch[2].toUpperCase() : '';
  const key = sectionName.toLowerCase().replace(/[\s-]/g, '');
  const base = sectionAbbreviations[key] ?? sectionName.slice(0, 2).toUpperCase();

  return {
    label: normalized,
    short: `${base}${suffix}`,
  };
}

function isSectionLine(text: string): boolean {
  if (SECTION_PATTERN.test(text.trim())) return true;
  return parseSectionInfo(text) !== null;
}
const CHORD_PATTERN = /(?:[A-G][#b]?(?:maj|min|m|dim|aug|sus|add|M)?(?:\d+)?(?:(?:sus|add|aug|dim|maj|min|m|b|#)\d*)*(?:\([^)]*\))?(?:\/[A-G][#b]?)?|b?[1-7][#b]?(?:maj|min|m|dim|aug|sus|add|M)?(?:\d+)?(?:(?:sus|add|aug|dim|maj|min|m|b|#)\d*)*(?:\([^)]*\))?(?:\/b?[1-7][#b]?)?)/g;

function renderColoredChordLine(chordLine: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  CHORD_PATTERN.lastIndex = 0;

  while ((match = CHORD_PATTERN.exec(chordLine)) !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={`s-${lastIndex}`} className="chord-space">{chordLine.substring(lastIndex, match.index)}</span>);
    }
    elements.push(<span key={`c-${match.index}`} style={{ color: CHORD_COLOR }}>{match[0]}</span>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < chordLine.length) {
    elements.push(<span key="s-end" className="chord-space">{chordLine.substring(lastIndex)}</span>);
  }

  return elements;
}

interface RenderLine {
  index: number;
  displayChords: string;
  isSection: boolean;
  lyrics: string;
  sectionInfo: SectionInfo | null;
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({
  lines, transpose, songKey, notation, accidental, autoScrollEnabled, autoScrollSpeed, editMode, lineToggleButtonsEnabled = true, columns = 1, viewMode = 'all', sectionJumpEnabled = true, sectionJumpSide = 'right', sectionJumpAutoHide = false, onLinesChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);
  const isEditingRef = useRef(false);
  const hideNavTimerRef = useRef<number | null>(null);
  const [showSectionJumpNav, setShowSectionJumpNav] = useState(!sectionJumpAutoHide);

  useEffect(() => {
    setShowSectionJumpNav(!sectionJumpAutoHide);
  }, [sectionJumpAutoHide]);

  useEffect(() => {
    if (!sectionJumpEnabled || !sectionJumpAutoHide) {
      if (hideNavTimerRef.current !== null) {
        window.clearTimeout(hideNavTimerRef.current);
        hideNavTimerRef.current = null;
      }
      return undefined;
    }

    const root = scrollRef.current;
    if (!root) return undefined;

    const showTemporarily = () => {
      setShowSectionJumpNav(true);
      if (hideNavTimerRef.current !== null) {
        window.clearTimeout(hideNavTimerRef.current);
      }
      hideNavTimerRef.current = window.setTimeout(() => {
        setShowSectionJumpNav(false);
        hideNavTimerRef.current = null;
      }, 900);
    };

    root.addEventListener('scroll', showTemporarily, { passive: true });
    return () => {
      root.removeEventListener('scroll', showTemporarily);
      if (hideNavTimerRef.current !== null) {
        window.clearTimeout(hideNavTimerRef.current);
        hideNavTimerRef.current = null;
      }
    };
  }, [sectionJumpAutoHide, sectionJumpEnabled]);

  useEffect(() => {
    if (!autoScrollEnabled) { isAutoScrollingRef.current = false; return; }
    isAutoScrollingRef.current = true;

    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!isAutoScrollingRef.current || !el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      el.scrollTop = Math.min(maxScroll, el.scrollTop + (autoScrollSpeed || 30) * 0.05);
    }, 50);

    return () => { clearInterval(interval); isAutoScrollingRef.current = false; };
  }, [autoScrollEnabled, autoScrollSpeed]);

  // Reset scroll on song change (but not when editing chord lines)
  useEffect(() => {
    if (isEditingRef.current) { isEditingRef.current = false; return; }
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [lines.length]);

  // Mark a lyric-only line as a chord line (merge with next lyric line if possible)
  const markAsChords = (index: number) => {
    if (!onLinesChange) return;
    isEditingRef.current = true;
    const newLines = [...lines];
    const current = newLines[index];
    if (!current.lyrics || current.chords) return; // only for lyric-only lines
    const text = current.lyrics;
    const next = newLines[index + 1];
    if (next && !next.chords && next.lyrics && !isSectionLine(next.lyrics)) {
      // Merge: current lyrics → chords, next lyrics stay
      newLines.splice(index, 2, { chords: text, lyrics: next.lyrics });
    } else {
      // Convert to chord-only line
      newLines[index] = { chords: text, lyrics: '' };
    }
    onLinesChange(newLines);
  };

  // Mark a chord line back as a lyric line (split if it had lyrics)
  const markAsLyrics = (index: number) => {
    if (!onLinesChange) return;
    isEditingRef.current = true;
    const newLines = [...lines];
    const current = newLines[index];
    if (!current.chords) return;
    if (current.lyrics) {
      // Split: chords become a lyric line, then existing lyrics
      newLines.splice(index, 1, { chords: '', lyrics: current.chords }, { chords: '', lyrics: current.lyrics });
    } else {
      newLines[index] = { chords: '', lyrics: current.chords };
    }
    onLinesChange(newLines);
  };

  const renderedLines: RenderLine[] = lines.map((line, index) => {
    const sectionInfo = line.lyrics ? parseSectionInfo(line.lyrics) : null;
    let displayChords = line.chords;
    if (displayChords) {
      displayChords = transposeLine(displayChords, transpose, accidental);
      if (notation === 'nashville') displayChords = nashvilleLineFromChords(displayChords, songKey);
    }

    return {
      index,
      displayChords,
      isSection: !!(line.lyrics && isSectionLine(line.lyrics)),
      lyrics: line.lyrics,
      sectionInfo,
    };
  });

  const sectionNavItems = renderedLines
    .filter((line) => line.sectionInfo)
    .map((line) => ({
      index: line.index,
      label: line.sectionInfo!.label,
      short: line.sectionInfo!.short,
    }));

  const midpoint = columns === 2 ? Math.ceil(renderedLines.length / 2) : renderedLines.length;
  const columnGroups = columns === 2
    ? [renderedLines.slice(0, midpoint), renderedLines.slice(midpoint)]
    : [renderedLines];

  const showChords = viewMode !== 'lyrics';
  const showLyrics = viewMode !== 'chords';
  const showSectionLabels = showLyrics;

  const renderLineBlock = (line: RenderLine) => (
    <div key={line.index} className={`line-block${editMode ? ' line-block-edit' : ''}`} data-line-index={line.index}>
      {showChords && line.displayChords ? (
        <div className="chord-line-row">
          <div className="chord-line">{renderColoredChordLine(line.displayChords)}</div>
          {editMode && lineToggleButtonsEnabled && (
            <button className="line-toggle-btn chord-to-lyric" title="Mark as lyrics" onClick={() => markAsLyrics(line.index)}>T</button>
          )}
        </div>
      ) : null}
      {line.lyrics ? (
        line.isSection ? (
          showSectionLabels ? (
          <div className="section-label">{line.lyrics}</div>
          ) : null
        ) : showLyrics ? (
          <div className="lyric-line-row">
            <div className="lyric-line">{line.lyrics}</div>
            {editMode && lineToggleButtonsEnabled && !lines[line.index].chords && (
              <button className="line-toggle-btn lyric-to-chord" title="Mark as chords" onClick={() => markAsChords(line.index)}>♫</button>
            )}
          </div>
        ) : null
      ) : null}
    </div>
  );

  const hasSectionJump = sectionJumpEnabled && sectionNavItems.length > 0;

  return (
    <div className={`lyrics-viewer-shell${hasSectionJump ? ` has-section-jump-${sectionJumpSide}` : ''}`}>
      {hasSectionJump && (
        <div className={`section-jump-nav ${sectionJumpSide === 'left' ? 'left' : 'right'}${showSectionJumpNav ? '' : ' is-hidden'}`}>
          {sectionNavItems.map((item) => (
            <button
              key={`${item.index}-${item.short}`}
              className="section-jump-btn"
              title={item.label}
              onClick={() => {
                const root = scrollRef.current;
                if (!root) return;
                const target = root.querySelector(`[data-line-index="${item.index}"]`) as HTMLElement | null;
                if (!target) return;
                root.scrollTo({ top: Math.max(0, target.offsetTop - 12), behavior: 'smooth' });
              }}
            >
              {item.short}
            </button>
          ))}
        </div>
      )}
      <div className={`lyrics-container${columns === 2 ? ' lyrics-two-columns' : ''}`} ref={scrollRef}>
        {columnGroups.map((group, columnIndex) => (
          <div key={columnIndex} className="lyrics-column">
            {group.map(renderLineBlock)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LyricsViewer;