import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
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
    <View style={styles.container}>
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
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#121212" />
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#121212' },
  logo: {
    width: 160,
    height: 54,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 12,
  },
  logoFallback: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, color: '#FFFFFF' },
  subtitle: { fontSize: 18, textAlign: 'center', marginBottom: 24, color: '#999' },
  error: { color: '#FF6B6B', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#333', borderRadius: 8,
    padding: 14, fontSize: 16, marginBottom: 12, color: '#FFFFFF', backgroundColor: '#1E1E1E',
  },
  btn: {
    backgroundColor: '#4FC3F7', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#121212', fontSize: 18, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#888',
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
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: { color: '#4FC3F7', textAlign: 'center', marginTop: 20, fontSize: 14 },
});

export default LoginScreen;
