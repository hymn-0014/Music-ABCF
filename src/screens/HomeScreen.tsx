import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const BIBLE_LOGO_ASSET = '/assets/logos/bible-logo.png';
const MUSIC_LOGO_ASSET = '/assets/logos/music-ministry-logo.png';
const BIBLE_LOGO_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect x="10" y="5" width="40" height="50" rx="4" fill="%23234E2C" stroke="%234FC3F7" stroke-width="2"/><line x1="30" y1="15" x2="30" y2="45" stroke="%23E74C3C" stroke-width="3"/><line x1="20" y1="28" x2="40" y2="28" stroke="%23E74C3C" stroke-width="3"/><text x="30" y="55" text-anchor="middle" font-family="sans-serif" font-size="6" fill="%234FC3F7">ABCF</text></svg>')}`;
const MUSIC_LOGO_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50"><text x="10" y="35" font-family="sans-serif" font-size="24" font-weight="700" fill="%234FC3F7">♪</text><text x="36" y="35" font-family="sans-serif" font-size="20" font-weight="700" fill="%23FFFFFF">Music</text><text x="100" y="35" font-family="sans-serif" font-size="20" font-weight="700" fill="%234FC3F7">ABCF</text></svg>')}`;

const HomeScreen = ({ navigation }: any) => {
  const [bibleLogoFailed, setBibleLogoFailed] = useState(false);
  const [musicLogoFailed, setMusicLogoFailed] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoRow}>
          <Image
            source={{ uri: bibleLogoFailed ? BIBLE_LOGO_SVG : BIBLE_LOGO_ASSET }}
            style={styles.bibleLogo}
            alt="ABCF Bible Logo"
            onError={() => setBibleLogoFailed(true)}
          />
          <Image
            source={{ uri: musicLogoFailed ? MUSIC_LOGO_SVG : MUSIC_LOGO_ASSET }}
            style={styles.musicLogo}
            alt="Music ABCF"
            onError={() => setMusicLogoFailed(true)}
          />
        </View>
      </View>

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
  logoContainer: { marginBottom: 32, alignItems: 'center' },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  bibleLogo: { width: 60, height: 60, resizeMode: 'contain' },
  bibleFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bibleFallbackText: { color: '#4FC3F7', fontSize: 14, fontWeight: '700' },
  musicLogo: { width: 120, height: 45, resizeMode: 'contain' },
  musicFallbackText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 4, color: '#FFFFFF' },
  subtitle: { fontSize: 16, marginBottom: 32, opacity: 0.7, color: '#FFFFFF' },
  btn: {
    backgroundColor: '#4FC3F7', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 32, marginVertical: 8, width: '80%', alignItems: 'center',
  },
  btnText: { color: '#121212', fontSize: 18, fontWeight: '600' },
});

export default HomeScreen;