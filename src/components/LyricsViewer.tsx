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

const LyricsViewer: React.FC<LyricsViewerProps> = ({
  lines, transpose, songKey, notation, accidental, autoScrollEnabled, autoScrollSpeed,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);

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

  // Reset scroll on song change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [lines.length]);

  return (
    <div className="lyrics-container" ref={scrollRef}>
      {lines.map((line, i) => {
        let displayChords = line.chords;
        if (displayChords) {
          displayChords = transposeLine(displayChords, transpose, accidental);
          if (notation === 'nashville') displayChords = nashvilleLineFromChords(displayChords, songKey);
        }
        return (
          <div key={i} className="line-block">
            {displayChords ? (
              <div className="chord-line">{renderColoredChordLine(displayChords)}</div>
            ) : null}
            {line.lyrics ? (
              SECTION_PATTERN.test(line.lyrics.trim()) ? (
                <div className="section-label">{line.lyrics}</div>
              ) : (
                <div className="lyric-line">{line.lyrics}</div>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default LyricsViewer;