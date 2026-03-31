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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const addSetlist = () => {
    if (!newName.trim()) return;
    const id = `sl-${Date.now()}`;
    setSetlists([...setlists, { id, name: newName.trim(), songIds: [], createdAt: new Date().toISOString() }]);
    setNewName('');
  };

  const editing = setlists.find((sl) => sl.id === editingId);

  if (editing) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setEditingId(null)}>
          <Text style={styles.back}>← Back to setlists</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>{editing.name}</Text>
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
    <View style={styles.container}>
      <Text style={styles.heading}>My Setlists</Text>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New setlist name…"
          placeholderTextColor="#888"
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
            <Text style={styles.slName}>{item.name}</Text>
            <Text style={{ color: '#AAA' }}>{item.songIds.length} songs</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#121212' },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#FFFFFF' },
  back: { fontSize: 16, marginBottom: 8, color: '#4FC3F7' },
  addRow: { flexDirection: 'row', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, fontSize: 16, color: '#FFFFFF', backgroundColor: '#1E1E1E' },
  addBtn: { backgroundColor: '#4FC3F7', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', marginLeft: 8 },
  addBtnText: { color: '#121212', fontWeight: '600' },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#333' },
  slName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  playBtn: { backgroundColor: '#4FC3F7', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  playText: { color: '#121212', fontSize: 18, fontWeight: 'bold' },
});

export default SetlistScreen;