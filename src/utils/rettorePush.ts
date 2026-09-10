import { doc, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const CACHE = 'rettore-push-session';
const KEY = '/__rettore_push_session__';
let blocked = false;
let pending: Promise<void> = Promise.resolve();

export function abilitaRegistrazioneRettore(): void { blocked = false; }

export async function cancellaSessionePushLocale(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(CACHE);
  await cache.delete(KEY);
  const reg = await navigator.serviceWorker?.getRegistration();
  const notifications = await reg?.getNotifications() ?? [];
  notifications.filter(n => n.tag.startsWith('rettore-')).forEach(n => n.close());
}

export async function puoMostrarePush(data?: Record<string, string>): Promise<boolean> {
  if (data?.kind !== 'in-riserva') return true;
  try {
    const saved = await (await caches.open(CACHE)).match(KEY);
    return !!data.rettoreSession && !!saved && await saved.text() === data.rettoreSession;
  } catch { return false; }
}

// Un vecchio SW non sa nascondere le push dopo il logout: registrazione vietata
// fino all'attivazione della versione che risponde a questo messaggio.
function supportsPrivatePush(reg: ServiceWorkerRegistration): Promise<boolean> {
  return new Promise(resolve => {
    if (!reg.active) { resolve(false); return; }
    const channel = new MessageChannel();
    const finish = (ok: boolean) => { clearTimeout(timer); channel.port1.close(); resolve(ok); };
    const timer = setTimeout(() => finish(false), 2000);
    channel.port1.onmessage = event => finish(event.data === 1);
    reg.active.postMessage('RETTORE_PUSH_VERSION', [channel.port2]);
  });
}

export function registraPushRettore(deviceId: string, token: string, reg: ServiceWorkerRegistration): Promise<void> {
  const user = auth.currentUser;
  if (blocked || !user || user.isAnonymous || !user.emailVerified ||
      user.email !== 'michele.bruni@gmail.com' ||
      !user.providerData.some(p => p.providerId === 'google.com')) return Promise.resolve();
  pending = pending.catch(() => {}).then(async () => {
    if (blocked || auth.currentUser !== user || !await supportsPrivatePush(reg)) return;
    if (blocked || auth.currentUser !== user) return;
    const sessionId = crypto.randomUUID();
    const cache = await caches.open(CACHE);
    await cache.put(KEY, new Response(sessionId));
    try {
      await setDoc(doc(db, 'config', 'rettore_push'), { deviceId, token, uid: user.uid, sessionId });
      if (blocked || auth.currentUser !== user) await cancellaSessionePushLocale();
    } catch (error) {
      await cancellaSessionePushLocale();
      throw error;
    }
  });
  return pending;
}

// Revoca prima del signOut, quando le rules consentono ancora la cancellazione.
// Un altro telefono divenuto destinatario nel frattempo non va disattivato.
export async function revocaPushRettore(deviceId: string): Promise<void> {
  blocked = true;
  await pending.catch(() => {});
  await cancellaSessionePushLocale();
  const ref = doc(db, 'config', 'rettore_push');
  await runTransaction(db, async tx => {
    const saved = await tx.get(ref);
    if (saved.data()?.deviceId === deviceId) tx.delete(ref);
  });
}
