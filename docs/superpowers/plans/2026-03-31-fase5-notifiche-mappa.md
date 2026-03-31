# Fase 5 — Notifiche Push + Mappa con Geofencing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere notifiche push FCM (5 eventi) e mappa real-time con geofencing (solo Rettore) a RiservApp.

**Architecture:** Cloud Functions Firebase v2 gestiscono l'invio push server-side. Il geofencing gira client-side (Turf.js). Le posizioni vivono in Firestore `/user_locations/{deviceId}` con TTL automatico via Cloud Function scheduled. Un deviceId UUID generato al primo avvio identifica ogni dispositivo senza richiedere login.

**Tech Stack:** React 19 + TypeScript + Vite, Firebase v12 (FCM, Firestore, Functions), @react-google-maps/api, @turf/boolean-point-in-polygon, Vitest (test funzioni pure).

---

## Mappa file

### Nuovi
| File | Responsabilità |
|------|---------------|
| `public/firebase-messaging-sw.js` | Riceve push FCM con app chiusa |
| `functions/src/index.ts` | Cloud Functions: notifiche + TTL cleanup |
| `functions/package.json` | Dipendenze Cloud Functions |
| `functions/tsconfig.json` | Compilazione TypeScript per Functions |
| `firebase.json` | Config Firebase CLI (rules + functions) |
| `.firebaserc` | Progetto Firebase default |
| `src/hooks/useFCM.ts` | Richiesta permesso notifiche + salvataggio token |
| `src/hooks/useGeolocation.ts` | Geofencing client-side + aggiornamento posizione smart |
| `src/hooks/useGeolocation.test.ts` | Test Vitest per funzioni pure |
| `src/components/MappaScreen.tsx` | Mappa Google Maps (solo Rettore) |

### Modificati
| File | Modifica |
|------|----------|
| `src/firebase.ts` | Aggiunge export `messaging` |
| `src/App.tsx` | DeviceId, init FCM+geo dopo nome, routing MappaScreen |
| `src/components/Header.tsx` | Aggiunge icona mappa per admin |
| `firestore.rules` | Regole per `fcm_tokens`, `user_locations`, `geofences`, `posts`, `config` |
| `.env.local` | Aggiunge `VITE_FCM_VAPID_KEY`, `VITE_GOOGLE_MAPS_API_KEY` |

---

## Task 1: Foundation — DeviceId + variabili ambiente

**Files:**
- Modify: `src/App.tsx`
- Modify: `.env.local`
- Create: `firebase.json`
- Create: `.firebaserc`

- [ ] **Step 1: Aggiungi funzione getOrCreateDeviceId in App.tsx**

Aggiungi questa funzione in cima a `MainApp()`, prima degli altri useState:

```typescript
function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem('riservapp_device_id')
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem('riservapp_device_id', id)
  return id
}
```

Poi nel corpo di `MainApp`, aggiungi PRIMA di tutti gli useState:
```typescript
const deviceId = getOrCreateDeviceId()
```

- [ ] **Step 2: Crea firebase.json**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log"]
    }
  ]
}
```

- [ ] **Step 3: Crea .firebaserc**

```json
{
  "projects": {
    "default": "riservapp-6054c"
  }
}
```

- [ ] **Step 4: Aggiungi variabili in .env.local**

Apri `.env.local` e aggiungi in fondo:
```
VITE_FCM_VAPID_KEY=FILL_IN_STEP_BELOW
VITE_GOOGLE_MAPS_API_KEY=FILL_IN_STEP_BELOW
```

**Come ottenere VITE_FCM_VAPID_KEY:**
1. Vai su https://console.firebase.google.com → progetto `riservapp-6054c`
2. Impostazioni progetto → Cloud Messaging → sezione "Web Push certificates"
3. Clicca "Generate key pair"
4. Copia la chiave e sostituisci `FILL_IN_STEP_BELOW`

**Come ottenere VITE_GOOGLE_MAPS_API_KEY:**
1. Vai su https://console.cloud.google.com
2. Seleziona o crea un progetto
3. API & Services → Enable APIs → cerca "Maps JavaScript API" → Enable
4. Credentials → Create Credentials → API Key
5. Copia la chiave e sostituisci `FILL_IN_STEP_BELOW`

- [ ] **Step 5: Verifica che il deviceId venga generato aprendo l'app**

```bash
npx tsx server.ts
```

Apri `http://localhost:3000`, apri DevTools → Application → Local Storage → `riservapp_device_id` deve essere presente (UUID del tipo `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`).

