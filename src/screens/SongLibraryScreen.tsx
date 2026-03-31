import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';

const SongLibraryScreen = ({ navigation }: any) => {
  const songs = useAppStore((s) => s.songs);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const setCurrentSetlistId = useAppStore((s) => s.setCurrentSetlistId);
  const [search, setSearch] = useState('');

  const filtered = songs.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search songs or artists…"
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyText}>No songs yet</Text>
            <Text style={styles.emptyHint}>Tap the button below to add your first song</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
              setCurrentSongId(item.id);
              setCurrentSetlistId(null);
              navigation.navigate('Viewer');
            }}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.songTitle}>{item.title}</Text>
              <Text style={styles.songArtist}>{item.artist}</Text>
            </View>
            <View style={styles.keyBadge}>
              <Text style={styles.keyText}>{item.key}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddSong')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: {
    borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 12,
    fontSize: 16, color: '#FFFFFF', backgroundColor: '#1E1E1E',
  },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  card: {
    backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  cardLeft: { flex: 1 },
  songTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 3 },
  songArtist: { fontSize: 14, color: '#AAA' },
  keyBadge: {
    backgroundColor: '#4FC3F7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    marginLeft: 12,
  },
  keyText: { color: '#121212', fontSize: 14, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 4 },
  emptyHint: { fontSize: 14, color: '#888' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#4FC3F7',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4FC3F7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: '#121212', fontSize: 28, fontWeight: '600', marginTop: -2 },
});

export default SongLibraryScreen;