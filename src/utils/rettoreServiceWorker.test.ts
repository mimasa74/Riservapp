// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

function setup(session?: string) {
  let receive: any;
  const listeners: Record<string, any> = {};
  const showNotification = vi.fn();
  runInNewContext(readFileSync('public/firebase-messaging-sw.js', 'utf8'), {
    importScripts() {},
    firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage: (fn: any) => { receive = fn; } }) },
    self: { addEventListener: (name: string, fn: any) => { listeners[name] = fn; }, registration: { showNotification } },
    workbox: { core: { clientsClaim() {} }, precaching: { precacheAndRoute() {} },
      routing: { registerRoute() {} }, strategies: { CacheFirst: class {} }, cacheableResponse: { CacheableResponsePlugin: class {} } },
    caches: { open: async () => ({ match: async () => session ? { text: async () => session } : undefined }) },
  });
  return { receive, showNotification, listeners };
}

it('SW: nasconde la push privata dopo logout', async () => {
  const sw = setup(); await sw.receive({ data: { kind: 'in-riserva', rettoreSession: 'old' } });
  expect(sw.showNotification).not.toHaveBeenCalled();
});
it('SW: nasconde una sessione vecchia o priva di identificatore', async () => {
  const sw = setup('new');
  await sw.receive({ data: { kind: 'in-riserva', rettoreSession: 'old' } });
  await sw.receive({ data: { kind: 'in-riserva' } });
  expect(sw.showNotification).not.toHaveBeenCalled();
});
it('SW: mostra una sola notifica data-only della sessione attiva', async () => {
  const sw = setup('active');
  await sw.receive({ data: { kind: 'in-riserva', rettoreSession: 'active', title: 'IN RISERVA', body: 'Mario Rossi, 9:12', ts: '1234', eventId: 'point' } });
  expect(sw.showNotification).toHaveBeenCalledExactlyOnceWith('IN RISERVA', expect.objectContaining({ body: 'Mario Rossi, 9:12', timestamp: 1234, tag: 'rettore-point' }));
});
it('SW: continua a mostrare le notifiche generali', async () => {
  const sw = setup(); await sw.receive({ data: { title: 'Bacheca', body: 'Messaggio' } });
  expect(sw.showNotification).toHaveBeenCalledOnce();
});
it('SW: conferma esplicitamente il supporto al logout privato', () => {
  const sw = setup(); const postMessage = vi.fn();
  sw.listeners.message({ data: 'RETTORE_PUSH_VERSION', ports: [{ postMessage }] });
  expect(postMessage).toHaveBeenCalledWith(1);
});
