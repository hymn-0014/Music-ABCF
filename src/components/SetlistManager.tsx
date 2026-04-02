import React, { useState, useCallback, useRef } from 'react';
import { Song } from '../types';

interface SetlistManagerProps {
  availableSongs: Song[];
  songIds: string[];
  onReorder: (songIds: string[]) => void;
}

const SetlistManager: React.FC<SetlistManagerProps> = ({ availableSongs, songIds, onReorder }) => {
  const [filterText, setFilterText] = useState('');
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const removeSong = useCallback(
    (index: number) => {
      const next = songIds.filter((_, i) => i !== index);
      onReorder(next);
    },
    [songIds, onReorder],
  );

  const addSong = useCallback(
    (id: string) => {
      if (!songIds.includes(id)) onReorder([...songIds, id]);
    },
    [songIds, onReorder],
  );

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === toIndex) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const next = [...songIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorder(next);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  // Touch drag support
  const touchIndexRef = useRef<number | null>(null);
  const touchCurrentRef = useRef<number | null>(null);

  const handleTouchStart = (index: number) => {
    touchIndexRef.current = index;
    touchCurrentRef.current = index;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const row = element.closest('[data-drag-index]') as HTMLElement | null;
      if (row) {
        const idx = parseInt(row.dataset.dragIndex ?? '', 10);
        if (!isNaN(idx)) {
          touchCurrentRef.current = idx;
          setDragOverIndex(idx);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    const fromIndex = touchIndexRef.current;
    const toIndex = touchCurrentRef.current;
    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      const next = [...songIds];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder(next);
    }
    touchIndexRef.current = null;
    touchCurrentRef.current = null;
    setDragOverIndex(null);
  };

  const songMap = new Map(availableSongs.map((s) => [s.id, s]));
  const filteredAvailable = availableSongs.filter(
    (s) => !songIds.includes(s.id) && s.title.toLowerCase().includes(filterText.toLowerCase()),
  );

  return (
    <div className="setlist-manager">
      <h3 className="setlist-heading">Setlist</h3>
      <div className="setlist-items">
        {songIds.map((id, index) => (
          <div
            key={id}
            className={`setlist-row${dragOverIndex === index ? ' setlist-row-dragover' : ''}`}
            data-drag-index={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={() => handleTouchStart(index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <span className="setlist-drag-handle" title="Drag to reorder">☰</span>
            <span className="setlist-song-title">{songMap.get(id)?.title ?? id}</span>
            <button className="setlist-remove" onClick={() => removeSong(index)} title="Remove from setlist">🗑️</button>
          </div>
        ))}
      </div>
      <h3 className="setlist-heading">Add Songs</h3>
      <input
        className="setlist-filter"
        placeholder="Filter songs…"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
      />
      <div className="setlist-items">
        {filteredAvailable.map((song) => (
          <button key={song.id} className="setlist-add-row" onClick={() => addSong(song.id)}>
            <span className="setlist-song-title">{song.title}</span>
            <span className="setlist-action">＋</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SetlistManager;