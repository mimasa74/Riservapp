import { getFirestore, DocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const PRESENZA_MS = 35 * 60_000;

export function corpoIngresso(nome: string, ms: number): string {
  const ora = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
  }).format(ms);
  return nome.trim() + ', ' + ora;
}

// Ordine totale anche per punti contemporanei: l'ora di creazione del server,
// poi l'id. Una query che escludesse solo se stessa zittirebbe entrambi.
export function precede(a: DocumentSnapshot, b: DocumentSnapshot): boolean {
  const x = a.createTime!;
  const y = b.createTime!;
  return x.seconds < y.seconds || (x.seconds === y.seconds &&
    (x.nanoseconds < y.nanoseconds || (x.nanoseconds === y.nanoseconds && a.id < b.id)));
}

export async function avvisaIngresso(point: DocumentSnapshot, now = Date.now()): Promise<void> {
  const db = getFirestore();
  const data = point.data();
  if (!data || typeof data.nome !== 'string' || typeof data.deviceId !== 'string') return;
  const ms = data.timestamp?.toMillis?.();
  if (!Number.isFinite(ms) || ms > now || ms <= now - PRESENZA_MS) return;

  const recipient = await db.runTransaction(async tx => {
    const current = await tx.get(point.ref);
    if (!current.exists || current.data()?.avvisoRettoreGestito) return null;
    const points = await tx.get(db.collection('user_locations').where('deviceId', '==', data.deviceId));
    const target = await tx.get(db.doc('config/rettore_push'));
    // Claim prima dell'invio: niente raffiche se il trigger è consegnato due volte.
    // Non si ritenta una consegna dall'esito incerto: vedi note di handoff.
    const alreadyPresent = points.docs.some(p => {
      const time = p.data().timestamp?.toMillis?.();
      return p.id !== point.id && time > now - PRESENZA_MS && precede(p, point);
    });
    tx.update(point.ref, { avvisoRettoreGestito: true });
    if (alreadyPresent) return null;
    const dest = target.data();
    if (!dest?.uid || !dest?.token || !dest?.sessionId || !dest?.deviceId) return null;
    return dest;
  });
  if (!recipient) return;
  // Mai consultare fcm_tokens, né inviare alla lista soci. Il destinatario è
  // registrato con rules Google-admin, revocato prima del logout.
  await getMessaging().send({
    token: recipient.token,
    data: {
      kind: 'in-riserva', title: 'IN RISERVA', body: corpoIngresso(data.nome, ms),
      priority: 'normal', ts: String(ms), eventId: point.id,
      rettoreSession: recipient.sessionId,
    },
    webpush: { headers: { Urgency: 'normal', TTL: '60' } },
  });
}
