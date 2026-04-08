import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

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
  console.log(`sendPushToAll: trovati ${docs.length} docs, ${tokens.length} token validi. Titolo: "${title}"`);
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

  console.log(`sendPushToAll: inviati ${tokens.length - invalid.length} ok, ${invalid.length} falliti`);

  if (invalid.length > 0) {
    const batch = getFirestore().batch();
    invalid.forEach(i => batch.delete(docs[i].ref));
    await batch.commit();
  }
}

// ─── Trigger: nuovo post in bacheca ──────────────────────────────────────────

export const onPostCreate = onDocumentCreated({ document: 'posts/{postId}', region: 'europe-west12' }, async (event) => {
  const post = event.data?.data();
  if (!post) return;

  const tipo: 'normale' | 'avviso' | 'alert' = post.tipo;
  const testo: string = post.testo || '';
  const preview = testo.substring(0, 80);

  if (tipo === 'alert') {
    await sendPushToAll('🚨 ALERT — Riserva Tuenno', preview, 'high');
  } else if (tipo === 'avviso') {
    await sendPushToAll('⚠️ Avviso — Riserva Tuenno', preview, 'normal');
  } else {
    await sendPushToAll('Riserva Tuenno', preview, 'normal');
  }
});

// ─── Trigger: aggiornamento config/main (quota + sospeso) ────────────────────

export const onConfigUpdate = onDocumentUpdated({ document: 'config/main', region: 'europe-west12' }, async (event) => {
  const before = event.data?.before.data() as Record<string, Record<string, unknown>> | undefined;
  const after = event.data?.after.data() as Record<string, Record<string, unknown>> | undefined;
  if (!before || !after) return;

  const species = ['cervo', 'capriolo', 'camoscio'];

  for (const specieId of species) {
    const beforeCats = extractCategorie(before[specieId] ?? {});
    const afterCats = extractCategorie(after[specieId] ?? {});

    for (let i = 0; i < afterCats.length; i++) {
      const b = beforeCats[i];
      const a = afterCats[i];
      if (!b || !a) continue;

      // Quota raggiunta (abbattuti appena arrivato a totale)
      if (a.totale > 0 && a.abbattuti === a.totale && b.abbattuti !== b.totale) {
        await sendPushToAll(
          'Quota raggiunta',
          `${a.nome}: ${a.abbattuti}/${a.totale} capi abbattuti`,
          'normal'
        );
      }

      // Categoria sospesa
      if (a.stato === 'sospeso' && b.stato !== 'sospeso') {
        await sendPushToAll(
          'Categoria sospesa',
          `${a.nome} è stata sospesa`,
          'normal'
        );
      }
    }
  }
});

// ─── Scheduled: elimina posizioni più vecchie di 35 minuti (GDPR) ─────────

export const cleanupOldLocations = onSchedule('every 10 minutes', async () => {
  const cutoff = new Date(Date.now() - 35 * 60 * 1000);
  const snap = await getFirestore()
    .collection('user_locations')
    .where('timestamp', '<', Timestamp.fromDate(cutoff))
    .get();

  if (snap.empty) return;

  const batch = getFirestore().batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();

  console.log(`Deleted ${snap.size} stale location(s)`);
});
