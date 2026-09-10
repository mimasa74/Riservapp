/**
 * I punti che arrivano da `user_locations` sono una collezione piatta: un
 * documento per posizione ricevuta, di tutti i soci mescolati. La mappa li
 * vuole invece raggruppati per telefono, in ordine di tempo, per disegnare la
 * scia di ognuno.
 *
 * Con la cancellazione dopo 35 minuti la scia è la mezz'ora appena passata, non
 * il giro della giornata: chi apre l'app un minuto resta un puntino solo.
 */

export interface PuntoPosizione {
  deviceId: string;
  nome: string;
  lat: number;
  lng: number;
  /** Millisecondi. I punti ancora in viaggio verso il server non ce l'hanno. */
  ms: number | null;
}

export interface ScienSocio {
  deviceId: string;
  nome: string;
  /** In ordine di tempo, dal più vecchio al più recente. */
  punti: { lat: number; lng: number }[];
  ultimo: { lat: number; lng: number };
  /** Ora dell'ultimo punto, `9:12`, oppure stringa vuota se non si sa. */
  ora: string;
}

export function formatOra(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function raggruppaPerSocio(punti: PuntoPosizione[]): ScienSocio[] {
  const perDevice = new Map<string, PuntoPosizione[]>();

  for (const p of punti) {
    if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
    if (!p.deviceId) continue;
    const lista = perDevice.get(p.deviceId);
    if (lista) lista.push(p); else perDevice.set(p.deviceId, [p]);
  }

  const scie: ScienSocio[] = [];

  for (const [deviceId, lista] of perDevice) {
    // Un punto appena scritto non ha ancora l'ora del server: va in fondo, è il
    // più recente per definizione.
    const ordinati = [...lista].sort((a, b) => {
      if (a.ms === null) return 1;
      if (b.ms === null) return -1;
      return a.ms - b.ms;
    });

    const ultimo = ordinati[ordinati.length - 1];
    scie.push({
      deviceId,
      nome: ultimo.nome ?? '',
      punti: ordinati.map(p => ({ lat: p.lat, lng: p.lng })),
      ultimo: { lat: ultimo.lat, lng: ultimo.lng },
      ora: formatOra(ultimo.ms),
    });
  }

  // Ordine stabile fra soci: per nome, così la mappa non rimescola le etichette
  // a ogni punto nuovo.
  return scie.sort((a, b) => a.nome.localeCompare(b.nome));
}
