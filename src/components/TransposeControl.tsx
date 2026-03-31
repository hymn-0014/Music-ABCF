import React from 'react';
import { AccidentalPreference } from '../types';

interface TransposeControlProps {
  transpose: number;
  accidental: AccidentalPreference;
  onTransposeChange: (value: number) => void;
  onAccidentalChange: (pref: AccidentalPreference) => void;
}

const TransposeControl: React.FC<TransposeControlProps> = ({
  transpose, accidental, onTransposeChange, onAccidentalChange,
}) => (
  <div className="transpose-row">
    <button className="round-btn" onClick={() => onTransposeChange(transpose - 1)}>-</button>
    <span className="transpose-level">{transpose > 0 ? `+${transpose}` : transpose}</span>
    <button className="round-btn" onClick={() => onTransposeChange(transpose + 1)}>+</button>
    <button className="round-btn" style={{ marginLeft: 16 }} onClick={() => onAccidentalChange(accidental === 'sharp' ? 'flat' : 'sharp')}>
      {accidental === 'sharp' ? '♯' : '♭'}
    </button>
  </div>
);

export default TransposeControl;