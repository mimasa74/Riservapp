// Self-destroying SW: rimuove il vecchio Workbox SW senza causare reload loop
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  await self.registration.unregister();
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
});
