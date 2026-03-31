import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { parseChordsFromText, fetchChordsFromUrl } from '../services/chordExtractor';
import { uploadSingleSong } from '../services/firebaseService';

const AddSongScreen = () => {
  const navigate = useNavigate();
  const songs = useAppStore((s) => s.songs);
  const setSongs = useAppStore((s) => s.setSongs);
  const uid = useAppStore((s) => s.uid);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [tempo, setTempo] = useState('90');
  const [chordText, setChordText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'url' | 'file'>('text');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedTempo = Math.min(240, Math.max(40, Number.parseInt(tempo, 10) || 90));

  const handleAddFromText = () => {
    if (!chordText.trim()) { setStatus('Paste some chord/lyric text first.'); return; }
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) {
      setStatus('Could not parse chords. Use alternating chord/lyric lines:\n\nG   C   G\nAmazing grace how sweet');
      return;
    }
    const newSong = { ...result, id: `song-${Date.now()}`, title: title || result.title, artist: artist || result.artist, tempo: parsedTempo };
    setSongs([...songs, newSong]);
    if (uid) uploadSingleSong(uid, newSong).catch(console.error);
    window.alert(`"${newSong.title}" added!`);
    navigate('/');
  };

  const handleAddAndSync = async () => {
    if (!chordText.trim()) { setStatus('Paste some chord/lyric text first.'); return; }
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) {
      setStatus('Could not parse chords. Use alternating chord/lyric lines:\n\nG   C   G\nAmazing grace how sweet');
      return;
    }
    const newSong = { ...result, id: `song-${Date.now()}`, title: title || result.title, artist: artist || result.artist, tempo: parsedTempo };
    setSongs([...songs, newSong]);
    setCloudSyncing(true);
    try {
      if (uid) await uploadSingleSong(uid, newSong);
      window.alert(`"${newSong.title}" added and synced to cloud!`);
    } catch { window.alert(`"${newSong.title}" added locally but cloud sync failed.`); }
    finally { setCloudSyncing(false); }
    navigate('/');
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    if (!file.type.includes('text') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setStatus('Please select a text file (.txt or .md).'); return;
    }
    setLoading(true); setStatus('Reading file…');
    try {
      const text = await file.text();
      if (!text.trim()) { setStatus('File is empty.'); return; }
      const result = parseChordsFromText(text, title || file.name.replace(/\.[^/.]+$/, ''), artist);
      if (!result || result.lines.length === 0) {
        setStatus('Could not parse chords from file.'); return;
      }
      const newSong = { ...result, id: `song-${Date.now()}`, title: title || result.title, artist: artist || result.artist, tempo: parsedTempo };
      setSongs([...songs, newSong]);
      if (uid) { try { await uploadSingleSong(uid, newSong); } catch { /* fallback */ } }
      window.alert(`"${newSong.title}" added!`);
      navigate('/');
    } catch { setStatus('Could not read file.'); }
    finally { setLoading(false); }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer?.files?.length) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleFetchFromUrl = async () => {
    if (!url.trim()) { setStatus('Enter a URL to a chord page.'); return; }
    setLoading(true); setStatus('Fetching chords from URL…');
    try {
      const result = await fetchChordsFromUrl(url.trim());
      if (!result || result.lines.length === 0) {
        setStatus('Could not extract chords from that URL.\n\nTIP: Copy the chord text and use the "Paste Text" tab.'); return;
      }
      const newSong = { ...result, id: `song-${Date.now()}`, title: title || result.title, artist: artist || result.artist, tempo: parsedTempo };
      setSongs([...songs, newSong]);
      if (uid) { try { await uploadSingleSong(uid, newSong); } catch { /* fallback */ } }
      window.alert(`"${newSong.title}" added!`);
      navigate('/');
    } catch { setStatus('Network/CORS error. Try the "Paste Text" tab.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen add-song-screen">
      <div className="screen-header">
        <button className="text-btn" onClick={() => navigate('/')}>← Back</button>
        <h2 className="screen-title">Add Song</h2>
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

        <div className="tab-row">
          {(['text', 'url', 'file'] as const).map((t) => (
            <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => { setActiveTab(t); setStatus(''); }}>
              {t === 'text' ? 'Paste Text' : t === 'url' ? 'From URL' : 'Drag File'}
            </button>
          ))}
        </div>

        {activeTab === 'text' && (
          <div>
            <textarea
              className="chord-textarea"
              placeholder={'Paste chord sheet here…\n\nExample:\nG        G7       C        G\nAmazing grace how sweet the sound'}
              rows={10}
              value={chordText}
              onChange={(e) => { setChordText(e.target.value); setStatus(''); }}
            />
            <button className="btn-primary full-width" onClick={handleAddFromText}>Add Song</button>
            <button className="btn-success full-width" onClick={handleAddAndSync} disabled={cloudSyncing}>
              {cloudSyncing ? 'Syncing…' : '☁️ Add & Sync to Cloud'}
            </button>
          </div>
        )}

        {activeTab === 'url' && (
          <div>
            <p className="hint">Paste a link to a chord sheet page (e.g. Ultimate Guitar, Chordie)</p>
            <input className="input-field" placeholder="https://…" value={url} onChange={(e) => { setUrl(e.target.value); setStatus(''); }} />
            <button className="btn-success full-width" onClick={handleFetchFromUrl} disabled={loading}>
              {loading ? 'Fetching…' : 'Import from URL'}
            </button>
          </div>
        )}

        {activeTab === 'file' && (
          <div>
            <p className="hint">Drag & drop a text file or click below to upload</p>
            <div
              className={`drop-zone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              📄 Drag file here or click to select
            </div>
            <button className="btn-warning full-width" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              {loading ? 'Reading…' : '📁 Choose File'}
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.md" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.length) handleFileSelect(e.target.files[0]); }} />
          </div>
        )}

        {status && <div className="status-box"><p className="status-text">{status}</p></div>}
      </div>
    </div>
  );
};

export default AddSongScreen;
