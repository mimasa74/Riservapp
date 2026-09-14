/**
 * I punti che arrivano da `user_locations` sono una collezione piatta: un
 * documento per posizione ricevuta, di tutti i soci mescolati. La mappa ne
 * mostra **uno solo per telefono**, il più recente.
 *
 * Niente scia (deciso con Michele il 14 set 2026): i soci non sono quasi mai in
 * riserva tutti insieme, e quasi mai camminano con l'app aperta. Una linea fra
 * i punti prometteva un percorso che nei fatti non c'è: due puntini presi a
 * mezz'ora di distanza uniti da un segmento dritto raccontano una strada che
 * nessuno ha fatto. Resta il puntino di dove il socio è stato visto.
 */

export interface PuntoPosizione {
  deviceId: string;
  nome: string;
  lat: number;
  lng: number;
  /** Millisecondi. I punti ancora in viaggio verso il server non ce l'hanno. */
  ms: number | null;
}

export interface PosizioneSocio {
  deviceId: string;
  nome: string;
  ultimo: { lat: number; lng: number };
  /** Ora dell'ultimo punto, `9:12`, oppure stringa vuota se non si sa. */
  ora: string;
}

export function formatOra(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Quanto grande scrivere il nome sulla mappa, a seconda dello zoom.
 *
 * L'etichetta standard di Google resta sempre della stessa dimensione: zoomando
 * la montagna si ingrandisce e il nome no, finendo per essere un francobollo su
 * mezzo schermo. Qui il nome cresce con lo zoom, ma non in proporzione: al
 * satellite ogni livello raddoppia il terreno, e un nome raddoppiato a ogni
 * tacca coprirebbe la riserva. Estremi tenuti fermi: mai sotto i 15px (si
 * leggono anche a braccio teso), mai sopra i 40px.
 */
export function dimensioneNome(zoom: number): number {
  if (!Number.isFinite(zoom)) return 20;
  return Math.max(15, Math.min(40, Math.round(20 + (zoom - 14) * 3.5)));
}

export function raggruppaPerSocio(punti: PuntoPosizione[]): PosizioneSocio[] {
  const perDevice = new Map<string, PuntoPosizione>();

  for (const p of punti) {
    if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (!p.deviceId) continue;

    // Un punto appena scritto non ha ancora l'ora del server: è il più recente
    // per definizione, l'ha appena mandato questo telefono.
    const gia = perDevice.get(p.deviceId);
    if (!gia || piuRecente(p, gia)) perDevice.set(p.deviceId, p);
  }

  const posizioni: PosizioneSocio[] = [];
  for (const [deviceId, ultimo] of perDevice) {
    posizioni.push({
      deviceId,
      nome: ultimo.nome ?? '',
      ultimo: { lat: ultimo.lat, lng: ultimo.lng },
      ora: formatOra(ultimo.ms),
    });
  }

  // Ordine stabile fra soci: per nome, così la mappa non rimescola le etichette
  // a ogni punto nuovo.
  return posizioni.sort((a, b) => a.nome.localeCompare(b.nome));
}

function piuRecente(a: PuntoPosizione, b: PuntoPosizione): boolean {
  if (a.ms === null) return true;
  if (b.ms === null) return false;
  return a.ms > b.ms;
}
