import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import SetlistManager from '../components/SetlistManager';
import ConfirmDialog from '../components/ConfirmDialog';
import { ModificationEntry } from '../types';

const SetlistScreen = () => {
  const navigate = useNavigate();
  const songs = useAppStore((s) => s.songs);
  const setlists = useAppStore((s) => s.setlists);
  const setSetlists = useAppStore((s) => s.setSetlists);
  const deleteSetlist = useAppStore((s) => s.deleteSetlist);
  const setCurrentSetlistId = useAppStore((s) => s.setCurrentSetlistId);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const uploadSetlist = useAppStore((s) => s.uploadSetlist);
  const userEmail = useAppStore((s) => s.userEmail);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);

  const addSetlist = () => {
    if (!newName.trim()) return;
    const id = `sl-${Date.now()}`;
    const now = new Date().toISOString();
    const email = userEmail || 'unknown';
    const entry: ModificationEntry = { userEmail: email, action: 'created', timestamp: now };
    setSetlists([...setlists, { id, name: newName.trim(), songIds: [], createdAt: now, lastModifiedBy: email, lastModifiedAt: now, modificationHistory: [entry] }]);
    setNewName('');
  };

  const confirmingSetlist = setlists.find((sl) => sl.id === confirmDeleteId);

  const editing = setlists.find((sl) => sl.id === editingId);

  const handleRenameSetlist = (): boolean => {
    if (!editing) return;
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setStatus('Setlist name cannot be empty.');
      return false;
    }
    if (trimmedName === editing.name) return false;

    const now = new Date().toISOString();
    const email = userEmail || 'unknown';
    const entry: ModificationEntry = { userEmail: email, action: 'renamed', timestamp: now };

    setSetlists(setlists.map((sl) => (
      sl.id === editing.id
        ? {
            ...sl,
            name: trimmedName,
            lastModifiedBy: email,
            lastModifiedAt: now,
            modificationHistory: [...(sl.modificationHistory || []), entry],
          }
        : sl
    )));
    setStatus('Setlist name saved.');
    return true;
  };

  const handleRenameAndSync = async () => {
    if (!editing) return;

    const renamed = handleRenameSetlist();
    if (!renamed && editingName.trim() !== editing.name) {
      return;
    }

    setCloudSyncing(true);
    try {
      const result = await useAppStore.getState().uploadSetlist(editing.id);
      const songMsg = result.songsUploaded > 0 ? `, ${result.songsUploaded} song(s) uploaded` : '';
      let nextStatus = `"${editingName.trim() || editing.name}" updated in cloud${songMsg}.`;
      if (result.warnings.length > 0) {
        nextStatus += ` Warnings: ${result.warnings.join(' | ')}`;
      }
      setStatus(nextStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Saved locally but cloud update failed: ${message}`);
    } finally {
      setCloudSyncing(false);
    }
  };

  if (editing) {
    return (
      <div className="screen">
        <button className="text-btn" onClick={() => { setEditingId(null); setEditingName(''); }}>← Back</button>
        <div className="add-row" style={{ padding: '0 16px' }}>
          <input
            className="input-field"
            placeholder="Setlist name"
            value={editingName}
            onChange={(e) => { setEditingName(e.target.value); setStatus(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSetlist(); }}
          />
          <button
            className="btn-primary small"
            onClick={handleRenameSetlist}
            disabled={!editingName.trim() || editingName.trim() === editing.name}
            title="Save setlist name"
          >
            Save
          </button>
        </div>
        <div style={{ padding: '8px 16px 0' }}>
          <button
            className="btn-success full-width"
            onClick={handleRenameAndSync}
            disabled={cloudSyncing || !editingName.trim()}
          >
            {cloudSyncing ? 'Syncing…' : '☁️ Save Name & Update Cloud'}
          </button>
        </div>
        <p className="section-subtitle">{editing.songIds.length} songs in setlist</p>
        <SetlistManager
          availableSongs={songs}
          songIds={editing.songIds}
          onReorder={(ids) => {
            const now = new Date().toISOString();
            const email = userEmail || 'unknown';
            const action = ids.length !== editing.songIds.length
              ? (ids.length > editing.songIds.length ? 'added song' : 'removed song')
              : 'reordered';
            const entry: ModificationEntry = { userEmail: email, action, timestamp: now };
            setSetlists(setlists.map((sl) => (sl.id === editing.id ? { ...sl, songIds: ids, lastModifiedBy: email, lastModifiedAt: now, modificationHistory: [...(sl.modificationHistory || []), entry] } : sl)));
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
        {status && <div className="status-box"><p className="status-text">{status}</p></div>}
        {/* Modification History Toggle */}
        {(editing.lastModifiedBy || (editing.modificationHistory && editing.modificationHistory.length > 0)) && (
          <div style={{ padding: '0 16px 16px' }}>
            <button className="btn-outline-small" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? '▾ Hide Changes' : '▸ Show Changes'}
            </button>
            {showHistory && (
              <>
                {editing.lastModifiedBy && (
                  <div className="mod-info" style={{ marginTop: 8 }}>
                    <span className="mod-label">Last modified by:</span> {editing.lastModifiedBy}
                    {editing.lastModifiedAt && <span className="mod-date"> — {new Date(editing.lastModifiedAt).toLocaleString()}</span>}
                  </div>
                )}
                {editing.modificationHistory && editing.modificationHistory.length > 0 && (
                  <div className="mod-history">
                    <h4 className="mod-history-title">Modification History</h4>
                    <ul className="mod-history-list">
                      {[...editing.modificationHistory].reverse().map((entry, i) => (
                        <li key={i} className="mod-history-item">
                          <span className="mod-action">{entry.action}</span>
                          <span className="mod-user">{entry.userEmail}</span>
                          <span className="mod-time">{new Date(entry.timestamp).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
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
          <div
            key={item.id}
            className="song-card"
            onClick={() => {
              setEditingId(item.id);
              setEditingName(item.name);
              setShowHistory(false);
            }}
          >
            <div className="song-card-left">
              <div className="song-title">{item.name}</div>
              <div className="song-artist">{item.songIds.length} {item.songIds.length === 1 ? 'song' : 'songs'}</div>
            </div>
            <button
              className="delete-btn"
              title="Delete setlist"
              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
      {confirmingSetlist && (
        <ConfirmDialog
          title="Delete Setlist"
          message={`Delete "${confirmingSetlist.name}"? This removes it from your library only — not from the shared cloud.`}
          onConfirm={() => { deleteSetlist(confirmingSetlist.id); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};

export default SetlistScreen;