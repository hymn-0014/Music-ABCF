import React, { useState } from 'react';

const ChordDisplay = ({ chords }) => {
    const [transpose, setTranspose] = useState(0);
    const [notation, setNotation] = useState('standard');

    const transposeChord = (chord) => {
        const chordMap = {
            'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
            'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
            'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
            'F': ['F', 'G', 'A', 'A#', 'C', 'D', 'E'],
            'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
            'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
            'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#']
        };
        const transposedChords = chordMap[chord];
        return transposedChords ? transposedChords[(transposedChords.indexOf(chord) + transpose + 7) % 7] : chord;
    };

    const handleTransposeChange = (event) => {
        setTranspose(Number(event.target.value));
    };

    const handleNotationToggle = () => {
        setNotation(notation === 'standard' ? 'nashville' : 'standard');
    };

    return (
        <div>
            <h2>Chord Display</h2>
            <button onClick={handleNotationToggle}>
                Toggle Notation ({notation})
            </button>
            <input 
                type="number" 
                value={transpose} 
                onChange={handleTransposeChange} 
                min={-12} 
                max={12} 
            />
            <h3>Chords:</h3>
            <ul>
                {chords.map((chord, index) => (
                    <li key={index}>{notation === 'standard' ? transposeChord(chord) : convertToNashville(transposeChord(chord))}</li>
                ))}
            </ul>
        </div>
    );
};

const convertToNashville = (chord) => {
    const nashvilleMap = {
        'C': '1',
        'D': '2',
        'E': '3',
        'F': '4',
        'G': '5',
        'A': '6',
        'B': '7'
    };
    return nashvilleMap[chord] || chord;
};

export default ChordDisplay;