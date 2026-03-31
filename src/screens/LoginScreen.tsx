import React, { useState } from 'react';
import {
  signIn,
  signInWithGoogle,
  signUp,
  getAuthErrorMessage,
} from '../services/authService';

const BASE = import.meta.env.BASE_URL;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logos">
          <img src={`${BASE}assets/logos/mt-logo.png`} alt="Music Ministry" className="login-logo-mt" />
          <img src={`${BASE}assets/logos/ABCF.png`} alt="ABCF" className="login-logo-abcf" />
        </div>
        <h1 className="login-title">Music ABCF</h1>
        <p className="login-subtitle">{isSignUp ? 'Create Account' : 'Sign In'}</p>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            className="login-input"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="login-input"
            placeholder="Password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="login-btn primary" disabled={loading}>
            {loading ? 'Please wait…' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {!isSignUp && (
          <>
            <div className="login-divider">
              <span className="login-divider-line" />
              <span className="login-divider-text">or continue with</span>
              <span className="login-divider-line" />
            </div>
            <button className="login-btn google" onClick={handleProviderSignIn} disabled={loading}>
              Continue with Google
            </button>
          </>
        )}

        <button
          className="login-toggle"
          onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
