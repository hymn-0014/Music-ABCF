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

  const deleteSetlist = (id: string) => {
    setSetlists(setlists.filter((sl) => sl.id !== id));
  };

  const editing = setlists.find((sl) => sl.id === editingId);

  if (editing) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setEditingId(null)}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.editTitle}>{editing.name}</Text>
        <Text style={styles.editSubtitle}>{editing.songIds.length} songs in setlist</Text>
        <SetlistManager
          availableSongs={songs}
          songIds={editing.songIds}
          onReorder={(ids) => {
            setSetlists(setlists.map((sl) => (sl.id === editing.id ? { ...sl, songIds: ids } : sl)));
          }}
        />
        {editing.songIds.length > 0 && (
          <TouchableOpacity
            style={styles.playBtn}
            activeOpacity={0.8}
            onPress={() => {
              setCurrentSetlistId(editing.id);
              setCurrentSongId(editing.songIds[0]);
              navigation.navigate('Viewer');
            }}
          >
            <Text style={styles.playText}>▶  Play Setlist</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New setlist name…"
          placeholderTextColor="#666"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={addSetlist}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addSetlist}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={setlists}
        keyExtractor={(sl) => sl.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No setlists yet</Text>
            <Text style={styles.emptyHint}>Create one above to organize your songs</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setEditingId(item.id)}>
            <View style={styles.cardLeft}>
              <Text style={styles.slName}>{item.name}</Text>
              <Text style={styles.slMeta}>{item.songIds.length} {item.songIds.length === 1 ? 'song' : 'songs'}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteSetlist(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  addRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 12,
    fontSize: 16, color: '#FFFFFF', backgroundColor: '#1E1E1E',
  },
  addBtn: {
    backgroundColor: '#4FC3F7', borderRadius: 12, width: 48, marginLeft: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#121212', fontSize: 24, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  card: {
    backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  cardLeft: { flex: 1 },
  slName: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 3 },
  slMeta: { fontSize: 14, color: '#AAA' },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 16, color: '#FF5252' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  emptyHint: { fontSize: 14, color: '#888' },
  backBtn: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 16, color: '#4FC3F7', fontWeight: '600' },
  editTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', paddingHorizontal: 16 },
  editSubtitle: { fontSize: 14, color: '#AAA', paddingHorizontal: 16, marginBottom: 8 },
  playBtn: {
    backgroundColor: '#4FC3F7', borderRadius: 12, padding: 16, marginHorizontal: 16,
    marginBottom: 16, alignItems: 'center',
  },
  playText: { color: '#121212', fontSize: 18, fontWeight: 'bold' },
});

export default SetlistScreen;