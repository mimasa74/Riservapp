import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth = getAuth(app);
export const storage = getStorage(app);

// Sign-in anonimo all'avvio. Serve a bloccare scraping diretto dell'API Firestore:
// rules richiedono request.auth != null per tutte le read. Il token dura tra sessioni
// (IndexedDB Firebase) quindi funziona anche offline dopo la prima apertura online.
// Admin Google login resta invariato — sostituisce il token anonimo quando attivo.
//
// Importante: attendiamo getIdToken() prima di risolvere. Senza questo step Firestore
// può inviare richieste prima che il token sia propagato al suo request queue e prendere
// permission-denied nonostante l'utente sia loggato.
export const authReady: Promise<void> = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await user.getIdToken();
      } catch (err) {
        console.error('[auth] getIdToken failed', err);
      }
      unsub();
      resolve();
      return;
    }
    try {
      const cred = await signInAnonymously(auth);
      await cred.user.getIdToken();
      // Non risolviamo qui: onAuthStateChanged ri-scatta con il nuovo user.
    } catch (err) {
      console.error('[auth] anonymous sign-in failed', err);
      unsub();
      resolve();
    }
  });
});

// Lazy init — messaging requires service worker, may fail on first load
export const getMessagingInstance = async () => {
  const { getMessaging } = await import('firebase/messaging');
  return getMessaging(app);
};
