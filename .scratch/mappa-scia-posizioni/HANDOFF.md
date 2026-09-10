# Ripresa rapida — 10 settembre 2026, Codex → Claude Code

## Punto di partenza

Michele ha chiesto prima la verifica del lavoro, poi l'avviso IN RISERVA
**solo al Rettore autenticato con Google michele.bruni@gmail.com**.
Il nome dichiarato dal socio non concede alcun privilegio. Nessun deploy autorizzato.
Base verificata: 0e905be; 155 test già verdi prima delle modifiche.

## Fatto in questa sessione

- Token FCM direttamente in config/rettore_push, protetto da Google, email
  verificata e UID. Non si legge fcm_tokens per inviare questo avviso: anche
  quel documento è scrivibile dai soci, quindi proteggerne solo l'id non bastava.
- Un solo destinatario: l'ultimo dispositivo che registra il token da Rettore.
  Login/rinnovo FCM lo registrano; logout revoca prima del signOut. La cache di
  sessione filtra le push già in viaggio, sia in foreground sia nel SW.
- Vecchi SW esclusi tramite handshake: attivare l'aggiornamento dell'app prima
  di aspettarsi questo avviso. Nessun nuovo prompt automatico di permesso.
- onLocationCreate (europe-west12): titolo IN RISERVA, corpo nome + ora italiana.
  Usa punti recenti, ordine createTime/id e claim transazionale sul punto stesso.
  Niente collezione aggiuntiva di presenze. Il claim muore insieme al punto.
- Nessun doppione per trigger ripetuti, punti contemporanei o aggiornamenti
  continui. Ricomparsa dopo 35 minuti senza punti = nuovo avviso.
- Rules dei punti: timestamp deve essere request.time (serverTimestamp), per
  impedire date future che falsino presenza e pulizia.
- Mappa: nasconde i punti oltre 35 minuti con un timer, anche prima della pulizia.
  Disegno e preferenze grafiche ancora da vedere con Michele.

## Verifica ripetibile

- npx vitest run --no-cache: **181 test, 19 file, tutti verdi**.
- npm run lint, npm run build, npm run build --prefix functions: tutti riusciti.
- Emulatore locale demo-riservapp-private: **19 controlli** riusciti, 16 sulle
  rules e 3 sulle transazioni reali. FCM sostituito con uno stub: nessun telefono
  contattato. Per ripetere: compilare functions, poi in tools/security-check
  eseguire npm ci e npm test. Serve Java; il primo avvio scarica l'emulatore.
- Build segnala bundle grande e import statico/dinamico messaging: non bloccanti.

## Limiti da conservare nel passaggio

- Non promettere consegna garantita: claim prima di FCM, retry false. Se FCM
  fallisce o il processo cade dopo il claim, quell'avviso può andare perso.
  Scelta conservativa contro raffiche/duplicati; TTL push 60 secondi. Un outbox
  affidabile sarebbe un lavoro distinto, non fingere che esista già.
- Il logout attende la revoca online. Se fallisce, resta autenticato e il codice
  registra l'errore; il filtro locale è già spento. Verificare anche questo sul
  telefono. Non spostare signOut prima della revoca senza ripensare le rules.
- Problema precedente rilevato: cleanupOldLocations ogni 10 minuti cancella
  timestamp < adesso-35m, quindi conservazione effettiva circa 35–45 minuti,
  oltre eventuali ritardi scheduler. Il filtro mappa NON è cancellazione dati.
  Allineare pulizia/promesse prima del rilascio, senza inventare nuovi consensi.
- Identità dei punti (nome/deviceId) non legata a UID anonimo: problema già
  documentato nella spec, non risolto qui. Il destinatario privato è protetto.
- useGeolocation ha ancora scritture async senza gestione esplicita degli errori
  e senza serializzazione dei fix: possibile duplicazione di punti su rete lenta.
  Il nuovo trigger gestisce i duplicati; resta un miglioramento del raccoglitore.

## Prossimi passi

1. Prova reale con Michele: aggiornamento SW, login Google, socio in riserva,
   secondo punto silenzioso, logout silenzioso, altro dispositivo ancora socio.
2. Guardare insieme la mappa (ticket 03); non ridisegnarla senza il riscontro.
3. Notifiche generiche: decisioni già prese ma implementazione ancora vecchia.
   Il post deve partire subito e azzerare l'avviso piano; vedere la sua spec.
4. Deploy solo su richiesta: hosting riservatuenno, rules e functions coordinati.
   I vecchi client setDoc delle posizioni non sono compatibili con rules create-only.
   Rimuovere la vecchia cleanupOldLocations in us-central1 nel rilascio coordinato.
5. Non aggiungere al commit AGENTS.md e scratchpad/: erano già non tracciati
   prima della sessione. Non contengono lavoro di questa modifica.
