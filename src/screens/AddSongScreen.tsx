import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import useAppStore from '../store/useAppStore';
import { parseChordsFromText, fetchChordsFromUrl } from '../services/chordExtractor';

const AddSongScreen = ({ navigation }: any) => {
  const darkMode = useAppStore((s) => s.darkMode);
  const songs = useAppStore((s) => s.songs);
  const setSongs = useAppStore((s) => s.setSongs);
  const pushToCloud = useAppStore((s) => s.pushToCloud);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [chordText, setChordText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const bg = darkMode ? '#1a1a1a' : '#fff';
  const text = darkMode ? '#eee' : '#000';
  const border = darkMode ? '#555' : '#ccc';

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
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: text }]}>Add Song</Text>

      <Text style={[styles.label, { color: text }]}>Title</Text>
      <TextInput style={[styles.input, { color: text, borderColor: border }]} placeholder="Song title" placeholderTextColor="#999" value={title} onChangeText={setTitle} />

      <Text style={[styles.label, { color: text }]}>Artist</Text>
      <TextInput style={[styles.input, { color: text, borderColor: border }]} placeholder="Artist name" placeholderTextColor="#999" value={artist} onChangeText={setArtist} />

      <Text style={[styles.sectionTitle, { color: text }]}>Option 1: Paste Chord Sheet</Text>
      <TextInput
        style={[styles.textArea, { color: text, borderColor: border }]}
        placeholder={'Paste chords & lyrics here…\n\nG        G7       C        G\nAmazing grace how sweet the sound'}
        placeholderTextColor="#999"
        multiline
        value={chordText}
        onChangeText={setChordText}
      />
      <TouchableOpacity style={styles.btn} onPress={handleAddFromText}>
        <Text style={styles.btnText}>Add from Text</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: text }]}>Option 2: Import from URL</Text>
      <TextInput style={[styles.input, { color: text, borderColor: border }]} placeholder="https://example.com/chords/song" placeholderTextColor="#999" autoCapitalize="none" value={url} onChangeText={setUrl} />
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#34C759' }]} onPress={handleFetchFromUrl} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Fetch from URL</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8 },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 140, textAlignVertical: 'top', marginBottom: 8 },
  btn: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default AddSongScreen;
