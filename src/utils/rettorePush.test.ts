import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: { currentUser: null as any }, setDoc: vi.fn(), saved: null as any, deleted: vi.fn() }));
vi.mock('../firebase', () => ({ auth: mocks.auth, db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: () => 'config/rettore_push',
  setDoc: mocks.setDoc,
  runTransaction: async (_db: any, fn: any) => fn({ get: async () => ({ data: () => mocks.saved }), delete: mocks.deleted }),
}));
import { abilitaRegistrazioneRettore, puoMostrarePush, registraPushRettore, revocaPushRettore } from './rettorePush';
const user = () => ({ uid: 'michele', email: 'michele.bruni@gmail.com', emailVerified: true, isAnonymous: false, providerData: [{ providerId: 'google.com' }] });
let cache: Map<string, string>;
let reg: any;
beforeEach(() => {
  abilitaRegistrazioneRettore(); mocks.auth.currentUser = user(); mocks.saved = null;
  mocks.setDoc.mockReset().mockImplementation(async (_ref, value) => { mocks.saved = value; }); mocks.deleted.mockReset();
  cache = new Map();
  vi.stubGlobal('caches', { open: async () => ({
    put: async (key: string, response: Response) => { cache.set(key, await response.text()); },
    match: async (key: string) => cache.has(key) ? new Response(cache.get(key)) : undefined,
    delete: async (key: string) => cache.delete(key),
  }) });
  vi.stubGlobal('MessageChannel', class {
    port1: any = { close: vi.fn(), onmessage: null };
    port2: any = { reply: (data: any) => this.port1.onmessage({ data }) };
  });
  reg = { active: { postMessage: (_msg: string, ports: any[]) => ports[0].reply(1) }, getNotifications: async () => [] };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => reg } });
});
afterEach(() => vi.unstubAllGlobals());

it.each([
  null,
  { ...user(), isAnonymous: true },
  { ...user(), email: 'altro@gmail.com' },
  { ...user(), emailVerified: false },
  { ...user(), providerData: [] },
])('non registra identità non autorizzate: %j', async current => {
  mocks.auth.currentUser = current;
  await registraPushRettore('device', 'token', reg);
  expect(mocks.setDoc).not.toHaveBeenCalled();
});
it('registra Google verificato e mostra solo la sua sessione', async () => {
  await registraPushRettore('device', 'token', reg);
  expect(mocks.saved).toEqual(expect.objectContaining({ uid: 'michele', token: 'token', deviceId: 'device' }));
  expect(await puoMostrarePush({ kind: 'in-riserva', rettoreSession: mocks.saved.sessionId })).toBe(true);
  expect(await puoMostrarePush({ kind: 'in-riserva', rettoreSession: 'altra' })).toBe(false);
});
it('il logout cancella il destinatario e blocca anche una push già in viaggio', async () => {
  await registraPushRettore('device', 'token', reg);
  const session = mocks.saved.sessionId;
  await revocaPushRettore('device');
  expect(mocks.deleted).toHaveBeenCalledOnce();
  expect(await puoMostrarePush({ kind: 'in-riserva', rettoreSession: session })).toBe(false);
  await registraPushRettore('device', 'token', reg);
  expect(mocks.setDoc).toHaveBeenCalledOnce();
});
it('il logout da un telefono non cancella il destinatario di un altro', async () => {
  mocks.saved = { deviceId: 'altro' }; await revocaPushRettore('device');
  expect(mocks.deleted).not.toHaveBeenCalled();
});
it('non registra su un vecchio service worker', async () => {
  reg.active.postMessage = (_msg: string, ports: any[]) => ports[0].reply(0);
  await registraPushRettore('device', 'token', reg);
  expect(mocks.setDoc).not.toHaveBeenCalled();
});
it('non lascia attiva la sessione se Firestore rifiuta la registrazione', async () => {
  mocks.setDoc.mockRejectedValueOnce(Error('permission-denied'));
  await expect(registraPushRettore('device', 'token', reg)).rejects.toThrow();
  expect(cache.size).toBe(0);
});
it('non altera le notifiche generali', async () => {
  expect(await puoMostrarePush({ title: 'Avviso' })).toBe(true);
});
