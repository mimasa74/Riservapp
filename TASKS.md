# TASKS.md — RiservApp
# Aggiorna dopo ogni sessione Claude Code, poi committa e pusha su main.
# Un lavoro non committato può esistere in un solo posto al mondo: è già successo.

## Regole condivise (13 set 2026)
- [x] AGENTS.md unifica regole di sviluppo, test, review, Git e prompt dei ruoli.
- [x] CLAUDE.md importa AGENTS.md per leggere le stesse istruzioni all'avvio.
- [x] Conservati gli aggiornamenti di contesto già presenti in CLAUDE.md.
- [x] Stack Android distinto dalla PWA attuale; nessuna migrazione avviata.
- [x] Modifica solo documentale: verificare diff e import; nessun deploy.
- [x] Regola su commit/push/deploy scritta in un posto solo ("Coordinamento e
      Git"); "Repo e ambienti" la richiama invece di ripeterla.
- [x] Stack Android spostato in fondo, sotto "Progetto Android — se e quando":
      fuori dalle regole che valgono per il lavoro di oggi.

## Rilascio completo — 14 settembre 2026, sera
- [x] Su richiesta di Michele, push del codice fino a `9dc1ed7` e deploy completo
      su `riservatuenno`: regole Firestore/Storage, cinque Functions e hosting.
      Firebase ha confermato tutte le operazioni e la release del sito.
- [x] Verifiche sul codice rilasciato: lint, build PWA e Functions, 184 test
      Vitest e 19 controlli sull'emulatore Firestore superati.
- Warning non bloccanti: bundle grande, import Messaging statico/dinamico,
  runtime Node 20 deprecato e SDK Functions da aggiornare.
- La review ha riprodotto due difetti preesistenti dell'avviso piano, non
  modificati in questo rilascio: lo svuotamento perde incrementi concorrenti;
  gli errori FCM per destinatario non impediscono di azzerare il conto.
  Restano da correggere insieme al lavoro sulle notifiche. Prove reali sul
  telefono e notifiche generiche restano aperte.

## Come riprendere
Scrivi a Claude Code:
"Leggi CLAUDE.md e TASKS.md e riprendi dal primo task non completato."

### ► IN CORSO (10 set 2026 — aggiornato da Codex)
Per riprendere velocemente leggere **.scratch/mappa-scia-posizioni/HANDOFF.md**:
contiene verifiche, limiti e ordine di ripresa per Claude Code.

- [x] Correzioni avvio/rientro: fromCache, slot proprio, deviceId stabile (76a2ed1).
- [x] Mappa: un documento per punto, attesa del confine, cleanup europeo a blocchi (0e905be).
- [x] Avviso IN RISERVA solo a Michele Bruni autenticato Google: token privato,
      revoca logout, filtro SW, dedup transazionale. 181 test + 19 prove emulatore.
- [x] Documenti aggiornati alle decisioni finali: 35 minuti, niente storico
      giornaliero, niente app nativa per ora. Informativa già ripristinata.
- [x] Grafica della mappa decisa con Michele il 14 set 2026 guardando l'anteprima:
      niente scia, un puntino per socio, nome bianco con ombra che cresce con lo
      zoom. La push di ingresso dice solo MAPPA: nome e ora si leggono in mappa.
- [x] **Deploy fatto il 14 set 2026**, chiesto da Michele: rules, functions e
      hosting. Fino a quel giorno non era pubblicato niente della mappa: il sito
      vivo era fermo al 2 set e `onLocationCreate` non esisteva sul server. È
      per questo che l'avviso non arrivava — non era rotto, non c'era.
- [x] Due incidenti durante quel rilascio, entrambi chiusi in giornata:
      1) la schedulata `cleanupOldLocations` rifiutata perché Cloud Scheduler
      non esiste in `europe-west12`, mentre la vecchia in us-central1 era già
      stata cancellata: per ~15 minuti nessuno cancellava le posizioni. Spostata
      in `europe-west8` (Milano), job verificato ENABLED, doppione morto a
      Torino eliminato. 2) l'errore delle functions ha impedito al primo
      tentativo la release dell'hosting, lasciando le rules nuove sopra il sito
      vecchio: ripubblicato subito.
