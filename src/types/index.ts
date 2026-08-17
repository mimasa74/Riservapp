export type CategoriaStato = 'aperto' | 'sospeso' | 'chiuso';

export interface Categoria {
  id: string;
  nome: string;
  descrizione?: string;
  badgeChiusura: string;
  totale: number;
  abbattuti: number;
  stato: CategoriaStato;
}

export interface RuotaData {
  testo?: string;
  foto?: string[];
}

export interface SpecieData {
  id: string;
  nome: string;
  nomeInglese: string;
  logoUrl: string;
  categorie: Categoria[];
  subZone?: { id: string; nome: string }[];
  note: string;
  alert: string;
  ruota: RuotaData;
  anno?: string;
  penalita?: string;
  lastUpdated?: string;
}

export type AppData = Record<string, SpecieData>;

export interface Members {
  nomi: string[];
  direttivo: string[];
}

// mappa normalizedName → deviceId (slot libero = chiave assente;
// null può comparire solo come residuo legacy, trattato come libero)
export type Slots = Record<string, string | null>;

export interface Post {
  id: string;
  tipo: 'normale' | 'avviso' | 'alert';
  testo: string;
  foto_url?: string | null;
  pdf_url?: string | null;
  foto_width?: number;
  foto_height?: number;
  data: number; // timestamp ms
  letti?: string[]; // nomi dei soci che hanno letto
  autore?: string; // chi ha pubblicato (Rettore o 'Sistema' per i post automatici)
  noPush?: boolean; // post di sistema: la push è già stata inviata da onConfigUpdate
}
