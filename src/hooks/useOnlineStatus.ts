import { useEffect, useState } from 'react';

function readLastSync(): number | null {
  const v = localStorage.getItem('lastSyncAt');
  return v ? Number(v) : null;
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(readLastSync);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    const onSync = () => setLastSyncAt(readLastSync());

    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    window.addEventListener('lastSyncAt', onSync);

    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      window.removeEventListener('lastSyncAt', onSync);
    };
  }, []);

  return { online, lastSyncAt };
}
