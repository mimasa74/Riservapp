# Mappa: scia delle posizioni dei soci

Status: ready-for-agent

Michele vede un solo socio sulla mappa. Gli altri hanno dato il permesso ma non
tengono l'app aperta, e oggi le posizioni si cancellano dopo 35 minuti.

Riscritta il 9 set 2026 dopo la revisione del codice: la prima versione
contraddiceva l'informativa già accettata dai soci e chiedeva una pulizia che
non si può fare con una query sola.

**Approvata da Michele il 10 set 2026**, pulizia notturna e testo
dell'informativa compresi. Le 12 ore decise il 9 set sono superate: le posizioni
vivono fino alle 00:35 della notte successiva, non 12 ore dall'ultimo punto.
Michele aveva detto che secondo lui non serve far rivedere il consenso ai soci
già dentro: quella resta la sua posizione, il biglietto 01 la registra.

## Limite tecnico da tenere presente

Una app web non riceve la posizione a app chiusa: iOS congela la pagina e non
esiste geolocalizzazione in background per il browser, nemmeno con l'app
salvata in Home. Quindi non si può sapere dove sono adesso. Si può solo non
buttare via i punti che arrivano quando il socio apre l'app.

## Deciso da Michele il 9 set 2026

- **Scia**: ogni posizione ricevuta resta un pallino. Aprendo la mappa Michele
  vede il giro che ogni socio ha fatto in giornata, non un punto solo.
- **Niente cancellazione all'uscita dalla riserva.** Oggi `useGeolocation`
  cancella il documento quando il socio esce dal poligono. Il gate sul poligono
  **resta** (fuori riserva non si scrive nulla, così non si registra dove abita
  un socio), ma i punti già presi dentro non si toccano più.
- **Le posizioni restano 12 ore dall'ultima ricevuta** — superato il 10 set
  dalla pulizia notturna qui sotto, che Michele ha approvato.

## Pulizia notturna, APPROVATA il 10 set 2026

- **Pulizia alle 00:35 di ogni notte, di tutto.** L'informativa direbbe:
  *"cancellato entro 35 minuti dalle ore 24:00 del giorno della localizzazione,
  nessuno storico"*. Quindi non esiste più un "ultimo punto" da cui contare:
  alla mezzanotte e mezza la collezione si svuota per intero. Sostituisce i 35
  minuti di `cleanupOldLocations`. È anche la regola "o tutti o nessuno" che
  Michele voleva, ottenuta gratis, e resta vicina alle parole che i soci hanno
  già letto. Allunga però la conservazione da 35 minuti a un giorno intero: per
  questo cambia anche il testo del consenso, riscritto il 10 set nel
  biglietto 01.

## Perché l'informativa va cambiata prima del codice

`OnboardingScreen.tsx` (`PRIVACY_TEXT`) promette oggi, in due punti, che le
posizioni si cancellano "entro circa 35 minuti dalla raccolta, senza creare uno
storico" e che la riserva "non conserva un archivio storico dettagliato". La
scia per una giornata è uno storico della giornata. Il 17 ago 2026 quel testo
era stato corretto apposta per dire la verità: non si torna indietro.

Fatto il 10 set 2026: sezione 4 e frase di consenso della sezione 8 riscritte.
Le parole esatte stanno nel biglietto 01.

## Struttura dei dati

Oggi `user_locations/{deviceId}` è **un** documento sovrascritto. Con la scia
serve **un documento per punto**. Siccome la pulizia cancella tutto ogni notte,
non serve nessun documento "padre" per socio: basta una collezione piatta.

- `user_locations/{autoId}` con `deviceId`, `nome`, `lat`, `lng`, `timestamp`.
- Il socio può solo **creare**: niente update, niente delete dal client. Il
  vincolo attuale `request.resource.data.deviceId == deviceId` (id del
  documento) **non passa** con un id automatico e va tolto. Al suo posto: tipi
  dei campi (`deviceId` e `nome` stringhe, `lat`/`lng` numeri, `timestamp`
  timestamp) e lunghezza massima delle stringhe. Lettura solo admin, come oggi.
- Nota onesta: già oggi nulla lega `deviceId` a `request.auth`, quindi un
  client anonimo può scrivere la posizione di chiunque. La scia non lo peggiora
  né lo migliora. Se un giorno va chiuso, è un lavoro a sé.

## Pulizia

`cleanupOldLocations` diventa una schedulata alle **00:35 Europe/Rome** che
cancella **tutti** i documenti di `user_locations`. Due vincoli che il codice di
oggi non rispetta:
- I batch Firestore reggono **500 operazioni**: oltre, `commit()` fallisce e
  non cancella niente. 45 soci per 48 punti al giorno superano il limite.
  Cancellare a blocchi.
- Dare la **regione** (`europe-west12`, come i trigger): oggi le schedulate
  senza regione finiscono in `us-central1`, e le posizioni dei soci vengono
  lette da una funzione negli Stati Uniti.

## Il gancio delle posizioni (`useGeolocation`)

- Via il `deleteDoc` all'uscita dal poligono.
- Ogni punto è un `addDoc`, non un `setDoc` sul documento del dispositivo.
- Ogni quanto: **come oggi**, 15 minuti se ci si è mossi di 100 m, 30 se fermi.
  Più fitto costa scritture e batteria; a 15 minuti siamo sotto le 5.000
  scritture al giorno nel caso peggiore, e non c'è motivo di spendere di più
  finché Michele non guarda la scia e dice che è troppo rada.
- **Bug da sistemare nello stesso giro**: il poligono arriva da Firestore con
  un `getDoc` asincrono, e finché non è arrivato ogni posizione conta come
  "fuori riserva" e viene scartata. In montagna, con la rete lenta, il primo
  fix GPS arriva prima del poligono e va perso; se il `getDoc` fallisce non si
  scrive mai, in silenzio. È una delle ragioni per cui Michele vede un socio
  solo. Il gancio deve aspettare il poligono prima di giudicare, e rivalutare
  l'ultimo fix quando il poligono arriva.

## La mappa (`MappaScreen`)

- Raggruppare i punti per `deviceId`: **nome e ora solo sull'ultimo punto**,
  pallini piccoli sugli altri, una linea che li unisce nell'ordine del tempo.
- L'intestazione "N cacciatori in riserva" non è più vera: chi è uscito alle 9
  resta sulla mappa fino a mezzanotte. Diventa "N cacciatori visti oggi",
  contando i `deviceId` distinti, non i documenti.
- La resa va decisa **guardando** con Michele: 45 soci per molti punti a testa
  riempiono la mappa. Biglietto 03, `ready-for-human`.

## Documenti da aggiornare insieme al codice

- `CLAUDE.md`: la riga `user_locations/{deviceId} — posizioni (TTL 35min)` e
  la voce `cleanupOldLocations` in TASKS.md.
- `OnboardingScreen.tsx`: l'informativa (biglietto 01).

## Biglietti

Vedi `issues/`. Ordine: 01 (informativa) → 02 (dati, rules, gancio, pulizia) →
03 (disegno della mappa, con Michele) → 04 (documenti).
