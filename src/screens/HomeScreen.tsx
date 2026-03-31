import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const HomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Music ABCF</Text>
      <Text style={styles.subtitle}>Chords · Lyrics · Setlists</Text>

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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#121212' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 4, color: '#FFFFFF' },
  subtitle: { fontSize: 16, marginBottom: 32, opacity: 0.7, color: '#FFFFFF' },
  btn: {
    backgroundColor: '#4FC3F7', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 32, marginVertical: 8, width: '80%', alignItems: 'center',
  },
  btnText: { color: '#121212', fontSize: 18, fontWeight: '600' },
});

export default HomeScreen;