import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import SetlistManager from '../components/SetlistManager';

const SetlistScreen = () => {
  const navigate = useNavigate();
  const songs = useAppStore((s) => s.songs);
  const setlists = useAppStore((s) => s.setlists);
  const setSetlists = useAppStore((s) => s.setSetlists);
  const setCurrentSetlistId = useAppStore((s) => s.setCurrentSetlistId);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const addSetlist = () => {
    if (!newName.trim()) return;
    const id = `sl-${Date.now()}`;
    setSetlists([...setlists, { id, name: newName.trim(), songIds: [], createdAt: new Date().toISOString() }]);
    setNewName('');
  };

  const deleteSetlist = (id: string) => {
    setSetlists(setlists.filter((sl) => sl.id !== id));
  };

  const editing = setlists.find((sl) => sl.id === editingId);

  if (editing) {
    return (
      <div className="screen">
        <button className="text-btn" onClick={() => setEditingId(null)}>← Back</button>
        <h2 className="section-title" style={{ paddingLeft: 16 }}>{editing.name}</h2>
        <p className="section-subtitle">{editing.songIds.length} songs in setlist</p>
        <SetlistManager
          availableSongs={songs}
          songIds={editing.songIds}
          onReorder={(ids) => {
            setSetlists(setlists.map((sl) => (sl.id === editing.id ? { ...sl, songIds: ids } : sl)));
          }}
        />
        {editing.songIds.length > 0 && (
          <button
            className="btn-primary full-width"
            style={{ margin: '0 16px 16px' }}
            onClick={() => {
              setCurrentSetlistId(editing.id);
              setCurrentSongId(editing.songIds[0]);
              navigate('/viewer');
            }}
          >
            ▶  Play Setlist
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="add-row">
        <input
          className="input-field"
          placeholder="New setlist name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addSetlist(); }}
        />
        <button className="btn-primary small" onClick={addSetlist}>+</button>
      </div>
      <div className="card-list">
        {setlists.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p className="empty-text">No setlists yet</p>
            <p className="empty-hint">Create one above to organize your songs</p>
          </div>
        )}
        {setlists.map((item) => (
          <div key={item.id} className="song-card" onClick={() => setEditingId(item.id)}>
            <div className="song-card-left">
              <div className="song-title">{item.name}</div>
              <div className="song-artist">{item.songIds.length} {item.songIds.length === 1 ? 'song' : 'songs'}</div>
            </div>
            <button
              className="delete-btn"
              onClick={(e) => { e.stopPropagation(); deleteSetlist(item.id); }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetlistScreen;