# Un documento per punto, rules nuove, gancio senza cancellazione, pulizia alle 00:35

Status: needs-info
Type: task
Blocked by: 01

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
