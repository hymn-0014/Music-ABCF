import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.heading}>Setlist</Text>
      <FlatList
        data={songIds}
        keyExtractor={(id) => id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.songTitle}>{songMap.get(item)?.title ?? item}</Text>
            <TouchableOpacity onPress={() => moveItem(index, -1)}><Text style={styles.action}>▲</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => moveItem(index, 1)}><Text style={styles.action}>▼</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => removeSong(index)}><Text style={styles.remove}>✕</Text></TouchableOpacity>
          </View>
        )}
      />
      <Text style={styles.heading}>Add Songs</Text>
      <TextInput style={styles.input} placeholder="Filter songs…" value={filterText} onChangeText={setFilterText} />
      <FlatList
        data={filteredAvailable}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.addRow} onPress={() => addSong(item.id)}>
            <Text style={styles.songTitle}>{item.title}</Text>
            <Text style={styles.action}>＋</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', marginVertical: 8, color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#333' },
  addRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  songTitle: { flex: 1, fontSize: 16, color: '#FFFFFF' },
  action: { fontSize: 20, paddingHorizontal: 8, color: '#4FC3F7' },
  remove: { fontSize: 18, paddingHorizontal: 8, color: '#FF5252' },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 8, marginBottom: 8, color: '#FFFFFF', backgroundColor: '#1E1E1E' },
});

export default SetlistManager;