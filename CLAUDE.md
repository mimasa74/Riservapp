# CLAUDE.md — RiservApp
# Leggi questo file prima di tutto, poi TASKS.md per lo stato avanzamento.

---

## Cos'è questa app
PWA mobile-first per la Riserva Cacciatori di Tuenno (45 soci + ospiti).
Sostituisce il gruppo WhatsApp per gestire assegnazioni caccia, bacheca comunicazioni, ruote di caccia.

**URL produzione:** https://riservatuenno.web.app
**Dev server:** `npx tsx server.ts` su http://localhost:3000
**Admin:** michele.bruni@gmail.com

## Repo e ambienti — leggi prima di deployare

**Repo:** https://github.com/mimasa74/Riservapp — branch `main`.
`main` è l'unica fonte di verità: committa e pusha alla fine di ogni sessione.
Il deploy NON è un commit. Controlla `git status` prima di ogni `firebase deploy`.

**Progetto Firebase:** `riservapp-6054c`. Contiene **due** siti hosting:

| Sito | URL | Stato |
|---|---|---|
| `riservatuenno` | https://riservatuenno.web.app | **PRODUZIONE** — questo è quello vivo |
| `riservapp-6054c` | https://riservapp-6054c.web.app | morto, fermo al 4 apr 2026 — non deployare qui |

Attenzione: `riservapp-6054c` è sia il nome del progetto sia quello del sito morto.
I comandi `firebase hosting:*` puntano al sito default (quello morto) se non passi
`--site riservatuenno`. `firebase deploy` usa i target in `firebase.json`.

**`.env.local` non è su GitHub** (`.gitignore` esclude `.env*`). 8 chiavi `VITE_*`
— Firebase, FCM VAPID, Google Maps. Senza quel file il build non parte e il clone
da solo non basta. Copie note: questo albero e `Desktop\backup\riservapp_v2g`.

## Stack
- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 (`@import "tailwindcss"` in index.css)
- Firebase Firestore (real-time) + Auth (Google Sign-In admin) + Storage + FCM
- @react-google-maps/api + @turf/boolean-point-in-polygon
- EB Garamond font (Google Fonts)

## Service worker — un solo file, non due

Non esiste `sw.js`. Workbox inietta il precache **dentro** il service worker FCM:
`swSrc: public/firebase-messaging-sw.js` → `swDest: dist/firebase-messaging-sw.js`
(vedi `workbox-config.cjs`). `vite-plugin-pwa` è stato rimosso il 25 apr 2026
perché era in conflitto con FCM.

Conseguenze pratiche:
- Il build è `vite build && workbox injectManifest workbox-config.cjs`. Il solo
  `vite build` produce un `dist/` senza precache: non deployarlo.
- `globPatterns` include `pdf` — serve per il regolamento offline.
- La regola header per `/sw.js` in `firebase.json` è config morta, residuo di
  `vite-plugin-pwa`. Da rimuovere, non da "far funzionare".
- Il PDF regolamento è cachato anche lato app in `REGOLAMENTO_CACHE`, perché un
  utente può avere in giro un SW vecchio senza il PDF nel precache. Non usare
  `PHOTO_CACHE` (`'photos'`) per il regolamento: è un errore già fatto una volta.

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
