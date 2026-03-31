import React, { useState, useCallback } from 'react';
import { Song } from '../types';

interface SetlistManagerProps {
  availableSongs: Song[];
  songIds: string[];
  onReorder: (songIds: string[]) => void;
}

const SetlistManager: React.FC<SetlistManagerProps> = ({ availableSongs, songIds, onReorder }) => {
  const [filterText, setFilterText] = useState('');

  const moveItem = useCallback(
    (fromIndex: number, direction: number) => {
      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= songIds.length) return;
      const next = [...songIds];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      onReorder(next);
    },
    [songIds, onReorder],
  );

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

  const songMap = new Map(availableSongs.map((s) => [s.id, s]));
  const filteredAvailable = availableSongs.filter(
    (s) => !songIds.includes(s.id) && s.title.toLowerCase().includes(filterText.toLowerCase()),
  );

  return (
    <div className="setlist-manager">
      <h3 className="setlist-heading">Setlist</h3>
      <div className="setlist-items">
        {songIds.map((id, index) => (
          <div key={id} className="setlist-row">
            <span className="setlist-song-title">{songMap.get(id)?.title ?? id}</span>
            <button className="setlist-action" onClick={() => moveItem(index, -1)}>▲</button>
            <button className="setlist-action" onClick={() => moveItem(index, 1)}>▼</button>
            <button className="setlist-remove" onClick={() => removeSong(index)}>✕</button>
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