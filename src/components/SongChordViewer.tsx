import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration } from 'react-native';
import { Song } from '../types';
import LyricsViewer from './LyricsViewer';
import TransposeControl from './TransposeControl';
import ChordDisplay from './ChordDisplay';
import PlaybackControls from './PlaybackControls';
import useAppStore from '../store/useAppStore';

interface SongChordViewerProps {
  song: Song;
}

const SongChordViewer: React.FC<SongChordViewerProps> = ({ song }) => {
  const transpose = useAppStore((state) => state.transpose);
  const notation = useAppStore((state) => state.notation);
  const accidental = useAppStore((state) => state.accidental);
  const tempo = useAppStore((state) => state.tempo);
  const metronomeEnabled = useAppStore((state) => state.metronomeEnabled);
  const autoScrollEnabled = useAppStore((state) => state.autoScrollEnabled);
  const autoScrollSpeed = useAppStore((state) => state.autoScrollSpeed);
  const setTranspose = useAppStore((state) => state.setTranspose);
  const setNotation = useAppStore((state) => state.setNotation);
  const setAccidental = useAppStore((state) => state.setAccidental);
  const setTempo = useAppStore((state) => state.setTempo);
  const setMetronomeEnabled = useAppStore((state) => state.setMetronomeEnabled);
  const setAutoScrollEnabled = useAppStore((state) => state.setAutoScrollEnabled);
  const setAutoScrollSpeed = useAppStore((state) => state.setAutoScrollSpeed);
  const [showPlayback, setShowPlayback] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!metronomeEnabled) {
      return undefined;
    }

    const playBeat = async () => {
      if (Platform.OS === 'web') {
        const audioWindow = globalThis as typeof globalThis & {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        };
        const ContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
        if (!ContextCtor) {
          return;
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new ContextCtor();
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        oscillator.type = 'square';
        oscillator.frequency.value = 1320;
        gainNode.gain.value = 0.0001;
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        const now = audioContextRef.current.currentTime;
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        oscillator.start(now);
        oscillator.stop(now + 0.07);
        return;
      }

      Vibration.vibrate(35);
    };

    void playBeat();
    const interval = setInterval(() => {
      void playBeat();
    }, 60000 / tempo);

    return () => {
      clearInterval(interval);
    };
  }, [metronomeEnabled, tempo]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <TransposeControl
            transpose={transpose}
            accidental={accidental}
            onTransposeChange={setTranspose}
            onAccidentalChange={setAccidental}
          />
        </View>
        <TouchableOpacity
          style={[styles.toolbarBtn, showPlayback && styles.toolbarBtnActive]}
          onPress={() => setShowPlayback(!showPlayback)}
        >
          <Text style={[styles.toolbarBtnText, showPlayback && styles.toolbarBtnTextActive]}>▶</Text>
        </TouchableOpacity>
      </View>
      <ChordDisplay
        notation={notation}
        onToggle={() => setNotation(notation === 'standard' ? 'nashville' : 'standard')}
      />
      {showPlayback && (
        <PlaybackControls
          tempo={tempo}
          metronomeEnabled={metronomeEnabled}
          autoScrollEnabled={autoScrollEnabled}
          autoScrollSpeed={autoScrollSpeed}
          onTempoChange={setTempo}
          onMetronomeToggle={() => setMetronomeEnabled(!metronomeEnabled)}
          onAutoScrollToggle={() => setAutoScrollEnabled(!autoScrollEnabled)}
          onAutoScrollSpeedChange={setAutoScrollSpeed}
        />
      )}
      <LyricsViewer
        lines={song.lines}
        transpose={transpose}
        songKey={song.key}
        notation={notation}
        accidental={accidental}
        autoScrollEnabled={autoScrollEnabled}
        autoScrollSpeed={autoScrollSpeed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' as const },
  toolbar: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingRight: 8 },
  toolbarLeft: { flex: 1 },
  toolbarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 4,
  },
  toolbarBtnActive: { backgroundColor: '#4FC3F7' },
  toolbarBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' as const },
  toolbarBtnTextActive: { color: '#121212' },
});

export default SongChordViewer;