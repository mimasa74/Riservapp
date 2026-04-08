import { getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db } from '../firebase';

// Mostra notifica in foreground (quando l'app è aperta)
function setupForegroundHandler(): void {
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Riserva Tuenno';
    const body = payload.notification?.body || '';
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo_tuenno_ui.png',
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
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (!token) return;

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
    console.warn('FCM init failed:', err);
  }
}
