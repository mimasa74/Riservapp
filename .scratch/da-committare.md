# Da committare dopo il discorso della posizione

Lista tenuta a mano: cosa resta da mettere su GitHub quando avremo chiuso il
lavoro sulla mappa a scia (`.scratch/mappa-scia-posizioni/`).

Aggiornata il 10 set 2026.

## Gia' su GitHub

- Tasto avviso urgente sull'ultimo capo (`src/App.tsx`,
  `src/components/BachecaScreen.tsx`) — provato dai test, non ancora provato
  con le mani da Michele. Biglietto:
  `.scratch/notifiche-generiche/issues/02-tasto-avviso-ultimo-capo.md`.

- Dati della mappa (biglietto `mappa-scia-posizioni/02`): rules, gancio,
  pulizia, raggruppamento per telefono. Fatto e committato il 10 set sera, da
  provare.

## Da fare, poi da committare

1. **Avviso al Rettore completato** (biglietto `mappa-scia-posizioni/05`):
   verificato da Codex, pronto per prova reale. Vedi HANDOFF.md.
2. **Disegno della scia** (biglietto `03`): Michele guarda e decide pallini,
   linea ed etichette.
3. **Documenti completati** (biglietto `04`): `CLAUDE.md` e `TASKS.md` allineati.
4. **Notifiche generiche** (spec `notifiche-generiche/spec.md`): il post in
   bacheca fa partire la push subito e azzera il conto dell'avviso piano.

## Correzioni di documento completate da Codex

- `CLAUDE.md` dice `merge: true` per l'accumulo dell'avviso piano: il codice usa
  `mergeFields` ed e' giusto il codice.
- `CLAUDE.md` nomina `riservapp_letti_*` fra le chiavi di localStorage: nel
  codice non esiste.

## Deciso che non si fa ora

- Deploy: si fa solo con l'ok di Michele, e non e' ancora stato dato. In
  produzione manca tutto il lavoro dal commit `76a2ed1` in poi.
- App vera da scaricare dal negozio Android per avere la posizione a telefono
  chiuso: **no per adesso**, deciso da Michele il 10 set 2026.
- Al primo deploy delle Functions: cancellare a mano la vecchia
  `cleanupOldLocations` rimasta in us-central1, altrimenti girano due pulizie.

## Da fare: ripartire costa troppo

Segnalato da Michele il 10 set 2026: riprendere il lavoro in una sessione nuova
consuma circa 84.000 token prima ancora di scrivere una riga. Le voci grosse:
`CLAUDE.md` (2.900 parole, letto a ogni avvio), `TASKS.md` (2.900 parole), la
lista delle osservazioni stampata all'avvio, le skill e i server dichiarati, e
la skill di checkpoint che inietta migliaia di token solo per rileggere un file.
Da rivedere: cosa resta in `CLAUDE.md` e cosa si sposta sotto `docs/`, e un file
di ripresa corto da leggere per primo. Chiesto un parere a Fable.
