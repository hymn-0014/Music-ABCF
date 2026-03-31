import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';

const SettingsScreen = () => {
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const accidental = useAppStore((s) => s.accidental);
  const setAccidental = useAppStore((s) => s.setAccidental);

  const bg = darkMode ? '#1a1a1a' : '#fff';
  const text = darkMode ? '#eee' : '#000';

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#ddd' },
  label: { fontSize: 16 },
});

export default SettingsScreen;