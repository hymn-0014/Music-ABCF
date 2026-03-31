import React from 'react';

interface PlaybackControlsProps {
  tempo: number;
  metronomeEnabled: boolean;
  autoScrollEnabled: boolean;
  autoScrollSpeed: number;
  onTempoChange: (tempo: number) => void;
  onMetronomeToggle: () => void;
  onAutoScrollToggle: () => void;
  onAutoScrollSpeedChange: (speed: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  tempo,
  metronomeEnabled,
  autoScrollEnabled,
  autoScrollSpeed,
  onTempoChange,
  onMetronomeToggle,
  onAutoScrollToggle,
  onAutoScrollSpeedChange,
}) => (
  <div className="playback-card">
    <div className="playback-header">
      <span className="playback-title">Playback</span>
      <button
        className={`toggle-pill${metronomeEnabled ? ' active' : ''}`}
        onClick={onMetronomeToggle}
      >
        {metronomeEnabled ? 'Stop Metronome' : 'Start Metronome'}
      </button>
    </div>

    <div className="playback-row">
      <span className="playback-label">Tempo</span>
      <div className="stepper">
        <button className="round-btn sm" onClick={() => onTempoChange(tempo - 5)}>-</button>
        <span className="stepper-value">{tempo} BPM</span>
        <button className="round-btn sm" onClick={() => onTempoChange(tempo + 5)}>+</button>
      </div>
    </div>

    <div className="playback-divider" />

    <div className="playback-header">
      <span className="playback-label">Auto Scroll</span>
      <button
        className={`toggle-pill${autoScrollEnabled ? ' active' : ''}`}
        onClick={onAutoScrollToggle}
      >
        {autoScrollEnabled ? 'Stop' : 'Start'}
      </button>
    </div>

    <div className="playback-row">
      <span className="playback-label">Speed</span>
      <div className="stepper">
        <button className="round-btn sm" onClick={() => onAutoScrollSpeedChange(autoScrollSpeed - 5)}>-</button>
        <span className="stepper-value">{autoScrollSpeed}px/s</span>
        <button className="round-btn sm" onClick={() => onAutoScrollSpeedChange(autoScrollSpeed + 5)}>+</button>
      </div>
    </div>
  </div>
);

export default PlaybackControls;