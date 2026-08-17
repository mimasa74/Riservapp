# TASKS.md — RiservApp
# Aggiorna dopo ogni sessione Claude Code, poi committa e pusha su main.
# Un lavoro non committato può esistere in un solo posto al mondo: è già successo.

## Come riprendere
Scrivi a Claude Code:
"Leggi CLAUDE.md e TASKS.md e riprendi dal primo task non completato."

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
- [ ] **Upgrade runtime functions a Node 22** + `firebase-functions@latest` — Node 20 dismesso il 2026-10-30 (breaking changes, sessione dedicata)

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
