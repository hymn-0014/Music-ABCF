import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';
import SetlistManager from '../components/SetlistManager';

const SetlistScreen = ({ navigation }: any) => {
  const songs = useAppStore((s) => s.songs);
  const setlists = useAppStore((s) => s.setlists);
  const setSetlists = useAppStore((s) => s.setSetlists);
  const setCurrentSetlistId = useAppStore((s) => s.setCurrentSetlistId);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const darkMode = useAppStore((s) => s.darkMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const bg = darkMode ? '#1a1a1a' : '#fff';
  const text = darkMode ? '#eee' : '#000';

  const addSetlist = () => {
    if (!newName.trim()) return;
    const id = `sl-${Date.now()}`;
    setSetlists([...setlists, { id, name: newName.trim(), songIds: [], createdAt: new Date().toISOString() }]);
    setNewName('');
  };

  const editing = setlists.find((sl) => sl.id === editingId);

  if (editing) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>  
        <TouchableOpacity onPress={() => setEditingId(null)}>
          <Text style={[styles.back, { color: '#007AFF' }]}>← Back to setlists</Text>
        </TouchableOpacity>
        <Text style={[styles.heading, { color: text }]}>{editing.name}</Text>
        <SetlistManager
          availableSongs={songs}
          songIds={editing.songIds}
          onReorder={(ids) => {
            setSetlists(setlists.map((sl) => (sl.id === editing.id ? { ...sl, songIds: ids } : sl)));
          }}
        />
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => {
            if (editing.songIds.length > 0) {
              setCurrentSetlistId(editing.id);
              setCurrentSongId(editing.songIds[0]);
              navigation.navigate('Viewer');
            }
          }}
        >
          <Text style={styles.playText}>▶ Play Setlist</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>  
      <Text style={[styles.heading, { color: text }]}>My Setlists</Text>
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { color: text, borderColor: darkMode ? '#555' : '#ccc' }]}
          placeholder="New setlist name…"
          placeholderTextColor={darkMode ? '#888' : '#aaa'}
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addSetlist}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={setlists}
        keyExtractor={(sl) => sl.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setEditingId(item.id)}>
            <Text style={[styles.slName, { color: text }]}>{item.name}</Text>
            <Text style={{ color: darkMode ? '#aaa' : '#666' }}>{item.songIds.length} songs</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  back: { fontSize: 16, marginBottom: 8 },
  addRow: { flexDirection: 'row', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16 },
  addBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', marginLeft: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#ddd' },
  slName: { fontSize: 18, fontWeight: '600' },
  playBtn: { backgroundColor: '#34C759', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  playText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default SetlistScreen;