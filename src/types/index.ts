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

export interface Post {
  id: string;
  tipo: 'normale' | 'avviso' | 'alert';
  testo: string;
  foto_url?: string | null;
  pdf_url?: string | null;
  data: number; // timestamp ms
}