---

## Task 2: Firebase FCM init + Service Worker

**Files:**
- Modify: `src/firebase.ts`
- Create: `public/firebase-messaging-sw.js`

- [ ] **Step 1: Aggiungi messaging a firebase.ts**

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
```

- [ ] **Step 2: Leggi i valori da .env.local**

Apri `.env.local`. Prendi nota di:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Ti servono per il prossimo step.

- [ ] **Step 3: Crea public/firebase-messaging-sw.js**

Sostituisci i tre valori `PASTE_FROM_ENV_LOCAL_...` con quelli letti nel step precedente:

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'PASTE_FROM_ENV_LOCAL_VITE_FIREBASE_API_KEY',
  authDomain: 'riservapp-6054c.firebaseapp.com',
  projectId: 'riservapp-6054c',
  storageBucket: 'riservapp-6054c.firebasestorage.app',
  messagingSenderId: 'PASTE_FROM_ENV_LOCAL_VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'PASTE_FROM_ENV_LOCAL_VITE_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Riserva Tuenno';
  const body = payload.notification?.body || '';
  const isAlert = payload.data?.priority === 'high';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    vibrate: isAlert ? [200, 100, 200, 100, 200] : [100],
    requireInteraction: isAlert,
  });
});
```

- [ ] **Step 4: Verifica service worker**

Avvia l'app, apri DevTools → Application → Service Workers. Dopo il Task 3 (useFCM) il service worker `firebase-messaging-sw.js` apparirà come "activated and is running".

---

## Task 3: useFCM hook

**Files:**
- Create: `src/hooks/useFCM.ts`

- [ ] **Step 1: Crea src/hooks/useFCM.ts**

```typescript
import { getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db } from '../firebase';

export async function initFCM(deviceId: string, nome: string): Promise<void> {
  const supported = await isSupported();
  if (!supported) return;

  const permission = await Notification.requestPermission();
  localStorage.setItem('riservapp_fcm', permission === 'granted' ? 'granted' : 'denied');
  if (permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (!token) return;

    await setDoc(doc(db, 'fcm_tokens', deviceId), {
      deviceId,
      nome,
      token,
      timestamp: new Date(),
    });
  } catch (err) {
    console.warn('FCM init failed:', err);
  }
}
```

- [ ] **Step 2: Commit parziale**

```bash
git add src/firebase.ts public/firebase-messaging-sw.js src/hooks/useFCM.ts
git commit -m "feat: FCM init — messaging export, service worker, useFCM hook"
```

---

