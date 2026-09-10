import { useEffect, useRef } from 'react';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';
import { db } from '../firebase';

// ─── Funzioni pure (esportate per i test) ────────────────────────────────────

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsidePolygon(lat: number, lng: number, coords: number[][]): boolean {
  if (!coords || coords.length < 4) return false;
  try {
    const pt = point([lng, lat]);
    const poly = polygon([coords]);
    return booleanPointInPolygon(pt, poly);
  } catch {
    return false;
  }
}

export type EsitoFix = 'aspetta-poligono' | 'fuori' | 'troppo-presto' | 'scrivi';

/**
 * Cosa fare di una posizione appena arrivata dal GPS.
 *
 * `aspetta-poligono` è il caso che fino al 10 set 2026 non esisteva e faceva
 * sparire i soci dalla mappa: il confine della riserva arriva da Firestore con
 * una lettura asincrona, e chi apre l'app un attimo in montagna, con la rete
 * lenta, riceve il primo fix GPS prima del confine. Senza confine ogni
 * posizione risultava "fuori riserva" e veniva buttata via in silenzio. Il fix
 * va tenuto da parte e rivalutato quando il confine arriva.
 */
export function valutaFix(input: {
  poligonoPronto: boolean;
  dentro: boolean;
  eraDentro: boolean;
  ultimaPosizione: { lat: number; lng: number } | null;
  lat: number;
  lng: number;
  adesso: number;
  ultimoInvio: number;
}): EsitoFix {
  if (!input.poligonoPronto) return 'aspetta-poligono';
  if (!input.dentro) return 'fuori';

  // Appena entrato: si scrive subito, altrimenti il socio comparirebbe sulla
  // mappa un quarto d'ora dopo essere arrivato.
  if (!input.eraDentro) return 'scrivi';

  const last = input.ultimaPosizione;
  const mosso = last !== null && haversineDistance(input.lat, input.lng, last.lat, last.lng) >= 100;
  const intervallo = mosso ? 15 * 60_000 : 30 * 60_000;
  return input.adesso - input.ultimoInvio >= intervallo ? 'scrivi' : 'troppo-presto';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface GeoState {
  deviceId: string;
  nome: string;
}

const TENTATIVI_POLIGONO = 3;
const ATTESA_FRA_TENTATIVI_MS = 3000;

export function useGeolocation({ deviceId, nome }: GeoState): void {
  const polygonCoordsRef = useRef<number[][]>([]);
  const polygonReadyRef = useRef(false);
  const fixInAttesaRef = useRef<GeolocationPosition | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const isInsideRef = useRef<boolean>(false);

  useEffect(() => {
    if (!nome) return;
    if (localStorage.getItem('riservapp_geo') !== 'true') return;
    if (!('geolocation' in navigator)) return;

    let annullato = false;

    // Carica il poligono da Firestore (formato: [{lat, lng}] → [[lng, lat]] per Turf).
    // Con qualche tentativo: se la lettura fallisce e basta, il telefono non
    // scrive nessuna posizione per tutta la sessione senza dirlo a nessuno.
    (async () => {
      for (let i = 0; i < TENTATIVI_POLIGONO && !annullato; i++) {
        try {
          const snap = await getDoc(doc(db, 'geofences', 'riserva-tuenno'));
          if (annullato) return;
          if (snap.exists()) {
            const raw = snap.data().coordinates as { lat: number; lng: number }[];
            polygonCoordsRef.current = raw.map(({ lat, lng }) => [lng, lat]);
            polygonReadyRef.current = true;
            // Il fix arrivato prima del confine non si butta via: si rivaluta ora.
            const inAttesa = fixInAttesaRef.current;
            fixInAttesaRef.current = null;
            if (inAttesa) void handlePosition(inAttesa);
            return;
          }
        } catch (err) {
          console.warn('Poligono riserva non caricato, ritento:', err);
        }
        await new Promise(r => setTimeout(r, ATTESA_FRA_TENTATIVI_MS));
      }
    })();

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 30_000 }
    );

    return () => {
      annullato = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [deviceId, nome]);

  async function handlePosition(pos: GeolocationPosition): Promise<void> {
    const { latitude: lat, longitude: lng } = pos.coords;

    const esito = valutaFix({
      poligonoPronto: polygonReadyRef.current,
      dentro: isInsidePolygon(lat, lng, polygonCoordsRef.current),
      eraDentro: isInsideRef.current,
      ultimaPosizione: lastPositionRef.current,
      lat,
      lng,
      adesso: Date.now(),
      ultimoInvio: lastUpdateTimeRef.current,
    });

    if (esito === 'aspetta-poligono') {
      fixInAttesaRef.current = pos;
      return;
    }

    if (esito === 'fuori') {
      // Fuori riserva non si scrive nulla, così non si registra dove abita un
      // socio. I punti già presi dentro NON si cancellano più: li toglie la
      // pulizia dopo 35 minuti, e nel frattempo sono la scia sulla mappa.
      isInsideRef.current = false;
      lastPositionRef.current = null;
      lastUpdateTimeRef.current = 0;
      return;
    }

    if (esito === 'troppo-presto') return;

    // Un documento per punto: la scia è fatta di punti, non di un puntino
    // sovrascritto. L'ora la mette il server: un telefono con l'orologio
    // sballato metterebbe i punti in disordine e scamperebbe alla pulizia.
    await addDoc(collection(db, 'user_locations'), {
      deviceId,
      nome,
      lat,
      lng,
      timestamp: serverTimestamp(),
    });

    lastPositionRef.current = { lat, lng };
    lastUpdateTimeRef.current = Date.now();
    isInsideRef.current = true;
  }
}
