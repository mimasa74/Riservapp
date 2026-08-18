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

// Titolo della notifica: la specie IN MAIUSCOLO, più la zona quando la specie
// ne ha (solo il camoscio).
//
// Il grassetto e il corpo più grande NON si possono impostare: l'API
// showNotification non accetta markup. È il sistema operativo a rendere il
// titolo in grassetto e più grande del corpo, sempre. Per questo la specie sta
// da sola qui: è l'unico modo di darle quel peso. Non spostarla nel corpo.

export function titoloNotifica(
  specieId: string,
  specieData: Record<string, unknown>,
  cat: Pick<Categoria, 'id'>
): string {
  const specie = specieLabel(specieId, specieData).toUpperCase();
  const zona = zonaLabel(specieId, specieData, cat.id);
  return zona ? `${specie} — ${zona}` : specie;
}

// Nome categoria in forma leggibile: i dati sono TUTTI IN MAIUSCOLO, ma nel
// corpo servono in caso normale, così lo stato in caps risalta per contrasto.
// Il maiuscolo pieno è anche più faticoso da leggere, e i soci sono anziani.

export function categoriaLeggibile(nomeCategoria: string): string {
  const t = nomeCategoria.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Corpo della notifica: categoria in caso normale, stato in maiuscolo.
// Il contrasto di maiuscole è l'unica evidenziazione possibile in una push.

export function corpoNotifica(
  cat: Pick<Categoria, 'nome'> & { badgeChiusura?: string },
  stato: 'chiuso' | 'sospeso'
): string {
  return `${categoriaLeggibile(cat.nome)} ${statoLabel(cat, stato)}`;
}


// Accordo di genere. La fonte è `badgeChiusura`, il campo che l'admin compila
// e che CategoryRow.tsx mostra già nel badge: stessa regola dell'app, non una
// seconda verità. Il fallback sul nome copre solo una categoria senza il campo.

export function statoLabel(
  cat: Pick<Categoria, 'nome'> & { badgeChiusura?: string },
  stato: 'chiuso' | 'sospeso'
): string {
  const badge = cat.badgeChiusura?.trim().toUpperCase();
  const femminile = badge
    ? badge === 'CHIUSE'
    : cat.nome.trim().toUpperCase().startsWith('FEMMINE');
  if (stato === 'chiuso') return femminile ? 'CHIUSE' : 'CHIUSI';
  return femminile ? 'SOSPESE' : 'SOSPESI';
}
