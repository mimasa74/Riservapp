import { getToken, isSupported, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { getMessagingInstance, db } from '../firebase';

// Mostra notifica in foreground (quando l'app è aperta)
// Usa SW showNotification perché new Notification() non è supportato su Android Chrome
function setupForegroundHandler(messaging: Messaging): void {
  onMessage(messaging, (payload) => {
    // Messaggi data-only (title/body in payload.data); fallback su payload.notification
    // per la transizione da vecchie Functions.
    const title = payload.data?.title || payload.notification?.title || 'Riserva Tuenno';
    const body = payload.data?.body || payload.notification?.body || '';
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/logo_tuenno_ui.png',
          data: { url: 'https://riservatuenno.web.app' },
        });
      });
    }
  });
}

let foregroundHandlerSetup = false;

// Chiamare da un GESTO UTENTE quando il permesso non è ancora stato concesso:
// su iOS Notification.requestPermission() fuori da user activation fallisce.
// La fonte di verità è Notification.permission, NON il flag in localStorage:
// se il socio riattiva il permesso dalle impostazioni di sistema, qui ripartiamo.
export async function initFCM(deviceId: string, nome: string): Promise<void> {
  const supported = await isSupported();
  if (!supported) return;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  localStorage.setItem('riservapp_fcm', permission === 'granted' ? 'granted' : 'denied');
  if (permission !== 'granted') return;

  // Registra (o rinnova) il token FCM — eseguito sempre per mantenere il token valido
  try {
    const messaging = await getMessagingInstance();
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Aspetta che il SW sia attivo prima di chiamare getToken
    // (getToken fallisce se il SW è ancora in stato "installing")
    if (!reg.active) {
      await new Promise<void>((resolve) => {
        const sw = reg.installing ?? reg.waiting;
        if (!sw) { resolve(); return; }
        sw.addEventListener('statechange', function handler() {
          if ((this as ServiceWorker).state === 'activated') {
            (this as ServiceWorker).removeEventListener('statechange', handler);
            resolve();
          }
        });
      });
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (!token) { console.warn('FCM: getToken returned null'); return; }

    await setDoc(doc(db, 'fcm_tokens', deviceId), {
      deviceId,
      nome,
      token,
      timestamp: new Date(),
    });

    if (!foregroundHandlerSetup) {
      setupForegroundHandler(messaging);
      foregroundHandlerSetup = true;
    }
  } catch (err) {
    console.error('FCM init failed:', err);
  }
}
