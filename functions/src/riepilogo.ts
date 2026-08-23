import type { Categoria } from './index';
import { specieLabel } from './labels';

// ─── Riepilogo serale dei capi segnati ───────────────────────────────────────
//
// Il server manda una push per ogni scrittura su config/main, quindi segnare i
// capi uno per uno produrrebbe una raffica di notifiche: è il motivo per cui il
// 20 ago 2026 gli abbattimenti erano rimasti senza push del tutto. Il riepilogo
// serale è il raggruppamento che mancava — una notifica per specie, a fine
// giornata, e solo se qualcosa è cambiato.
//
// Qui dentro sta la sola logica pura, verificabile: index.ts chiama
// initializeApp() al load e non è importabile in un test. riepilogo.test.ts è
// escluso dal build Functions via tsconfig.json, altrimenti finirebbe in lib/ e
// verrebbe deployato.

/** catId → capi abbattuti. La fotografia dell'ultimo riepilogo inviato. */
export type SnapshotSpecie = Record<string, number>;

export function snapshotSpecie(categorie: Categoria[]): SnapshotSpecie {
  const snap: SnapshotSpecie = {};
  for (const cat of categorie) {
    if (!cat?.id) continue;
    snap[cat.id] = typeof cat.abbattuti === 'number' ? cat.abbattuti : 0;
  }
  return snap;
}

/**
 * Quanti capi sono comparsi dall'ultimo riepilogo.
 *
 * Stesse due regole dell'avviso dentro l'app (src/utils/novita.ts), e per gli
 * stessi motivi: contano solo gli incrementi — una correzione in meno del
 * Rettore e l'azzeramento di stagione non sono capi caduti — e una categoria
 * mai vista prima entra in silenzio, perché senza termine di paragone un
 * semplice rinomino annuncerebbe capi che nessuno ha appena abbattuto.
 */
export function capiSegnati(prev: SnapshotSpecie | null, curr: SnapshotSpecie): number {
  if (!prev) return 0;
  let totale = 0;
  for (const [catId, abbattuti] of Object.entries(curr)) {
    if (!(catId in prev)) continue;
    const delta = abbattuti - prev[catId];
    if (delta > 0) totale += delta;
  }
  return totale;
}

/**
 * Titolo: la specie in maiuscolo e basta.
 *
 * Le notifiche di chiusura aggiungono la zona per il camoscio, perché parlano di
 * una categoria sola. Il riepilogo abbraccia tutte le categorie della specie,
 * quindi entrambe le zone: nominarne una sarebbe falso.
 */
export function titoloRiepilogo(specieId: string, specieData: Record<string, unknown>): string {
  return specieLabel(specieId, specieData).toUpperCase();
}

/** Corpo: il solo conto. Le classi il socio le trova in app, con la pastiglia
 *  NUOVO sulla riga e le crocette rosse sui capi. */
export function corpoRiepilogo(capi: number): string {
  return capi === 1 ? 'Segnato 1 capo' : `Segnati ${capi} capi`;
}
