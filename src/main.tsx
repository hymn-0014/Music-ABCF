import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import useAppStore from './store/useAppStore';
import './index.css';

// Expose store for E2E tests
(window as unknown as Record<string, unknown>).__appStore = useAppStore;

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
