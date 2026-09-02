import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { categoriaLabel, corpoNotifica, specieLabel, titoloNotifica } from './labels';
import {
  capiComparsi,
  corpoAvviso,
  deveInviare,
  sommaDelta,
  DeltaSpecie,
  TITOLO_AVVISO,
} from './avvisoPiano';

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

  const comparsi: DeltaSpecie = {};

  for (const specieId of SPECIE) {
    const specieData = after[specieId] ?? {};
    const specie = specieLabel(specieId, specieData);
    const beforeCats = extractCategorie(before[specieId] ?? {});
    const afterCats = extractCategorie(specieData);

    // I capi segnati non fanno partire niente adesso: il conto si chiude in
    // avvisoPianoTick, quando il Rettore ha smesso di crociare.
    const capi = capiComparsi(beforeCats, afterCats);
    if (capi > 0) comparsi[specieId] = capi;

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

  if (Object.keys(comparsi).length > 0) await accumulaAvvisoPiano(comparsi);
});

// ─── Avviso di aggiornamento del piano ───────────────────────────────────────
//
// Una notifica sola per sessione di lavoro, col conto per specie:
// `AGGIORNAMENTO PIANO` / `Capriolo +3, Camoscio +1, Cervo +1`.
//
// Perché non parte subito: ogni crocetta è una scrittura a sé su config/main.
// Mandandola alla prima direbbe "Capriolo +1" e i capi successivi resterebbero
// fuori; mandandola a ogni scrittura tornerebbe la raffica di notifiche che nel
// ago 2026 aveva lasciato gli abbattimenti senza push del tutto. Quindi
// onConfigUpdate accumula in silenzio e un tick al minuto decide quando è ora.
//
// Sostituisce il riepilogo serale delle 21 (rimosso il 2 set 2026): quello
// arrivava fino a 23 ore dopo, e i capi segnati dopo le 21 — cioè una battuta
// finita a sera, la norma — cadevano sempre nel buco.
//
// Niente post di sistema in bacheca: il riquadro "Aggiornamento piano" che il
// socio ci trova già fa quel mestiere, e un post per ogni sessione seppellirebbe
// i messaggi del Rettore.

interface StatoAvvisoPiano {
  /** specieId → capi in attesa di essere annunciati */
  pending?: DeltaSpecie;
  /** istante dell'ultima crocetta: da qui si contano i minuti di quiete */
  ultimaModifica?: number;
  /** istante dell'ultima notifica inviata: da qui i minuti di silenzio */
  ultimoInvio?: number;
}

const AVVISO_PIANO_DOC = 'config/avviso_piano';

// merge: true e non mergeFields, al contrario di quasi tutto il resto: qui la
// fusione ricorsiva dentro `pending` è proprio quello che serve, perché somma
// le specie già in attesa con quelle di questa scrittura. Lo svuotamento, che
// invece deve azzerare per intero, usa mergeFields.
async function accumulaAvvisoPiano(nuovi: DeltaSpecie): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(AVVISO_PIANO_DOC);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const stato = (snap.data() ?? {}) as StatoAvvisoPiano;
    tx.set(
      ref,
      { pending: sommaDelta(stato.pending, nuovi), ultimaModifica: Date.now() },
      { mergeFields: ['pending', 'ultimaModifica'] }
    );
  });
}

// Un giro al minuto: è il passo più fitto che lo scheduler permetta, e regge
// sia i 5 minuti di quiete sia i 15 di silenzio senza altri ingranaggi.
export const avvisoPianoTick = onSchedule('every 1 minutes', async () => {
  const db = getFirestore();
  const ref = db.doc(AVVISO_PIANO_DOC);
  const stato = ((await ref.get()).data() ?? {}) as StatoAvvisoPiano;
  const delta = stato.pending ?? {};

  if (!deveInviare(delta, stato.ultimaModifica, stato.ultimoInvio, Date.now())) return;

  const config = (await db.doc('config/main').get()).data() as
    | Record<string, Record<string, unknown>>
    | undefined;

  const corpo = corpoAvviso(delta, config ?? {});
  if (!corpo) return;

  // Se la push fallisce il conto NON si svuota: i capi rientrano nel prossimo
  // giro invece di sparire. Senza il catch il documento resterebbe pieno ma
  // ultimoInvio avanzerebbe lo stesso, zittendo l'avviso per un quarto d'ora.
  try {
    await sendPushToAll(TITOLO_AVVISO, corpo, 'normal');
  } catch (e) {
    console.error('avvisoPianoTick: push fallita, riprovo al prossimo giro', e);
    return;
  }

  await ref.set(
    { pending: {}, ultimoInvio: Date.now() },
    { mergeFields: ['pending', 'ultimoInvio'] }
  );
  console.log(`avvisoPianoTick: inviato "${corpo}"`);
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
