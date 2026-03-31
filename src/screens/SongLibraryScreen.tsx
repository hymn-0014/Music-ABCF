import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';

const SongLibraryScreen = ({ navigation }: any) => {
  const songs = useAppStore((s) => s.songs);
  const darkMode = useAppStore((s) => s.darkMode);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const [search, setSearch] = useState('');

  const filtered = songs.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
  const bg = darkMode ? '#1a1a1a' : '#fff';
  const text = darkMode ? '#eee' : '#000';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>  
      <TextInput
        style={[styles.search, { color: text, borderColor: darkMode ? '#555' : '#ccc' }]}
        placeholder="Search songs…"
        placeholderTextColor={darkMode ? '#888' : '#aaa'}
        value={search}
        onChangeText={setSearch}
      />
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
            <Text style={[styles.title, { color: text }]}>{item.title}</Text>
            <Text style={[styles.artist, { color: darkMode ? '#aaa' : '#666' }]}>{item.artist} · Key of {item.key}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#ddd' },
  title: { fontSize: 18, fontWeight: '600' },
  artist: { fontSize: 14, marginTop: 2 },
});

export default SongLibraryScreen;