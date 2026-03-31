import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Vibration } from 'react-native';
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
  container: { flex: 1 },
});

export default SongChordViewer;