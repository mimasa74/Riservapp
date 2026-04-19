import { vi } from 'vitest';

// Node.js v22+ espone un localStorage nativo (node:internal/webstorage) che non implementa
// l'interfaccia completa (es. clear() mancante senza --localstorage-file).
// Vitest v4 + jsdom non sovrascrive questa property perché `localStorage` non è nei suoi KEYS.
// Sostituiamo con un'implementazione in-memory che rispetta la Web Storage API.
{
  const store: Record<string, string> = {};
  const localStoragePolyfill = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStoragePolyfill,
    configurable: true,
    writable: true,
  });
}

// Mock firebase/messaging — non supportato in jsdom
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(() => Promise.resolve('mock-token')),
  onMessage: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
}));

// Mock firebase/firestore per evitare connessioni reali
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  getFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  onSnapshot: vi.fn(),
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { getIdToken: () => Promise.resolve('mock') } })),
  onAuthStateChanged: vi.fn(() => () => {}),
}));

// Mock firebase/storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
}));

// Mock firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));
