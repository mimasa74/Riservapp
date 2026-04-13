import { getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db } from '../firebase';

// Mostra notifica in foreground (quando l'app è aperta)
// Usa SW showNotification perché new Notification() non è supportato su Android Chrome
function setupForegroundHandler(): void {
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Riserva Tuenno';
    const body = payload.notification?.body || '';
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

export async function initFCM(deviceId: string, nome: string): Promise<void> {
  const supported = await isSupported();
  if (!supported) return;

  const alreadyGranted = localStorage.getItem('riservapp_fcm') === 'granted';

  // Se non ancora concesso, chiedi il permesso
  if (!alreadyGranted) {
    const permission = await Notification.requestPermission();
    localStorage.setItem('riservapp_fcm', permission === 'granted' ? 'granted' : 'denied');
    if (permission !== 'granted') return;
  }

  // Se esplicitamente negato, esci
  if (localStorage.getItem('riservapp_fcm') === 'denied') return;

  // Registra (o rinnova) il token FCM — eseguito sempre per mantenere il token valido
  try {
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
      setupForegroundHandler();
      foregroundHandlerSetup = true;
    }
  } catch (err) {
    console.error('FCM init failed:', err);
  }
}
