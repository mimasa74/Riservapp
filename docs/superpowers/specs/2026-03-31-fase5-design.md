# Fase 5 — Notifiche Push + Mappa con Geofencing
# Design spec — 2026-03-31

---

## Panoramica

Due sistemi indipendenti che si implementano in parallelo:
1. **Notifiche push (FCM)** — push a tutti i cacciatori su eventi rilevanti
2. **Mappa + Geofencing** — mappa real-time delle posizioni (solo Rettore)

Architettura scelta: **Cloud Functions** (piano Blaze attivo).

---

## 1. Notifiche Push (FCM)

### Flusso
1. Cacciatore apre l'app → dopo onboarding il browser chiede permesso notifiche
2. Se accetta → token FCM salvato in Firestore con il suo nome
3. Quando si verifica un evento → Cloud Function triggered → push a tutti i token registrati

### 5 eventi notifica

| Evento | Suono | Priorità | Testo |
|--------|-------|----------|-------|
| Post normale pubblicato | suono standard | normale | primi 80 char del post |
| Post avviso pubblicato | suono standard | normale | primi 80 char del post |
| Post alert pubblicato | suono + vibrazione, bypassa silenzioso | alta | primi 80 char del post |
| Quota raggiunta (abbattuti == totale) | suono standard | normale | "Quota raggiunta: Categoria X" |
| Categoria sospesa (stato → "sospeso") | suono standard | normale | "Categoria X sospesa" |

> Nota: la chiusura manuale (stato → "chiuso") non genera notifica separata — la quota raggiunta l'ha già inviata.

### Struttura dati Firestore

```
/fcm_tokens/{deviceId}
  deviceId: string    ← UUID generato al primo avvio (localStorage: riservapp_device_id)
  nome: string        ← nome cacciatore (da localStorage: riservapp_nome)
  token: string       ← token FCM del dispositivo
  timestamp: Timestamp
```

### File nuovi
- `public/firebase-messaging-sw.js` — service worker, riceve push con app chiusa
- `src/hooks/useFCM.ts` — richiede permesso, salva token, gestisce refresh
- `functions/index.ts` — Cloud Functions: onPostCreate, onCategoryClose

### Regole Firestore aggiuntive
- `/fcm_tokens` — write pubblico (cacciatori non autenticati devono poter salvare il token), read solo admin

---

## 2. Mappa + Geofencing

### Accesso
- Solo Rettore (dopo login Google)
- Icona mappa nell'header, accanto all'ingranaggio
- `MappaScreen.tsx` — componente separato, non visibile ai cacciatori

### Cosa mostra
- Google Maps con poligono perimetro riserva
- Marker per ogni cacciatore dentro la riserva
- Nome cacciatore visibile zoomando sul marker
- Aggiornamento real-time via `onSnapshot` su `/user_locations`

### Poligono riserva
- Già presente in Firestore: `/geofences/riserva-tuenno` (32 vertici reali)
- L'app lo legge all'avvio di MappaScreen

### Logica posizione lato cacciatore (invisibile)
Il geofencing gira client-side nel browser del cacciatore:

1. **Entrata nel perimetro** → posizione inviata immediatamente a Firestore
2. **Fermo** (spostamento < ~100m) → aggiornamento ogni 30 minuti
3. **In movimento** (spostamento ≥ ~100m) → aggiornamento ogni 15 minuti
4. **Uscita dal perimetro** → documento eliminato immediatamente

### GDPR — cancellazione automatica
- Cloud Function scheduled ogni 10 minuti
- Elimina documenti in `/user_locations` con timestamp > 35 minuti
- Nessuno storico: un solo documento per cacciatore, sovrascritto ad ogni update

### Struttura dati Firestore

```
/user_locations/{deviceId}
  deviceId: string    ← UUID generato al primo avvio (localStorage: riservapp_device_id)
  nome: string        ← nome cacciatore (da localStorage: riservapp_nome)
  lat: number
  lng: number
  timestamp: Timestamp
```

### File nuovi
- `src/hooks/useGeolocation.ts` — logica geofencing + smart update frequency
- `src/components/MappaScreen.tsx` — mappa Google Maps (solo Rettore)

### API key Google Maps
- Da generare su Google Cloud Console (istruzioni fornite in fase di implementazione)
- Salvata in `.env.local` come `VITE_GOOGLE_MAPS_API_KEY`

---

## 3. Onboarding aggiornato

### Flusso completo
1. Video fullscreen (`/public/onboarding.mp4`) con pulsante "Salta"
2. Privacy GDPR + consenso geolocalizzazione **in un'unica schermata**
   - Testo: da `GEOREFERENCE E PRIVACY.txt` (già redatto)
   - Pulsanti: [ACCETTO] / [NON ACCETTO]
3. HunterNameModal → nome obbligatorio
   - Senza nome: non si vede nulla dell'app
4. App (bacheca, assegnazioni, ruote)

### Comportamento consensi
| Consenso geo | Nome | Risultato |
|---|---|---|
| Accettato | Dato | App completa + georeferenziato |
| Rifiutato | Dato | App completa, non georeferenziato |
| Qualsiasi | Non dato | Non vede nulla |

### localStorage keys aggiunte
- `riservapp_geo` — già esistente (`'true'`/`'false'`)
- `riservapp_fcm` — `'granted'`/`'denied'` (permesso notifiche)
- `riservapp_device_id` — UUID generato al primo avvio, non cambia mai

---

## 4. File da creare/modificare

### Nuovi
| File | Scopo |
|------|-------|
| `public/firebase-messaging-sw.js` | Service worker FCM |
| `functions/index.ts` | Cloud Functions |
| `functions/package.json` | Dipendenze Cloud Functions |
| `src/hooks/useFCM.ts` | Permesso + token FCM |
| `src/hooks/useGeolocation.ts` | Geofencing + posizione smart |
| `src/components/MappaScreen.tsx` | Mappa Rettore |

### Modificati
| File | Modifica |
|------|----------|
| `OnboardingScreen.tsx` | Privacy + geo insieme in step 2 |
| `Header.tsx` | Icona mappa per admin |
| `App.tsx` | Init FCM, routing MappaScreen |
| `firebase.ts` | Aggiunge FCM e Functions |
| `firestore.rules` | Regole per `fcm_tokens` e `user_locations` |

---

## 5. Dipendenze npm da aggiungere

```
@react-google-maps/api       ← mappa
@turf/boolean-point-in-polygon ← geofencing client-side
firebase-admin               ← Cloud Functions (solo in functions/)
firebase-functions           ← Cloud Functions (solo in functions/)
```

---

## Fuori scope

- Storico posizioni cacciatori
- Notifiche per azioni del cacciatore (solo il Rettore genera eventi)
- Mappa visibile ai cacciatori
