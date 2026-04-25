import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { authReady } from './firebase';
import './index.css';

// Registra il Service Worker al boot, indipendente da FCM permission.
// Necessario per cache offline-first (precache app shell + cache 'photos' Firebase Storage).
// useFCM.ts chiamerà getRegistration successivamente — register() è idempotente per stesso scriptURL.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .catch((err) => console.warn('SW registration failed:', err));
}

// Attendi l'anonymous sign-in prima di montare l'app: così onSnapshot e get()
// partono sempre con token valido e non ricevono 403 dalle nuove rules.
authReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
