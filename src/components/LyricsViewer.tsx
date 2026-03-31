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
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({
  lines, transpose, songKey, notation, accidental,
}) => {
  return (
    <ScrollView style={styles.container}>
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
  container: { flex: 1, padding: 16, backgroundColor: '#121212' },
  lineBlock: { marginBottom: 4 },
  chordLine: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#4FC3F7' },
  lyricLine: { fontFamily: 'monospace', fontSize: 18, color: '#FFFFFF' },
});

export default LyricsViewer;