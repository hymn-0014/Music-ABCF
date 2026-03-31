import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Platform } from 'react-native';
import useAppStore from '../store/useAppStore';
import { signOut } from '../services/authService';
import { SyncConfirmFn, SyncResult } from '../types';

const webConfirm: SyncConfirmFn = async (title: string, message: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise((resolve) => {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Skip', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Overwrite', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
};

const formatSyncResult = (result: SyncResult, direction: 'push' | 'pull'): string => {
  const parts: string[] = [];
  if (direction === 'push') {
    if (result.songsUploaded > 0) parts.push(`${result.songsUploaded} song(s) uploaded`);
    if (result.setlistsUploaded > 0) parts.push(`${result.setlistsUploaded} setlist(s) uploaded`);
  } else {
    if (result.songsDownloaded > 0) parts.push(`${result.songsDownloaded} song(s) downloaded`);
    if (result.setlistsDownloaded > 0) parts.push(`${result.setlistsDownloaded} setlist(s) downloaded`);
  }
  if (result.overwritten > 0) parts.push(`${result.overwritten} overwritten`);
  if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
  if (parts.length === 0) return '✓ Everything is already in sync';
  return '✓ ' + parts.join(', ');
};

const SettingsScreen = () => {
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const accidental = useAppStore((s) => s.accidental);
  const setAccidental = useAppStore((s) => s.setAccidental);
  const smartPushToCloud = useAppStore((s) => s.smartPushToCloud);
  const smartPullFromCloud = useAppStore((s) => s.smartPullFromCloud);
  const songs = useAppStore((s) => s.songs);
  const setlists = useAppStore((s) => s.setlists);
  const [syncing, setSyncing] = useState<'push' | 'pull' | null>(null);
  const [syncMsg, setSyncMsg] = useState('');

  const handleSync = async (direction: 'push' | 'pull') => {
    setSyncing(direction);
    setSyncMsg('');
    try {
      if (direction === 'push') {
        const result = await smartPushToCloud(webConfirm);
        setSyncMsg(formatSyncResult(result, 'push'));
      } else {
        const result = await smartPullFromCloud(webConfirm);
        setSyncMsg(formatSyncResult(result, 'pull'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSyncMsg(`✗ Sync failed: ${msg}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🌙</Text>
              <Text style={styles.label}>Dark Mode</Text>
            </View>
            <Switch value={darkMode} onValueChange={toggleDarkMode} trackColor={{ false: '#555', true: '#4FC3F7' }} thumbColor="#fff" />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>♯</Text>
              <Text style={styles.label}>Prefer Sharps</Text>
            </View>
            <Switch
              value={accidental === 'sharp'}
              onValueChange={(v) => setAccidental(v ? 'sharp' : 'flat')}
              trackColor={{ false: '#555', true: '#4FC3F7' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Sync</Text>
        <Text style={styles.syncInfo}>
          Local: {songs.length} song(s), {setlists.length} setlist(s)
        </Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.syncRow} onPress={() => handleSync('push')} disabled={syncing !== null}>
            <Text style={styles.rowIcon}>☁️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Upload to Cloud</Text>
              <Text style={styles.syncHint}>Uploads local songs & setlists not in cloud</Text>
            </View>
            {syncing === 'push' ? <ActivityIndicator color="#4FC3F7" size="small" /> : <Text style={styles.arrow}>→</Text>}
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.syncRow} onPress={() => handleSync('pull')} disabled={syncing !== null}>
            <Text style={styles.rowIcon}>📥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Download from Cloud</Text>
              <Text style={styles.syncHint}>Downloads cloud songs & setlists not on device</Text>
            </View>
            {syncing === 'pull' ? <ActivityIndicator color="#4FC3F7" size="small" /> : <Text style={styles.arrow}>→</Text>}
          </TouchableOpacity>
        </View>
        {syncMsg !== '' && (
          <Text style={[styles.syncMsg, syncMsg.startsWith('✗') && { color: '#FF5252' }]}>{syncMsg}</Text>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { fontSize: 18, marginRight: 12, width: 24, textAlign: 'center' },
  label: { fontSize: 16, color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#2A2A2A', marginLeft: 52 },
  syncRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  syncInfo: { fontSize: 13, color: '#4FC3F7', marginBottom: 8, marginLeft: 4 },
  syncHint: { fontSize: 12, color: '#666', marginTop: 2 },
  arrow: { marginLeft: 'auto', color: '#555', fontSize: 18 },
  syncMsg: { fontSize: 13, color: '#4FC3F7', marginTop: 8, marginLeft: 4 },
  signOutBtn: { backgroundColor: '#FF5252', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SettingsScreen;