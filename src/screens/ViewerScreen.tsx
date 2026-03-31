import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import SongChordViewer from '../components/SongChordViewer';

const ViewerScreen = () => {
  const navigate = useNavigate();
  const songs = useAppStore((s) => s.songs);
  const currentSongId = useAppStore((s) => s.currentSongId);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const currentSetlistId = useAppStore((s) => s.currentSetlistId);
  const setlists = useAppStore((s) => s.setlists);

  const song = songs.find((s) => s.id === currentSongId);
  const setlist = setlists.find((sl) => sl.id === currentSetlistId);
  const setlistSongIds = setlist?.songIds ?? [];
  const currentIndex = setlistSongIds.indexOf(currentSongId ?? '');
  const totalInSetlist = setlistSongIds.length;

  const goPrev = () => {
    if (currentIndex > 0) setCurrentSongId(setlistSongIds[currentIndex - 1]);
  };
  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < totalInSetlist - 1)
      setCurrentSongId(setlistSongIds[currentIndex + 1]);
  };

  if (!song) {
    return (
      <div className="center-screen">
        <span className="empty-icon">🎵</span>
        <p className="empty-text">No song selected</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go to Songs</button>
      </div>
    );
  }

  return (
    <div className="viewer-layout">
      <div className="viewer-header">
        <div className="viewer-header-top">
          <button className="back-btn" onClick={() => navigate('/')}>←</button>
          <div className="viewer-header-info">
            <div className="viewer-title">{song.title}</div>
            <div className="viewer-artist">{song.artist} · Key of {song.key}</div>
          </div>
          <button className="icon-btn" onClick={() => navigate(`/edit-song/${song.id}`)}>✏️</button>
        </div>
        {setlist && (
          <div className="viewer-setlist-info">{setlist.name} ({currentIndex + 1}/{totalInSetlist})</div>
        )}
      </div>
      <SongChordViewer song={song} />
      {totalInSetlist > 1 && (
        <div className="viewer-nav-row">
          <button
            className="btn-primary"
            disabled={currentIndex <= 0}
            onClick={goPrev}
          >
            ← Prev
          </button>
          <span className="nav-counter">{currentIndex + 1} / {totalInSetlist}</span>
          <button
            className="btn-primary"
            disabled={currentIndex >= totalInSetlist - 1}
            onClick={goNext}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewerScreen;
