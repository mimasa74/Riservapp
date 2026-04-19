import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { authReady } from './firebase';
import './index.css';

// Attendi l'anonymous sign-in prima di montare l'app: così onSnapshot e get()
// partono sempre con token valido e non ricevono 403 dalle nuove rules.
authReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
