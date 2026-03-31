import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import useAppStore from '../store/useAppStore';
import { parseChordsFromText, fetchChordsFromUrl } from '../services/chordExtractor';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

const AddSongScreen = ({ navigation }: any) => {
  const songs = useAppStore((s) => s.songs);
  const setSongs = useAppStore((s) => s.setSongs);
  const pushToCloud = useAppStore((s) => s.pushToCloud);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [tempo, setTempo] = useState('90');
  const [chordText, setChordText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('text');

  const parsedTempo = Math.min(240, Math.max(40, Number.parseInt(tempo, 10) || 90));

  const handleAddFromText = () => {
    if (!chordText.trim()) {
      setStatus('Paste some chord/lyric text first.');
      return;
    }
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) {
      setStatus('Could not parse chords. Use alternating chord/lyric lines:\n\nG   C   G\nAmazing grace how sweet');
      return;
    }
    const newSong = {
      ...result,
      id: `song-${Date.now()}`,
      title: title || result.title,
      artist: artist || result.artist,
      tempo: parsedTempo,
    };
    setSongs([...songs, newSong]);
    pushToCloud();
    showAlert('Success', `"${newSong.title}" added!`);
    navigation.goBack();
  };

  const handleFetchFromUrl = async () => {
    if (!url.trim()) {
      setStatus('Enter a URL to a chord page.');
      return;
    }
    setLoading(true);
    setStatus('Fetching chords from URL…');
    try {
      const result = await fetchChordsFromUrl(url.trim());
      if (!result || result.lines.length === 0) {
        setStatus('Could not extract chords from that URL.\n\nTry copying the chord text from the page and using the Paste tab instead.');
        return;
      }
      const newSong = {
        ...result,
        id: `song-${Date.now()}`,
        title: title || result.title,
        artist: artist || result.artist,
        tempo: parsedTempo,
      };
      setSongs([...songs, newSong]);
      pushToCloud();
      showAlert('Success', `"${newSong.title}" added!`);
      navigation.goBack();
    } catch {
      setStatus('Failed to fetch URL. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.metaRow}>
        <View style={styles.metaField}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} placeholder="Song title" placeholderTextColor="#666" value={title} onChangeText={setTitle} />
        </View>
        <View style={styles.metaField}>
          <Text style={styles.label}>Artist</Text>
          <TextInput style={styles.input} placeholder="Artist name" placeholderTextColor="#666" value={artist} onChangeText={setArtist} />
        </View>
      </View>

      <View style={styles.tempoRow}>
        <View style={styles.tempoField}>
          <Text style={styles.label}>Tempo</Text>
          <TextInput
            style={styles.input}
            placeholder="90"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={tempo}
            onChangeText={setTempo}
          />
        </View>
        <View style={styles.tempoHintWrap}>
          <Text style={styles.tempoHint}>{parsedTempo} BPM</Text>
          <Text style={styles.tempoSubhint}>Saved with the song</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'text' && styles.tabActive]}
          onPress={() => { setActiveTab('text'); setStatus(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'text' && styles.tabTextActive]}>Paste Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'url' && styles.tabActive]}
          onPress={() => { setActiveTab('url'); setStatus(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>From URL</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'text' ? (
        <View>
          <TextInput
            style={styles.textArea}
            placeholder={'Paste chord sheet here…\n\nExample:\nG        G7       C        G\nAmazing grace how sweet the sound\nG        Em       A7       D\nThat saved a wretch like me'}
            placeholderTextColor="#555"
            multiline
            value={chordText}
            onChangeText={(t) => { setChordText(t); setStatus(''); }}
          />
          <TouchableOpacity style={styles.btn} onPress={handleAddFromText}>
            <Text style={styles.btnText}>Add Song</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={styles.hint}>Paste a link to a chord sheet page (e.g. Ultimate Guitar, Chordie, etc.)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://…"
            placeholderTextColor="#666"
            autoCapitalize="none"
            value={url}
            onChangeText={(t) => { setUrl(t); setStatus(''); }}
          />
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#66BB6A' }]} onPress={handleFetchFromUrl} disabled={loading}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#121212" size="small" />
                <Text style={[styles.btnText, { marginLeft: 8 }]}>Fetching…</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>Import from URL</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {status ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20, paddingBottom: 40 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metaField: { flex: 1 },
  tempoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 20 },
  tempoField: { flex: 1 },
  tempoHintWrap: { paddingBottom: 12 },
  tempoHint: { color: '#4FC3F7', fontSize: 16, fontWeight: '700' },
  tempoSubhint: { color: '#888', fontSize: 12, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 12,
    fontSize: 16, color: '#FFFFFF', backgroundColor: '#1E1E1E',
  },
  tabRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#1E1E1E', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#4FC3F7' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#121212' },
  textArea: {
    borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14,
    fontSize: 15, minHeight: 200, textAlignVertical: 'top', color: '#FFFFFF',
    backgroundColor: '#1E1E1E', fontFamily: 'monospace', lineHeight: 22,
  },
  hint: { fontSize: 13, color: '#888', marginBottom: 10, lineHeight: 18 },
  btn: {
    backgroundColor: '#4FC3F7', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 14,
  },
  btnText: { color: '#121212', fontSize: 17, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  statusBox: {
    marginTop: 16, backgroundColor: '#2A2A2A', borderRadius: 10,
    padding: 14, borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  statusText: { color: '#FFB74D', fontSize: 14, lineHeight: 20 },
});

export default AddSongScreen;
