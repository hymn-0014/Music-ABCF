import React from 'react';

interface LyricsViewerProps {
  lyrics: string;
  chords: string;
}

const LyricsViewer: React.FC<LyricsViewerProps> = ({ lyrics, chords }) => {
  // Split the lyrics and chords by line
  const lyricsLines = lyrics.split('\n');
  const chordsLines = chords.split('\n');

  return (
    <div className="lyrics-viewer" style={{ overflowY: 'scroll', height: '80vh' }}>
      {lyricsLines.map((line, index) => (
        <div key={index}>
          <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{chordsLines[index]}</div>
          <div>{line}</div>
        </div>
      ))}
    </div>
  );
};

export default LyricsViewer;