import type { Categoria } from './index';

// ─── Etichette leggibili per le notifiche ────────────────────────────────────
// Senza la specie la notifica è ambigua: "MASCHI DI PRIMA CLASSE" esiste sia nel
// capriolo sia nel camoscio. E nel camoscio le 12 categorie sono duplicate nelle
// due subzone (prefissi cam1_ / cam2_) con lo stesso nome, quindi serve anche la zona.

const SPECIE_FALLBACK: Record<string, string> = {
  cervo: 'Cervo',
  capriolo: 'Capriolo',
  camoscio: 'Camoscio',
};

export function specieLabel(specieId: string, specieData: Record<string, unknown>): string {
  const nome = specieData?.nome;
  if (typeof nome === 'string' && nome.trim()) return nome.trim();
  return SPECIE_FALLBACK[specieId] ?? specieId;
}

export function zonaLabel(
  specieId: string,
  specieData: Record<string, unknown>,
  catId: string
): string | null {
  if (specieId !== 'camoscio') return null;
  const zones = specieData?.subZone;
  const list = Array.isArray(zones) ? (zones as { nome?: string }[]) : [];
  if (catId.startsWith('cam1_')) return list[0]?.nome ?? 'Zona 1';
  if (catId.startsWith('cam2_')) return list[1]?.nome ?? 'Zona 2';
  return null;
}

export function categoriaLabel(
  specieId: string,
  specieData: Record<string, unknown>,
  cat: Pick<Categoria, 'id' | 'nome'>
): string {
  const zona = zonaLabel(specieId, specieData, cat.id);
  return zona ? `${cat.nome} (${zona})` : cat.nome;
}
