import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { parseChordsFromText } from '../services/chordExtractor';
import { uploadSingleSong } from '../services/firebaseService';

const linesToText = (lines: { chords: string; lyrics: string }[]): string =>
  lines.map((line) => line.chords && line.chords.trim() ? `${line.chords}\n${line.lyrics}` : line.lyrics).join('\n');

const EditSongScreen = () => {
  const navigate = useNavigate();
  const { songId } = useParams<{ songId: string }>();
  const songs = useAppStore((s) => s.songs);
  const updateSong = useAppStore((s) => s.updateSong);
  const deleteSong = useAppStore((s) => s.deleteSong);
  const uid = useAppStore((s) => s.uid);

  const song = songs.find((s) => s.id === songId);

  const [title, setTitle] = useState(song?.title ?? '');
  const [artist, setArtist] = useState(song?.artist ?? '');
  const [tempo, setTempo] = useState(String(song?.tempo ?? 90));
  const [chordText, setChordText] = useState(song ? linesToText(song.lines) : '');
  const [status, setStatus] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const parsedTempo = Math.min(240, Math.max(40, Number.parseInt(tempo, 10) || 90));

  if (!song) {
    return (
      <div className="center-screen">
        <p className="empty-text">Song not found</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  const handleSave = () => {
    if (!chordText.trim()) { setStatus('Chord text cannot be empty.'); return; }
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) { setStatus('Could not parse chords.'); return; }
    updateSong(songId!, { title: title || song.title, artist: artist || song.artist, key: result.key || song.key, tempo: parsedTempo, lines: result.lines });
    window.alert(`"${title || song.title}" updated!`);
    navigate('/');
  };

  const handleSaveAndSync = async () => {
    if (!chordText.trim()) { setStatus('Chord text cannot be empty.'); return; }
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) { setStatus('Could not parse chords.'); return; }
    updateSong(songId!, { title: title || song.title, artist: artist || song.artist, key: result.key || song.key, tempo: parsedTempo, lines: result.lines });
    setCloudSyncing(true);
    try {
      // Push only this specific song — not the entire library
      const updatedSong = useAppStore.getState().songs.find((s) => s.id === songId);
      if (uid && updatedSong) await uploadSingleSong(uid, updatedSong);
      window.alert(`"${title || song.title}" updated and synced!`);
    }
    catch { window.alert(`Updated locally but cloud sync failed.`); }
    finally { setCloudSyncing(false); }
    navigate('/');
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${song.title}"?`)) {
      deleteSong(songId!);
      navigate('/');
    }
  };

  return (
    <div className="screen add-song-screen">
      <div className="screen-header">
        <button className="text-btn" onClick={() => navigate(-1)}>← Back</button>
        <h2 className="screen-title">Edit Song</h2>
      </div>
      <div className="add-song-content">
        <div className="meta-row">
          <div className="meta-field">
            <label className="field-label">Title</label>
            <input className="input-field" placeholder="Song title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="meta-field">
            <label className="field-label">Artist</label>
            <input className="input-field" placeholder="Artist name" value={artist} onChange={(e) => setArtist(e.target.value)} />
          </div>
        </div>

        <div className="meta-row">
          <div className="meta-field" style={{ maxWidth: 180 }}>
            <label className="field-label">Tempo</label>
            <input className="input-field" placeholder="90" type="number" value={tempo} onChange={(e) => setTempo(e.target.value)} />
          </div>
          <div className="tempo-hint">{parsedTempo} BPM</div>
        </div>

        <textarea
          className="chord-textarea"
          placeholder="Chord sheet text…"
          rows={10}
          value={chordText}
          onChange={(e) => { setChordText(e.target.value); setStatus(''); }}
        />

        <button className="btn-primary full-width" onClick={handleSave}>Save Changes</button>
        <button className="btn-success full-width" onClick={handleSaveAndSync} disabled={cloudSyncing}>
          {cloudSyncing ? 'Syncing…' : '☁️ Save & Update Cloud'}
        </button>
        <button className="btn-danger-outlined full-width" onClick={handleDelete}>Delete Song</button>

        {status && <div className="status-box"><p className="status-text">{status}</p></div>}

        {/* Modification History Toggle */}
        {(song.lastModifiedBy || (song.modificationHistory && song.modificationHistory.length > 0)) && (
          <div>
            <button className="btn-outline-small" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? '▾ Hide Changes' : '▸ Show Changes'}
            </button>
            {showHistory && (
              <>
                {song.lastModifiedBy && (
                  <div className="mod-info" style={{ marginTop: 8 }}>
                    <span className="mod-label">Last modified by:</span> {song.lastModifiedBy}
                    {song.lastModifiedAt && <span className="mod-date"> — {new Date(song.lastModifiedAt).toLocaleString()}</span>}
                  </div>
                )}
                {song.modificationHistory && song.modificationHistory.length > 0 && (
                  <div className="mod-history">
                    <h4 className="mod-history-title">Modification History</h4>
                    <ul className="mod-history-list">
                      {[...song.modificationHistory].reverse().map((entry, i) => (
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
    </div>
  );
};

export default EditSongScreen;
