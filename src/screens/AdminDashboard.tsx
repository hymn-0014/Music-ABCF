import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  fetchAllCloudSongs,
  fetchAllCloudSetlists,
  fetchRegisteredUsers,
  deleteCloudSong,
  deleteCloudSetlist,
  updateUserStatus,
  removeUser,
  deriveUsers,
  mergeUsersWithActivity,
  computeStats,
  exportDataAsJson,
  checkIsAdmin,
} from '../services/adminService';
import { UserStatus } from '../types';
import { Song, Setlist, AdminUser, AdminStats, AdminView } from '../types';

/* ─── Sidebar ──────────────────────────────────────────── */
const NAV_ITEMS: { key: AdminView; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard' },
  { key: 'songs', icon: '🎵', label: 'Songs' },
  { key: 'setlists', icon: '📋', label: 'Setlists' },
  { key: 'users', icon: '👥', label: 'Users' },
  { key: 'settings', icon: '⚙️', label: 'Settings' },
];

/* ─── Pagination helper ────────────────────────────────── */
const PAGE_SIZE = 20;

function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Reset page when items change and current page is out of range
  useEffect(() => { if (page > totalPages) setPage(1); }, [items.length]);
  return { page, totalPages, paginated, setPage };
}

/* ─── Sort helper ──────────────────────────────────────── */
type SortField = 'title' | 'name' | 'date' | 'creator' | 'modifier';
type SortDir = 'asc' | 'desc';