- [ ] Prova sul telefono di Michele: aggiornare l'app ("Nuova versione"), login
      Google, farsi geolocalizzare in riserva, aspettare la push MAPPA e provare
      il logout.
- [x] Pulizia effettiva circa 35–45 minuti: tolleranza accettata esplicitamente da Michele il 10 set 2026. Nessuna modifica richiesta; non blocca il rilascio.
- [ ] Notifiche generiche: decisione chiusa, post subito e azzeramento del conto
      in attesa. Implementazione ancora da fare: .scratch/notifiche-generiche/spec.md.
- [ ] Riassociazione iPhone fra Safari/Home/browser WhatsApp: ancora aperta.
- [x] Deploy coordinato eseguito il 14 set 2026 su richiesta di Michele. I
      prossimi restano solo su richiesta.

### ► PROSSIMA SESSIONE: DESIGN E USABILITÀ
L'app **funziona**, la parte tecnica è a posto. Il prossimo lavoro è di
design, non di funzionalità. Michele sta raccogliendo note usandola: partire
da quelle, non da un redesign a tavolino.

Problema già emerso in produzione: **arrivano troppe notifiche**.
Vedi "DESIGN E NOTIFICHE" in DA FARE per l'analisi.

---

## FASE 1 — UI base
- [x] Struttura componenti separati in src/components/
- [x] Long press login admin sul logo (3 secondi) → modal con bottone "Accedi con Google"
- [x] AssignmentBoxes.tsx — quadratini 26×26px, X nera grande, bordo verde, sfondo pagina
- [x] CategoryRow.tsx — struttura base
- [x] NotesCard.tsx — note + alert rosso
- [x] ZoneTabs.tsx — tab Campa/Tovel per Camoscio
- [x] Layout verticale categorie — linee di separazione, niente card
- [x] Grafica fedele a docs/preview_v2.html
- [x] Header: logo sx, testo sx, long press admin
- [x] Scroll verticale funzionante
- [x] SwipeContainer rimosso — BottomNav 4 tasti (Bacheca, Capriolo, Cervo, Camoscio)

## FASE 2 — Bacheca
- [x] Feed scrollabile (più recente in cima)
- [x] PostCard: testo + foto intera + data/ora + tipo
- [x] Vista Rettore: pulsante + e cestino
- [x] Vista Direttivo: pulsante + e cestino (5 membri riconosciuti dal nome)
- [x] Upload foto su Firebase Storage
- [x] Conferme lettura (solo admin/direttivo vede chi ha letto)
- [x] "Hanno letto" salvato su Firestore, confronto nomi normalizzato

## FASE 3 — Ruote e Squadre
- [x] Pulsante in fondo a ogni schermata assegnazioni
- [x] Capriolo: "Squadre", Cervo e Camoscio: "Ruota"
- [x] Pulsante visibile ai cacciatori solo se c'è contenuto caricato
- [x] RuotaView: testo editabile + upload foto multiple
- [x] Admin: aggiungi/elimina foto, modifica testo

## FASE 4 — Impostazioni stagione
- [x] Icona ingranaggio nell'header (solo admin, solo bacheca)
- [x] SettingsScreen: tab per specie, anno, totale capi, stato categorie
- [x] Pulsante "Nuova stagione" → azzera abbattuti con conferma
- [x] Desinenze corrette (Aperti/Aperte, Sospesi/Sospese, Chiusi/Chiuse)
- [x] Ordine camoscio: m1 m2 m3 f1 f2 f3 — zone separate (Zona Campa / Zona Tovel)

## FASE 5 — Notifiche e Mappa
- [x] DeviceId UUID persistente (localStorage: riservapp_device_id)
- [x] Firebase Messaging init + service worker (public/firebase-messaging-sw.js)
- [x] useFCM.ts — token rinnovato ad ogni avvio, gestore foreground
- [x] useGeolocation.ts — geofencing Turf.js, smart frequency, GDPR TTL 35min
- [x] Cloud Functions: onPostCreate, onConfigUpdate (quota+sospeso), cleanupOldLocations
- [x] MappaScreen.tsx — Google Maps satellite, poligono riserva, marker real-time
- [x] Header: icona mappa per admin (solo bacheca)
- [x] Firestore rules aggiornate e deployate

