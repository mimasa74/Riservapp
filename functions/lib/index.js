"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldLocations = exports.onConfigUpdate = exports.onPostCreate = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firestore_2 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const labels_1 = require("./labels");
(0, app_1.initializeApp)();
// ─── Helper: estrae categorie da un oggetto specie ───────────────────────────
function extractCategorie(specieData) {
    const cats = specieData?.categorie;
    if (Array.isArray(cats))
        return cats;
    return [];
}
// ─── Helper: invia push a tutti i token FCM registrati ───────────────────────
// Messaggi DATA-ONLY: la notifica la costruisce il SW (firebase-messaging-sw.js).
// Con payload `notification` l'SDK web la mostrerebbe automaticamente in background
// E il SW la mostrerebbe di nuovo → doppia notifica.
async function sendPushToAll(title, body, priority = 'normal') {
    const snap = await (0, firestore_1.getFirestore)().collection('fcm_tokens').get();
    // Dedup per token: due doc con lo stesso token (deviceId rigenerato sullo
    // stesso browser) non devono produrre notifiche duplicate.
    const byToken = new Map();
    for (const d of snap.docs) {
        const t = d.data().token;
        if (!t)
            continue;
        const refs = byToken.get(t) ?? [];
        refs.push(d.ref);
        byToken.set(t, refs);
    }
    const tokens = [...byToken.keys()];
    console.log(`sendPushToAll: ${snap.size} docs, ${tokens.length} token unici. Titolo: "${title}"`);
    if (!tokens.length)
        return;
    const response = await (0, messaging_1.getMessaging)().sendEachForMulticast({
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
    const batch = (0, firestore_1.getFirestore)().batch();
    let toDelete = 0;
    response.responses.forEach((r, i) => {
        if (!r.success) {
            const code = r.error?.code ?? '';
            if (code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token') {
                for (const ref of byToken.get(tokens[i]) ?? []) {
                    batch.delete(ref);
                    toDelete++;
                }
            }
        }
    });
    const failed = response.responses.filter(r => !r.success).length;
    console.log(`sendPushToAll: ${tokens.length - failed} ok, ${failed} falliti, ${toDelete} doc rimossi`);
    if (toDelete > 0)
        await batch.commit();
}
// ─── Helper: post di sistema in bacheca ──────────────────────────────────────
// Fallback per chi non riceve la push (iOS vecchi, permesso negato, token rotto):
// l'evento resta consultabile in bacheca. noPush evita che onPostCreate
// generi una seconda notifica.
async function createSystemPost(tipo, testo) {
    await (0, firestore_1.getFirestore)().collection('posts').add({
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
exports.onPostCreate = (0, firestore_2.onDocumentCreated)({ document: 'posts/{postId}', region: 'europe-west12' }, async (event) => {
    const post = event.data?.data();
    if (!post)
        return;
    if (post.noPush === true)
        return; // post di sistema: push già inviata da onConfigUpdate
    const tipo = post.tipo;
    const testo = post.testo || '';
    const preview = testo.substring(0, 80);
    if (tipo === 'alert') {
        await sendPushToAll('🚨 ALERT — Riserva Tuenno', preview, 'high');
    }
    else if (tipo === 'avviso') {
        await sendPushToAll('⚠️ Avviso — Riserva Tuenno', preview, 'normal');
    }
    else {
        await sendPushToAll('Riserva Tuenno', preview, 'normal');
    }
});
// ─── Trigger: aggiornamento config/main (quota, sospeso, chiuso) ─────────────
exports.onConfigUpdate = (0, firestore_2.onDocumentUpdated)({ document: 'config/main', region: 'europe-west12' }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const species = ['cervo', 'capriolo', 'camoscio'];
    for (const specieId of species) {
        const specieData = after[specieId] ?? {};
        const specie = (0, labels_1.specieLabel)(specieId, specieData);
        const beforeCats = extractCategorie(before[specieId] ?? {});
        const afterCats = extractCategorie(specieData);
        for (const a of afterCats) {
            // Accoppia per id, NON per indice: se l'admin aggiunge/rimuove una categoria
            // gli indici slittano e il confronto produrrebbe notifiche spurie.
            const b = beforeCats.find(c => c.id === a.id);
            if (!b)
                continue;
            // Titolo = specie (+ zona per il camoscio); corpo = categoria + stato.
            const titolo = (0, labels_1.titoloNotifica)(specieId, specieData, a);
            const categoria = (0, labels_1.categoriaLabel)(specieId, specieData, a);
            // Quota raggiunta (abbattuti appena arrivato a totale)
            if (a.totale > 0 && a.abbattuti === a.totale && b.abbattuti !== b.totale) {
                await sendPushToAll(titolo, `${a.nome}: QUOTA RAGGIUNTA ${a.abbattuti}/${a.totale}`, 'normal');
                await createSystemPost('avviso', `${specie} — ${categoria}: quota raggiunta (${a.abbattuti}/${a.totale})`);
            }
            // Categoria sospesa
            if (a.stato === 'sospeso' && b.stato !== 'sospeso') {
                await sendPushToAll(titolo, `${a.nome} ${(0, labels_1.statoLabel)(a.nome, 'sospeso')}`, 'normal');
                await createSystemPost('avviso', `${specie} — ${categoria}: sospesa`);
            }
            // Categoria chiusa — l'evento più critico: priorità alta
            if (a.stato === 'chiuso' && b.stato !== 'chiuso') {
                await sendPushToAll(titolo, `${a.nome} ${(0, labels_1.statoLabel)(a.nome, 'chiuso')}`, 'high');
                await createSystemPost('alert', `${specie} — ${categoria}: chiusa`);
            }
        }
    }
});
// ─── Scheduled: elimina posizioni più vecchie di 35 minuti (GDPR) ─────────
exports.cleanupOldLocations = (0, scheduler_1.onSchedule)('every 10 minutes', async () => {
    const cutoff = new Date(Date.now() - 35 * 60 * 1000);
    const snap = await (0, firestore_1.getFirestore)()
        .collection('user_locations')
        .where('timestamp', '<', firestore_1.Timestamp.fromDate(cutoff))
        .get();
    if (snap.empty)
        return;
    const batch = (0, firestore_1.getFirestore)().batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`Deleted ${snap.size} stale location(s)`);
});
//# sourceMappingURL=index.js.map