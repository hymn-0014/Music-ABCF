import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';

const SongLibraryScreen = ({ navigation }: any) => {
  const songs = useAppStore((s) => s.songs);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const [search, setSearch] = useState('');

  const filtered = songs.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search songs…"
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddSong')}>
        <Text style={styles.addBtnText}>+ Add Song</Text>
      </TouchableOpacity>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              setCurrentSongId(item.id);
              navigation.navigate('Viewer');
            }}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.artist}>{item.artist} · Key of {item.key}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#121212' },
  search: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 16, color: '#FFFFFF', backgroundColor: '#1E1E1E' },
  addBtn: { backgroundColor: '#4FC3F7', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: '#121212', fontSize: 16, fontWeight: '600' },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#333' },
  title: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  artist: { fontSize: 14, marginTop: 2, color: '#AAA' },
});

export default SongLibraryScreen;