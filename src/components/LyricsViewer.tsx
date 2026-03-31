import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ChordLyricLine, NotationMode, AccidentalPreference } from '../types';
import { transposeLine, nashvilleLineFromChords } from '../utils/chordTranspose';

interface LyricsViewerProps {
  lines: ChordLyricLine[];
  transpose: number;
  songKey: string;
  notation: NotationMode;
  accidental: AccidentalPreference;
  darkMode?: boolean;
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({
  lines, transpose, songKey, notation, accidental, darkMode = false,
}) => {
  const bg = darkMode ? '#1a1a1a' : '#fff';
  const textColor = darkMode ? '#eee' : '#000';
  const chordColor = darkMode ? '#6cb4ee' : '#007AFF';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>
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
              <Text style={[styles.chordLine, { color: chordColor }]}>{displayChords}</Text>
            ) : null}
            <Text style={[styles.lyricLine, { color: textColor }]}>{line.lyrics}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  lineBlock: { marginBottom: 4 },
  chordLine: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold' },
  lyricLine: { fontFamily: 'monospace', fontSize: 18 },
});

export default LyricsViewer;