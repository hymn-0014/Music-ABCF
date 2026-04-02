import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';

const SongLibraryScreen = () => {
  const songs = useAppStore((s) => s.songs);
  const setlists = useAppStore((s) => s.setlists);
  const setSetlists = useAppStore((s) => s.setSetlists);
  const userEmail = useAppStore((s) => s.userEmail);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const setCurrentSetlistId = useAppStore((s) => s.setCurrentSetlistId);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [pickerSongId, setPickerSongId] = useState<string | null>(null);

  const filtered = songs.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  const addSongToSetlist = (songId: string, setlistId: string) => {
    const now = new Date().toISOString();
    const email = userEmail || 'unknown';
    setSetlists(setlists.map((sl) =>
      sl.id === setlistId && !sl.songIds.includes(songId)
        ? {
            ...sl,
            songIds: [...sl.songIds, songId],
            lastModifiedBy: email,
            lastModifiedAt: now,
            modificationHistory: [...(sl.modificationHistory || []), { userEmail: email, action: 'added song', timestamp: now }],
          }
        : sl
    ));
    setPickerSongId(null);
  };

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
              className="add-to-setlist-btn"
              title="Add to setlist"
              onClick={(e) => { e.stopPropagation(); setPickerSongId(item.id); }}
            >
              📋+
            </button>
            <button
              className="edit-btn"
              onClick={(e) => { e.stopPropagation(); navigate(`/edit-song/${item.id}`); }}
            >
              ✏️
            </button>
          </div>
        ))}
      </div>
      <button className="fab" onClick={() => navigate('/add-song')}>+</button>

      {/* Setlist picker modal */}
      {pickerSongId && (
        <div className="picker-overlay" onClick={() => setPickerSongId(null)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>Add to Setlist</h3>
              <button className="picker-close" onClick={() => setPickerSongId(null)}>✕</button>
            </div>
            {setlists.length === 0 ? (
              <div className="picker-empty">
                <p>No setlists yet.</p>
                <button className="btn-primary small" onClick={() => { setPickerSongId(null); navigate('/setlists'); }}>
                  Create Setlist
                </button>
              </div>
            ) : (
              <div className="picker-list">
                {setlists.map((sl) => {
                  const alreadyAdded = sl.songIds.includes(pickerSongId);
                  return (
                    <button
                      key={sl.id}
                      className={`picker-item${alreadyAdded ? ' picker-item-disabled' : ''}`}
                      onClick={() => !alreadyAdded && addSongToSetlist(pickerSongId, sl.id)}
                      disabled={alreadyAdded}
                    >
                      <span className="picker-item-name">{sl.name}</span>
                      <span className="picker-item-count">
                        {alreadyAdded ? '✓ Added' : `${sl.songIds.length} songs`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SongLibraryScreen;