/* ─── Main component ──────────────────────────────────── */
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const darkMode = useAppStore((s) => s.darkMode);
  const currentUserEmail = useAppStore((s) => s.userEmail);

  // Data state
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalSongs: 0, totalSetlists: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Navigation
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filters
  const [songFilter, setSongFilter] = useState('');
  const [setlistFilter, setSetlistFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // Sort
  const [songSort, setSongSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'date', dir: 'desc' });
  const [setlistSort, setSetlistSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'date', dir: 'desc' });

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'song' | 'setlist'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Load data
  const loadData = async () => {
    try {
      // Ensure the config/admins doc is seeded so Firestore rules recognise us
      if (currentUserEmail) {
        await checkIsAdmin(currentUserEmail);
      }

      // Fetch each source independently so one failure doesn't block the rest
      const [songsResult, setlistsResult, usersResult] = await Promise.allSettled([
        fetchAllCloudSongs(),
        fetchAllCloudSetlists(),
        fetchRegisteredUsers(),
      ]);

      const cloudSongs = songsResult.status === 'fulfilled' ? songsResult.value : [];
      const cloudSetlists = setlistsResult.status === 'fulfilled' ? setlistsResult.value : [];
      const registeredUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];

      if (songsResult.status === 'rejected') console.error('Failed to fetch songs:', songsResult.reason);
      if (setlistsResult.status === 'rejected') console.error('Failed to fetch setlists:', setlistsResult.reason);
      if (usersResult.status === 'rejected') console.error('Failed to fetch users:', usersResult.reason);

      setSongs(cloudSongs);
      setSetlists(cloudSetlists);

      const mergedUsers = mergeUsersWithActivity(registeredUsers, cloudSongs, cloudSetlists);

      setUsers(mergedUsers);
      setStats(computeStats(cloudSongs, cloudSetlists, mergedUsers));
    } catch (e) {
      console.error('Admin data load failed:', e);
    }
  };

  const handleSetUserStatus = async (uid: string, status: UserStatus) => {
    setUpdatingUser(uid);
    try {
      if (status === 'removed') {
        await removeUser(uid);
      } else {
        await updateUserStatus(uid, status);
      }
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
    } catch (e) {
      console.error('Failed to update user status:', e);
    } finally {
      setUpdatingUser(null);
    }
  };

  const statusLabel = (status: UserStatus): string => {
    switch (status) {
      case 'restricted': return 'Restricted';
      case 'banned': return 'Banned';
      case 'removed': return 'Removed';
      default: return 'Active';
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filtered + sorted songs
  const filteredSongs = useMemo(() => {
    let result = songs;
    if (songFilter.trim()) {
      const q = songFilter.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.lastModifiedBy || '').toLowerCase().includes(q),
      );
    }
    result = [...result].sort((a, b) => {
      const dir = songSort.dir === 'asc' ? 1 : -1;
      switch (songSort.field) {
        case 'title': return dir * a.title.localeCompare(b.title);
        case 'date': return dir * ((a.lastModifiedAt || '').localeCompare(b.lastModifiedAt || ''));
        case 'creator': return dir * ((a.lastModifiedBy || '').localeCompare(b.lastModifiedBy || ''));
        default: return 0;
      }
    });
    return result;
  }, [songs, songFilter, songSort]);

  // Filtered + sorted setlists
  const filteredSetlists = useMemo(() => {
    let result = setlists;
    if (setlistFilter.trim()) {
      const q = setlistFilter.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.lastModifiedBy || '').toLowerCase().includes(q),
      );
    }
    result = [...result].sort((a, b) => {
      const dir = setlistSort.dir === 'asc' ? 1 : -1;
      switch (setlistSort.field) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'date': return dir * ((a.lastModifiedAt || a.createdAt || '').localeCompare(b.lastModifiedAt || b.createdAt || ''));
        case 'creator': return dir * ((a.lastModifiedBy || '').localeCompare(b.lastModifiedBy || ''));
        default: return 0;
      }
    });
    return result;
  }, [setlists, setlistFilter, setlistSort]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userFilter.trim()) return users;
    const q = userFilter.toLowerCase();
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.status.toLowerCase().includes(q),
    );
  }, [users, userFilter]);

  // Pagination
  const songPag = usePagination(filteredSongs);
  const setlistPag = usePagination(filteredSetlists);
  const userPag = usePagination(filteredUsers);

  // Delete handlers
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'song') {
        await deleteCloudSong(confirmDelete.id);
        setSongs((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      } else {
        await deleteCloudSetlist(confirmDelete.id);
        setSetlists((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      }
      // Recompute stats
      const newSongs = confirmDelete.type === 'song' ? songs.filter((s) => s.id !== confirmDelete.id) : songs;
      const newSetlists = confirmDelete.type === 'setlist' ? setlists.filter((s) => s.id !== confirmDelete.id) : setlists;
      const newUsers = mergeUsersWithActivity(users, newSongs, newSetlists);
      setUsers(newUsers);
      setStats(computeStats(newSongs, newSetlists, newUsers));
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  // Export handler
  const handleExport = () => {
    const json = exportDataAsJson(songs, setlists);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `music-abcf-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sort toggle helper
  const toggleSort = (
    current: { field: SortField; dir: SortDir },
    field: SortField,
    setter: (v: { field: SortField; dir: SortDir }) => void,
  ) => {
    if (current.field === field) {
      setter({ field, dir: current.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setter({ field, dir: 'asc' });
    }
  };

  const sortIndicator = (current: { field: SortField; dir: SortDir }, field: SortField) =>
    current.field === field ? (current.dir === 'asc' ? ' ▲' : ' ▼') : '';

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading admin data…</p>
      </div>
    );
  }

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          {!sidebarCollapsed && <span className="admin-sidebar-title">Admin</span>}
          <button className="admin-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`admin-nav-item ${activeView === item.key ? 'active' : ''}`}
              onClick={() => setActiveView(item.key)}
              title={item.label}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="admin-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-nav-item" onClick={() => navigate('/')} title="Back to App">
            <span className="admin-nav-icon">←</span>
            {!sidebarCollapsed && <span className="admin-nav-label">Back to App</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">
            {NAV_ITEMS.find((n) => n.key === activeView)?.icon}{' '}
            {NAV_ITEMS.find((n) => n.key === activeView)?.label}
          </h1>
          <button className="btn-outline-small" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
        </div>

        {/* Dashboard view */}
        {activeView === 'dashboard' && (
          <div className="admin-dashboard-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-icon">🎵</span>
              <div className="admin-stat-info">
                <span className="admin-stat-value">{stats.totalSongs}</span>
                <span className="admin-stat-label">Songs in Cloud</span>
              </div>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-icon">📋</span>
              <div className="admin-stat-info">
                <span className="admin-stat-value">{stats.totalSetlists}</span>
                <span className="admin-stat-label">Setlists in Cloud</span>
              </div>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-icon">👥</span>
              <div className="admin-stat-info">
                <span className="admin-stat-value">{stats.totalUsers}</span>
                  <span className="admin-stat-label">Registered Users</span>
              </div>
            </div>
            <div className="admin-section">
              <h3>Recent Activity</h3>
              <div className="admin-recent-list">
                {songs
                  .filter((s) => s.lastModifiedAt)
                  .sort((a, b) => (b.lastModifiedAt || '').localeCompare(a.lastModifiedAt || ''))
                  .slice(0, 8)
                  .map((s) => (
                    <div key={s.id} className="admin-recent-item">
                      <span className="admin-recent-icon">🎵</span>
                      <div className="admin-recent-info">
                        <span className="admin-recent-title">{s.title}</span>
                        <span className="admin-recent-meta">
                          {s.lastModifiedBy} — {s.lastModifiedAt ? new Date(s.lastModifiedAt).toLocaleString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                {songs.filter((s) => s.lastModifiedAt).length === 0 && (
                  <p className="admin-empty">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Songs view */}
        {activeView === 'songs' && (
          <div className="admin-table-view">
            <div className="admin-filter-row">
              <input
                className="admin-filter-input"
                placeholder="Filter by title, artist, or creator…"
                value={songFilter}
                onChange={(e) => setSongFilter(e.target.value)}
              />
              <span className="admin-count">{filteredSongs.length} song(s)</span>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort(songSort, 'title', setSongSort)} className="admin-sortable">
                      Title{sortIndicator(songSort, 'title')}
                    </th>
                    <th>Artist</th>
                    <th>Key</th>
                    <th onClick={() => toggleSort(songSort, 'date', setSongSort)} className="admin-sortable">
                      Modified{sortIndicator(songSort, 'date')}
                    </th>
                    <th onClick={() => toggleSort(songSort, 'creator', setSongSort)} className="admin-sortable">
                      Modified By{sortIndicator(songSort, 'creator')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songPag.paginated.map((song) => (
                    <tr key={song.id}>
                      <td className="admin-td-title">{song.title}</td>
                      <td>{song.artist}</td>
                      <td>{song.key}</td>
                      <td className="admin-td-date">
                        {song.lastModifiedAt ? new Date(song.lastModifiedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="admin-td-email">{song.lastModifiedBy || '—'}</td>
                      <td>
                        <button
                          className="admin-delete-btn"
                          onClick={() => setConfirmDelete({ type: 'song', id: song.id, name: song.title })}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {songPag.paginated.length === 0 && (
                    <tr><td colSpan={6} className="admin-empty-row">No songs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {songPag.totalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={songPag.page <= 1} onClick={() => songPag.setPage(songPag.page - 1)}>‹ Prev</button>
                <span>Page {songPag.page} of {songPag.totalPages}</span>
                <button disabled={songPag.page >= songPag.totalPages} onClick={() => songPag.setPage(songPag.page + 1)}>Next ›</button>
              </div>
            )}
          </div>
        )}

        {/* Setlists view */}
        {activeView === 'setlists' && (
          <div className="admin-table-view">
            <div className="admin-filter-row">
              <input
                className="admin-filter-input"
                placeholder="Filter by name or creator…"
                value={setlistFilter}
                onChange={(e) => setSetlistFilter(e.target.value)}
              />
              <span className="admin-count">{filteredSetlists.length} setlist(s)</span>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort(setlistSort, 'name', setSetlistSort)} className="admin-sortable">
                      Name{sortIndicator(setlistSort, 'name')}
                    </th>
                    <th>Songs</th>
                    <th onClick={() => toggleSort(setlistSort, 'date', setSetlistSort)} className="admin-sortable">
                      Modified{sortIndicator(setlistSort, 'date')}
                    </th>
                    <th onClick={() => toggleSort(setlistSort, 'creator', setSetlistSort)} className="admin-sortable">
                      Modified By{sortIndicator(setlistSort, 'creator')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {setlistPag.paginated.map((sl) => (
                    <tr key={sl.id}>
                      <td className="admin-td-title">{sl.name}</td>
                      <td>{sl.songIds.length}</td>
                      <td className="admin-td-date">
                        {(sl.lastModifiedAt || sl.createdAt) ? new Date(sl.lastModifiedAt || sl.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="admin-td-email">{sl.lastModifiedBy || '—'}</td>
                      <td>
                        <button
                          className="admin-delete-btn"
                          onClick={() => setConfirmDelete({ type: 'setlist', id: sl.id, name: sl.name })}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {setlistPag.paginated.length === 0 && (
                    <tr><td colSpan={5} className="admin-empty-row">No setlists found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {setlistPag.totalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={setlistPag.page <= 1} onClick={() => setlistPag.setPage(setlistPag.page - 1)}>‹ Prev</button>
                <span>Page {setlistPag.page} of {setlistPag.totalPages}</span>
                <button disabled={setlistPag.page >= setlistPag.totalPages} onClick={() => setlistPag.setPage(setlistPag.page + 1)}>Next ›</button>
              </div>
            )}
          </div>
        )}

        {/* Users view */}
        {activeView === 'users' && (
          <div className="admin-table-view">
            <div className="admin-filter-row">
              <input
                className="admin-filter-input"
                placeholder="Filter by email or status…"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
              <span className="admin-count">{filteredUsers.length} user(s)</span>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Songs Uploaded</th>
                    <th>Setlists Uploaded</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userPag.paginated.map((user) => (
                    <tr key={user.email}>
                      <td className="admin-td-email">{user.email}</td>
                      <td>{statusLabel(user.status)}</td>
                      <td>{user.songsCount}</td>
                      <td>{user.setlistsCount}</td>
                      <td className="admin-td-date">
                        {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn-outline-small"
                            disabled={updatingUser === user.uid || currentUserEmail?.toLowerCase() === user.email.toLowerCase()}
                            onClick={() => handleSetUserStatus(user.uid, 'active')}
                          >
                            Activate
                          </button>
                          <button
                            className="btn-outline-small"
                            disabled={updatingUser === user.uid || currentUserEmail?.toLowerCase() === user.email.toLowerCase()}
                            onClick={() => handleSetUserStatus(user.uid, 'restricted')}
                          >
                            Restrict
                          </button>
                          <button
                            className="btn-outline-small"
                            disabled={updatingUser === user.uid || currentUserEmail?.toLowerCase() === user.email.toLowerCase()}
                            onClick={() => handleSetUserStatus(user.uid, 'banned')}
                          >
                            Ban
                          </button>
                          <button
                            className="btn-outline-small"
                            disabled={updatingUser === user.uid || currentUserEmail?.toLowerCase() === user.email.toLowerCase()}
                            onClick={() => handleSetUserStatus(user.uid, 'removed')}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {userPag.paginated.length === 0 && (
                    <tr><td colSpan={6} className="admin-empty-row">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {userPag.totalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={userPag.page <= 1} onClick={() => userPag.setPage(userPag.page - 1)}>‹ Prev</button>
                <span>Page {userPag.page} of {userPag.totalPages}</span>
                <button disabled={userPag.page >= userPag.totalPages} onClick={() => userPag.setPage(userPag.page + 1)}>Next ›</button>
              </div>
            )}
          </div>
        )}

        {/* Admin Settings view */}
        {activeView === 'settings' && (
          <div className="admin-settings-view">
            <div className="admin-section">
              <h3>Backup & Data</h3>
              <div className="admin-settings-card">
                <button className="settings-sync-row" onClick={handleExport}>
                  <span className="settings-icon">💾</span>
                  <div className="settings-sync-info">
                    <span>Export Database</span>
                    <span className="settings-hint">Download all cloud songs & setlists as JSON</span>
                  </div>
                  <span className="arrow">→</span>
                </button>
              </div>
            </div>
            <div className="admin-section">
              <h3>Info</h3>
              <div className="admin-info-card">
                <p>Songs in cloud: <strong>{stats.totalSongs}</strong></p>
                <p>Setlists in cloud: <strong>{stats.totalSetlists}</strong></p>
                <p>Registered users: <strong>{stats.totalUsers}</strong></p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.type === 'song' ? 'Song' : 'Setlist'}`}
          message={`Delete "${confirmDelete.name}" from the shared cloud? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
