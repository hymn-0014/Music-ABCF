import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import useAppStore from '../store/useAppStore';
import { parseChordsFromText, fetchChordsFromUrl } from '../services/chordExtractor';

const AddSongScreen = ({ navigation }: any) => {
  const songs = useAppStore((s) => s.songs);
  const setSongs = useAppStore((s) => s.setSongs);
  const pushToCloud = useAppStore((s) => s.pushToCloud);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [chordText, setChordText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddFromText = () => {
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) {
      Alert.alert('Error', 'Could not parse any chords from the text. Paste alternating chord/lyric lines.');
      return;
    }
    const newSong = { ...result, id: `song-${Date.now()}`, title: title || result.title, artist: artist || result.artist };
    setSongs([...songs, newSong]);
    pushToCloud();
    Alert.alert('Success', `"${newSong.title}" added!`);
    navigation.goBack();
  };

  const handleFetchFromUrl = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Enter a URL to a chord sheet page.');
      return;
    }
    setLoading(true);
    try {
      const result = await fetchChordsFromUrl(url.trim());
      if (!result || result.lines.length === 0) {
        Alert.alert('Error', 'Could not extract chords from that URL. Try pasting the chord text directly.');
        return;
      }
      const newSong = { ...result, id: `song-${Date.now()}`, title: title || result.title, artist: artist || result.artist };
      setSongs([...songs, newSong]);
      pushToCloud();
      Alert.alert('Success', `"${newSong.title}" added!`);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to fetch from URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Add Song</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} placeholder="Song title" placeholderTextColor="#888" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Artist</Text>
      <TextInput style={styles.input} placeholder="Artist name" placeholderTextColor="#888" value={artist} onChangeText={setArtist} />

      <Text style={styles.sectionTitle}>Option 1: Paste Chord Sheet</Text>
      <TextInput
        style={styles.textArea}
        placeholder={'Paste chords & lyrics here…\n\nG        G7       C        G\nAmazing grace how sweet the sound'}
        placeholderTextColor="#888"
        multiline
        value={chordText}
        onChangeText={setChordText}
      />
      <TouchableOpacity style={styles.btn} onPress={handleAddFromText}>
        <Text style={styles.btnText}>Add from Text</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Option 2: Import from URL</Text>
      <TextInput style={styles.input} placeholder="https://example.com/chords/song" placeholderTextColor="#888" autoCapitalize="none" value={url} onChangeText={setUrl} />
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#66BB6A' }]} onPress={handleFetchFromUrl} disabled={loading}>
        {loading ? <ActivityIndicator color="#121212" /> : <Text style={styles.btnText}>Fetch from URL</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#FFFFFF' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8, color: '#FFFFFF' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 8, color: '#FFFFFF' },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8, color: '#FFFFFF', backgroundColor: '#1E1E1E' },
  textArea: { borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 140, textAlignVertical: 'top', marginBottom: 8, color: '#FFFFFF', backgroundColor: '#1E1E1E' },
  btn: { backgroundColor: '#4FC3F7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#121212', fontSize: 16, fontWeight: '600' },
});

export default AddSongScreen;