## ACCESSO E RUOLI (2026-04-05)
- [x] Lista soci in config/members (45 nomi)
- [x] Slot esclusivo per nome (max 1 dispositivo per nome) in config/slots
- [x] Normalizzazione nomi: sort parole → "Bruni Michele" = "Michele Bruni"
- [x] Ruolo Direttivo riconosciuto dal nome (5 membri)
- [x] Admin non occupa slot — usa Google Auth separato
- [x] Seed tool: public/seed-members.html

## SICUREZZA (2026-04-05)
- [x] Allowlist email admin (ADMIN_EMAILS in AuthContext.tsx)
- [x] Firestore rules: write solo admin, post solo direttivo/admin
- [x] config/slots e config/ospite: write pubblica (slot system)

## ONBOARDING
- [x] Codice pronto (OnboardingScreen.tsx)
- [x] Schermata privacy GDPR con bottoni Accetto / Non accetto
- [x] Video onboarding: public/onboarding.mp4 presente e deployato

## LOGO E PWA (2026-04-11)
- [x] Nuovo logo senza scritta (logo_tuenno_ui.png)
- [x] manifest.json: short_name = "Caccia Tuen"
- [x] firebase-messaging-sw.js: notificationclick funziona su localhost e produzione

## SICUREZZA FASE 1 (2026-04-19)
- [x] Anonymous Auth all'avvio — Firestore rules richiedono `request.auth != null` per ogni read
- [x] `authReady` attende `getIdToken()` prima di risolvere (evita permission-denied al boot)
- [x] Mock `persistentLocalCache` + auth nei test

## OFFLINE-FIRST (2026-04-19 → 04-25)
- [x] `useOnlineStatus` con tracking `lastSyncAt`
- [x] `OfflineBanner` montato, `lastSyncAt` da snapshot freschi
- [x] `PhotoPlaceholder` + `foto_width`/`foto_height` per aspect-ratio senza layout shift
- [x] Write Firestore protette da check online (`requireOnline`), bottoni Settings disabilitati
- [x] `reconcilePhotoCache` — collector puro + GC async, cleanup cache su delete
- [x] Prefetch dei 30 post più recenti
- [x] Migrazione a Workbox `injectManifest` manuale, rimosso `vite-plugin-pwa`
- [x] PDF regolamento offline via `REGOLAMENTO_CACHE` + blob URL
- [x] Lightbox foto in PostCard (Escape, swipe giù, tap sul fondo)
- [x] `docs/` — audit del gap service worker e strategia offline
- [ ] **Verificare l'offline su telefono reale** — il PDF e le foto in aereo mode

## SICUREZZA STORAGE (2026-04-26)
- [x] `storage.rules` — read autenticata, write solo admin su ruote/regolamento
- [x] `firebase.json` include storage nel deploy
- [x] Realtime Database: non usato dall'app, root a `null`
- [ ] **Disabilitare RTDB** dalla console Firebase (va fatto a mano, non da CLI)

## RECUPERO ALBERO (2026-08-17)
- [x] Albero di lavoro ricostruito in `riservapp_v2_restore`, `main` = `e2f1d79`
- [x] Recuperato il lavoro del 25 apr che era in produzione ma mai committato
- [x] `globPatterns` con `pdf` ripristinato, `@types/react@^19` reinstallato
- [ ] Mettere al sicuro `.env.local` fuori dal disco (password manager o secret store)
- [x] Rimuovere la regola header `/sw.js` da `firebase.json` (config morta) — ora punta a `/firebase-messaging-sw.js`
- [ ] Cancellare `Desktop\michele\riservapp_v2` (rotta) e `Desktop\backup\riservapp_v2g`
      — solo DOPO aver messo al sicuro `.env.local`, il backup ne è l'unica altra copia

