import { useEffect, useRef } from 'react';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface GeoState {
  deviceId: string;
  nome: string;
}

export function useGeolocation({ deviceId, nome }: GeoState): void {
  const polygonCoordsRef = useRef<number[][]>([]);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const isInsideRef = useRef<boolean>(false);

  useEffect(() => {
    if (!nome) return;
    if (localStorage.getItem('riservapp_geo') !== 'true') return;
    if (!('geolocation' in navigator)) return;

    // Carica il poligono da Firestore (formato: [{lat, lng}] → [[lng, lat]] per Turf)
    getDoc(doc(db, 'geofences', 'riserva-tuenno')).then(snap => {
      if (snap.exists()) {
        const raw = snap.data().coordinates as { lat: number; lng: number }[];
        polygonCoordsRef.current = raw.map(({ lat, lng }) => [lng, lat]);
      }
    });

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 30_000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [deviceId, nome]);

  async function handlePosition(pos: GeolocationPosition): Promise<void> {
    const { latitude: lat, longitude: lng } = pos.coords;
    const coords = polygonCoordsRef.current;

    const inside = isInsidePolygon(lat, lng, coords);

    if (!inside) {
      if (isInsideRef.current) {
        await deleteDoc(doc(db, 'user_locations', deviceId));
        isInsideRef.current = false;
        lastPositionRef.current = null;
        lastUpdateTimeRef.current = 0;
      }
      return;
    }

    // Calcola se aggiornare
    const now = Date.now();
    const last = lastPositionRef.current;
    const timeSince = now - lastUpdateTimeRef.current;

    const justEntered = !isInsideRef.current;
    const moved = last !== null && haversineDistance(lat, lng, last.lat, last.lng) >= 100;
    const interval = moved ? 15 * 60_000 : 30 * 60_000;
    const shouldUpdate = justEntered || timeSince >= interval;

    if (!shouldUpdate) return;

    await setDoc(doc(db, 'user_locations', deviceId), {
      deviceId,
      nome,
      lat,
      lng,
      timestamp: new Date(),
    });

    lastPositionRef.current = { lat, lng };
    lastUpdateTimeRef.current = now;
    isInsideRef.current = true;
  }
}
