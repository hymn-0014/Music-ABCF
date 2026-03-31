import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';

const SongLibraryScreen = () => {
  const songs = useAppStore((s) => s.songs);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const setCurrentSetlistId = useAppStore((s) => s.setCurrentSetlistId);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = songs.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="screen">
      <div className="search-row">
        <input
          className="search-input"
          placeholder="Search songs or artists…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="song-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🎵</span>
            <p className="empty-text">No songs yet</p>
            <p className="empty-hint">Tap the button below to add your first song</p>
          </div>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="song-card"
            onClick={() => {
              setCurrentSongId(item.id);
              setCurrentSetlistId(null);
              navigate('/viewer');
            }}
          >
            <div className="song-card-left">
              <div className="song-title">{item.title}</div>
              <div className="song-artist">{item.artist}</div>
            </div>
            <button
              className="edit-btn"
              onClick={(e) => { e.stopPropagation(); navigate(`/edit-song/${item.id}`); }}
            >
              ✏️
            </button>
            <span className="key-badge">{item.key}</span>
          </div>
        ))}
      </div>
      <button className="fab" onClick={() => navigate('/add-song')}>+</button>
    </div>
  );
};

export default SongLibraryScreen;