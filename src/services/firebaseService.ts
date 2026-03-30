import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Sync songs to Firestore
export const syncSongs = async (songs) => {
  const batch = db.batch();
  songs.forEach((song) => {
    const songRef = db.collection('songs').doc(song.id);
    batch.set(songRef, song);
  });
  await batch.commit();
};

// Sync setlists to Firestore
export const syncSetlists = async (setlists) => {
  const batch = db.batch();
  setlists.forEach((setlist) => {
    const setlistRef = db.collection('setlists').doc(setlist.id);
    batch.set(setlistRef, setlist);
  });
  await batch.commit();
};

// Sync user data to Firestore
export const syncUserData = async (userId, userData) => {
  const userRef = db.collection('users').doc(userId);
  await userRef.set(userData);
};