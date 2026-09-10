# Mappa: posizioni dei soci

Status: ready-for-agent

Michele vede un solo socio sulla mappa. Gli altri hanno dato il permesso ma non
tengono l'app aperta.

## Limite tecnico, il vincolo che decide tutto

Una app web non riceve la posizione a app chiusa: né iOS né Android la danno a
una pagina web in secondo piano, e non c'è codice che lo aggiri. Detto a Michele
il 10 set 2026 sera. Per avere la posizione a telefono in tasca servirebbe una
app installata dal negozio (Android 25 € una tantum, iPhone 99 €/anno più la
revisione Apple): è un progetto a sé, non un ritocco di questo.

Conseguenza, con le parole di Michele: *"nessun socio terrà la app aperta,
escludo georeferenziazioni in continuo"*. Si può solo non buttare via i punti
che arrivano quando il socio apre l'app.

## Deciso il 10 set 2026, sera — sostituisce le decisioni del 9 e del 10 mattina

Michele, guardate le conseguenze:

1. **La scia resta**, cioè un documento per ogni punto ricevuto, non più un
   documento sovrascritto per dispositivo.
2. **Le posizioni si cancellano dopo 35 minuti dalla raccolta**, come oggi.
   Cade quindi la pulizia notturna delle 00:35 approvata il mattino del 10 set,
   e con essa le 12 ore decise il 9.
3. **Notifica al Rettore quando un socio compare in riserva**, non a ogni punto.
4. Un socio che è sulla mappa da un'ora si mostra **come gli altri, con l'ora**
   dell'ultimo punto: nessuno sbiadire, nessun interruttore.

Cosa vuol dire davvero, scritto perché non vada perso: con la cancellazione a 35
minuti la scia **non è più il giro della giornata**, è la mezz'ora appena
passata. Chi apre l'app un minuto resta un puntino solo, come oggi. Michele lo
sa: gliel'ho detto prima che scegliesse.

**L'informativa torna quella di prima.** Il testo dei 35 minuti che i soci hanno
già accettato ridiventa vero, quindi il lavoro fatto il 10 set mattina
(commit `be8a80c`, `PRIVACY_TEXT` in `OnboardingScreen.tsx`) è stato annullato la
sera stessa. In produzione non era mai arrivato: nessun socio deve riaccettare
niente. Vedi biglietto 01.

## Struttura dei dati

Oggi `user_locations/{deviceId}` è **un** documento sovrascritto. Serve **un
documento per punto**: `user_locations/{autoId}` con `deviceId`, `nome`, `lat`,
`lng`, `timestamp`. Niente documento padre per socio: i punti vivono 35 minuti
e la collezione resta corta.

Rules: il socio può solo **creare**, niente update e niente delete dal client. Il
vincolo attuale `request.resource.data.deviceId == deviceId` (id del documento)
**non passa** con un id automatico e va tolto; al suo posto i tipi dei campi e la
lunghezza massima delle stringhe. Lettura solo admin, come oggi.

Nota onesta: già oggi nulla lega `deviceId` a `request.auth`, quindi un client
anonimo può scrivere la posizione di chiunque. Il cambio non lo peggiora né lo
migliora. Se un giorno va chiuso, è un lavoro a sé.

## Pulizia

`cleanupOldLocations` cancella i punti più vecchi di **35 minuti**. Due vincoli
che il codice di oggi non rispetta:

- **Regione**: le schedulate senza regione finiscono in `us-central1`, cioè le
  posizioni dei soci vengono lette da una funzione negli Stati Uniti. Va messa
  `europe-west12`, come i trigger.
- **Batch da 500**: oltre il limite `commit()` fallisce e non cancella niente.
  Cancellare a blocchi. Con 35 minuti di conservazione i numeri sono piccoli,
  ma il blocco va scritto lo stesso: costa due righe e toglie una bomba.

## Notifica al Rettore

Nuova, decisa il 10 set sera. Biglietto 05.

- Parte **quando un socio compare**: primo punto dopo che non era più sulla
  mappa. Finché resta, non se ne mandano altre. Se sparisce e ricompare, parte
  di nuovo.
- **Titolo** `IN RISERVA`, **corpo** nome e ora: `Mario Rossi, 9:12`.
- Va **solo al telefono del Rettore**. Il nome nel documento del token non basta:
  chiunque può scriverci quello che vuole. Quando Michele entra come Rettore,
  l'app registra il suo `deviceId` in un documento che solo l'admin può scrivere,
  e la notifica parte verso quel solo token.
- È una notifica in più al giorno per ogni socio che entra: circa venti in una
  giornata piena. Michele lo ha scelto sapendolo, dopo che gli è stato detto.

## Il gancio delle posizioni (`useGeolocation`)

- Ogni punto è un `addDoc`, non un `setDoc` sul documento del dispositivo.
- **Via il `deleteDoc`** all'uscita dal poligono: il gate resta (fuori riserva
  non si scrive nulla, così non si registra dove abita un socio) ma i punti già
  presi dentro li cancella la pulizia, non l'uscita.
- Ogni quanto: **come oggi**, 15 minuti se ci si è mossi di 100 m, 30 se fermi.
- **Bug da sistemare nello stesso giro, ed è probabilmente perché Michele vede
  un socio solo**: il poligono arriva da Firestore con un `getDoc` asincrono, e
  finché non è arrivato ogni posizione conta come "fuori riserva" e viene
  scartata. Chi apre l'app un attimo, in montagna con la rete lenta, non viene
  registrato affatto; se il `getDoc` fallisce non si scrive mai, in silenzio. Il
  gancio deve aspettare il poligono prima di giudicare, e rivalutare l'ultimo fix
  quando il poligono arriva.

## La mappa (`MappaScreen`)

- Raggruppare i punti per `deviceId`: **nome e ora solo sull'ultimo punto**,
  pallini piccoli sugli altri, una linea che li unisce nell'ordine del tempo.
- L'intestazione "N cacciatori in riserva" **resta vera**: con 35 minuti di
  conservazione chi è sulla mappa è stato visto nell'ultima mezz'ora. Contare i
  `deviceId` distinti, non i documenti.
- La resa va decisa **guardando** con Michele. Biglietto 03.

## Documenti da aggiornare insieme al codice

`CLAUDE.md`: la riga `user_locations/{deviceId} — posizioni (TTL 35min)` diventa
una collezione piatta, stesso TTL. `TASKS.md`: la voce `cleanupOldLocations`.

## Biglietti

Ordine: 02 (dati, rules, gancio, pulizia) → 05 (notifica al Rettore) → 03
(disegno della mappa, con Michele) → 04 (documenti). Il 01 è chiuso: annullato.
