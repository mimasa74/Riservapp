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
- [x] Pallini navigazione in cima
- [x] Scroll verticale funzionante
- [x] SwipeContainer con overflow-x clip

## FASE 2 — Bacheca
- [x] Feed scrollabile (più recente in cima)
- [x] PostCard: testo + foto intera + data/ora + tipo
- [x] Vista Rettore: pulsante + e cestino
- [x] Upload foto su Firebase Storage
- [x] Conferme lettura (solo admin vede chi ha letto)

## FASE 3 — Ruote e Squadre
- [x] Pulsante in fondo a ogni schermata assegnazioni
- [x] Label: "ASSEGNAZIONI" per Capriolo, "RUOTA" per Cervo e Camoscio
- [x] Pulsante visibile ai cacciatori solo se c'è contenuto caricato
- [x] RuotaView: testo editabile + upload foto multiple
- [x] Admin: aggiungi/elimina foto, modifica testo

## FASE 4 — Impostazioni stagione
- [x] Icona ingranaggio nell'header (solo admin)
- [x] SettingsScreen: tab per specie, anno, totale capi, stato categorie
- [x] Pulsante "Nuova stagione" → azzera abbattuti con conferma
- [ ] NOTE: Michele preferisce aggiornare dati a inizio stagione con Claude Code direttamente

## ONBOARDING
- [x] Codice pronto (OnboardingScreen.tsx)
- [ ] Video onboarding: in attesa di `public/onboarding.mp4` da Nanobana
- [ ] Immagine header privacy: in attesa di `public/onboarding.png`

## FASE 5 — Notifiche e Mappa
- [x] DeviceId UUID persistente (localStorage: riservapp_device_id)
- [x] firebase.json + .firebaserc
- [x] Firebase Messaging init + service worker (public/firebase-messaging-sw.js)
- [x] src/hooks/useFCM.ts — initFCM() richiede permesso + salva token FCM
- [x] src/hooks/useGeolocation.ts — geofencing Turf.js, smart frequency
- [x] Cloud Functions: onPostCreate, onConfigUpdate (quota+sospeso), cleanupOldLocations (TTL GDPR)
- [x] MappaScreen.tsx — Google Maps con poligono riserva e marker real-time
- [x] Header: icona mappa per admin
- [x] Firestore rules aggiornate
- [ ] **PROSSIMO STEP — Deploy:**
  1. Compilare in .env.local: VITE_FCM_VAPID_KEY (da Firebase Console → Cloud Messaging → Web Push certificates)
  2. Compilare in .env.local: VITE_GOOGLE_MAPS_API_KEY (da Google Cloud Console → API & Services)
  3. `firebase login` nel terminale
  4. `firebase deploy --only functions,firestore:rules`

## FIREBASE — configurazione completata
- [x] Firestore: database default in Torino (europe-west12)
- [x] Firebase Auth: localhost autorizzato
- [x] Firebase Storage: bucket riservapp-6054c.firebasestorage.app, CORS configurato
- [x] Regole Firestore: read pubblico, write solo autenticati

---

## Log sessioni
<!-- 2026-03-27: Refactor con 4 agenti, 11 file creati, build ok -->
<!-- 2026-03-30: Bacheca foto upload, login fix, Ruote&Squadre ridisegnate, Impostazioni stagione, fix quadratini -->
