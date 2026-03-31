import React, { useEffect, useRef, useState } from 'react';
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
    if (!metronomeEnabled) return undefined;

    const playBeat = async () => {
      const ContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ContextCtor) return;
      if (!audioContextRef.current) audioContextRef.current = new ContextCtor();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

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
    };

    void playBeat();
    const interval = setInterval(() => void playBeat(), 60000 / tempo);
    return () => clearInterval(interval);
  }, [metronomeEnabled, tempo]);

  return (
    <div className="song-chord-viewer">
      <div className="toolbar">
        <div className="toolbar-left">
          <TransposeControl
            transpose={transpose}
            accidental={accidental}
            onTransposeChange={setTranspose}
            onAccidentalChange={setAccidental}
          />
        </div>
        <button
          className={`toolbar-btn ${showPlayback ? 'active' : ''}`}
          onClick={() => setShowPlayback(!showPlayback)}
        >
          ▶
        </button>
      </div>
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
    </div>
  );
};

export default SongChordViewer;