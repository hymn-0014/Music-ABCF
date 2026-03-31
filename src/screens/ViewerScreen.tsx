import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  const goPrev = () => {
    if (currentIndex > 0) setCurrentSongId(setlistSongIds[currentIndex - 1]);
  };
  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < setlistSongIds.length - 1)
      setCurrentSongId(setlistSongIds[currentIndex + 1]);
  };

  if (!song) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#FFFFFF' }}>No song selected.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{song.title}</Text>
      <Text style={styles.artist}>{song.artist} · Key of {song.key}</Text>
      <SongChordViewer song={song} />
      {setlistSongIds.length > 1 && (
        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.navBtn, currentIndex <= 0 && styles.disabled]} onPress={goPrev} disabled={currentIndex <= 0}>
            <Text style={styles.navText}>← Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, currentIndex >= setlistSongIds.length - 1 && styles.disabled]} onPress={goNext} disabled={currentIndex >= setlistSongIds.length - 1}>
            <Text style={styles.navText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  artist: { fontSize: 14, marginBottom: 8, color: '#AAA' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  navBtn: { backgroundColor: '#4FC3F7', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  navText: { color: '#121212', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});

export default ViewerScreen;
