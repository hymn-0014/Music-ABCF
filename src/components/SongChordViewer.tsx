import React, { useState } from 'react';

const SongChordViewer = ({ song, initialKey }) => {
  const [transposedKey, setTransposedKey] = useState(initialKey);

  const transpose = (interval) => {
    // A very basic example of chord transposition logic
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const transposeNote = (note, interval) => {
      const index = notes.indexOf(note);
      return notes[(index + interval + notes.length) % notes.length];
    };

    const transposedSong = song.map((line) => {
      return line.replace(/[A-G](?:#|b)?/g, (match) => transposeNote(match, interval));
    });

    return transposedSong;
  };

  return (
    <div>
      <h1>Song Chord Viewer</h1>
      <div>
        <button onClick={() => setTransposedKey(transpose(1))}>Up</button>
        <button onClick={() => setTransposedKey(transpose(-1))}>Down</button>
      </div>
      <pre>{transposedKey.join('\n')}</pre>
    </div>
  );
};

export default SongChordViewer;