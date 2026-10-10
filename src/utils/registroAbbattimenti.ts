/**
 * Registro degli abbattimenti: un documento per ogni capo segnato dal Rettore,
 * in `registro_abbattimenti/{autoId}`. È il quaderno a fianco del piano —
 * i numeri restano quelli di `config/main`, qui c'è chi, quando e cosa.
 *
 * Le rules lo aprono al solo admin, come il diario: il nome del cacciatore non
 * deve arrivare sul telefono del socio. Vedi "Registro degli abbattimenti" in
 * AGENTS.md.
 */
import { SpecieData } from '../types';

export interface VoceRegistro {
  id: string;
  specieId: string;
  catId: string;
  /** nome della classe al momento del capo: un rename del piano non riscrive la storia */
  categoria: string;
  /** solo camoscio, dove le classi hanno lo stesso nome nelle due zone */
  zona: string | null;
  cacciatore: string;
  note: string;
  /** ora del server; null finché la scrittura non è confermata */
  quando: Date | null;
  /** anno del piano (`SpecieData.anno`): "Nuova stagione" azzera il piano, non il registro */
  stagione: string;
}

/** Stessa regola di SettingsScreen e di functions/src/labels.ts: cam1_ / cam2_. */
export function zonaDi(specie: Pick<SpecieData, 'subZone'>, catId: string): string | null {
  const zone = specie.subZone;
  if (!zone) return null;
  if (catId.startsWith('cam1_')) return zone[0]?.nome ?? 'Zona 1';
  if (catId.startsWith('cam2_')) return zone[1]?.nome ?? 'Zona 2';
  return null;
}

export function stagioneDi(specie: Pick<SpecieData, 'anno'>): string {
  return specie.anno ?? '2026';
}

/**
 * Cosa fa un tocco su un quadratino. Ogni tocco sposta di un capo solo
 * (deciso con Michele il 9 ott 2026): ogni capo ha bisogno del suo nome,
 * quindi toccare il quinto quadratino vuoto aggiunge il prossimo, non tre.
 * Un quadratino pieno, qualunque sia, toglie l'ultimo capo.
 */
export function azioneTocco(
  cat: { abbattuti: number; totale: number },
  index: number,
): 'aggiungi' | 'togli' | null {
  if (index < cat.abbattuti) return cat.abbattuti > 0 ? 'togli' : null;
  return cat.abbattuti < cat.totale ? 'aggiungi' : null;
}

function asDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (v && typeof (v as { toDate?: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return null;
}

/** Legge un documento Firestore; una voce sporca si scarta invece di far saltare la schermata. */
export function voceDaDocumento(id: string, raw: unknown): VoceRegistro | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : null);
  const specieId = str('specieId');
  const catId = str('catId');
  const categoria = str('categoria');
  const cacciatore = str('cacciatore');
  const stagione = str('stagione');
  if (!specieId || !catId || !categoria || !cacciatore || !stagione) return null;
  return {
    id, specieId, catId, categoria, cacciatore, stagione,
    zona: str('zona'),
    note: str('note') ?? '',
    quando: asDate(r.quando),
  };
}

/** Dal più recente al più vecchio; le voci ancora senza ora del server stanno in cima. */
export function ordinaVoci(voci: VoceRegistro[]): VoceRegistro[] {
  const t = (v: VoceRegistro) => v.quando?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...voci].sort((a, b) => t(b) - t(a));
}

/** La voce che una correzione del Rettore deve cancellare: l'ultima di quella classe. */
export function ultimaVoceDi(
  voci: VoceRegistro[], specieId: string, catId: string, stagione: string,
): VoceRegistro | null {
  return ordinaVoci(voci).find(v =>
    v.specieId === specieId && v.catId === catId && v.stagione === stagione,
  ) ?? null;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export function formatGiorno(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatOra(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function stessoGiorno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Voci del giorno di `oggi`. Una voce appena scritta, ancora senza ora del server, è di oggi. */
export function vociDelGiorno(voci: VoceRegistro[], oggi: Date): VoceRegistro[] {
  return ordinaVoci(voci).filter(v => !v.quando || stessoGiorno(v.quando, oggi));
}

/** Raggruppa per giorno, dal più recente; l'ordine dentro il giorno è dal più recente. */
export function vociPerGiorno(voci: VoceRegistro[]): { giorno: string; voci: VoceRegistro[] }[] {
  const gruppi: { giorno: string; voci: VoceRegistro[] }[] = [];
  for (const v of ordinaVoci(voci)) {
    const giorno = v.quando ? formatGiorno(v.quando) : 'In salvataggio';
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.giorno === giorno) ultimo.voci.push(v);
    else gruppi.push({ giorno, voci: [v] });
  }
  return gruppi;
}

const NOMI_SPECIE: Record<string, string> = {
  capriolo: 'Capriolo', cervo: 'Cervo', camoscio: 'Camoscio',
};

export function nomeSpecie(specieId: string): string {
  return NOMI_SPECIE[specieId] ?? specieId;
}

/** Una riga del report: quello che Michele ricopia sul sito dell'Associazione. */
export function rigaReport(v: VoceRegistro): string {
  const ora = v.quando ? `${formatGiorno(v.quando)} ${formatOra(v.quando)}` : 'in salvataggio';
  const classe = v.zona ? `${v.categoria} (${v.zona})` : v.categoria;
  const base = `${ora} — ${v.cacciatore} — ${nomeSpecie(v.specieId)}, ${classe}`;
  return v.note.trim() ? `${base} — ${v.note.trim()}` : base;
}

/** Testo da copiare negli appunti: una riga per capo, dal più vecchio, come si ricopiano. */
export function testoReport(voci: VoceRegistro[]): string {
  return ordinaVoci(voci).reverse().map(rigaReport).join('\n');
}

/**
 * Capi della stagione che il piano conta ma il registro non conosce: quelli
 * segnati prima che il registro esistesse. Per specie, mai sotto zero.
 */
export function capiSenzaRegistro(
  data: Record<string, Pick<SpecieData, 'categorie' | 'anno'>>,
  voci: VoceRegistro[],
): number {
  let totale = 0;
  for (const [specieId, sp] of Object.entries(data)) {
    if (!sp?.categorie) continue;
    const stagione = stagioneDi(sp);
    const nelPiano = sp.categorie.reduce((s, c) => s + (c.abbattuti ?? 0), 0);
    const nelRegistro = voci.filter(v => v.specieId === specieId && v.stagione === stagione).length;
    totale += Math.max(nelPiano - nelRegistro, 0);
  }
  return totale;
}
