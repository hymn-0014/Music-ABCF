import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { signOut } from '../services/authService';
import { checkIsAdmin } from '../services/adminService';
import { Setlist, SyncConfirmFn, SyncResult } from '../types';

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
  const main = parts.length === 0 ? '✓ Everything is already in sync' : '✓ ' + parts.join(', ');
  if (result.warnings.length > 0) {
    return main + '\n⚠ ' + result.warnings.join('\n⚠ ');
  }
  return main;
};

const SettingsScreen = () => {
  const navigate = useNavigate();
  const userEmail = useAppStore((s) => s.userEmail);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (userEmail) {
      checkIsAdmin(userEmail).then(setIsAdmin);
    }
  }, [userEmail]);

  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const accidental = useAppStore((s) => s.accidental);
  const setAccidental = useAppStore((s) => s.setAccidental);
  const sectionJumpEnabled = useAppStore((s) => s.sectionJumpEnabled);
  const sectionJumpSide = useAppStore((s) => s.sectionJumpSide);
  const sectionJumpAutoHide = useAppStore((s) => s.sectionJumpAutoHide);
  const setSectionJumpEnabled = useAppStore((s) => s.setSectionJumpEnabled);
  const setSectionJumpSide = useAppStore((s) => s.setSectionJumpSide);
  const setSectionJumpAutoHide = useAppStore((s) => s.setSectionJumpAutoHide);
  const smartPushToCloud = useAppStore((s) => s.smartPushToCloud);
  const smartPullFromCloud = useAppStore((s) => s.smartPullFromCloud);
  const songs = useAppStore((s) => s.songs);
  const setlists = useAppStore((s) => s.setlists);
  const fetchCloudSetlists = useAppStore((s) => s.fetchCloudSetlists);
  const uploadSetlist = useAppStore((s) => s.uploadSetlist);
  const downloadSetlist = useAppStore((s) => s.downloadSetlist);
  const [syncing, setSyncing] = useState<'push' | 'pull' | null>(null);
  const [syncMsg, setSyncMsg] = useState('');

  // Setlist picker state
  const [pickerMode, setPickerMode] = useState<'upload' | 'download' | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [cloudSetlists, setCloudSetlists] = useState<Setlist[]>([]);
  const [pickerMsg, setPickerMsg] = useState('');

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

  const openUploadPicker = () => {
    setPickerMode('upload');
    setPickerMsg('');
    setCloudSetlists([]);
  };

  const openDownloadPicker = async () => {
    setPickerMode('download');
    setPickerMsg('');
    setPickerLoading(true);
    try {
      const lists = await fetchCloudSetlists();
      setCloudSetlists(lists);
      if (lists.length === 0) setPickerMsg('No setlists found in cloud.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setPickerMsg(`Failed to load: ${msg}`);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleUploadSetlist = async (setlistId: string) => {
    setPickerLoading(true);
    setPickerMsg('');
    try {
      const result = await uploadSetlist(setlistId);
      const sl = setlists.find((s) => s.id === setlistId);
      const uploadedMsg = result.songsUploaded > 0 ? `, ${result.songsUploaded} new song(s) uploaded` : '';
      const updatedMsg = result.songsUpdated > 0 ? `, ${result.songsUpdated} edited song(s) updated in cloud` : '';
      let msg = `✓ "${sl?.name}" uploaded${uploadedMsg}${updatedMsg}`;
      if (result.songsUpdated > 0) {
        msg += '\nℹ Edited song lines were pushed to cloud.';
      }
      if (result.warnings.length > 0) {
        msg += '\n⚠ ' + result.warnings.join('\n⚠ ');
      }
      setPickerMsg(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setPickerMsg(`✗ Upload failed: ${msg}`);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleDownloadSetlist = async (setlist: Setlist) => {
    setPickerLoading(true);
    setPickerMsg('');
    try {
      const result = await downloadSetlist(setlist);
      const songMsg = result.songsDownloaded > 0 ? `, ${result.songsDownloaded} song(s) downloaded` : '';
      let msg = `✓ "${setlist.name}" downloaded${songMsg}`;
      if (result.warnings.length > 0) {
        msg += '\n⚠ ' + result.warnings.join('\n⚠ ');
      }
      setPickerMsg(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setPickerMsg(`✗ Download failed: ${msg}`);
    } finally {
      setPickerLoading(false);
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
          <div className="settings-divider" />
          <div className="settings-row">
            <div className="settings-row-left">
              <span className="settings-icon">🧭</span>
              <span>Section Jump Buttons</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={sectionJumpEnabled} onChange={(e) => setSectionJumpEnabled(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          {sectionJumpEnabled && (
            <>
              <div className="settings-divider" />
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-icon">↔️</span>
                  <span>Section Button Side</span>
                </div>
                <div className="settings-pill-group">
                  <button
                    className={`toggle-pill ${sectionJumpSide === 'left' ? 'active' : ''}`}
                    onClick={() => setSectionJumpSide('left')}
                    type="button"
                  >
                    Left
                  </button>
                  <button
                    className={`toggle-pill ${sectionJumpSide === 'right' ? 'active' : ''}`}
                    onClick={() => setSectionJumpSide('right')}
                    type="button"
                  >
                    Right
                  </button>
                </div>
              </div>
              <div className="settings-divider" />
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-icon">👁️</span>
                  <span>Auto-hide While Idle</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={sectionJumpAutoHide} onChange={(e) => setSectionJumpAutoHide(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </>
          )}
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
          <p className={`sync-msg ${syncMsg.startsWith('✗') ? 'error' : syncMsg.includes('⚠') ? 'warning' : ''}`}>{syncMsg}</p>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Setlist Sync</h3>
        <div className="settings-card">
          <button className="settings-sync-row" onClick={openUploadPicker} disabled={pickerMode !== null}>
            <span className="settings-icon">📤</span>
            <div className="settings-sync-info">
              <span>Upload Setlist</span>
              <span className="settings-hint">Pick a setlist to upload (includes its songs)</span>
            </div>
            <span className="arrow">→</span>
          </button>
          <div className="settings-divider" />
          <button className="settings-sync-row" onClick={openDownloadPicker} disabled={pickerMode !== null}>
            <span className="settings-icon">📥</span>
            <div className="settings-sync-info">
              <span>Download Setlist</span>
              <span className="settings-hint">Pick a cloud setlist to download (includes its songs)</span>
            </div>
            <span className="arrow">→</span>
          </button>
        </div>
      </div>

      {/* Setlist picker modal */}
      {pickerMode && (
        <div className="picker-overlay" onClick={() => !pickerLoading && setPickerMode(null)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>{pickerMode === 'upload' ? 'Upload Setlist' : 'Download Setlist'}</h3>
              <button className="picker-close" onClick={() => setPickerMode(null)} disabled={pickerLoading}>✕</button>
            </div>
            {pickerLoading && (
              <div className="picker-loading"><span className="spinner-small" /></div>
            )}
            {pickerMsg && (
              <p className={`picker-msg ${pickerMsg.startsWith('✗') ? 'error' : pickerMsg.includes('⚠') ? 'warning' : ''}`}>{pickerMsg}</p>
            )}
            <div className="picker-list">
              {pickerMode === 'upload' && setlists.map((sl) => (
                <button
                  key={sl.id}
                  className="picker-item"
                  disabled={pickerLoading}
                  onClick={() => handleUploadSetlist(sl.id)}
                >
                  <div className="picker-item-info">
                    <span className="picker-item-name">{sl.name}</span>
                    <span className="picker-item-detail">{sl.songIds.length} song(s)</span>
                  </div>
                  <span className="arrow">↑</span>
                </button>
              ))}
              {pickerMode === 'download' && cloudSetlists.map((sl) => (
                <button
                  key={sl.id}
                  className="picker-item"
                  disabled={pickerLoading}
                  onClick={() => handleDownloadSetlist(sl)}
                >
                  <div className="picker-item-info">
                    <span className="picker-item-name">{sl.name}</span>
                    <span className="picker-item-detail">{sl.songIds.length} song(s)</span>
                  </div>
                  <span className="arrow">↓</span>
                </button>
              ))}
              {pickerMode === 'upload' && setlists.length === 0 && (
                <p className="picker-empty">No local setlists to upload.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="settings-section">
          <h3 className="settings-section-title">Administration</h3>
          <div className="settings-card">
            <button className="settings-sync-row" onClick={() => navigate('/admin')}>
              <span className="settings-icon">🛡️</span>
              <div className="settings-sync-info">
                <span>Admin Dashboard</span>
                <span className="settings-hint">Manage songs, setlists, and users</span>
              </div>
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
      )}

      <div className="settings-section">
        <button className="btn-danger full-width" onClick={signOut}>Sign Out</button>
      </div>
    </div>
  );
};

export default SettingsScreen;