import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import useAppStore from '../store/useAppStore';
import { parseChordsFromText } from '../services/chordExtractor';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

const linesToText = (lines: { chords: string; lyrics: string }[]): string =>
  lines
    .map((line) =>
      line.chords && line.chords.trim()
        ? `${line.chords}\n${line.lyrics}`
        : line.lyrics,
    )
    .join('\n');

const EditSongScreen = ({ route, navigation }: any) => {
  const songId: string = route.params?.songId;
  const songs = useAppStore((s) => s.songs);
  const updateSong = useAppStore((s) => s.updateSong);
  const deleteSong = useAppStore((s) => s.deleteSong);
  const pushToCloud = useAppStore((s) => s.pushToCloud);

  const song = songs.find((s) => s.id === songId);

  const [title, setTitle] = useState(song?.title ?? '');
  const [artist, setArtist] = useState(song?.artist ?? '');
  const [tempo, setTempo] = useState(String(song?.tempo ?? 90));
  const [chordText, setChordText] = useState(song ? linesToText(song.lines) : '');
  const [status, setStatus] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);

  const parsedTempo = Math.min(240, Math.max(40, Number.parseInt(tempo, 10) || 90));

  if (!song) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Song not found</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSave = () => {
    if (!chordText.trim()) {
      setStatus('Chord text cannot be empty.');
      return;
    }
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) {
      setStatus('Could not parse chords. Use alternating chord/lyric lines.');
      return;
    }
    updateSong(songId, {
      title: title || song.title,
      artist: artist || song.artist,
      key: result.key || song.key,
      tempo: parsedTempo,
      lines: result.lines,
    });
    showAlert('Success', `"${title || song.title}" updated!`);
    navigation.goBack();
  };

  const handleSaveAndSync = async () => {
    if (!chordText.trim()) {
      setStatus('Chord text cannot be empty.');
      return;
    }
    const result = parseChordsFromText(chordText, title, artist);
    if (!result || result.lines.length === 0) {
      setStatus('Could not parse chords. Use alternating chord/lyric lines.');
      return;
    }
    updateSong(songId, {
      title: title || song.title,
      artist: artist || song.artist,
      key: result.key || song.key,
      tempo: parsedTempo,
      lines: result.lines,
    });
    setCloudSyncing(true);
    try {
      await pushToCloud();
      showAlert('Success', `"${title || song.title}" updated and synced to cloud!`);
    } catch {
      showAlert('Partial Success', `"${title || song.title}" updated locally but cloud sync failed.`);
    } finally {
      setCloudSyncing(false);
    }
    navigation.goBack();
  };

  const handleDelete = () => {
    showConfirm('Delete Song', `Are you sure you want to delete "${song.title}"?`, () => {
      deleteSong(songId);
      navigation.navigate('Main');
    });
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
        </View>
      </View>

      <TextInput
        style={styles.textArea}
        placeholder={'Chord sheet text…'}
        placeholderTextColor="#555"
        multiline
        value={chordText}
        onChangeText={(t) => { setChordText(t); setStatus(''); }}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveBtn, styles.cloudBtn]}
        onPress={handleSaveAndSync}
        disabled={cloudSyncing}
      >
        {cloudSyncing ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#121212" size="small" />
            <Text style={[styles.saveBtnText, { marginLeft: 8 }]}>Syncing…</Text>
          </View>
        ) : (
          <Text style={styles.saveBtnText}>☁️ Save & Update Cloud</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>Delete Song</Text>
      </TouchableOpacity>

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  emptyText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 16 },
  goBackBtn: { backgroundColor: '#4FC3F7', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  goBackText: { color: '#121212', fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metaField: { flex: 1 },
  tempoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 20 },
  tempoField: { flex: 1 },
  tempoHintWrap: { paddingBottom: 12 },
  tempoHint: { color: '#4FC3F7', fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 12,
    fontSize: 16, color: '#FFFFFF', backgroundColor: '#1E1E1E',
  },
  textArea: {
    borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14,
    fontSize: 15, minHeight: 200, textAlignVertical: 'top', color: '#FFFFFF',
    backgroundColor: '#1E1E1E', fontFamily: 'monospace', lineHeight: 22,
  },
  saveBtn: {
    backgroundColor: '#4FC3F7', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 14,
  },
  saveBtnText: { color: '#121212', fontSize: 17, fontWeight: '700' },
  cloudBtn: {
    backgroundColor: '#66BB6A',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: {
    backgroundColor: '#2A2A2A', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#FF5252',
  },
  deleteBtnText: { color: '#FF5252', fontSize: 17, fontWeight: '700' },
  statusBox: {
    marginTop: 16, backgroundColor: '#2A2A2A', borderRadius: 10,
    padding: 14, borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  statusText: { color: '#FFB74D', fontSize: 14, lineHeight: 20 },
});

export default EditSongScreen;
