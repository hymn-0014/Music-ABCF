import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
      <Text style={styles.title}>Music ABCF</Text>
      <Text style={styles.subtitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
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
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 18, textAlign: 'center', marginBottom: 24, color: '#666' },
  error: { color: '#d32f2f', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 14, fontSize: 16, marginBottom: 12,
  },
  btn: {
    backgroundColor: '#007AFF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d9d9d9',
  },
  dividerText: {
    color: '#666',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d6d6d6',
  },
  googleBtnText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: { color: '#007AFF', textAlign: 'center', marginTop: 20, fontSize: 14 },
});

export default LoginScreen;
