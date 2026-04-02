import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SongLibraryScreen from './screens/SongLibraryScreen';
import SetlistScreen from './screens/SetlistScreen';
import ViewerScreen from './screens/ViewerScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import AddSongScreen from './screens/AddSongScreen';
import EditSongScreen from './screens/EditSongScreen';
import AdminDashboard from './screens/AdminDashboard';
import { onAuthChange, getUserStatus, signOut } from './services/authService';
import useAppStore from './store/useAppStore';

const BASE = import.meta.env.BASE_URL;

function TabLayout() {
  const [activeTab, setActiveTab] = useState<'songs' | 'setlists' | 'settings'>('songs');

  return (
    <div className="app-layout">
      <header className="app-header">
        <img src={`${BASE}assets/logos/mt-logo.png`} alt="Music Ministry" className="header-logo-img" />
        <span className="header-title">Music ABCF</span>
      </header>
      <main className="app-main">
        {activeTab === 'songs' && <SongLibraryScreen />}
        {activeTab === 'setlists' && <SetlistScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </main>
      <nav className="tab-bar">
        <button className={`tab-item ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>
          <span className="tab-icon">🎵</span>
          <span className="tab-label">Songs</span>
        </button>
        <button className={`tab-item ${activeTab === 'setlists' ? 'active' : ''}`} onClick={() => setActiveTab('setlists')}>
          <span className="tab-icon">📋</span>
          <span className="tab-label">Setlists</span>
        </button>
        <button className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">Settings</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const uid = useAppStore((s) => s.uid);
  const darkMode = useAppStore((s) => s.darkMode);
  const setUid = useAppStore((s) => s.setUid);
  const restorePersonalData = useAppStore((s) => s.restorePersonalData);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        const status = await getUserStatus(user.uid);
        if (status === 'banned' || status === 'removed') {
          await signOut();
          setUid(null, null);
          alert('Your account has been disabled. Please contact an administrator.');
          setLoading(false);
          return;
        }
      }

      setUid(user?.uid ?? null, user?.email ?? null);
      if (user) {
        // Tier 1: restore the user's own backup silently on login
        await restorePersonalData();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!uid) {
    return <LoginScreen />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TabLayout />} />
        <Route path="/viewer" element={<ViewerScreen />} />
        <Route path="/add-song" element={<AddSongScreen />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/edit-song/:songId" element={<EditSongScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}