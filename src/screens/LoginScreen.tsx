import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import {
  signIn,
  signInWithGoogle,
  signUp,
  getAuthErrorMessage,
} from '../services/authService';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const LOGO_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50"><text x="10" y="35" font-family="sans-serif" font-size="24" font-weight="700" fill="%234FC3F7">♪</text><text x="36" y="35" font-family="sans-serif" font-size="20" font-weight="700" fill="%23FFFFFF">Music</text><text x="100" y="35" font-family="sans-serif" font-size="20" font-weight="700" fill="%234FC3F7">ABCF</text></svg>')}`;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.containerContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Image
          source={{ uri: LOGO_SVG }}
          style={styles.logo}
          alt="Music ABCF"
        />
        <Text style={styles.title}>Music ABCF</Text>
        <Text style={styles.subtitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8A93A7"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8A93A7"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0A0F1A" />
          ) : (
            <Text style={styles.btnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
          )}
        </TouchableOpacity>

        {!isSignUp ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.providerBtn, styles.googleBtn]}
              onPress={handleProviderSignIn}
              disabled={loading}
            >
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(''); }}>
          <Text style={styles.toggle}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B12' },
  containerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: 28,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#0E1422',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 18,
    padding: Platform.OS === 'web' ? 28 : 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  logo: {
    width: 180,
    height: 64,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 6, color: '#FFFFFF' },
  subtitle: { fontSize: 17, textAlign: 'center', marginBottom: 22, color: '#9AA7C7' },
  error: { color: '#FF7A7A', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#C0C8D8',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: '#0A0F1A',
    backgroundColor: '#FFFFFF',
  },
  btn: {
    backgroundColor: '#4FC3F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#09101F', fontSize: 18, fontWeight: '700' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2F3C57',
  },
  dividerText: {
    color: '#95A3C3',
    marginHorizontal: 12,
    fontSize: 13,
  },
  providerBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleBtn: {
    backgroundColor: '#121B2D',
    borderWidth: 1,
    borderColor: '#324563',
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: { color: '#4FC3F7', textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '600' },
});

export default LoginScreen;
