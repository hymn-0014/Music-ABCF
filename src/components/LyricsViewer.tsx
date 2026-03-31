import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
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

const LyricsViewer: React.FC<LyricsViewerProps> = ({
  lines, transpose, songKey, notation, accidental, autoScrollEnabled, autoScrollSpeed,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const containerHeightRef = useRef(0);

  useEffect(() => {
    if (!autoScrollEnabled) {
      return undefined;
    }

    const interval = setInterval(() => {
      const maxScroll = Math.max(0, contentHeightRef.current - containerHeightRef.current);
      if (maxScroll <= 0) {
        return;
      }

      const nextY = Math.min(maxScroll, scrollYRef.current + autoScrollSpeed * 0.05);
      if (nextY === scrollYRef.current) {
        return;
      }

      scrollYRef.current = nextY;
      scrollRef.current?.scrollTo({ y: nextY, animated: false });
    }, 50);

    return () => clearInterval(interval);
  }, [autoScrollEnabled, autoScrollSpeed]);

  useEffect(() => {
    scrollYRef.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [lines]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      onLayout={(event) => {
        containerHeightRef.current = event.nativeEvent.layout.height;
      }}
      onContentSizeChange={(_, height) => {
        contentHeightRef.current = height;
      }}
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
    >
      {lines.map((line, i) => {
        let displayChords = line.chords;
        if (displayChords) {
          displayChords = transposeLine(displayChords, transpose, accidental);
          if (notation === 'nashville') {
            displayChords = nashvilleLineFromChords(displayChords, songKey);
          }
        }
        return (
          <View key={i} style={styles.lineBlock}>
            {displayChords ? (
              <Text style={styles.chordLine}>{displayChords}</Text>
            ) : null}
            <Text style={styles.lyricLine}>{line.lyrics}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#121212', minHeight: 0 },
  lineBlock: { marginBottom: 4 },
  chordLine: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#4FC3F7' },
  lyricLine: { fontFamily: 'monospace', fontSize: 18, color: '#FFFFFF' },
});

export default LyricsViewer;