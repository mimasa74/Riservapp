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

## Avviso capi nuovi — l'avviso in app è tutto locale

Quando il Rettore segna degli abbattimenti il socio se ne accorge **aprendo
l'app**: niente scritture Firestore, niente regole nuove (deciso con Michele il
20 ago 2026 — le notifiche erano già troppe, vedi TASKS.md). Una push c'è, ma è
**una sola per sessione di lavoro** e la manda il server, non questo meccanismo:
vedi "Avviso di aggiornamento del piano". Qui sotto non c'è nulla che tocchi la rete.

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

## Capi abbattuti in una classe sospesa

Capita che un socio abbatta un capo di una classe sospesa. Il Rettore deve poterlo
segnare lo stesso (necessità reale del 22 ago 2026): prima nelle classi sospese
non c'era nessun quadratino, solo la scritta SOSPESI.

- **Admin**: nella classe sospesa vede i quadratini di tutto il piano e li crocia
  come in una classe aperta. Nessun filtro per stato in `handleToggleAbbattimento`.
- **Socio**: vede la scritta SOSPESI e accanto **i soli capi caduti**
  (`soloAbbattuti` in `AssignmentBoxes`). Il piano non si mostra: dei quadratini
  vuoti direbbero al socio che quella classe è cacciabile.
- Croce e bordo in arancione `#B8730A`, lo stesso della scritta SOSPESI. Il rosso
  `#8B1A1A` NON si usa qui: significa una cosa sola, "capo nuovo", e `isNuovo` ha
  la precedenza sul colore passato — non invertire quel ternario.
- La pastiglia NUOVO compare anche nelle sospese. Prima non c'era, e un capo
  segnato lì accendeva il bollino in `BottomNav` (`novita.ts` conta tutte le
  categorie) senza che la riga mostrasse niente.

`confermaUltimoCapo` (`src/utils/conferme.ts`) è la frase della `window.confirm`
sull'ultimo quadratino. Nelle sospese non dice "quota completata": nessuna quota
è stata completata. La conferma resta perché i quadratini sono 26px e un tocco
storto completerebbe il piano senza che nessuno se ne accorga.

## Avviso di aggiornamento del piano — l'unica push sugli abbattimenti

`avvisoPianoTick` (`functions/src/index.ts` + `avvisoPiano.ts`) manda **una sola
notifica per sessione di lavoro del Rettore**, col conto per specie: titolo
`AGGIORNAMENTO PIANO`, corpo `Capriolo +3, Camoscio +1, Cervo +1`.

Perché è fatto a due tempi: ogni crocetta è una scrittura a sé su `config/main`.
Mandando la push alla prima direbbe `Capriolo +1` e i capi successivi resterebbero
fuori; mandandone una per scrittura tornerebbe la raffica che il 20 ago 2026 aveva
lasciato gli abbattimenti senza push del tutto. Quindi `onConfigUpdate` **accumula
in silenzio** in `config/avviso_piano` e un tick **al minuto** decide quando è ora.

Le due attese, entrambe in `avvisoPiano.ts` (`QUIETE_MS`, `SILENZIO_MS`):
- **5 minuti di quiete** dall'ultima crocetta: finché il Rettore segna, il conto
  cresce e la notifica aspetta. È quello che permette di scrivere `+3` invece di
  mandare tre notifiche da `+1`.
- **15 minuti di silenzio** dalla notifica precedente: se riprende subito a
  segnare i capi si accumulano lo stesso, ma i soci non ricevono due notifiche
  appiccicate. Misure decise da Michele il 2 set 2026.

Ha sostituito il **riepilogo serale delle 21** (`riepilogoSerale`, rimosso il
2 set 2026): arrivava fino a 23 ore dopo il fatto, e i capi segnati dopo le 21 —
cioè una battuta finita a sera, la norma — cadevano sempre nel buco fino al
giorno dopo. Con `config/riepilogo` sono spariti anche `riepilogo.ts` e le sue
rules.

- **Nessun post di sistema in bacheca.** Il riquadro "Aggiornamento piano" che il
  socio ci trova già fa quel mestiere; un post per ogni sessione seppellirebbe i
  messaggi del Rettore.
