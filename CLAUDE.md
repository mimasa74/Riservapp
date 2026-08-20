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
- Il build è `vite build && workbox injectManifest workbox-config.cjs`. Dal 17 ago
  è agganciato come `predeploy` hosting in `firebase.json`: `firebase deploy`
  builda da solo, impossibile deployare un `dist/` stale o senza precache.
- `globPatterns` include `pdf` per sicurezza, ma dal 17 ago 2026 in `public/` non
  c'è nessun PDF: il regolamento vive solo su Storage (vedi sotto).
- Niente `skipWaiting` automatico. Il nuovo SW resta in waiting; `UpdateBanner.tsx`
  mostra "Nuova versione — tocca per aggiornare" → postMessage `SKIP_WAITING` →
  reload. Il reload avviene solo su gesto (clientsClaim fa scattare
  controllerchange anche alla prima install: non ricaricare in automatico).
- Le push sono DATA-ONLY (`title`/`body`/`priority`/`ts` in `data`): la notifica
  la costruisce solo il SW. Non aggiungere payload `notification` nelle Functions:
  l'SDK la mostrerebbe in automatico → notifica doppia.
- `ts` è l'istante dell'evento, non della consegna. Il SW lo passa a
  `showNotification` come `timestamp`: un telefono spento per ore mostra al
  risveglio l'ora in cui la categoria è stata chiusa. Non toglierlo.
- `onConfigUpdate` invia **una push per ogni transizione di categoria**, più un
  post di sistema ciascuna: nessuna aggregazione. Modificare più categorie in
  una volta produce quindi una raffica di notifiche. È il problema di usabilità
  segnalato dall'uso reale il 17 ago 2026 — vedi "DESIGN E NOTIFICHE" in
  TASKS.md prima di toccare il trigger.

## Testo delle notifiche di categoria — non improvvisarlo

Le etichette stanno in `functions/src/labels.ts`, non inline nel trigger:
`index.ts` chiama `initializeApp()` al load e non è importabile in un test.
`functions/src/labels.test.ts` è escluso dal build Functions via `tsconfig.json`,
altrimenti finirebbe compilato in `lib/` e verrebbe deployato.

Forma decisa il 18 ago 2026 leggendo le notifiche sul telefono:
- **titolo** = specie IN MAIUSCOLO, più la zona per il solo camoscio —
  `CERVO`, `CAMOSCIO — Zona Campa - Spora`
- **corpo**  = categoria in caso normale + stato in maiuscolo —
  `Maschi palcuti CHIUSI`

Grassetto e dimensione **non sono impostabili**: `showNotification` accetta solo
testo. È l'OS a rendere il titolo più grande e in grassetto del corpo, ed è per
questo che la specie sta lì da sola. Nel corpo, il maiuscolo dello stato è
l'unica evidenziazione disponibile: per questo la categoria scende in caso
normale, altrimenti non risalterebbe nulla.

Cervo e capriolo hanno il titolo con la sola specie: non hanno subzone e
"Riserva Tuenno" in un'app della riserva è pleonastico. Scelta di Michele.

Non esiste più la notifica di **quota raggiunta** (rimossa il 18 ago 2026):
registrare l'ultimo capo e chiudere la categoria sono lo stesso fatto e
producevano due push più due post. Se la reintroduci, unificala alla chiusura.
La conferma in `App.tsx` (`handleToggleAbbattimento`) non promette più una
notifica: se rimetti la push, rimetti anche quella frase.

La specie nel titolo **non è decorazione**: prima del 18 ago la notifica
nominava solo la categoria, e "MASCHI DI PRIMA CLASSE" esiste sia nel capriolo
sia nel camoscio — dove per giunta le 12 categorie sono duplicate sulle due
subzone (`cam1_` / `cam2_`) con nome identico. Tre eventi diversi producevano
notifiche indistinguibili. Se togli specie o zona il bug torna.

Lo stato è accordato al genere leggendo **`badgeChiusura`**, il campo che
compila l'admin e che `CategoryRow.tsx` mostra già nel badge: `CHIUSE` →
femminile, altrimenti maschile. Non dedurlo dal nome della categoria — sarebbe
una seconda verità che può divergere da quello che il socio legge in app. Il
fallback sul nome (inizia per FEMMINE) copre solo una categoria priva del campo.

## Avviso capi nuovi — tutto locale, nessuna push

