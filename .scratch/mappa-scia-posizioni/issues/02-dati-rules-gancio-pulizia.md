# Un documento per punto, rules nuove, gancio senza cancellazione, pulizia alle 00:35

Status: ready-for-human
Type: task


Segue la spec. Quattro pezzi, da fare insieme perché il primo rompe gli altri:

1. **Rules** (`firestore.rules`, blocco `user_locations`): il socio può solo
   `create`; via `update` e `delete` per i client; togliere il confronto con
   l'id del documento; controllare i tipi (`deviceId`, `nome` stringhe corte,
   `lat`/`lng` numeri, `timestamp` timestamp). Lettura solo admin.
2. **Gancio** (`src/hooks/useGeolocation.ts`): `addDoc` su
   `collection(db, 'user_locations')` al posto del `setDoc` per dispositivo;
   via il `deleteDoc` all'uscita dal poligono; stesso passo di oggi (15/30
   minuti). Sistemare la corsa col poligono: non giudicare "fuori" finché il
   poligono non è arrivato, e rivalutare l'ultimo fix quando arriva. I test in
   `useGeolocation.test.ts` coprono solo le funzioni pure: aggiungerne uno per
   la corsa col poligono.
3. **Pulizia** (`functions/src/index.ts`, `cleanupOldLocations`): schedulata
   alle 00:35 `Europe/Rome`, regione `europe-west12`, cancella tutta la
   collezione a blocchi da 500.
4. **Mappa** (`src/components/MappaScreen.tsx`): raggruppa per `deviceId`,
   conteggio dei dispositivi distinti con la scritta "visti oggi". La resa
   grafica (pallini, linea, etichetta) è il biglietto 03: qui basta che
   funzioni.

Non deployare: il deploy lo decide Michele.

## Corretto la sera del 10 set 2026

Il punto 3 cambia: **niente schedulata alle 00:35**. `cleanupOldLocations`
continua a cancellare i punti piu' vecchi di **35 minuti**, come oggi, e le due
correzioni restano: regione `europe-west12` e cancellazione a blocchi da 500.

Il punto 4 cambia: l'intestazione resta **"N cacciatori in riserva"**, perche'
con 35 minuti chi e' sulla mappa e' stato visto nell'ultima mezz'ora. Si contano
i `deviceId` distinti, non i documenti.

Il resto (rules, gancio, un documento per punto, corsa col poligono) vale tale e
quale.

## Fatto il 10 set 2026 sera

- `firestore.rules`: `user_locations/{pointId}`, il client puo' solo `create`,
  update e delete chiusi a tutti, tipi e lunghezze controllati, lettura admin.
- `src/hooks/useGeolocation.ts`: `addDoc` su un documento per punto, ora del
  server (`serverTimestamp`) perche' un telefono con l'orologio sballato
  metterebbe i punti in disordine e scamperebbe alla pulizia; via il `deleteDoc`
  all'uscita; nuova funzione pura `valutaFix` con l'esito `aspetta-poligono` che
  tiene da parte il fix arrivato prima del confine e lo rivaluta; il confine si
  rilegge fino a tre volte se Firestore non risponde.
- `functions/src/index.ts`: `cleanupOldLocations` con regione `europe-west12`,
  fuso `Europe/Rome`, cancellazione a blocchi da 500, sempre a 35 minuti.
- `src/utils/scie.ts` (nuovo) + `MappaScreen.tsx`: i punti si raggruppano per
  telefono, linea sottile fra i punti, pallini piccoli sui precedenti, nome e
  ora solo sull'ultimo. L'intestazione conta i telefoni distinti.
- Test: 155 verdi, 13 nuovi fra `valutaFix` e `raggruppaPerSocio`.

**Attenzione al deploy**: cambiare regione a una funzione gia' pubblicata non la
sposta, ne crea una nuova in Europa e lascia la vecchia in us-central1. La
vecchia `cleanupOldLocations` va cancellata a mano, altrimenti restano due
pulizie che girano insieme. `avvisoPianoTick` e' ancora senza regione: se un
giorno si sposta, stessa attenzione, e li' due copie vorrebbero dire notifiche
doppie.

La resa grafica resta da guardare con Michele: biglietto 03.