## HARDENING + SOLO RETTORE (2026-08-17)
Semplificazione voluta: SOLO il Rettore pubblica/modifica/scrive. Il direttivo non pubblica più.
- [x] Rules: post create/delete solo admin (la vecchia regola era spoofabile via campo `autore`)
- [x] Rules: `letti` solo append; `fcm_tokens`/`user_locations` richiedono auth + schema
- [x] Rules: `config/slots` — il socio può solo AGGIUNGERE la propria chiave (slot libero = chiave assente)
- [x] Rules: `config/onboarding_reset` — il device può solo rimuovere id; `config/ospite` rimosso (deny)
- [x] Storage rules: `posts/` write solo admin
- [x] Functions: trigger "categoria chiusa" (mancava!), pairing categorie per id, push data-only
      (niente doppia notifica), dedup token, post di sistema in bacheca (`noPush`) come fallback push
- [x] Client: rimosso ruolo direttivo (UI + handler), rimosso post demo hard-coded
- [x] Client: `handleReleaseSlot` usa `deleteField`; migrazione automatica slot `null` (solo admin)
- [x] Client: conferma prima di chiudere una quota (evita push per tap accidentale)
- [x] FCM: prompt permesso dentro il gesto utente (fix iOS); `Notification.permission` è la fonte
      di verità (recupero dopo "nega"); banner stato notifiche in bacheca (attiva/bloccate/non supportate)
- [x] UpdateBanner: nuovo SW in waiting → "Nuova versione — tocca per aggiornare" (SKIP_WAITING su gesto)
- [x] `firebase.json`: predeploy `npm run build` (impossibile deployare dist stale/senza precache)
- [x] Privacy onboarding: TTL posizioni corretto a 35 minuti (prima diceva 1 minuto, non vero)
- [x] **Deploy**: `firebase deploy` eseguito 2026-08-17 ~17:20 — rules Firestore/Storage rilasciate, 3 functions aggiornate (onPostCreate, onConfigUpdate, cleanupOldLocations), hosting `riservatuenno` release completa. Warning: runtime Node 20 deprecato, decommission 2026-10-30 → upgrade a Node 22 + firebase-functions@latest prima di ottobre
- [ ] **Test su telefono reale**: notifica singola (non doppia), banner attiva notifiche, update banner
- [ ] **Verificare il regolamento in modalità aereo** — deve aprirsi il decreto 45, non il vecchio
- [x] **`firebase.json`: predeploy build anche per le functions** (20 ago 2026).
      L'hosting ce l'aveva, le functions no: `firebase deploy` spediva `lib/`
      così com'era, quindi bastava dimenticare `npx tsc` per deployare codice
      vecchio senza accorgersene.
- [ ] **Upgrade runtime functions a Node 22** + `firebase-functions@latest` — Node 20 dismesso il 2026-10-30 (breaking changes, sessione dedicata)

## DESIGN E NOTIFICHE (aperto — focus prossima sessione)

Feedback dall'uso reale (Michele, 17 ago 2026): l'app funziona ma
**arrivano troppe notifiche** e l'interfaccia non è abbastanza intuitiva.
Michele sta prendendo note man mano che la usa: aspettare quelle prima di
riprogettare, sono la fonte migliore che abbiamo.

