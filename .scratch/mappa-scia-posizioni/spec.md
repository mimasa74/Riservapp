# Mappa: scia delle posizioni, ripulita 12 ore dopo l'ultima

Status: ready-for-agent

Michele vede un solo socio sulla mappa. Gli altri hanno dato il permesso ma non
tengono l'app aperta, e oggi le posizioni si cancellano dopo 35 minuti.

## Limite tecnico da tenere presente

Una app web non riceve la posizione a app chiusa: iOS congela la pagina e non
esiste geolocalizzazione in background per il browser, nemmeno con l'app
salvata in Home. Quindi non si può sapere dove sono adesso. Si può solo non
buttare via i punti che arrivano quando il socio apre l'app.

## Forma decisa (Michele, 9 set 2026)

- **Scia**: ogni posizione ricevuta resta un pallino. Aprendo la mappa Michele
  vede il giro che ogni socio ha fatto in giornata, non un punto solo.
- **Niente cancellazione all'uscita dalla riserva.** Oggi `useGeolocation`
  cancella il documento quando il socio esce dal poligono: era il modo di non
  tenere posizioni fuori riserva. Il gate sul poligono **resta** (fuori riserva
  non si scrive nulla, così non si registra dove abita un socio), ma i punti già
  presi dentro non si toccano più.
- **Pulizia a 12 ore dall'ultima posizione di quel dispositivo**, non
  dall'età del singolo punto: o si tengono tutti i punti di quel socio, o si
  buttano tutti insieme. Sostituisce i 35 minuti di `cleanupOldLocations`.

## Nodi aperti (da chiudere con Michele guardando)

- 45 soci per molti punti a testa: la mappa si riempie. Serve una gerarchia
  visiva — nome e ora solo sull'ultimo punto, pallini piccoli sugli altri,
  forse una linea che li unisce.
- La struttura dei dati cambia: oggi `user_locations/{deviceId}` è **un**
  documento sovrascritto. Con la scia serve un documento per punto, quindi
  cambiano anche le rules e il conteggio "N cacciatori in riserva"
  nell'intestazione della mappa.
- Ogni quanto scrivere un punto: oggi 15 minuti se si è mossi di 100 m, 30 se
  fermo. Con la scia forse più fitto, ma sono scritture Firestore e batteria.
