import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';
import { signOut } from '../services/authService';

const SettingsScreen = () => {
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const accidental = useAppStore((s) => s.accidental);
  const setAccidental = useAppStore((s) => s.setAccidental);
  const pushToCloud = useAppStore((s) => s.pushToCloud);
  const pullFromCloud = useAppStore((s) => s.pullFromCloud);
  const [syncing, setSyncing] = useState(false);

  const bg = darkMode ? '#1a1a1a' : '#fff';
  const text = darkMode ? '#eee' : '#000';

  const handleSync = async (direction: 'push' | 'pull') => {
    setSyncing(true);
    try {
      if (direction === 'push') await pushToCloud();
      else await pullFromCloud();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>  
      <Text style={[styles.heading, { color: text }]}>Settings</Text>

      <View style={styles.row}>
        <Text style={[styles.label, { color: text }]}>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={toggleDarkMode} />
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: text }]}>Prefer Sharps</Text>
        <Switch
          value={accidental === 'sharp'}
          onValueChange={(v) => setAccidental(v ? 'sharp' : 'flat')}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: text }]}>Cloud Sync</Text>

      <View style={styles.syncRow}>
        <TouchableOpacity style={styles.syncBtn} onPress={() => handleSync('push')} disabled={syncing}>
          {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.syncText}>Upload to Cloud</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.syncBtn, { backgroundColor: '#34C759' }]} onPress={() => handleSync('pull')} disabled={syncing}>
          {syncing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.syncText}>Download from Cloud</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#ddd' },
  label: { fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 28, marginBottom: 12 },
  syncRow: { flexDirection: 'row', gap: 12 },
  syncBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  syncText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  signOutBtn: { marginTop: 32, backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SettingsScreen;