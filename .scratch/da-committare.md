# Da committare dopo il discorso della posizione

Lista tenuta a mano: cosa resta da mettere su GitHub quando avremo chiuso il
lavoro sulla mappa a scia (`.scratch/mappa-scia-posizioni/`).

Aggiornata il 10 set 2026.

## Gia' su GitHub

- Tasto avviso urgente sull'ultimo capo (`src/App.tsx`,
  `src/components/BachecaScreen.tsx`) — provato dai test, non ancora provato
  con le mani da Michele. Biglietto:
  `.scratch/notifiche-generiche/issues/02-tasto-avviso-ultimo-capo.md`.

## Da fare, poi da committare

1. **Mappa a scia, i dati** (biglietto `mappa-scia-posizioni/02`):
   `firestore.rules` (il socio puo' solo aggiungere una posizione),
   `src/hooks/useGeolocation.ts` (un documento per punto, niente cancellazione,
   corsa col poligono), `functions/src/index.ts` (pulizia alle 00:35, regione
   `europe-west12`), `src/components/MappaScreen.tsx` (raggruppa per telefono).
2. **Disegno della scia** (biglietto `03`): anteprima con dati finti, Michele
   guarda e decide pallini, linea ed etichette. Poi il codice vero.
3. **Documenti** (biglietto `04`): `CLAUDE.md` e `TASKS.md` allineati alla scia.
4. **Notifiche generiche** (spec `notifiche-generiche/spec.md`): il post in
   bacheca fa partire la push subito e azzera il conto dell'avviso piano.

## Correzioni di documento in coda, piccole

- `CLAUDE.md` dice `merge: true` per l'accumulo dell'avviso piano: il codice usa
  `mergeFields` ed e' giusto il codice.
- `CLAUDE.md` nomina `riservapp_letti_*` fra le chiavi di localStorage: nel
  codice non esiste.

## Deciso che non si fa ora

- Deploy: si fa solo con l'ok di Michele, e non e' ancora stato dato. In
  produzione manca tutto il lavoro dal commit `76a2ed1` in poi.
