import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface FcmToken {
  deviceId: string;
  nome: string;
  token: string;
}

interface Categoria {
  id: string;
  nome: string;
  abbattuti: number;
  totale: number;
  stato: 'aperto' | 'sospeso' | 'chiuso';
}

// ─── Helper: estrae categorie da un oggetto specie ───────────────────────────

function extractCategorie(specieData: Record<string, unknown>): Categoria[] {
  const cats = specieData?.categorie;
  if (Array.isArray(cats)) return cats as Categoria[];
  return [];
}

// ─── Helper: invia push a tutti i token FCM registrati ───────────────────────

async function sendPushToAll(
  title: string,
  body: string,
  priority: 'high' | 'normal' = 'normal'
): Promise<void> {
  const snap = await getFirestore().collection('fcm_tokens').get();
  const docs = snap.docs;
  const tokens = docs.map(d => (d.data() as FcmToken).token).filter(Boolean);
  if (!tokens.length) return;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      priority: priority === 'high' ? 'high' : 'normal',
      notification: {
        sound: 'default',
        channelId: priority === 'high' ? 'riservapp_alert' : 'riservapp_default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          'interruption-level': priority === 'high' ? 'time-sensitive' : 'active',
        },
      },
      headers: { 'apns-priority': priority === 'high' ? '10' : '5' },
    },
    data: { priority },
  });

  // Rimuovi token non validi
  const invalid: number[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalid.push(i);
      }
    }
  });

  if (invalid.length > 0) {
    const batch = getFirestore().batch();
    invalid.forEach(i => batch.delete(docs[i].ref));
    await batch.commit();
  }
}

export { extractCategorie, sendPushToAll };
