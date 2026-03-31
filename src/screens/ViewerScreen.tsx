import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import useAppStore from '../store/useAppStore';
import SongChordViewer from '../components/SongChordViewer';

const ViewerScreen = ({ navigation }: any) => {
  const songs = useAppStore((s) => s.songs);
  const currentSongId = useAppStore((s) => s.currentSongId);
  const setCurrentSongId = useAppStore((s) => s.setCurrentSongId);
  const currentSetlistId = useAppStore((s) => s.currentSetlistId);
  const setlists = useAppStore((s) => s.setlists);

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

  if (!song) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🎵</Text>
        <Text style={styles.emptyText}>No song selected</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>Go to Songs</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
            <Text style={styles.artist}>{song.artist} · Key of {song.key}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditSong', { songId: song.id })}
          >
            <Text style={styles.editBtnText}>✏️</Text>
          </TouchableOpacity>
        </View>
        {setlist && (
          <Text style={styles.setlistInfo}>{setlist.name} ({currentIndex + 1}/{totalInSetlist})</Text>
        )}
      </View>
      <SongChordViewer song={song} />
      {totalInSetlist > 1 && (
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex <= 0 && styles.disabled]}
            onPress={goPrev}
            disabled={currentIndex <= 0}
          >
            <Text style={styles.navText}>← Prev</Text>
          </TouchableOpacity>
          <Text style={styles.navCounter}>{currentIndex + 1} / {totalInSetlist}</Text>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex >= totalInSetlist - 1 && styles.disabled]}
            onPress={goNext}
            disabled={currentIndex >= totalInSetlist - 1}
          >
            <Text style={styles.navText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    ...(Platform.OS === 'web' ? { height: '100vh' as any, overflow: 'hidden' as any } : {}),
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 16 },
  goBackBtn: { backgroundColor: '#4FC3F7', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  goBackText: { color: '#121212', fontSize: 16, fontWeight: '600' },
  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backBtnText: { color: '#4FC3F7', fontSize: 22, fontWeight: 'bold' },
  editBtn: { padding: 8, marginLeft: 8 },
  editBtnText: { fontSize: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  artist: { fontSize: 14, color: '#AAA', marginTop: 2 },
  setlistInfo: { fontSize: 12, color: '#4FC3F7', marginTop: 4 },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
  },
  navBtn: { backgroundColor: '#4FC3F7', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  navText: { color: '#121212', fontSize: 15, fontWeight: '600' },
  navCounter: { color: '#AAA', fontSize: 14 },
  disabled: { opacity: 0.3 },
});

export default ViewerScreen;
