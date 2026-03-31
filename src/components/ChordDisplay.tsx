import React from 'react';
import { NotationMode } from '../types';

interface ChordDisplayProps {
  notation: NotationMode;
  onToggle: () => void;
}

const ChordDisplay: React.FC<ChordDisplayProps> = ({ notation, onToggle }) => (
  <div className="notation-row">
    <span className="notation-label">Notation:</span>
    <button className="notation-pill" onClick={onToggle}>
      {notation === 'standard' ? 'Standard (A, B, C…)' : 'Nashville (1, 2, 3…)'}
    </button>
  </div>
);

export default ChordDisplay;