import { SpecieData } from '../types';

/**
 * Fotografia degli abbattimenti di una specie: catId → capi già abbattuti.
 * Vive solo su localStorage, nessuna scrittura su Firestore: l'avviso "ci sono
 * capi nuovi" è una cosa privata del telefono, non un dato della riserva.
 */
export type SnapshotSpecie = Record<string, number>;

export interface NovitaSpecie {
  /** quanti capi sono stati segnati da quando il socio ha guardato l'ultima volta */
  capi: number;
  /** catId → capi nuovi, per la pastiglia NUOVO e le crocette rosse */
  categorie: Record<string, number>;
}

/** Riga dell'avviso in bacheca: la specie e quando il piano e' cambiato.
 *  Il conteggio dei capi resta nel bollino e nella pastiglia NUOVO: qui il socio
 *  vuole sapere quale piano guardare e se e' roba di oggi, non un numero. */
export interface AvvisoNovita {
  specieId: string;
  nomeSpecie: string;
  /** `lastUpdated` della specie, scritto dal Rettore quando segna un capo */
  aggiornato?: string;
}

const PREFIX = 'riservapp_novita_';

export function snapshotDaSpecie(specie: SpecieData): SnapshotSpecie {
  const snap: SnapshotSpecie = {};
  for (const cat of specie.categorie ?? []) {
    snap[cat.id] = cat.abbattuti ?? 0;
  }
  return snap;
}

/** Solo gli incrementi contano: le correzioni in meno e l'azzeramento di
 *  stagione non sono novità. Una categoria mai vista prima non ha un termine
 *  di paragone, quindi entra in silenzio. */
function incrementi(prev: SnapshotSpecie, curr: SnapshotSpecie): [string, number][] {
  return Object.entries(curr)
    .filter(([catId]) => catId in prev)
    .map(([catId, abbattuti]) => [catId, abbattuti - prev[catId]] as [string, number])
    .filter(([, delta]) => delta > 0);
}

export function contaCapiNuovi(prev: SnapshotSpecie | null, curr: SnapshotSpecie): number {
  if (!prev) return 0;
  return incrementi(prev, curr).reduce((tot, [, delta]) => tot + delta, 0);
}

/** catId → quanti capi sono comparsi da quando il socio ha guardato l'ultima volta */
export function incrementiPerCategoria(
  prev: SnapshotSpecie | null,
  curr: SnapshotSpecie,
): Record<string, number> {
  if (!prev) return {};
  return Object.fromEntries(incrementi(prev, curr));
}

export function leggiSnapshot(specieId: string): SnapshotSpecie | null {
  const raw = localStorage.getItem(PREFIX + specieId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (Object.values(parsed).some(v => typeof v !== 'number')) return null;
    return parsed as SnapshotSpecie;
  } catch {
    return null;
  }
}

export function salvaSnapshot(specieId: string, snap: SnapshotSpecie): void {
  try {
    localStorage.setItem(PREFIX + specieId, JSON.stringify(snap));
  } catch {
    // quota piena o storage negato: l'avviso è un di più, non deve rompere l'app
  }
}

/** Traduce le novità in avvisi leggibili per la bacheca, saltando le specie ferme.
 *  La data è `lastUpdated` della specie: la stessa che AssegnazioniScreen mostra in
 *  fondo al piano, scritta da handleToggleAbbattimento. Nessuna seconda verità. */
export function avvisiDaNovita(
  data: Record<string, SpecieData>,
  novita: Record<string, NovitaSpecie>,
): AvvisoNovita[] {
  const avvisi: AvvisoNovita[] = [];
  for (const [specieId, specie] of Object.entries(data)) {
    const n = novita[specieId];
    if (!specie?.categorie || !n || n.capi <= 0) continue;
    avvisi.push({ specieId, nomeSpecie: specie.nome, aggiornato: specie.lastUpdated });
  }
  return avvisi;
}
