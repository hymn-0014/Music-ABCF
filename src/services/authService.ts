import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { UserStatus } from '../types';

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

async function upsertUserProfile(user: User, preferredName?: string): Promise<void> {
  if (!user.uid || !user.email) return;

  const now = new Date().toISOString();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const existingStatus = (snap.data()?.status as UserStatus | undefined) ?? 'active';

  const payload: {
    uid: string;
    email: string;
    status: UserStatus;
    name?: string;
    createdAt?: string;
    lastLoginAt: string;
  } = {
    uid: user.uid,
    email: user.email.toLowerCase(),
    status: existingStatus,
    lastLoginAt: now,
  };

  const resolvedName = (preferredName ?? user.displayName ?? '').trim();
  if (resolvedName) {
    payload.name = resolvedName;
  }

  if (!snap.exists()) {
    payload.createdAt = now;
  }

  await setDoc(ref, payload, { merge: true });
}

export async function getUserStatus(uid: string): Promise<UserStatus> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 'active';
  return (snap.data()?.status as UserStatus | undefined) ?? 'active';
}

export async function signUp(email: string, password: string, name: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await upsertUserProfile(cred.user, name);
  return cred.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await upsertUserProfile(cred.user);
  return cred.user;
}

function ensureWebPopupSupport() {
  if (typeof window === 'undefined') {
    throw new Error('Google sign-in requires a browser environment.');
  }
}

export async function signInWithGoogle(): Promise<User> {
  ensureWebPopupSupport();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await upsertUserProfile(cred.user);
  return cred.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'Authentication failed. Please try again.';
  }

  switch (error.code) {
    case 'auth/configuration-not-found':
      return 'Firebase Auth is not configured for this project yet. In Firebase Console, open Authentication, click Get started, enable Email/Password, and add hymn-0014.github.io to Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled. Enable the provider in Firebase Console -> Authentication -> Sign-in method.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Check src/config/firebase.ts settings.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completion.';
    case 'auth/popup-blocked':
      return 'The browser blocked the sign-in popup. Allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup is already open. Complete it or close it first.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}