## Task 4: Setup Cloud Functions

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/index.ts` (scheletro)

- [ ] **Step 1: Crea functions/package.json**

```json
{
  "name": "riservapp-functions",
  "private": true,
  "scripts": {
    "build": "tsc",
    "deploy": "npm run build && firebase deploy --only functions"
  },
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Crea functions/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2020",
    "esModuleInterop": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 3: Crea functions/src/index.ts — scheletro con helper**

```typescript
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();

// ─── Helper: invia push a tutti i token FCM registrati ───────────────────────

interface FcmToken {
  deviceId: string;
  nome: string;
  token: string;
}

async function sendPushToAll(
  title: string,
  body: string,
  priority: 'high' | 'normal' = 'normal'
): Promise<void> {
  const snap = await getFirestore().collection('fcm_tokens').get();
  const docs = snap.docs;
  const tokens = docs.map(d => (d.data() as FcmToken).token).filter(Boolean);
  if (!tokens.length) return;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      priority: priority === 'high' ? 'high' : 'normal',
      notification: {
        sound: 'default',
        channelId: priority === 'high' ? 'riservapp_alert' : 'riservapp_default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          'interruption-level': priority === 'high' ? 'time-sensitive' : 'active',
        },
      },
      headers: { 'apns-priority': priority === 'high' ? '10' : '5' },
    },
    data: { priority },
  });

  // Rimuovi token non validi
  const invalid: number[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalid.push(i);
      }
    }
  });

  if (invalid.length > 0) {
    const batch = getFirestore().batch();
    invalid.forEach(i => batch.delete(docs[i].ref));
    await batch.commit();
  }
}

// Le Cloud Functions vengono aggiunte nei task successivi
export {};
```

- [ ] **Step 4: Installa dipendenze Cloud Functions**

```bash
cd functions && npm install && cd ..
```

Expected output: `added N packages` senza errori.

- [ ] **Step 5: Verifica compilazione TypeScript**

```bash
cd functions && npm run build && cd ..
```

Expected output: nessun errore TypeScript, cartella `functions/lib/` creata.

---

## Task 5: Cloud Function — Notifiche Post

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Aggiungi onPostCreate in functions/src/index.ts**

Sostituisci `export {};` con:

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

// ─── Trigger: nuovo post in bacheca ──────────────────────────────────────────

export const onPostCreate = onDocumentCreated('posts/{postId}', async (event) => {
  const post = event.data?.data();
  if (!post) return;

  const tipo: 'normale' | 'avviso' | 'alert' = post.tipo;
  const testo: string = post.testo || '';
  const preview = testo.substring(0, 80);

  if (tipo === 'alert') {
    await sendPushToAll('🚨 ALERT — Riserva Tuenno', preview, 'high');
  } else if (tipo === 'avviso') {
    await sendPushToAll('⚠️ Avviso — Riserva Tuenno', preview, 'normal');
  } else {
    await sendPushToAll('Riserva Tuenno', preview, 'normal');
  }
});
```

- [ ] **Step 2: Verifica compilazione**

```bash
cd functions && npm run build && cd ..
```

Expected: nessun errore.

---

## Task 6: Cloud Function — Notifiche Categoria (quota + sospeso)

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Aggiungi i tipi Categoria in functions/src/index.ts**

Aggiungi dopo `initializeApp()`:

```typescript
interface Categoria {
  id: string;
  nome: string;
  abbattuti: number;
  totale: number;
  stato: 'aperto' | 'sospeso' | 'chiuso';
}
```

- [ ] **Step 2: Aggiungi helper extractCategorie**

Aggiungi dopo l'interfaccia Categoria:

```typescript
function extractCategorie(specieData: Record<string, unknown>): Categoria[] {
  const cats = specieData?.categorie;
  if (Array.isArray(cats)) return cats as Categoria[];
  return [];
}
```

- [ ] **Step 3: Aggiungi onConfigUpdate in functions/src/index.ts**

Aggiungi dopo `onPostCreate`:

```typescript
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const onConfigUpdate = onDocumentUpdated('config/main', async (event) => {
  const before = event.data?.before.data() as Record<string, Record<string, unknown>> | undefined;
  const after = event.data?.after.data() as Record<string, Record<string, unknown>> | undefined;
  if (!before || !after) return;

  const species = ['cervo', 'capriolo', 'camoscio'];

  for (const specieId of species) {
    const beforeCats = extractCategorie(before[specieId] ?? {});
    const afterCats = extractCategorie(after[specieId] ?? {});

    for (let i = 0; i < afterCats.length; i++) {
      const b = beforeCats[i];
      const a = afterCats[i];
      if (!b || !a) continue;

      // Quota raggiunta (abbattuti appena arrivato a totale)
      if (a.totale > 0 && a.abbattuti === a.totale && b.abbattuti !== b.totale) {
        await sendPushToAll(
          'Quota raggiunta',
          `${a.nome}: ${a.abbattuti}/${a.totale} capi abbattuti`,
          'normal'
        );
      }

      // Categoria sospesa
      if (a.stato === 'sospeso' && b.stato !== 'sospeso') {
        await sendPushToAll(
          'Categoria sospesa',
          `${a.nome} è stata sospesa`,
          'normal'
        );
      }
    }
  }
});
```

- [ ] **Step 4: Verifica compilazione**

```bash
cd functions && npm run build && cd ..
```

Expected: nessun errore.

---

## Task 7: Cloud Function — TTL cleanup posizioni (GDPR)

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Aggiungi onSchedule import e TTL function**

Aggiungi in testa agli import in `functions/src/index.ts`:
```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp } from 'firebase-admin/firestore';
```

Aggiungi dopo `onConfigUpdate`:

```typescript
// ─── Scheduled: elimina posizioni più vecchie di 35 minuti (GDPR) ─────────

