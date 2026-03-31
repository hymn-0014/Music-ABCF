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
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={toggleDarkMode} trackColor={{ true: '#4FC3F7' }} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Prefer Sharps</Text>
        <Switch
          value={accidental === 'sharp'}
          onValueChange={(v) => setAccidental(v ? 'sharp' : 'flat')}
          trackColor={{ true: '#4FC3F7' }}
        />
      </View>

      <Text style={styles.sectionTitle}>Cloud Sync</Text>

      <View style={styles.syncRow}>
        <TouchableOpacity style={styles.syncBtn} onPress={() => handleSync('push')} disabled={syncing}>
          {syncing ? <ActivityIndicator color="#121212" size="small" /> : <Text style={styles.syncText}>Upload to Cloud</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.syncBtn, { backgroundColor: '#66BB6A' }]} onPress={() => handleSync('pull')} disabled={syncing}>
          {syncing ? <ActivityIndicator color="#121212" size="small" /> : <Text style={styles.syncText}>Download from Cloud</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#121212' },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#FFFFFF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#333' },
  label: { fontSize: 16, color: '#FFFFFF' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 28, marginBottom: 12, color: '#FFFFFF' },
  syncRow: { flexDirection: 'row', gap: 12 },
  syncBtn: { flex: 1, backgroundColor: '#4FC3F7', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  syncText: { color: '#121212', fontWeight: '600', fontSize: 14 },
  signOutBtn: { marginTop: 32, backgroundColor: '#FF5252', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SettingsScreen;