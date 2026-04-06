import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { parseChordsFromText } from '../services/chordExtractor';
import { uploadSingleSong } from '../services/firebaseService';
import ConfirmDialog from '../components/ConfirmDialog';

const linesToText = (lines: { chords: string; lyrics: string }[]): string =>
  lines.map((line) => line.chords && line.chords.trim() ? `${line.chords}\n${line.lyrics}` : line.lyrics).join('\n');

type EditableRowKind = 'chord' | 'lyric';

const linesToEditableRows = (lines: { chords: string; lyrics: string }[]): { text: string; kind: EditableRowKind }[] => {
  const rows: { text: string; kind: EditableRowKind }[] = [];
  lines.forEach((line) => {
    if (line.chords) rows.push({ text: line.chords, kind: 'chord' });
    if (line.lyrics) rows.push({ text: line.lyrics, kind: 'lyric' });
  });
  return rows;
};

const parseUsingOriginalRowKinds = (
  rawText: string,
  originalRows: { text: string; kind: EditableRowKind }[],
): { lines: { chords: string; lyrics: string }[]; key: string } | null => {
  const editedRows = rawText.replace(/\r\n/g, '\n').split('\n');
  if (editedRows.length !== originalRows.length) return null;

  const parsedLines: { chords: string; lyrics: string }[] = [];
  let pendingChord: string | null = null;

  for (let i = 0; i < editedRows.length; i += 1) {
    const text = editedRows[i] ?? '';
    const kind = originalRows[i].kind;

    if (kind === 'chord') {
      if (pendingChord !== null) parsedLines.push({ chords: pendingChord, lyrics: '' });
      pendingChord = text;
      continue;
    }

    if (pendingChord !== null) {
      parsedLines.push({ chords: pendingChord, lyrics: text });
      pendingChord = null;
    } else {
      parsedLines.push({ chords: '', lyrics: text });
    }
  }

  if (pendingChord !== null) parsedLines.push({ chords: pendingChord, lyrics: '' });

  const firstChordToken = parsedLines
    .find((line) => line.chords.trim())
    ?.chords.trim()
    .split(/\s+/)[0] ?? '';
  const keyMatch = firstChordToken.match(/^([A-G][#b]?)/);

  return {
    lines: parsedLines,
    key: keyMatch ? keyMatch[1] : 'C',
  };
};

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
  const [originalRows] = useState(song ? linesToEditableRows(song.lines) : []);
  const [status, setStatus] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    const preserved = parseUsingOriginalRowKinds(chordText, originalRows);
    const result = preserved
      ? { title: title || song.title, artist: artist || song.artist, key: preserved.key, lines: preserved.lines }
      : parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) { setStatus('Could not parse chords.'); return; }
    updateSong(songId!, { title: title || song.title, artist: artist || song.artist, key: result.key || song.key, tempo: parsedTempo, lines: result.lines });
    window.alert(`"${title || song.title}" updated!`);
    navigate('/');
  };

  const handleSaveAndSync = async () => {
    if (!chordText.trim()) { setStatus('Chord text cannot be empty.'); return; }
    const preserved = parseUsingOriginalRowKinds(chordText, originalRows);
    const result = preserved
      ? { title: title || song.title, artist: artist || song.artist, key: preserved.key, lines: preserved.lines }
      : parseChordsFromText(chordText, title, artist);
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
    setShowDeleteConfirm(true);
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
        <button className="btn-danger-outlined full-width" onClick={handleDelete}>🗑️ Delete Song</button>

        {showDeleteConfirm && (
          <ConfirmDialog
            title="Delete Song"
            message={`Delete "${song.title}"? This removes it from your library only — not from the shared cloud.`}
            onConfirm={() => { deleteSong(songId!); navigate('/'); }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

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
