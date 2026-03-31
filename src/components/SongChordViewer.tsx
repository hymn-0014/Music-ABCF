import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Song, NotationMode, AccidentalPreference } from '../types';
import LyricsViewer from './LyricsViewer';
import TransposeControl from './TransposeControl';
import ChordDisplay from './ChordDisplay';

interface SongChordViewerProps {
  song: Song;
  darkMode?: boolean;
}

const SongChordViewer: React.FC<SongChordViewerProps> = ({ song, darkMode = false }) => {
  const [transpose, setTranspose] = useState(0);
  const [notation, setNotation] = useState<NotationMode>('standard');
  const [accidental, setAccidental] = useState<AccidentalPreference>('sharp');

  return (
    <View style={styles.container}>
      <TransposeControl
        transpose={transpose}
        accidental={accidental}
        onTransposeChange={setTranspose}
        onAccidentalChange={setAccidental}
      />
      <ChordDisplay
        notation={notation}
        onToggle={() => setNotation(notation === 'standard' ? 'nashville' : 'standard')}
      />
      <LyricsViewer
        lines={song.lines}
        transpose={transpose}
        songKey={song.key}
        notation={notation}
        accidental={accidental}
        darkMode={darkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default SongChordViewer;