export const cleanupOldLocations = onSchedule('every 10 minutes', async () => {
  const cutoff = new Date(Date.now() - 35 * 60 * 1000);
  const snap = await getFirestore()
    .collection('user_locations')
    .where('timestamp', '<', Timestamp.fromDate(cutoff))
    .get();

  if (snap.empty) return;

  const batch = getFirestore().batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();

  console.log(`Deleted ${snap.size} stale location(s)`);
});
```

- [ ] **Step 2: Verifica compilazione finale Cloud Functions**

```bash
cd functions && npm run build && cd ..
```

Expected: nessun errore, `functions/lib/index.js` aggiornato.

- [ ] **Step 3: Commit Cloud Functions**

```bash
git add functions/ firebase.json .firebaserc
git commit -m "feat: Cloud Functions — push notifiche post, quota, sospeso, TTL geo"
```

---

## Task 8: Setup Vitest + test funzioni pure

**Files:**
- Modify: `vite.config.ts`
- Create: `src/hooks/useGeolocation.test.ts`

> Questo task testa solo le funzioni pure (haversine, point-in-polygon). Il browser Geolocation API viene testato manualmente.

- [ ] **Step 1: Installa Vitest**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Aggiungi test config in vite.config.ts**

Leggi `vite.config.ts` e aggiungi la sezione `test`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 3: Installa dipendenze test geolocation**

```bash
npm install @turf/boolean-point-in-polygon @turf/helpers
```

- [ ] **Step 4: Scrivi i test failing**

Crea `src/hooks/useGeolocation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { haversineDistance, isInsidePolygon } from './useGeolocation'

// Coordinate reali approssimate per i test
// Tuenno centro: lat 46.41, lng 11.07
// Poligono test: quadrato 1km attorno a Tuenno
const TEST_POLYGON: number[][] = [
  [11.06, 46.40],
  [11.08, 46.40],
  [11.08, 46.42],
  [11.06, 46.42],
  [11.06, 46.40], // chiuso
]

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(46.41, 11.07, 46.41, 11.07)).toBe(0)
  })

  it('returns approximately 111km per degree of latitude', () => {
    const dist = haversineDistance(0, 0, 1, 0)
    expect(dist).toBeGreaterThan(110000)
    expect(dist).toBeLessThan(112000)
  })

  it('detects movement of ~100m correctly', () => {
    // ~0.001 degree latitude ≈ 111m
    const dist = haversineDistance(46.41, 11.07, 46.411, 11.07)
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(150)
  })
})

