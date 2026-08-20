/**
 * Diario privato del Rettore, una voce per volta, separato per specie.
 *
 * Vive in `config/note_rettore`, un documento a parte da `config/main`: le
 * rules lo aprono solo all'admin, quindi il testo non arriva nemmeno sul
 * telefono del socio. Nasconderlo nella UI non sarebbe bastato — `config/main`
 * lo scarica per intero ogni dispositivo autenticato.
 */
export interface NotaRettore {
  id: string;
  /** già formattata, gg/mm/aaaa — l'anno serve: le note attraversano le stagioni */
  data: string;
  testo: string;
}

/** specieId → diario di quella specie, dalla più recente alla più vecchia */
export type NoteRettorePerSpecie = Record<string, NotaRettore[]>;

export function formatDataNota(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function creaNota(testo: string, quando: Date): NotaRettore {
  return {
    id: crypto.randomUUID(),
    data: formatDataNota(quando),
    testo: testo.trim(),
  };
}

/** L'ordine è quello dell'array, non la data: così non serve rileggere una
 *  stringa già formattata per capire quale voce viene prima. */
export function aggiungiNota(note: NotaRettore[], nota: NotaRettore): NotaRettore[] {
  return [nota, ...note];
}

export function rimuoviNota(note: NotaRettore[], id: string): NotaRettore[] {
  return note.filter(n => n.id !== id);
}

function isNota(v: unknown): v is NotaRettore {
  if (!v || typeof v !== 'object') return false;
  const n = v as Record<string, unknown>;
  return typeof n.id === 'string' && typeof n.data === 'string' && typeof n.testo === 'string';
}

/** Legge il diario di una specie da quello che arriva da Firestore, scartando
 *  quello che non è una nota: una voce sporca non deve far sparire la schermata. */
export function noteDiSpecie(doc: unknown, specieId: string): NotaRettore[] {
  if (!doc || typeof doc !== 'object') return [];
  const campo = (doc as Record<string, unknown>)[specieId];
  if (!Array.isArray(campo)) return [];
  return campo.filter(isNota);
}
