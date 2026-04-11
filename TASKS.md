# TASKS.md — RiservApp
# Aggiorna dopo ogni sessione Claude Code

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
- [ ] **Video onboarding: in attesa di `public/onboarding.mp4` da Nanobana**
  - Specifiche: MP4 H.264, 15-20s, max 15MB, 4 foto Ken Burns

## LOGO E PWA (2026-04-11)
- [x] Nuovo logo senza scritta (logo_tuenno_ui.png)
- [x] manifest.json: short_name = "Caccia Tuen"
- [x] firebase-messaging-sw.js: notificationclick funziona su localhost e produzione

## DA FARE
- [ ] **Deploy Firebase** — `firebase deploy` (hosting + rules + functions)
  - Pubblica: logo nuovo, fix notificationclick, manifest aggiornato
- [ ] **Test notifiche su telefono reale** — verificare click su push apre l'app
- [ ] **Verifica geofence** con socio fisicamente in riserva
- [ ] **Video onboarding** (public/onboarding.mp4)

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
