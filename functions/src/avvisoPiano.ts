import type { Categoria } from './index';
import { specieLabel } from './labels';

// ─── Avviso di aggiornamento del piano ───────────────────────────────────────
//
// Una sola notifica per sessione di lavoro del Rettore, col conto dei capi per
// specie: `Capriolo +3, Camoscio +1, Cervo +1`.
//
// Ogni crocetta è una scrittura a sé su config/main, quindi il conto non si può
// fare al volo: alla prima crocetta la notifica direbbe "Capriolo +1" e le
// altre resterebbero fuori. Per questo onConfigUpdate accumula in silenzio e
// l'invio lo decide un tick al minuto, quando il Rettore ha smesso di segnare.
//
// Qui sta la sola logica pura, verificabile: index.ts chiama initializeApp() al
// load e non è importabile in un test. avvisoPiano.test.ts è escluso dal build
// Functions via tsconfig.json, altrimenti finirebbe in lib/ e verrebbe deployato.

/** specieId → capi comparsi da annunciare. */
export type DeltaSpecie = Record<string, number>;

/** Quanto silenzio serve prima di dare per finita la sessione. */
export const QUIETE_MS = 5 * 60 * 1000;

/** Quanto deve passare tra una notifica e la successiva. */
export const SILENZIO_MS = 15 * 60 * 1000;

/**
 * L'ordine in cui le specie compaiono nel corpo è quello della BottomNav, non
 * quello in cui il Rettore le ha toccate: il socio ritrova le stesse tre parole
 * nello stesso ordine ogni volta, e le confronta con le linguette in fondo allo
 * schermo. SPECIE in index.ts ha un altro ordine perché lì non si legge nulla.
 */
export const ORDINE_SPECIE = ['capriolo', 'cervo', 'camoscio'];

export const TITOLO_AVVISO = 'AGGIORNAMENTO PIANO';

/**
 * I capi comparsi tra due stati della stessa specie.
 *
 * Stesse due regole dell'avviso dentro l'app (src/utils/novita.ts), e per gli
 * stessi motivi: contano solo gli incrementi — una correzione in meno del
 * Rettore e l'azzeramento di stagione non sono capi caduti — e una categoria
 * mai vista prima entra in silenzio, perché senza termine di paragone la
 * pubblicazione di un piano nuovo annuncerebbe capi che nessuno ha abbattuto.
 */
export function capiComparsi(before: Categoria[], after: Categoria[]): number {
  let totale = 0;
  for (const a of after) {
    if (!a?.id) continue;
    // Accoppia per id, NON per indice: aggiungendo o togliendo una categoria
    // gli indici slittano e il conto verrebbe fuori a caso.
    const b = before.find(c => c.id === a.id);
    if (!b) continue;
    const delta = (typeof a.abbattuti === 'number' ? a.abbattuti : 0)
      - (typeof b.abbattuti === 'number' ? b.abbattuti : 0);
    if (delta > 0) totale += delta;
  }
  return totale;
}

/** Somma due conti parziali, scartando le specie a zero. */
export function sommaDelta(pending: DeltaSpecie | undefined, nuovi: DeltaSpecie): DeltaSpecie {
  const out: DeltaSpecie = {};
  for (const fonte of [pending ?? {}, nuovi]) {
    for (const [specieId, capi] of Object.entries(fonte)) {
      if (typeof capi !== 'number' || capi <= 0) continue;
      out[specieId] = (out[specieId] ?? 0) + capi;
    }
  }
  return out;
}

/**
 * Corpo della notifica: `Capriolo +3, Camoscio +1, Cervo +1`.
 *
 * Compaiono solo le specie cambiate davvero. Il camoscio non nomina la zona:
 * il conto abbraccia tutte le sue categorie, quindi entrambe le subzone, e
 * nominarne una sarebbe falso. Le notifiche di chiusura la nominano perché
 * parlano di una categoria sola.
 */
export function corpoAvviso(
  delta: DeltaSpecie,
  config: Record<string, Record<string, unknown>>
): string {
  const noti = ORDINE_SPECIE.filter(id => id in delta);
  const altri = Object.keys(delta).filter(id => !ORDINE_SPECIE.includes(id)).sort();
  return [...noti, ...altri]
    .filter(id => delta[id] > 0)
    .map(id => `${specieLabel(id, config[id] ?? {})} +${delta[id]}`)
    .join(', ');
}

/**
 * Se è il momento di mandare la notifica.
 *
 * Due condizioni, e servono tutte e due:
 * - **quiete**: sono passati QUIETE_MS dall'ultima crocetta, cioè il Rettore ha
 *   finito. Finché segna, il conto cresce e la notifica aspetta.
 * - **silenzio**: sono passati SILENZIO_MS dalla notifica precedente. Se il
 *   Rettore riprende subito a segnare i capi si accumulano lo stesso, ma i soci
 *   non ricevono due notifiche appiccicate.
 */
export function deveInviare(
  delta: DeltaSpecie,
  ultimaModifica: number | undefined,
  ultimoInvio: number | undefined,
  ora: number
): boolean {
  if (!Object.values(delta).some(n => n > 0)) return false;
  if (typeof ultimaModifica !== 'number') return false;
  if (ora - ultimaModifica < QUIETE_MS) return false;
  if (typeof ultimoInvio === 'number' && ora - ultimoInvio < SILENZIO_MS) return false;
  return true;
}
