# CLAUDE.md — RiservApp
# Leggi questo file per primo. Poi leggi docs/01_DATA.md, docs/02_LOGIC.md, docs/03_UI.md

---

## Cos'è questa app
Bacheca digitale per la Riserva di Caccia di Tuenno (40-45 soci).
Sostituisce il gruppo WhatsApp con uno strumento strutturato.

## Stack
- React 19 + TypeScript
- Tailwind CSS v4
- Firebase Firestore (real-time)
- Firebase Auth (Google Sign-In — solo admin)
- Firebase Cloud Messaging (notifiche push)
- Vite 6

## Documenti da leggere in ordine
1. `docs/01_DATA.md` — struttura dati e categorie reali
2. `docs/02_LOGIC.md` — regole di business
3. `docs/03_UI.md` — interfaccia utente
4. `docs/preview_v2.html` — mockup interattivo approvato dal cliente

## Asset
- `assets/icons/` — loghi specie (cervo, capriolo, camoscio)
- `assets/mockups/` — screenshot di riferimento grafico

## Regola fondamentale
UNA SOLA APP, DUE MODALITÀ:
- Cacciatore: apre e vede tutto, sola lettura, nessun login visibile
- Rettore: long press 3 secondi sul logo → Google Sign-In

Il cacciatore non deve MAI sapere che esiste una modalità admin.

## Stato avanzamento
- [x] Struttura componenti separati in src/components/
- [x] Long press login admin sul logo
- [x] AssignmentBoxes, CategoryRow, NotesCard, ZoneTabs
- [ ] Layout verticale categorie (un blocco per categoria)
- [ ] Grafica fedele a docs/preview_v2.html
- [ ] Scroll verticale funzionante
- [ ] Bacheca feed
- [ ] Ruote e Squadre
- [ ] Impostazioni stagione

## Primo messaggio da inviare
"Leggi CLAUDE.md e tutti i file in docs/.
Implementa il layout verticale delle categorie
fedele a docs/preview_v2.html.
Ogni categoria è un blocco separato con bordo.
Usa le categorie reali da docs/01_DATA.md.
Confronta con assets/mockups/."
