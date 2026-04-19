// src/components/OfflineBanner.tsx
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function formatLastSync(ts: number | null): string {
  if (!ts) return 'mai';
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(ts));
}

export function OfflineBanner() {
  const { online, lastSyncAt } = useOnlineStatus();
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: '#8B1A1A',
        color: '#fff',
        padding: online ? '0 16px' : '12px 16px',
        maxHeight: online ? 0 : 100,
        overflow: 'hidden',
        fontSize: 15,
        fontWeight: 600,
        textAlign: 'center',
        transition: 'max-height 0.3s ease-in-out, padding 0.3s ease-in-out',
      }}
    >
      Sei offline. Ultimo aggiornamento: {formatLastSync(lastSyncAt)}. Dati aggiornati disponibili quando torni online.
    </div>
  );
}