- **Il corpo non nomina la zona**, nemmeno sul camoscio: il conto abbraccia tutte
  le categorie della specie, quindi entrambe le subzone. Le notifiche di chiusura
  la nominano perché parlano di una categoria sola.
- **L'ordine delle specie è quello della `BottomNav`** (`ORDINE_SPECIE`:
  capriolo, cervo, camoscio), non quello in cui il Rettore le ha toccate: il
  socio ritrova le stesse parole nello stesso posto ogni volta. `SPECIE` in
  `index.ts` ha un altro ordine perché lì non si legge nulla.
- **Contano solo gli incrementi**, e una categoria mai vista prima entra in
  silenzio: stesse due regole di `src/utils/novita.ts`, stessi motivi. La seconda
  è anche quello che tiene muta la **pubblicazione di un piano nuovo**, dove
  tutte le classi sono nuove di zecca.
- **Il calo di una classe non mangia i capi di un'altra**: il delta si somma solo
  quando è positivo, categoria per categoria. Sommando i totali di specie, una
  correzione in meno su una classe cancellerebbe un capo caduto in un'altra.
- **Chiudendo una classe partono due notifiche**: quella di chiusura, che nomina
  la categoria, e questa. Sono due fatti diversi — stessa scelta del 23 ago 2026,
  meglio due notifiche che un capo taciuto.
- Il conto sta in `config/avviso_piano`, **chiuso a ogni client** nelle rules
  (`if false`): lo tocca solo l'Admin SDK. Manometterlo vorrebbe dire far partire
  una notifica a tutti i soci, o zittirla per sempre.
- L'accumulo gira **in transazione** e usa `merge: true`, al contrario di quasi
  tutto il resto: qui la fusione dentro `pending` è proprio quello che serve.
  Lo svuotamento dopo l'invio usa invece `mergeFields`, perché deve azzerare per
  intero — con `merge` le specie già annunciate resterebbero in attesa in eterno.
- Se la push fallisce, **il conto non si svuota e `ultimoInvio` non avanza**: i
  capi rientrano nel giro dopo invece di sparire.

`avvisoPiano.test.ts` è escluso dal build Functions via `tsconfig.json`, come
`labels.test.ts`: altrimenti finirebbe in `lib/` e verrebbe deployato.

## Diario del Rettore — privato davvero, non solo nascosto

In fondo alla scheda di ogni specie, sotto la data dell'ultimo capo, l'admin
trova un diario: tocca `+`, scrive una riga, l'app ci mette la data. Serve a
ricordare **perché** il piano è cambiato (`src/utils/noteRettore.ts` +
`src/components/NoteRettore.tsx`).

Vive in `config/note_rettore`, **non** in `config/main`, e le rules lo aprono
al solo `isAdmin()`. Non è una scelta estetica: `config/main` è leggibile da
qualsiasi client autenticato, anche anonimo, e ogni telefono lo scarica per
intero. Una nota lì dentro sarebbe invisibile nella UI ma estraibile dalla
console. Per lo stesso motivo `App.tsx` **non sottoscrive** il documento se non
è admin: al socio la onSnapshot fallirebbe e basta.

Regole del meccanismo:
- La data è **gg/mm/aaaa** con l'anno per esteso, non il `gg/mm` del resto
  dell'app: queste note si rileggono da una stagione all'altra.
- L'ordine è quello dell'array (nuova in cima), **non** la data: la data è una
  stringa già formattata e rileggerla per ordinare sarebbe una seconda verità.
- `noteDiSpecie` scarta le voci malformate invece di far saltare la schermata.
- La scrittura è `setDoc(..., { merge: true })`: alla prima nota il documento
  non esiste ancora e `updateDoc` fallirebbe.
- **Niente cestino** (deciso con Michele il 20 ago 2026): una nota cancellata è
  persa, per questo la `✕` chiede conferma. Se serve il ripristino va dentro il
  lavoro su "tutto deve essere reversibile", non aggiunto qui di corsa.

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
- `config/note_rettore` — `{ [specieId]: NotaRettore[] }` — diario privato,
  leggibile SOLO dall'admin (vedi "Diario del Rettore")
- `config/avviso_piano` — `{ pending, ultimaModifica, ultimoInvio }` — memoria
  dell'avviso di aggiornamento del piano, chiusa a ogni client (vedi "Avviso di
  aggiornamento del piano")
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