- [x] **Notifiche senza indicazione della specie** — RISOLTO 18 ago 2026.
      `onConfigUpdate` componeva il testo dalla sola categoria: il socio leggeva
      "MASCHI DI PRIMA CLASSE è stata chiusa" senza sapere di quale animale si
      parlasse. Nome condiviso fra capriolo e camoscio, e nel camoscio duplicato
      sulle due subzone: tre eventi, una sola notifica indistinguibile.
      Ora titolo = SPECIE (+ zona), corpo = categoria + stato in maiuscolo.
      Aggiunto `ts` (ora dell'evento) usato dal SW come `timestamp`.
      Vedi "Testo delle notifiche di categoria" in CLAUDE.md.
- [ ] **Raccogliere le note d'uso di Michele** — punto di partenza obbligato
- [x] **Avviso in app quando il Rettore segna degli abbattimenti** (20 ago 2026).
      Il socio non riceveva nulla: gli abbattimenti comparivano in silenzio.
      Scelta di Michele: **niente push** (ce ne sono già troppe), l'avviso si
      vede aprendo l'app. Pastiglia rossa senza numero sull'icona della specie,
      riquadro in cima alla bacheca che porta al piano, pastiglia NUOVO sulla
      riga della categoria e crocette rosse sui capi nuovi.
      Tutto locale: `localStorage`, zero scritture Firestore, zero regole nuove,
      zero Functions. 42 test nuovi. Vedi "Avviso capi nuovi" in CLAUDE.md.
- [x] **Notifica di quota raggiunta rimossa** (18 ago 2026). Registrare l'ultimo
      capo e chiudere la categoria erano due push + due post per lo stesso fatto.
      Resta la sola chiusura. Primo taglio al volume di notifiche.
- [ ] **Ridurre il volume di notifiche.** Ipotesi da verificare (non ancora
      confermata sul campo): in `functions/src/index.ts` il trigger
      `onConfigUpdate` cicla su tutte le specie e categorie e invia **una push
      per ogni transizione**, più un post di sistema ciascuna. Chiudere o
      sospendere 4 categorie in un colpo → 4 notifiche + 4 post in bacheca.
      Direzione: aggregare le transizioni della stessa invocazione in una sola
      notifica ("3 categorie chiuse: ...") e un solo post. Da verificare anche
      quante scritture su `config/main` genera SettingsScreen per ogni modifica
      dell'admin: se ne fa una per campo, ogni ritocco è una push a sé.
- [ ] **L'avviso "Aggiornamento piano" si spegne troppo tardi, e non sembra
      toccabile** — nota d'uso di Michele, 16 set 2026.
      Oggi la fotografia degli abbattimenti si aggiorna quando il socio **esce**
      dalla specie: chi tocca il riquadro in bacheca, guarda il piano e poi
      cambia schermata trova ancora acceso l'avviso finché non ripassa dalla
      bacheca. Michele lo vuole spento **appena ci clicca sopra** per andare a
      vedere il piano.
      Attenzione: la regola dell'uscita esiste per un motivo (la pastiglia NUOVO
      sulle righe e le crocette rosse sparirebbero prima che il socio le veda),
      quindi le due cose vanno separate: spegnere il riquadro della bacheca al
      tocco, tenere accese le crocette finché resta sulla specie.
      Secondo pezzo: far **capire che il riquadro si può toccare** — oggi sembra
      solo un avviso. Serve un segno visibile (freccia, "vedi il piano", tasto).
      Vedi "Avviso capi nuovi" in CLAUDE.md, `useNovita.ts` e `AvvisiNovita`.
- [ ] **Le icone delle specie in fondo alla pagina si vedono poco** — nota
      d'uso di Michele, 16 set 2026. Vuole **icone più grandi** e le scritte un
      po' più grandi.
      Misure di oggi in `BottomNav.tsx`: barra alta 68px, icone 24×24px dentro
      un riquadro da 32px, scritte da **11px** maiuscole. Sono le scritte più
      piccole di tutta l'app, che altrove usa 20 e 30px apposta per chi ci vede
      poco: la barra è rimasta indietro.
      C'è anche un motivo nascosto: le icone delle specie non aperte sono
      **sbiadite al 45%** (`opacity: 0.45`). Anche a parità di dimensione si
      vedrebbero meglio alzando quel valore. Da provare prima di ingrandire
      tutto.
- [ ] **Idea di Michele: togliere "Bacheca" dalla barra** e lasciare le sole tre
      specie, tornando in bacheca col tasto indietro di Android — un tocco alla
      bacheca, un altro tocco fuori dall'app.
      Due parti, e conviene separarle:
      - **il tasto indietro che riporta in bacheca si può fare**, e da solo è un
        miglioramento. Oggi l'app non lo gestisce affatto: nessuna traccia di
        `popstate` o `pushState` nel codice, quindi premendo indietro l'app si
        chiude e basta.
      - **togliere il tasto Bacheca è la metà rischiosa.** Sugli iPhone il tasto
        indietro non esiste, e l'app è installata a schermo intero
        (`"display": "standalone"` nel manifest): un socio con l'iPhone
        resterebbe chiuso dentro la specie senza più una strada per la bacheca.
        Prima di toglierlo serve sapere **quanti soci hanno l'iPhone**.
      Proposta: fare prima il tasto indietro tenendo il bottone Bacheca al suo
      posto. Il guadagno lo si ha subito, e lo spazio per le icone più grandi
      si trova lo stesso alzando un po' la barra.
