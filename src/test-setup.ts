import { vi } from 'vitest';

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
}));

// Mock firebase/storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
}));

// Mock firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));