describe('isInsidePolygon', () => {
  it('returns true for a point inside the polygon', () => {
    // Centro del quadrato
    expect(isInsidePolygon(46.41, 11.07, TEST_POLYGON)).toBe(true)
  })

  it('returns false for a point outside the polygon', () => {
    // Chiaramente fuori
    expect(isInsidePolygon(46.50, 11.20, TEST_POLYGON)).toBe(false)
  })

  it('returns false for empty polygon', () => {
    expect(isInsidePolygon(46.41, 11.07, [])).toBe(false)
  })
})
```

- [ ] **Step 5: Esegui test per verificare che falliscano**

```bash
npx vitest run src/hooks/useGeolocation.test.ts
```

Expected: FAIL — `haversineDistance` e `isInsidePolygon` not found.

---

## Task 9: useGeolocation hook

**Files:**
- Create: `src/hooks/useGeolocation.ts`

- [ ] **Step 1: Crea src/hooks/useGeolocation.ts**

```typescript
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

    // Carica il poligono da Firestore
    getDoc(doc(db, 'geofences', 'riserva-tuenno')).then(snap => {
      if (snap.exists()) {
        polygonCoordsRef.current = snap.data().coordinates as number[][];
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
        // Appena uscito dalla riserva
        await deleteDoc(doc(db, 'user_locations', deviceId));
        isInsideRef.current = false;
        lastPositionRef.current = null;
        lastUpdateTimeRef.current = 0;
      }
      return;
    }

    // È dentro la riserva — calcola se aggiornare
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
```

- [ ] **Step 2: Esegui i test**

```bash
npx vitest run src/hooks/useGeolocation.test.ts
```

Expected:
```
✓ haversineDistance > returns 0 for identical coordinates
✓ haversineDistance > returns approximately 111km per degree of latitude
✓ haversineDistance > detects movement of ~100m correctly
✓ isInsidePolygon > returns true for a point inside the polygon
✓ isInsidePolygon > returns false for a point outside the polygon
✓ isInsidePolygon > returns false for empty polygon

Test Files  1 passed (1)
Tests       6 passed (6)
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGeolocation.ts src/hooks/useGeolocation.test.ts vite.config.ts package.json package-lock.json
git commit -m "feat: useGeolocation hook con geofencing Turf.js + test Vitest"
```

---

## Task 10: MappaScreen

**Files:**
- Create: `src/components/MappaScreen.tsx`

- [ ] **Step 1: Installa @react-google-maps/api**

```bash
npm install @react-google-maps/api
```

- [ ] **Step 2: Crea src/components/MappaScreen.tsx**

```typescript
import React, { useEffect, useState } from 'react';
import { GoogleMap, Polygon, Marker, useLoadScript } from '@react-google-maps/api';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface HunterPosition {
  deviceId: string;
  nome: string;
  lat: number;
  lng: number;
}

interface MappaScreenProps {
  onBack: () => void;
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const TUENNO_CENTER = { lat: 46.41, lng: 11.07 };

export const MappaScreen = ({ onBack }: MappaScreenProps) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [hunters, setHunters] = useState<HunterPosition[]>([]);
  const [polygonPath, setPolygonPath] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    // Carica poligono riserva
    getDoc(doc(db, 'geofences', 'riserva-tuenno')).then(snap => {
      if (snap.exists()) {
        const coords = snap.data().coordinates as number[][];
        // GeoJSON: [lng, lat] → Google Maps: {lat, lng}
        setPolygonPath(coords.map(([lng, lat]) => ({ lat, lng })));
      }
    });

    // Ascolta posizioni in real-time
    const unsub = onSnapshot(collection(db, 'user_locations'), snap => {
      setHunters(snap.docs.map(d => d.data() as HunterPosition));
    });
    return unsub;
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: '#EDEEE6' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: '#ECEDE1',
        borderBottom: '1px solid #d0d5c4',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#5C6B3A', padding: 4, display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{
          fontFamily: '-apple-system, sans-serif',
          fontWeight: 700, fontSize: 14,
          color: '#1A1A14', letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Mappa Riserva
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12, color: '#6B6B5A',
          fontFamily: '-apple-system, sans-serif',
        }}>
          {hunters.length} {hunters.length === 1 ? 'cacciatore' : 'cacciatori'} in riserva
        </span>
      </div>

      {/* Mappa */}
      <div style={{ flex: 1 }}>
        {loadError && (
          <div style={{ padding: 24, textAlign: 'center', color: '#8B1A1A' }}>
            Errore caricamento mappa. Verifica la API key Google Maps.
          </div>
        )}
        {!isLoaded && !loadError && (
          <div style={{ padding: 24, textAlign: 'center', color: '#6B6B5A' }}>
            Caricamento mappa...
          </div>
        )}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={TUENNO_CENTER}
            zoom={13}
            options={{
              mapTypeId: 'terrain',
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {polygonPath.length > 0 && (
              <Polygon
                paths={polygonPath}
                options={{
                  strokeColor: '#5C6B3A',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: '#5C6B3A',
                  fillOpacity: 0.08,
                }}
              />
            )}
            {hunters.map(h => (
              <Marker
                key={h.deviceId}
                position={{ lat: h.lat, lng: h.lng }}
                label={{
                  text: h.nome,
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#1A1A14',
                }}
                title={h.nome}
              />
            ))}
          </GoogleMap>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Build check**

```bash
npm run lint
```

Expected: nessun errore TypeScript.

---

## Task 11: Header — icona mappa + App routing

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Aggiungi prop onOpenMappa in Header.tsx**

Modifica l'interfaccia `HeaderProps`:

```typescript
interface HeaderProps {
  nome: string;
  nomeInglese?: string;
  logoUrl: string;
  year?: string;
  onOpenSettings?: () => void;
  onOpenMappa?: () => void;  // ← aggiunta
}
```

Aggiorna la firma della funzione:
```typescript
export const Header = ({ nome, nomeInglese, logoUrl, year = '2026', onOpenSettings, onOpenMappa }: HeaderProps) => {
```

- [ ] **Step 2: Aggiungi pulsante mappa accanto all'ingranaggio in Header.tsx**

Trova il blocco `{isAdmin && onOpenSettings && (` e sostituiscilo con:

```typescript
{isAdmin && (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
    {onOpenMappa && (
      <button
        onClick={onOpenMappa}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 8, color: '#5C6B3A',
        }}
        title="Mappa"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      </button>
    )}
    {onOpenSettings && (
      <button
        onClick={onOpenSettings}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 8, color: '#5C6B3A',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    )}
  </div>
)}
```

- [ ] **Step 3: Aggiungi stato showMappa in App.tsx**

Nel corpo di `MainApp`, aggiungi dopo `const [showSettings, setShowSettings] = useState(false)`:

```typescript
const [showMappa, setShowMappa] = useState(false);
```

- [ ] **Step 4: Aggiungi MappaScreen import e rendering in App.tsx**

Aggiungi import in cima:
```typescript
import { MappaScreen } from './components/MappaScreen';
```

Aggiungi il blocco di render PRIMA del blocco `if (showRuota)`:
```typescript
if (showMappa) {
  return <MappaScreen onBack={() => setShowMappa(false)} />;
}
```

- [ ] **Step 5: Passa onOpenMappa a AssegnazioniScreen via Header**

Nel componente `AssegnazioniScreen`, la prop `onOpenSettings` già passa a `Header`. Ora devi anche passare `onOpenMappa`.

Prima modifica `AssegnazioniScreenProps` in `AssegnazioniScreen.tsx`, aggiungi:
```typescript
onOpenMappa: () => void;
```

Poi nella firma della funzione aggiungi `onOpenMappa` e passala a `Header`:
```typescript
<Header
  nome={data.nome}
  nomeInglese={data.nomeInglese}
  logoUrl={data.logoUrl}
  year={data.anno ?? '2026'}
  onOpenSettings={onOpenSettings}
  onOpenMappa={onOpenMappa}
/>
```

- [ ] **Step 6: Aggiorna la chiamata a AssegnazioniScreen in App.tsx**

Trova il render di `AssegnazioniScreen` e aggiungi `onOpenMappa`:
```typescript
<AssegnazioniScreen
  data={spData}
  selectedSubZone={selectedSubZone}
  onSubZoneChange={setSelectedSubZone}
  onToggle={handleToggleAbbattimento}
  onUpdateText={handleUpdateText}
  onOpenRuota={() => setShowRuota(true)}
  onOpenSettings={() => setShowSettings(true)}
  onOpenMappa={() => setShowMappa(true)}
  isAdmin={isAdmin}
/>
```

- [ ] **Step 7: Build check**

```bash
npm run lint
```

Expected: nessun errore TypeScript.

- [ ] **Step 8: Commit**

```bash
git add src/components/MappaScreen.tsx src/components/Header.tsx src/components/AssegnazioniScreen.tsx src/App.tsx package.json package-lock.json
git commit -m "feat: MappaScreen + Header icona mappa per admin"
```

---

## Task 12: App.tsx — Init FCM + Geolocation dopo nome

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Aggiungi import hooks in App.tsx**

```typescript
import { initFCM } from './hooks/useFCM';
import { useGeolocation } from './hooks/useGeolocation';
```

- [ ] **Step 2: Attiva useGeolocation in MainApp**

Nel corpo di `MainApp`, aggiungi dopo la dichiarazione di `deviceId`:

```typescript
useGeolocation({ deviceId, nome: hunterName });
```

- [ ] **Step 3: Modifica handleSetName per inizializzare FCM**

Sostituisci la funzione `handleSetName` esistente:

```typescript
const handleSetName = (nome: string) => {
  localStorage.setItem('riservapp_nome', nome);
  setHunterName(nome);
  // Inizializza FCM dopo che il nome è noto
  initFCM(deviceId, nome).catch(console.warn);
};
```

- [ ] **Step 4: Inizializza FCM anche per utenti già registrati**

Gli utenti che hanno già il nome (già passati dall'onboarding) non passano per `handleSetName`. Aggiungi un `useEffect` in `MainApp`:

```typescript
useEffect(() => {
  if (!hunterName) return;
  if (localStorage.getItem('riservapp_fcm') === 'granted') return; // già fatto
  initFCM(deviceId, hunterName).catch(console.warn);
}, [hunterName]);
```

- [ ] **Step 5: Build e test manuale**

```bash
npm run lint
npx tsx server.ts
```

Apri `http://localhost:3000`. Se hai già fatto l'onboarding:
1. Il browser dovrebbe chiedere il permesso per le notifiche
2. In Firestore → `fcm_tokens` → deve apparire un documento con il tuo deviceId
3. DevTools → Application → Service Workers → `firebase-messaging-sw.js` deve essere attivo

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: init FCM e geolocation in App dopo inserimento nome"
```

---

## Task 13: Firestore Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Sostituisci firestore.rules con il contenuto completo**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    // config/main: lettura pubblica, scrittura solo admin
    match /config/main {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // posts: lettura pubblica, scrittura solo admin
    match /posts/{postId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // fcm_tokens: scrittura pubblica (cacciatori non autenticati),
    // solo il proprio documento (per deviceId), lettura solo admin
    match /fcm_tokens/{deviceId} {
      allow create, update: if request.resource.data.deviceId == deviceId;
      allow delete: if isAuthenticated();
      allow read: if isAuthenticated();
    }

    // user_locations: scrittura pubblica sul proprio documento,
    // lettura solo admin.
    // Per delete: resource.data.deviceId == deviceId è sempre vero
    // (il doc ID è il deviceId), ma request.resource è null su DELETE,
    // quindi la guardia è su resource (documento esistente).
    match /user_locations/{deviceId} {
      allow create, update: if request.resource.data.deviceId == deviceId;
      allow delete: if resource != null && resource.data.deviceId == deviceId;
      allow read: if isAuthenticated();
    }

    // geofences: lettura pubblica (serve al client per il geofencing),
    // scrittura solo admin
    match /geofences/{docId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }
  }
}
```

- [ ] **Step 2: Deploy regole Firestore**

```bash
firebase deploy --only firestore:rules
```

Expected:
```
✔  firestore: released rules firestore.rules to cloud.firestore
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: firestore rules per fcm_tokens, user_locations, geofences"
```

---

## Task 14: Deploy Cloud Functions

> ⚠️ Questo task richiede Firebase CLI installato globalmente. Se non lo hai: `npm install -g firebase-tools` poi `firebase login`.

- [ ] **Step 1: Verifica compilazione finale**

```bash
cd functions && npm run build && cd ..
```

Expected: nessun errore.

- [ ] **Step 2: Deploy Cloud Functions**

```bash
firebase deploy --only functions
```

Il deploy richiede 2-5 minuti. Expected output finale:
```
✔  functions: Finished running predeploy script.
✔  functions[onPostCreate]: Successful create operation.
✔  functions[onConfigUpdate]: Successful create operation.
✔  functions[cleanupOldLocations]: Successful create operation.
```

- [ ] **Step 3: Verifica nel Firebase Console**

Vai su https://console.firebase.google.com → progetto `riservapp-6054c` → Functions.
Devono apparire 3 functions: `onPostCreate`, `onConfigUpdate`, `cleanupOldLocations`.

- [ ] **Step 4: Test end-to-end notifiche**

1. Apri l'app su `localhost:3000`, dai il permesso notifiche
2. Vai su Firebase Console → Firestore → `posts` → Add document manualmente con `{tipo: "alert", testo: "TEST NOTIFICA"}`
3. Entro 10 secondi deve arrivare la notifica push sul dispositivo

- [ ] **Step 5: Test end-to-end mappa**

1. Accedi come Rettore (long press logo 3 secondi)
2. Tocca l'icona mappa nell'header
3. La mappa Google Maps deve caricarsi con il poligono verde
4. Aggiungi manualmente un documento in Firestore → `user_locations/{qualsiasi-id}` con `{deviceId: "test", nome: "Test Cacciatore", lat: 46.41, lng: 11.07, timestamp: <now>}`
5. Il marker deve apparire sulla mappa in real-time

- [ ] **Step 6: Commit finale**

```bash
git add .
git commit -m "feat: Fase 5 completa — notifiche FCM + mappa geofencing deploy"
```

---

## Checklist spec coverage

| Requisito spec | Task |
|---|---|
| DeviceId stabile per fcm_tokens e user_locations | Task 1 |
| Service worker per push in background | Task 2 |
| Push post normale (suono standard) | Task 5 |
| Push post avviso (suono standard) | Task 5 |
| Push post alert (alta priorità) | Task 5 |
| Push quota raggiunta (abbattuti==totale) | Task 6 |
| Push categoria sospesa | Task 6 |
| TTL posizioni 35 min (GDPR) | Task 7 |
| Geofencing client-side Turf.js | Task 9 |
| Smart frequency (entrata/15min/30min) | Task 9 |
| Uscita dal perimetro → delete posizione | Task 9 |
| MappaScreen solo Rettore | Task 10 |
| Poligono riserva da Firestore | Task 10 |
| Marker real-time con nome | Task 10 |
| Icona mappa nell'header admin | Task 11 |
| FCM init dopo inserimento nome | Task 12 |
| Firestore rules nuove collection | Task 13 |
| Deploy Cloud Functions | Task 14 |
