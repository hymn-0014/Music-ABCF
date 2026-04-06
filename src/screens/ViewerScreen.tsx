import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import SongChordViewer from '../components/SongChordViewer';

const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_VERTICAL_DRIFT = 48;

const isSwipeIgnoredTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, input, textarea, select, a, .picker-overlay, .picker-modal, .controls-ribbon, .action-bar, .viewer-nav-row'));
};

const ViewerScreen = () => {
  const navigate = useNavigate();
  const songs = useAppStore((s) => s.songs);
  const currentSongId = useAppStore((s) => s.currentSongId);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const currentSetlistId = useAppStore((s) => s.currentSetlistId);
  const setlists = useAppStore((s) => s.setlists);
  const setSetlists = useAppStore((s) => s.setSetlists);
  const userEmail = useAppStore((s) => s.userEmail);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  const supportsNativeFullscreen = !!document.documentElement.requestFullscreen
    || !!(document.documentElement as any).webkitRequestFullscreen;

  const toggleFullscreen = useCallback(() => {
    if (supportsNativeFullscreen) {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const el = viewerRef.current;
        if (el?.requestFullscreen) el.requestFullscreen();
        else if ((el as any)?.webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      }
    } else {
      // iOS / browsers without Fullscreen API: CSS-based fallback
      setIsFullscreen((prev) => !prev);
    }
  }, [supportsNativeFullscreen]);

  useEffect(() => {
    if (!supportsNativeFullscreen) return;
    const handler = () => setIsFullscreen(
      !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
    );
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [supportsNativeFullscreen]);

  // Prevent body scroll when in CSS-based fullscreen fallback
  useEffect(() => {
    if (!supportsNativeFullscreen && isFullscreen) {
      const scrollY = window.scrollY;
      const prevBodyOverflow = document.body.style.overflow;
      const prevBodyPosition = document.body.style.position;
      const prevBodyTop = document.body.style.top;
      const prevBodyLeft = document.body.style.left;
      const prevBodyRight = document.body.style.right;
      const prevBodyWidth = document.body.style.width;

      document.documentElement.classList.add('fullscreen-fallback-lock');
      document.body.classList.add('fullscreen-fallback-lock');
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';

      return () => {
        document.documentElement.classList.remove('fullscreen-fallback-lock');
        document.body.classList.remove('fullscreen-fallback-lock');
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.position = prevBodyPosition;
        document.body.style.top = prevBodyTop;
        document.body.style.left = prevBodyLeft;
        document.body.style.right = prevBodyRight;
        document.body.style.width = prevBodyWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isFullscreen, supportsNativeFullscreen]);

  // Notify SongChordViewer when CSS fallback state changes
  useEffect(() => {
    if (!supportsNativeFullscreen) {
      window.dispatchEvent(new CustomEvent('fullscreen-fallback-changed'));
    }
  }, [isFullscreen, supportsNativeFullscreen]);

  // Listen for toggle requests from SongChordViewer's action-bar button
  useEffect(() => {
    if (supportsNativeFullscreen) return;
    const handler = () => setIsFullscreen((prev) => !prev);
    window.addEventListener('toggle-fullscreen-fallback', handler);
    return () => window.removeEventListener('toggle-fullscreen-fallback', handler);
  }, [supportsNativeFullscreen]);

  // Allow Escape key to exit CSS-based fullscreen fallback
  useEffect(() => {
    if (supportsNativeFullscreen || !isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen, supportsNativeFullscreen]);

  const song = songs.find((s) => s.id === currentSongId);
  const setlist = setlists.find((sl) => sl.id === currentSetlistId);
  const setlistSongIds = setlist?.songIds ?? [];
  const currentIndex = setlistSongIds.indexOf(currentSongId ?? '');
  const totalInSetlist = setlistSongIds.length;

  const goPrev = () => {
    if (currentIndex > 0) setCurrentSongId(setlistSongIds[currentIndex - 1]);
  };
  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < totalInSetlist - 1)
      setCurrentSongId(setlistSongIds[currentIndex + 1]);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1 || pickerOpen || totalInSetlist <= 1) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      ignore: isSwipeIgnoredTarget(event.target),
    };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || start.ignore || pickerOpen || totalInSetlist <= 1 || event.changedTouches.length !== 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < SWIPE_MIN_DISTANCE || absY > SWIPE_MAX_VERTICAL_DRIFT || absX <= absY * 1.5) {
      return;
    }

    if (deltaX < 0) goNext();
    else goPrev();
  };

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
    setPickerOpen(false);
  };

  if (!song) {
    return (
      <div className="center-screen">
        <span className="empty-icon">🎵</span>
        <p className="empty-text">No song selected</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go to Songs</button>
      </div>
    );
  }

  return (
    <div
      className={`viewer-layout${isFullscreen ? ' fullscreen-active' : ''}${isFullscreen && !supportsNativeFullscreen ? ' fullscreen-fallback' : ''}`}
      ref={viewerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="viewer-header">
        <div className="viewer-header-top">
          <button className="back-btn" onClick={() => navigate('/')}>←</button>
          <div className="viewer-header-info">
            <div className="viewer-title">{song.title}</div>
            <div className="viewer-artist">{song.artist} · Key of {song.key}</div>
          </div>
          <button className="icon-btn" title="Add to setlist" onClick={() => setPickerOpen(true)}>📋+</button>
          <button className="icon-btn" onClick={() => navigate(`/edit-song/${song.id}`)}>✏️</button>
          <button
            className={`icon-btn fullscreen-btn${isFullscreen ? ' active' : ''}`}
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
        {setlist && (
          <div className="viewer-setlist-info">{setlist.name} ({currentIndex + 1}/{totalInSetlist})</div>
        )}
      </div>
      <SongChordViewer song={song} />
      {totalInSetlist > 1 && (
        <div className="viewer-nav-row">
          <button
            className="btn-primary"
            disabled={currentIndex <= 0}
            onClick={goPrev}
          >
            ← Prev
          </button>
          <span className="nav-counter">{currentIndex + 1} / {totalInSetlist}</span>
          <button
            className="btn-primary"
            disabled={currentIndex >= totalInSetlist - 1}
            onClick={goNext}
          >
            Next →
          </button>
        </div>
      )}

      {/* Setlist picker modal */}
      {pickerOpen && currentSongId && (
        <div className="picker-overlay" onClick={() => setPickerOpen(false)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>Add to Setlist</h3>
              <button className="picker-close" onClick={() => setPickerOpen(false)}>✕</button>
            </div>
            {setlists.length === 0 ? (
              <div className="picker-empty">
                <p>No setlists yet.</p>
                <button className="btn-primary small" onClick={() => { setPickerOpen(false); navigate('/setlists'); }}>
                  Create Setlist
                </button>
              </div>
            ) : (
              <div className="picker-list">
                {setlists.map((sl) => {
                  const alreadyAdded = sl.songIds.includes(currentSongId);
                  return (
                    <button
                      key={sl.id}
                      className={`picker-item${alreadyAdded ? ' picker-item-disabled' : ''}`}
                      onClick={() => !alreadyAdded && addSongToSetlist(currentSongId, sl.id)}
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

export default ViewerScreen;
