"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldLocations = exports.onConfigUpdate = exports.onPostCreate = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firestore_2 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
(0, app_1.initializeApp)();
// ─── Helper: estrae categorie da un oggetto specie ───────────────────────────
function extractCategorie(specieData) {
    const cats = specieData?.categorie;
    if (Array.isArray(cats))
        return cats;
    return [];
}
// ─── Helper: invia push a tutti i token FCM registrati ───────────────────────
async function sendPushToAll(title, body, priority = 'normal') {
    const snap = await (0, firestore_1.getFirestore)().collection('fcm_tokens').get();
    const docs = snap.docs;
    const tokens = docs.map(d => d.data().token).filter(Boolean);
    console.log(`sendPushToAll: trovati ${docs.length} docs, ${tokens.length} token validi. Titolo: "${title}"`);
    if (!tokens.length)
        return;
    const response = await (0, messaging_1.getMessaging)().sendEachForMulticast({
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
    const invalid = [];
    response.responses.forEach((r, i) => {
        if (!r.success) {
            const code = r.error?.code ?? '';
            if (code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token') {
                invalid.push(i);
            }
        }
    });
    console.log(`sendPushToAll: inviati ${tokens.length - invalid.length} ok, ${invalid.length} falliti`);
    if (invalid.length > 0) {
        const batch = (0, firestore_1.getFirestore)().batch();
        invalid.forEach(i => batch.delete(docs[i].ref));
        await batch.commit();
    }
}
// ─── Trigger: nuovo post in bacheca ──────────────────────────────────────────
exports.onPostCreate = (0, firestore_2.onDocumentCreated)({ document: 'posts/{postId}', region: 'europe-west12' }, async (event) => {
    const post = event.data?.data();
    if (!post)
        return;
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
// ─── Trigger: aggiornamento config/main (quota + sospeso) ────────────────────
exports.onConfigUpdate = (0, firestore_2.onDocumentUpdated)({ document: 'config/main', region: 'europe-west12' }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const species = ['cervo', 'capriolo', 'camoscio'];
    for (const specieId of species) {
        const beforeCats = extractCategorie(before[specieId] ?? {});
        const afterCats = extractCategorie(after[specieId] ?? {});
        for (let i = 0; i < afterCats.length; i++) {
            const b = beforeCats[i];
            const a = afterCats[i];
            if (!b || !a)
                continue;
            // Quota raggiunta (abbattuti appena arrivato a totale)
            if (a.totale > 0 && a.abbattuti === a.totale && b.abbattuti !== b.totale) {
                await sendPushToAll('Quota raggiunta', `${a.nome}: ${a.abbattuti}/${a.totale} capi abbattuti`, 'normal');
            }
            // Categoria sospesa
            if (a.stato === 'sospeso' && b.stato !== 'sospeso') {
                await sendPushToAll('Categoria sospesa', `${a.nome} è stata sospesa`, 'normal');
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