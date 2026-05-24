// Firebase Authentication setup for ClassCost.
//
// This module bootstraps the Firebase SDK ONLY if all required env vars are
// present. When env vars are missing (e.g. on a teammate's machine who hasn't
// set up Firebase yet), it exports `firebaseEnabled = false` and all helpers
// throw a clear error if called. The rest of the app stays functional with
// the existing Google + Email OTP flow.
//
// Apple sign-in requires extra setup in the Firebase console + an Apple
// Developer account ($99/yr). See FIREBASE_SETUP.md.

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app = null;
let auth = null;

if (firebaseEnabled) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Persist sessions across browser restarts (default, but explicit).
  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.warn('Firebase persistence setup failed:', e);
  });
}

export { auth };

const ensureEnabled = () => {
  if (!firebaseEnabled) {
    throw new Error(
      'Firebase is not configured. Add VITE_FIREBASE_* vars to .env (see FIREBASE_SETUP.md).'
    );
  }
};

// ─── Apple Sign-In ───────────────────────────────────────────────────────────
// Requires Apple provider enabled in Firebase Console + Apple Developer setup.
// Returns the Firebase User object on success.
export async function appleSignIn() {
  ensureEnabled();
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// ─── Phone Sign-In ───────────────────────────────────────────────────────────
// Two-step flow:
//   1. sendPhoneOtp(phone, recaptchaContainerId) → returns confirmationResult
//   2. confirmationResult.confirm(code) → returns userCredential
//
// Caller is responsible for rendering a <div id={recaptchaContainerId}> in the
// DOM before calling sendPhoneOtp.
export async function sendPhoneOtp(phoneNumber, recaptchaContainerId = 'recaptcha-container') {
  ensureEnabled();
  // Clean up any previous verifier instance (re-renders, retries).
  if (window._classcostRecaptcha) {
    try { window._classcostRecaptcha.clear(); } catch { /* ignore */ }
    window._classcostRecaptcha = null;
  }
  const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: 'invisible',
  });
  window._classcostRecaptcha = verifier;
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

// ─── Sign Out ────────────────────────────────────────────────────────────────
// Safe to call even when Firebase isn't configured — becomes a no-op.
export async function signOutFirebase() {
  if (!firebaseEnabled || !auth) return;
  try { await fbSignOut(auth); } catch (e) { console.warn('Firebase signOut error:', e); }
}

// ─── Auth State Subscription ────────────────────────────────────────────────
// Returns an unsubscribe function. No-op when Firebase isn't configured.
export function onAuthStateChanged(callback) {
  if (!firebaseEnabled || !auth) return () => {};
  return fbOnAuthStateChanged(auth, callback);
}

// ─── User Mapping ────────────────────────────────────────────────────────────
// Maps a Firebase User to the app's user shape so it slots into AppContext.
export function mapFirebaseUserToAppUser(fbUser, method) {
  return {
    id: fbUser.uid,
    email: fbUser.email || null,
    phone: fbUser.phoneNumber || null,
    name: fbUser.displayName || null,
    avatar: fbUser.photoURL || null,
    authProvider: method, // 'apple' | 'phone'
    isLoggedIn: true,
    profileComplete: false,
  };
}
