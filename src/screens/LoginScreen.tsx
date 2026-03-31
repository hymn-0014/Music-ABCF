import React, { useState } from 'react';
import {
  signIn,
  signInWithGoogle,
  signUp,
  getAuthErrorMessage,
} from '../services/authService';

const LOGO_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50"><text x="10" y="35" font-family="sans-serif" font-size="24" font-weight="700" fill="%234FC3F7">♪</text><text x="36" y="35" font-family="sans-serif" font-size="20" font-weight="700" fill="%23FFFFFF">Music</text><text x="100" y="35" font-family="sans-serif" font-size="20" font-weight="700" fill="%234FC3F7">ABCF</text></svg>')}`;

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
        <img src={LOGO_SVG} alt="Music ABCF" className="login-logo" />
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
