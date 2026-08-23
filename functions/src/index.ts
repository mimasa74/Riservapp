import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { categoriaLabel, corpoNotifica, specieLabel, titoloNotifica } from './labels';
import { capiSegnati, corpoRiepilogo, snapshotSpecie, titoloRiepilogo, SnapshotSpecie } from './riepilogo';

initializeApp();

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface FcmToken {
  deviceId: string;
  nome: string;
  token: string;
}

export interface Categoria {
  id: string;
  nome: string;
  abbattuti: number;
  totale: number;
  stato: 'aperto' | 'sospeso' | 'chiuso';
  // Desinenza scritta dall'admin ('CHIUSE' / 'CHIUSI'). È la stessa che
  // CategoryRow.tsx mostra nel badge: la notifica non deve inventarne un'altra.
  badgeChiusura?: string;
}

// ─── Helper: estrae categorie da un oggetto specie ───────────────────────────

const SPECIE = ['cervo', 'capriolo', 'camoscio'];

function extractCategorie(specieData: Record<string, unknown>): Categoria[] {
  const cats = specieData?.categorie;
  if (Array.isArray(cats)) return cats as Categoria[];
  return [];
}

// ─── Helper: invia push a tutti i token FCM registrati ───────────────────────
// Messaggi DATA-ONLY: la notifica la costruisce il SW (firebase-messaging-sw.js).
// Con payload `notification` l'SDK web la mostrerebbe automaticamente in background
// E il SW la mostrerebbe di nuovo → doppia notifica.

async function sendPushToAll(
  title: string,
  body: string,
  priority: 'high' | 'normal' = 'normal'
): Promise<void> {
  const snap = await getFirestore().collection('fcm_tokens').get();

  // Dedup per token: due doc con lo stesso token (deviceId rigenerato sullo
  // stesso browser) non devono produrre notifiche duplicate.
  const byToken = new Map<string, FirebaseFirestore.DocumentReference[]>();
  for (const d of snap.docs) {
    const t = (d.data() as FcmToken).token;
    if (!t) continue;
    const refs = byToken.get(t) ?? [];
    refs.push(d.ref);
    byToken.set(t, refs);
  }
  const tokens = [...byToken.keys()];
  console.log(`sendPushToAll: ${snap.size} docs, ${tokens.length} token unici. Titolo: "${title}"`);
  if (!tokens.length) return;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    // ts = istante dell'evento. Il SW lo usa come timestamp della notifica:
    // un telefono spento per ore mostra l'ora del fatto, non della consegna.
    data: { title, body, priority, ts: String(Date.now()) },
    webpush: {
      headers: {
        Urgency: priority === 'high' ? 'high' : 'normal',
        TTL: '86400',
      },
    },
  });

  // Rimuovi token non validi (tutti i doc che condividono quel token)
  const batch = getFirestore().batch();
  let toDelete = 0;
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        for (const ref of byToken.get(tokens[i]) ?? []) {
          batch.delete(ref);
          toDelete++;
        }
      }
    }
  });

  const failed = response.responses.filter(r => !r.success).length;
  console.log(`sendPushToAll: ${tokens.length - failed} ok, ${failed} falliti, ${toDelete} doc rimossi`);

  if (toDelete > 0) await batch.commit();
}

// ─── Helper: post di sistema in bacheca ──────────────────────────────────────
// Fallback per chi non riceve la push (iOS vecchi, permesso negato, token rotto):
// l'evento resta consultabile in bacheca. noPush evita che onPostCreate
// generi una seconda notifica.

async function createSystemPost(tipo: 'avviso' | 'alert', testo: string): Promise<void> {
  await getFirestore().collection('posts').add({
    tipo,
    testo,
    data: Date.now(),
    foto_url: null,
    pdf_url: null,
    autore: 'Sistema',
    noPush: true,
  });
}

// ─── Trigger: nuovo post in bacheca ──────────────────────────────────────────

