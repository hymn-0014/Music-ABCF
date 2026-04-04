import React, { useEffect, useRef } from 'react';
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
  columns?: 1 | 2;
  viewMode?: 'all' | 'chords' | 'lyrics';
  onLinesChange?: (newLines: ChordLyricLine[]) => void;
}

const CHORD_COLOR = '#4FC3F7';
const SECTION_PATTERN = /^\[.*\]$/;
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
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({
  lines, transpose, songKey, notation, accidental, autoScrollEnabled, autoScrollSpeed, editMode, columns = 1, viewMode = 'all', onLinesChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);
  const isEditingRef = useRef(false);

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
    if (next && !next.chords && next.lyrics && !SECTION_PATTERN.test(next.lyrics.trim())) {
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
    let displayChords = line.chords;
    if (displayChords) {
      displayChords = transposeLine(displayChords, transpose, accidental);
      if (notation === 'nashville') displayChords = nashvilleLineFromChords(displayChords, songKey);
    }

    return {
      index,
      displayChords,
      isSection: !!(line.lyrics && SECTION_PATTERN.test(line.lyrics.trim())),
      lyrics: line.lyrics,
    };
  });

  const midpoint = columns === 2 ? Math.ceil(renderedLines.length / 2) : renderedLines.length;
  const columnGroups = columns === 2
    ? [renderedLines.slice(0, midpoint), renderedLines.slice(midpoint)]
    : [renderedLines];

  const showChords = viewMode !== 'lyrics';
  const showLyrics = viewMode !== 'chords';
  const showSectionLabels = viewMode !== 'lyrics';

  const renderLineBlock = (line: RenderLine) => (
    <div key={line.index} className={`line-block${editMode ? ' line-block-edit' : ''}`}>
      {showChords && line.displayChords ? (
        <div className="chord-line-row">
          <div className="chord-line">{renderColoredChordLine(line.displayChords)}</div>
          {editMode && (
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
            {editMode && !lines[line.index].chords && (
              <button className="line-toggle-btn lyric-to-chord" title="Mark as chords" onClick={() => markAsChords(line.index)}>♫</button>
            )}
          </div>
        ) : null
      ) : null}
    </div>
  );

  return (
    <div className={`lyrics-container${columns === 2 ? ' lyrics-two-columns' : ''}`} ref={scrollRef}>
      {columnGroups.map((group, columnIndex) => (
        <div key={columnIndex} className="lyrics-column">
          {group.map(renderLineBlock)}
        </div>
      ))}
    </div>
  );
};

export default LyricsViewer;