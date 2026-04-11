# CLAUDE.md — RiservApp
# Leggi questo file prima di tutto, poi TASKS.md per lo stato avanzamento.

---

## Cos'è questa app
PWA mobile-first per la Riserva Cacciatori di Tuenno (45 soci + ospiti).
Sostituisce il gruppo WhatsApp per gestire assegnazioni caccia, bacheca comunicazioni, ruote di caccia.

**URL produzione:** https://riservatuenno.web.app
**Dev server:** `npx tsx server.ts` su http://localhost:3000
**Admin:** michele.bruni@gmail.com

## Stack
- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 (`@import "tailwindcss"` in index.css)
- Firebase Firestore (real-time) + Auth (Google Sign-In admin) + Storage + FCM
- @react-google-maps/api + @turf/boolean-point-in-polygon
- EB Garamond font (Google Fonts)

## Ruoli
- **Cacciatore** — legge tutto, nome validato contro lista soci, nessun login
- **Direttivo** — come cacciatore + pubblica/cancella post bacheca (riconosciuto dal nome)
- **Rettore** (admin) — tutto — long press 3s logo → Google Sign-In

Il cacciatore NON deve mai sapere che esiste una modalità admin.

## Struttura schermate
4 schermate via BottomNav: `Bacheca | Capriolo | Cervo | Camoscio`
- Ingranaggio e mappa SOLO in bacheca, SOLO per admin

## Colori
- bg: `#EDEEE6`, header bg: `#ECEDE1`
- verde: `#5C6B3A`, bordo: `#d0d5c4`
- pericolo: `#8B1A1A`, sospeso: `#B8730A`

## UI — regole fondamentali
- Inline styles con px espliciti, NON Tailwind per layout critici
- Font grandi: messaggi 30px, note 20px, ruota 25px — utenti anziani
- Logo PNG già circolare — nessun bordo CSS aggiuntivo

## Firestore collections
- `config/main` — dati specie
- `config/members` — `{ nomi: string[], direttivo: string[] }`
- `config/slots` — `{ [normalizedName]: deviceId | null }`
- `posts` — messaggi bacheca
- `fcm_tokens/{deviceId}` — token push
- `user_locations/{deviceId}` — posizioni (TTL 35min)
- `geofences/riserva-tuenno` — poligono 96 vertici

## localStorage keys
- `riservapp_nome`, `riservapp_device_id`, `riservapp_onboarding`
- `riservapp_geo`, `riservapp_fcm`, `riservapp_letti_${nome}`

## Normalizzazione nomi
```ts
s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/\s+/).filter(Boolean).sort().join('')
// "Bruni Michele" === "Michele Bruni" === "brunimichele"
```

## Stato avanzamento → vedi TASKS.md
