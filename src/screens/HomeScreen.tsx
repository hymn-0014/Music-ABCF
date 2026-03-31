import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';

const HomeScreen = ({ navigation }: any) => {
  const darkMode = useAppStore((s) => s.darkMode);
  const bg = darkMode ? '#1a1a1a' : '#fff';
  const text = darkMode ? '#eee' : '#000';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>  
      <Text style={[styles.title, { color: text }]}>Music ABCF</Text>
      <Text style={[styles.subtitle, { color: text }]}>Chords · Lyrics · Setlists</Text>

      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('SongLibrary')}>
        <Text style={styles.btnText}>Song Library</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Setlists')}>
        <Text style={styles.btnText}>Setlists</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.btnText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 32, opacity: 0.7 },
  btn: {
    backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 32, marginVertical: 8, width: '80%', alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default HomeScreen;