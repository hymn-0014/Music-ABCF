import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { signOut } from '../services/authService';
import { SyncConfirmFn, SyncResult } from '../types';

const webConfirm: SyncConfirmFn = async (title: string, message: string): Promise<boolean> => {
  return window.confirm(`${title}\n\n${message}`);
};

const formatSyncResult = (result: SyncResult, direction: 'push' | 'pull'): string => {
  const parts: string[] = [];
  if (direction === 'push') {
    if (result.songsUploaded > 0) parts.push(`${result.songsUploaded} song(s) uploaded`);
    if (result.setlistsUploaded > 0) parts.push(`${result.setlistsUploaded} setlist(s) uploaded`);
  } else {
    if (result.songsDownloaded > 0) parts.push(`${result.songsDownloaded} song(s) downloaded`);
    if (result.setlistsDownloaded > 0) parts.push(`${result.setlistsDownloaded} setlist(s) downloaded`);
  }
  if (result.overwritten > 0) parts.push(`${result.overwritten} overwritten`);
  if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
  if (parts.length === 0) return '✓ Everything is already in sync';
  return '✓ ' + parts.join(', ');
};

const SettingsScreen = () => {
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const accidental = useAppStore((s) => s.accidental);
  const setAccidental = useAppStore((s) => s.setAccidental);
  const smartPushToCloud = useAppStore((s) => s.smartPushToCloud);
  const smartPullFromCloud = useAppStore((s) => s.smartPullFromCloud);
  const songs = useAppStore((s) => s.songs);
  const setlists = useAppStore((s) => s.setlists);
  const [syncing, setSyncing] = useState<'push' | 'pull' | null>(null);
  const [syncMsg, setSyncMsg] = useState('');

  const handleSync = async (direction: 'push' | 'pull') => {
    setSyncing(direction);
    setSyncMsg('');
    try {
      if (direction === 'push') {
        const result = await smartPushToCloud(webConfirm);
        setSyncMsg(formatSyncResult(result, 'push'));
      } else {
        const result = await smartPullFromCloud(webConfirm);
        setSyncMsg(formatSyncResult(result, 'pull'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSyncMsg(`✗ Sync failed: ${msg}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="screen settings-screen">
      <div className="settings-section">
        <h3 className="settings-section-title">Display</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row-left">
              <span className="settings-icon">🌙</span>
              <span>Dark Mode</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-divider" />
          <div className="settings-row">
            <div className="settings-row-left">
              <span className="settings-icon">♯</span>
              <span>Prefer Sharps</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={accidental === 'sharp'} onChange={(e) => setAccidental(e.target.checked ? 'sharp' : 'flat')} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Cloud Sync</h3>
        <p className="sync-info">Local: {songs.length} song(s), {setlists.length} setlist(s)</p>
        <div className="settings-card">
          <button className="settings-sync-row" onClick={() => handleSync('push')} disabled={syncing !== null}>
            <span className="settings-icon">☁️</span>
            <div className="settings-sync-info">
              <span>Upload to Cloud</span>
              <span className="settings-hint">Uploads local songs & setlists not in cloud</span>
            </div>
            {syncing === 'push' ? <span className="spinner-small" /> : <span className="arrow">→</span>}
          </button>
          <div className="settings-divider" />
          <button className="settings-sync-row" onClick={() => handleSync('pull')} disabled={syncing !== null}>
            <span className="settings-icon">📥</span>
            <div className="settings-sync-info">
              <span>Download from Cloud</span>
              <span className="settings-hint">Downloads cloud songs & setlists not on device</span>
            </div>
            {syncing === 'pull' ? <span className="spinner-small" /> : <span className="arrow">→</span>}
          </button>
        </div>
        {syncMsg !== '' && (
          <p className={`sync-msg ${syncMsg.startsWith('✗') ? 'error' : ''}`}>{syncMsg}</p>
        )}
      </div>

      <div className="settings-section">
        <button className="btn-danger full-width" onClick={signOut}>Sign Out</button>
      </div>
    </div>
  );
};

export default SettingsScreen;