Quando il Rettore segna degli abbattimenti il socio se ne accorge **aprendo
l'app**, non dal telefono: niente push, niente scritture Firestore, niente
regole nuove (deciso con Michele il 20 ago 2026 — le notifiche erano già
troppe, vedi TASKS.md).

Tre viste dello stesso conto, `src/utils/novita.ts` + `src/hooks/useNovita.ts`:
- pastiglia rossa **senza numero** sull'icona della specie in `BottomNav`
- riquadro in cima alla bacheca (`AvvisiNovita`) che porta al piano della specie
- pastiglia `NUOVO` sulla riga della categoria e crocette rosse sui capi nuovi

Il meccanismo è un confronto con una fotografia `{catId: abbattuti}` tenuta su
`localStorage` per specie. Regole che non vanno cambiate senza rifare i conti:
- **Solo gli incrementi contano.** Correzione in meno del Rettore e azzeramento
  di stagione non sono novità, altrimenti ogni nuova stagione accenderebbe
  tutto in rosso.
- **Categoria mai vista prima → entra in silenzio.** Senza termine di paragone
  un rename di categoria segnalerebbe capi che nessuno ha appena abbattuto.
- **La fotografia si aggiorna quando il socio ESCE dalla specie**, non quando
  entra: altrimenti la pastiglia `NUOVO` sparirebbe prima che riesca a vederla.
- **La specie aperta è congelata**: i capi segnati mentre il socio la guarda
  non accendono nulla — li vede in diretta, ed è il caso del Rettore che li sta
  segnando col dito su quella schermata.
- Il confronto è **sui numeri, non sull'identità dell'oggetto** `data`: lo
  snapshot Firestore cambia identità a ogni consegna anche quando i capi sono
  gli stessi, e un `useEffect([data])` andava in ciclo infinito.

## Regolamento interno — solo Storage, nessun PDF bundled

Non esiste PDF di riserva in `public/`. L'unica fonte è
`config/main.regolamento_url`, che punta al file caricato dal Rettore. Senza
quel campo il socio non vede la riga in bacheca (l'admin vede solo l'upload).
Il PDF è cachato lato app in `REGOLAMENTO_CACHE` — non usare `PHOTO_CACHE`
(`'photos'`): è un errore già fatto una volta.

L'upload sovrascrive sempre `regolamento/regolamento.pdf`, quindi un regolamento
nuovo ha lo stesso path e cambia **solo il token in query string**. Da qui due
regole non negoziabili:
- Il lookup in cache deve essere **match esatto**. Con `ignoreSearch: true` il
  vecchio PDF risultava già presente e il nuovo non veniva mai scaricato: i soci
  offline leggevano il regolamento superato (bug corretto il 17 ago 2026).
- Dopo ogni `cache.put` vanno cancellate le entry con URL diverso.
  `reconcilePhotoCache` NON copre questa cache: lavora solo su `PHOTO_CACHE`.

## Ruoli
- **Cacciatore** — legge tutto, nome validato contro lista soci, nessun login
- **Rettore** (admin) — UNICO che pubblica/modifica/scrive — long press 3s logo → Google Sign-In

Il ruolo "Direttivo" è stato RIMOSSO il 17 ago 2026 (semplificazione voluta:
la vecchia regola Firestore basata sul campo `autore` era spoofabile da qualsiasi
client anonimo). `config/members.direttivo` esiste ancora su Firestore ma non è usato.
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
- `config/members` — `{ nomi: string[], direttivo: string[] }` (direttivo non più usato)
- `config/slots` — `{ [normalizedName]: deviceId }` — slot libero = chiave ASSENTE
  (l'admin libera con `deleteField`; le rules permettono al socio solo di aggiungere
  la propria chiave, mai modificare o rimuovere)
- `posts` — messaggi bacheca
- `fcm_tokens/{deviceId}` — token push
- `user_locations/{deviceId}` — posizioni (TTL 35min)
- `geofences/riserva-tuenno` — poligono 96 vertici

## localStorage keys
- `riservapp_nome`, `riservapp_device_id`, `riservapp_onboarding`
- `riservapp_geo`, `riservapp_fcm`, `riservapp_letti_${nome}`
- `riservapp_novita_${specieId}` — fotografia abbattimenti (vedi "Avviso capi nuovi")

## Normalizzazione nomi
```ts
s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/\s+/).filter(Boolean).sort().join('')
// "Bruni Michele" === "Michele Bruni" === "brunimichele"
```

## Stato avanzamento → vedi TASKS.md
