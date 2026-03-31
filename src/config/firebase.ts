import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA4r6MgsiRsoKiwpjx9z8IQjxauJeCh0mM",
  authDomain: "music-abcf.firebaseapp.com",
  projectId: "music-abcf",
  storageBucket: "music-abcf.firebasestorage.app",
  messagingSenderId: "697114617955",
  appId: "1:697114617955:web:5b75504316f079ce147056",
  measurementId: "G-QNB7NTN581",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };