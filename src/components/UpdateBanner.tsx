// src/components/UpdateBanner.tsx
// Dopo un deploy il nuovo SW resta in "waiting" finché tutte le tab sono chiuse.
// Questo banner lo rende visibile: tap → SKIP_WAITING → controllerchange → reload.
// Il reload avviene SOLO se richiesto dall'utente (mai automatico: clientsClaim
// fa scattare controllerchange anche alla prima installazione).
import { useEffect, useRef, useState } from 'react';

export function UpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloadRequested = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // "installed" con un controller attivo = aggiornamento in attesa
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(nw);
          }
        });
      });
    });

    const onControllerChange = () => {
      if (reloadRequested.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;

  return (
    <button
      onClick={() => {
        reloadRequested.current = true;
        waiting.postMessage('SKIP_WAITING');
      }}
      style={{
        width: '100%', padding: '12px 16px',
        background: '#5C6B3A', color: '#EDEEE6',
        border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
        textAlign: 'center',
      }}
    >
      Nuova versione disponibile — tocca per aggiornare
    </button>
  );
}
