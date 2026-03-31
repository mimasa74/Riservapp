import { getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db } from '../firebase';

export async function initFCM(deviceId: string, nome: string): Promise<void> {
  const supported = await isSupported();
  if (!supported) return;

  const permission = await Notification.requestPermission();
  localStorage.setItem('riservapp_fcm', permission === 'granted' ? 'granted' : 'denied');
  if (permission !== 'granted') return;

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
  } catch (err) {
    console.warn('FCM init failed:', err);
  }
}