export const onPostCreate = onDocumentCreated({ document: 'posts/{postId}', region: 'europe-west12' }, async (event) => {
  const post = event.data?.data();
  if (!post) return;
  if (post.noPush === true) return; // post di sistema: push già inviata da onConfigUpdate

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

// ─── Trigger: aggiornamento config/main (sospeso, chiuso) ────────────────────

export const onConfigUpdate = onDocumentUpdated({ document: 'config/main', region: 'europe-west12' }, async (event) => {
  const before = event.data?.before.data() as Record<string, Record<string, unknown>> | undefined;
  const after = event.data?.after.data() as Record<string, Record<string, unknown>> | undefined;
  if (!before || !after) return;

  for (const specieId of SPECIE) {
    const specieData = after[specieId] ?? {};
    const specie = specieLabel(specieId, specieData);
    const beforeCats = extractCategorie(before[specieId] ?? {});
    const afterCats = extractCategorie(specieData);

    for (const a of afterCats) {
      // Accoppia per id, NON per indice: se l'admin aggiunge/rimuove una categoria
      // gli indici slittano e il confronto produrrebbe notifiche spurie.
      const b = beforeCats.find(c => c.id === a.id);
      if (!b) continue;

      // Titolo = specie (+ zona per il camoscio); corpo = categoria + stato.
      const titolo = titoloNotifica(specieId, specieData, a);
      const categoria = categoriaLabel(specieId, specieData, a);

      // Nessuna notifica per la quota raggiunta: registrare l'ultimo capo e
      // chiudere la categoria sono lo stesso fatto, e producevano due push più
      // due post in bacheca. Resta la sola chiusura. Deciso il 18 ago 2026.

      // Categoria sospesa
      if (a.stato === 'sospeso' && b.stato !== 'sospeso') {
        await sendPushToAll(titolo, corpoNotifica(a, 'sospeso'), 'normal');
        await createSystemPost('avviso', `${specie} — ${categoria}: sospesa`);
      }

      // Categoria chiusa — l'evento più critico: priorità alta
      if (a.stato === 'chiuso' && b.stato !== 'chiuso') {
        await sendPushToAll(titolo, corpoNotifica(a, 'chiuso'), 'high');
        await createSystemPost('alert', `${specie} — ${categoria}: chiusa`);
      }
    }
  }
});

// ─── Scheduled: riepilogo serale dei capi segnati ────────────────────────────
//
// Segnare i capi uno per uno manderebbe una push per quadratino: per questo dal
// 20 ago 2026 gli abbattimenti non ne mandavano nessuna. Qui il conto si fa una
// volta sola, alle 21, e parte una notifica per specie — quasi sempre una sola.
//
// Nessun post di sistema in bacheca: il riquadro "Aggiornamento piano" che il
// socio ci trova già fa quel mestiere, e un post ogni sera seppellirebbe i
// messaggi del Rettore.
//
// Il riepilogo parte anche sulle specie in cui una classe si è chiusa in
// giornata, quindi lì il socio riceve due push: la chiusura e il conto della
// sera. Prima quelle specie tacevano, ma la push di chiusura nomina una sola
// categoria e i capi caduti nelle altre classi non venivano annunciati mai —
// nemmeno la sera dopo, perché la fotografia avanzava lo stesso. Scelta di
// Michele del 23 ago 2026: meglio due notifiche che un capo taciuto.
//
// Niente region esplicita, come cleanupOldLocations: gli scheduler di questo
// progetto girano nella region di default e funzionano.

interface StatoRiepilogo {
  /** istante dell'ultimo riepilogo inviato */
  ultimoInvio?: number;
  /** specieId → fotografia { catId: abbattuti } di quel momento */
  snapshot?: Record<string, SnapshotSpecie>;
}

export const riepilogoSerale = onSchedule(
  { schedule: '0 21 * * *', timeZone: 'Europe/Rome' },
  async () => {
    const db = getFirestore();
    const [configSnap, statoSnap] = await Promise.all([
      db.doc('config/main').get(),
      db.doc('config/riepilogo').get(),
    ]);

    const config = configSnap.data() as Record<string, Record<string, unknown>> | undefined;
    if (!config) {
      console.log('riepilogoSerale: config/main assente, niente da fare');
      return;
    }

    const stato = (statoSnap.data() ?? {}) as StatoRiepilogo;
    const snapshotPrec = stato.snapshot ?? {};

    const snapshotNuovo: Record<string, SnapshotSpecie> = {};

    for (const specieId of SPECIE) {
      const specieData = config[specieId] ?? {};
      const curr = snapshotSpecie(extractCategorie(specieData));
      snapshotNuovo[specieId] = curr;

      const capi = capiSegnati(snapshotPrec[specieId] ?? null, curr);
      if (capi <= 0) {
        console.log(`riepilogoSerale: ${specieId} tace, nessun capo nuovo`);
        continue;
      }

      // Se la push fallisce, questa specie tiene la fotografia di ieri: i capi
      // ricompaiono nel riepilogo di domani invece di sparire. Senza il catch un
      // errore a metà loop lascerebbe la scrittura finale inevasa e domani sera
      // le specie già avvisate riceverebbero una seconda push per gli stessi capi.
      try {
        await sendPushToAll(titoloRiepilogo(specieId, specieData), corpoRiepilogo(capi), 'normal');
      } catch (e) {
        console.error(`riepilogoSerale: push fallita per ${specieId}, riprovo domani`, e);
        const prec = snapshotPrec[specieId];
        if (prec) snapshotNuovo[specieId] = prec;
        else delete snapshotNuovo[specieId];
      }
    }

    // La fotografia si aggiorna per tutte le specie, anche quelle rimaste zitte.
    //
    // mergeFields, NON merge: con `merge: true` Firestore fonde ricorsivamente
    // anche dentro `snapshot`, e una categoria cancellata da config/main
    // resterebbe in fotografia per sempre col suo ultimo conteggio. Ricreandola
    // poi con lo stesso id (azzeramento di stagione fatto cancellando le classi)
    // i suoi primi capi darebbero delta negativi e non verrebbero mai annunciati.
    // Con mergeFields i due campi elencati vengono rimpiazzati per intero.
    await db.doc('config/riepilogo').set(
      { ultimoInvio: Date.now(), snapshot: snapshotNuovo },
      { mergeFields: ['ultimoInvio', 'snapshot'] }
    );
  }
);

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
