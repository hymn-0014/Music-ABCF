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
  const CHORD_COLOR = '#4FC3F7';

  // Parse and render colored chords preserving original spacing
  const renderColoredChormLine = (chordLine: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const CHORD_PATTERN = /[A-G][#b]?[a-z0-9]*/g;
    let lastIndex = 0;
    let match;
    
    // eslint-disable-next-line no-cond-assign
    while ((match = CHORD_PATTERN.exec(chordLine)) !== null) {
      // Add spaces/text before the chord
      if (match.index > lastIndex) {
        elements.push(
          <Text key={`space-${lastIndex}`} style={styles.chordLine}>
            {chordLine.substring(lastIndex, match.index)}
          </Text>
        );
      }
      
      // Add the colored chord
      const chord = match[0];
      elements.push(
        <Text key={`chord-${match.index}`} style={[styles.chordLine, { color: CHORD_COLOR }]}>
          {chord}
        </Text>
      );
      
      lastIndex = match.index + chord.length;
    }
    
    // Add any remaining text after the last chord
    if (lastIndex < chordLine.length) {
      elements.push(
        <Text key={`space-end`} style={styles.chordLine}>
          {chordLine.substring(lastIndex)}
        </Text>
      );
    }
    
    return elements.length > 0 ? elements : [];
  };
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const containerHeightRef = useRef(0);
  const isAutoScrollingRef = useRef(false);

  useEffect(() => {
    if (!autoScrollEnabled) {
      isAutoScrollingRef.current = false;
      return undefined;
    }

    isAutoScrollingRef.current = true;

    const interval = setInterval(() => {
      if (!isAutoScrollingRef.current) {
        return;
      }

      const maxScroll = Math.max(0, contentHeightRef.current - containerHeightRef.current);
      if (maxScroll <= 0) {
        return;
      }

      const nextY = Math.min(maxScroll, scrollYRef.current + (autoScrollSpeed || 30) * 0.05);

      scrollYRef.current = nextY;
      scrollRef.current?.scrollTo({ y: nextY, animated: false });
    }, 50);

    return () => {
      clearInterval(interval);
      isAutoScrollingRef.current = false;
    };
  }, [autoScrollEnabled, autoScrollSpeed]);

  // Only reset scroll on actual song change, not on transpose/notation changes
  useEffect(() => {
    scrollYRef.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [lines.length]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      scrollEnabled={true}
      showsVerticalScrollIndicator={true}
      testID="lyrics-scroll"
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
              <Text style={styles.chordLineWrapper}>
                {renderColoredChormLine(displayChords)}
              </Text>
            ) : null}
            <Text style={styles.lyricLine}>{line.lyrics}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: '#1A1A1A',
    minHeight: 0,
  },
  contentContainer: {
    paddingBottom: 60,
  },
  lineBlock: { marginBottom: 6 },
  chordLineWrapper: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold' },
  chordLine: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold' },
  lyricLine: { fontFamily: 'monospace', fontSize: 18, color: '#E0E0E0', lineHeight: 26 },
});

export default LyricsViewer;