- [ ] **Review usabilità.** Utenti anziani, 45 soci. Guardare: gerarchia della
      bacheca, riconoscibilità dei tasti, `AssignmentBoxes` (aree di tocco
      26×26px, sotto i 44px consigliati), leggibilità dei font già ingranditi.
- [ ] Decidere se le notifiche vanno rese silenziabili per categoria dal socio

---

## REGISTRO DEGLI ABBATTIMENTI (aperto — deciso con Michele il 16 set 2026)

Oggi l'app **non tiene memoria del singolo capo**: la crocetta del Rettore alza
di uno un contatore dentro `config/main`. Chi, quando e a che ora non esistono
da nessuna parte, e a fine stagione non c'è niente da rileggere.

Michele quel lavoro lo rifa a mano su **bd.cacciatoritrentini.it** (il sito
dell'Associazione Cacciatori Trentini), dove aggiunge età del capo, causa della
morte, località e una foto.

### Quello che si fa
- [ ] Alla crocetta l'app chiede **il nome del cacciatore** (scelto dalla lista
      soci che l'app ha già) e subito dopo un campo **note** libero.
      Due domande, non una. Deciso da Michele.
- [ ] Ogni capo diventa una riga a sé: **nome e cognome, data, ora, specie,
      classe, note**.
- [ ] **Un report di fine giornata** con le righe del giorno: è quello che
      Michele si porta dietro la sera quando ricopia i capi sul sito
      dell'Associazione dal telefono.
- [ ] L'archivio resta consultabile tutta la stagione: a fine anno il riepilogo
      di tutte le date e specie deve uscire da qui.
- [ ] Togliendo la crocetta (correzione del Rettore) la riga va cancellata:
      numero del piano e registro devono restare sempre d'accordo.
- [ ] Il piano continua a contare come oggi; il registro è un quaderno a
      fianco, non una seconda verità sui numeri.

### Deciso da Michele il 16 set 2026
- Il report è **una schermata che apre lui**, non una notifica: di notifiche ne
  arrivano già troppe (è il problema aperto in "DESIGN E NOTIFICHE").
- Il nome del cacciatore lo vede **solo il Rettore**. Il registro sta quindi
  dove sta il diario: un documento a sé, chiuso ai soci nelle regole Firestore,
  non dentro `config/main` che ogni telefono scarica per intero.
  Stesso motivo scritto in "Diario del Rettore" in CLAUDE.md.

### Ancora da guardare quando si implementa
- [ ] Il socio continua a vedere le crocette come adesso: il registro non
      cambia niente di quello che vede lui.
- [ ] Il campo note è libero e può restare vuoto: non deve fermare il Rettore
      che sta segnando col dito.

### Collegamento automatico a bd.cacciatoritrentini.it — ABBANDONATO
**Chiuso da Michele il 16 set 2026.** L'idea era che un programma entrasse col
suo accesso e compilasse nome, cognome, specie e classe, lasciandogli da
aggiungere la sera solo il resto. Non si può fare: il modulo del sito pretende
**troppi campi obbligatori** che l'app non conosce — causa della morte del capo,
località e altri. Una scheda a metà non si salva, quindi il robot non ha niente
da inserire.

Sono cadute per strada anche le altre due forme: Michele quel sito lo usa
**solo dal telefono**, e dentro il browser di un telefono, su un sito di altri,
non si può mettere niente di nostro.

Resta quindi il **report**, che è la cosa utile davvero: lui ricopia a mano come
adesso, ma legge una riga già pronta invece di ricordarsi a memoria chi ha
sparato a cosa e quando.

Note tecniche del sito, se un giorno si riapre il discorso: è
**bd.cacciatoritrentini.it** (senza punto non esiste), TYPO3, login con nome
utente e password, nessun canale per programmi esterni visibile da fuori.

---

## DA FARE
- [ ] **Verifica geofence** con socio fisicamente in riserva
- [x] Deploy Firebase — hosting + rules + functions deployato
- [x] Test notifiche push su telefono reale — funzionanti
- [x] Video onboarding (public/onboarding.mp4) — deployato

---

## Log sessioni
<!-- 2026-03-27: Refactor con 4 agenti, 11 file creati, build ok -->
<!-- 2026-03-30: Bacheca foto upload, login fix, Ruote&Squadre, Impostazioni stagione -->
<!-- 2026-04-03: Grafica header, mappa satellite, long press fix, icone PWA -->
<!-- 2026-04-04: SwipeContainer rimosso, BottomNav 4 tasti, sicurezza login, nuovo URL -->
<!-- 2026-04-05: Sistema allowlist soci, slot esclusivi per nome, ruolo direttivo -->
<!-- 2026-04-05 sera: Fix slot admin, font messaggi 30px, modale nome e cognome -->
<!-- 2026-04-05 notte: Desinenze stato, ordine camoscio, zone settings, font note/ruota, tasto Squadre, scroll fix -->
<!-- 2026-04-06: Notifiche FCM funzionanti, "hanno letto" su Firestore, fix direttivo, fix slot admin -->
<!-- 2026-04-08: Cestino direttivo, notificationclick handler, type safety Post, Firestore rules deploy -->
<!-- 2026-04-11: Nuovo logo senza scritta, short_name Caccia Tuen, fix notificationclick URL -->
<!-- 2026-04-12: Fix FCM push (vite-plugin-pwa conflict), foreground notifications, SW self-destroying -->
<!-- 2026-04-13: Rimossi file morti (SwipeContainer, AssignmentView, AssignmentGrid), TASKS.md allineato allo stato reale -->
<!-- 2026-04-19: Sicurezza Fase 1 (Anonymous Auth + rules), spec offline-first, useOnlineStatus, OfflineBanner -->
<!-- 2026-04-20: PhotoPlaceholder, aspect-ratio foto, lastSyncAt da snapshot -->
<!-- 2026-04-22: Write protette offline, requireOnline, PHOTO_CACHE, reconcilePhotoCache -->
<!-- 2026-04-24: Prefetch 30 post, reconcile gated, cleanup cache su delete -->
<!-- 2026-04-25: Workbox injectManifest manuale, rimosso vite-plugin-pwa, PDF offline, lightbox foto, deploy prod 16:22 -->
<!-- 2026-04-26: storage.rules deployate, RTDB verificato vuoto, push su GitHub -->
<!-- 2026-08-17: Albero di lavoro trovato senza file di config e senza .git. Recuperato il -->
<!--   refactor del 25 apr, che era live in produzione ma non committato da nessuna parte.   -->
<!--   Fuso clone + copia locale congelata, build verificato identico a produzione (hash     -->
<!--   bundle e 14 URL nel precache), commit e2f1d79 su main. Da qui GitHub è la fonte unica.-->
<!-- 2026-08-17 pom: Code review completa + hardening. Modello semplificato: solo Rettore    -->
<!--   scrive. Rules blindate (post spoofabili, slots, token), trigger "chiusa" aggiunto,    -->
<!--   push data-only, post di sistema, UpdateBanner, fix permesso iOS, predeploy build.     -->
<!-- 2026-08-17 sera: Deploy in produzione (rules + 3 functions + hosting). Poi dicitura    -->
<!--   regolamento corretta in "Decreto 45 del 25 maggio 2026". Trovato che il regolamento   -->
<!--   nuovo non raggiungeva i soci offline: l'upload riusa lo stesso path Storage, cambia   -->
<!--   solo il token, e match(ignoreSearch) trovava il vecchio PDF considerandolo valido.    -->
<!--   Ora match esatto + prune delle versioni precedenti. Rimosso il PDF bundled del        -->
<!--   decreto 86 (fallback sbagliato, -1,58 MB di precache): unica fonte regolamento_url.   -->
<!--   Chiusa la fase tecnica. Feedback dall'uso: troppe notifiche, UI da rendere più        -->
<!--   intuitiva. Prossima sessione sul design, partendo dalle note d'uso di Michele.        -->
<!-- 2026-08-18: Notifiche di categoria senza specie. Root cause: onConfigUpdate     -->
<!--   usava solo cat.nome, specieId era nel loop ma inutilizzato. Aggravante: il     -->
<!--   camoscio ha 12 categorie duplicate su due subzone con nome identico.           -->
<!--   Etichette estratte in functions/src/labels.ts (index.ts non e' importabile:    -->
<!--   chiama initializeApp al load), 15 test di regressione, test esclusi dal build   -->
<!--   Functions. Formato rivisto con Michele guardando le notifiche sul telefono.    -->
<!--   Commit f3ef50d + a995e8a. Deployati poi lo stesso giorno alle 14:30.        -->
<!-- 2026-08-18 pom: Formato notifiche rivisto con Michele guardandole sul telefono:  -->
<!--   SPECIE maiuscola nel titolo (l'OS la rende grassetto/grande, non impostabile   -->
<!--   da codice), categoria in caso normale + stato in caps come unica evidenziazione.-->
<!--   Desinenza presa da badgeChiusura invece che dedotta dal nome: stessa fonte del  -->
<!--   badge in CategoryRow. Notifica di quota raggiunta rimossa e conferma in App.tsx -->
<!--   riscritta (non promette piu' una push). 36 test verdi.                          -->
<!-- 2026-08-20: Verificato prima di deployare: hosting live identico al build      -->
<!--   locale (stessi hash bundle e SW), functions aggiornate il 18 alle 14:30 —     -->
<!--   era gia' tutto in produzione, la nota "DA DEPLOYARE" era rimasta indietro.    -->
<!--   Aggiunto il predeploy build alle functions in firebase.json. Poi ripreso il   -->
<!--   task del mattino: avviso in app per gli abbattimenti segnati dal Rettore.     -->
<!--   Approvata l'opzione C col bollino SENZA numero. Tutto in TDD: novita.ts,      -->
<!--   useNovita.ts, AvvisiNovita.tsx + pastiglia NUOVO e crocette rosse. 78 test.   -->
<!-- 2026-08-20 sera: Riquadro novita' in bacheca rifatto con Michele: solo    -->
<!--   specie + "Aggiornamento piano" + data, via il conteggio capi e l'elenco  -->
<!--   categorie (il numero resta nella pastiglia NUOVO). La data e' lastUpdated -->
<!--   della specie, la stessa che AssegnazioniScreen mostra in fondo al piano.  -->
<!--   "Riserva Val di Tovel" -> RISERVA TUENNO, corpo clamp(20px,7.5vw,30px):   -->
<!--   erano corsivo e letterSpacing 0.09em a mangiare la larghezza. Poi diario  -->
<!--   privato del Rettore per specie, in TDD: config/note_rettore chiuso dalle  -->
<!--   rules al solo admin, non un campo nascosto in config/main. 99 test.       -->
<!--   Chiarito da Michele: i riquadri servono a CORREGGERE un abbattimento,     -->
<!--   l'ingranaggio a MODIFICARE il piano. Sono due gesti distinti.             -->
<!-- 2026-09-09: Revisione su richiesta di Michele, con un secondo modello a     -->
<!--   rivedere progetto e codice. Verificato che le notifiche di aggiornamento   -->
<!--   piano funzionano (log: 28 token, 0 falliti) e che i 5 minuti di quiete     -->
<!--   spiegano il "non arriva niente". Il deviceId NON era in sessionStorage:    -->
<!--   la causa e' Safari che svuota, e su iPhone tre memorie separate per lo     -->
<!--   stesso indirizzo. Fatte le tre correzioni urgenti (guardia fromCache,      -->
<!--   rientro col proprio slot, deviceId letto una volta). 142 test verdi.       -->
<!--   Da deployare: no, deciso con Michele quando il resto e' pronto.            -->
