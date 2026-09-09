# Revisione di Fable — 9 set 2026

Status: ready-for-human

Revisione del progetto (le due specifiche nuove) e del codice esistente, fatta da
un secondo modello su richiesta di Michele. Legenda: **[V]** = verificato leggendo
il codice, **[S]** = il percorso esiste ma dipende da comportamenti del browser
non riproducibili qui.

## A. Gravi, codice già in produzione

**1. L'admin può cancellare soci, slot e piano per un abbaglio della cache [V]**
`src/App.tsx` 123-126, 147-151, 161-165: i tre listener, sul ramo `!snapshot.exists()`,
riscrivono il documento se sei admin, **senza guardare `snapshot.metadata.fromCache`**.
Un documento assente dalla cache mentre il backend non risponde dà `exists() === false`
con `fromCache: true`. Sul telefono dell'admin, con cache Firestore svuotata da iOS e
rete lenta al primo avvio: `config/slots` azzerato (tutti i soci su BENVENUTO),
`config/members` svuotato ("Nome non riconosciuto" per tutti), `config/main` sostituito
dal `data.json` di marzo, che fa vedere a `onConfigUpdate` transizioni di stato finte
e scatena una raffica di push di chiusura a 45 soci.
Sui non-admin lo stesso ramo mette `membersFromServer = true` su un buco di cache.

**2. Il socio buttato fuori non rientra più con lo stesso telefono [V]**
`firestore.rules` 81-86 accetta l'update di `config/slots` solo con
`addedKeys().size() == 1`. `HunterNameModal.tsx` 47 riscrive `{[norm]: deviceId}`:
se lo slot contiene già **lo stesso** deviceId non c'è nessuna chiave aggiunta,
quindi permission-denied, e il modale dice "Errore di connessione. Riprova." per
sempre. Manda il socio a cercare la rete invece del Rettore.

**3. Dopo il logout admin l'app resta senza utente [V]**
`src/firebase.ts` 34-56: `authReady` fa `unsub()` al primo utente e non risottoscrive.
`AuthContext.tsx` 37-40 fa `signOut` se l'account Google non è quello dell'admin.
Dopo il signOut nessuno rifà `signInAnonymously`: tutti gli onSnapshot vanno in
permission-denied, l'app mostra dati congelati e non avvisa. Si sblocca ricaricando.

**4. Salvare le Impostazioni può revertire le crocette [V]**
`SettingsScreen.tsx` 45 fa una copia profonda al mount; `App.tsx` 347-359 riscrive
l'intero array `categorie`, **abbattuti compresi**, da quella copia. Telefono e PC
aperti insieme: "Salva" sovrascrive i capi segnati nel frattempo. Silenzioso, perché
`capiComparsi` ignora i cali.

**5. Falso NUOVO al primo avvio, per colpa di `data.json` [V]**
`App.tsx` 62 parte da `fallbackData`. `useNovita.ts` 38-63 gira al primo render, prima
di qualunque snapshot, non trova fotografia e **salva i numeri finti**. All'arrivo dei
dati veri ogni categoria con più abbattuti del file statico si accende in rosso. La
regola "categoria mai vista entra in silenzio" è aggirata da una prima vista falsa.

## B. Il bug Safari (BENVENUTO + "Nome già in uso")

Confermato: deviceId in `localStorage`, nessun `sessionStorage`, nessun `clear()`.
Il messaggio "già in uso" richiede che lo slot contenga un deviceId **diverso** da
quello locale: perdere il solo nome non basta.

**6. La validazione dà falsi negativi su cache vuota e li tratta come verità [V]**
`App.tsx` 147-165: i flag `membersFromServer` e `slotsFromServer` vanno a `true` anche
su uno snapshot `fromCache`. Con IndexedDB purgata da iOS e rete debole, la validazione
(253-272) gira con la lista soci vuota, quindi rimuove nome, onboarding e geo, e porta
a BENVENUTO. Il guard `isOffline` non intercetta niente perché il browser si dichiara
online.

**7. Il deviceId si rigenera a ogni render se una lettura fallisce [S]**
`App.tsx` 51-60: `getOrCreateDeviceId()` è chiamata **nel corpo del componente**, a
ogni render, e su valore assente scrive subito un UUID nuovo. `hunterName` invece è
letto una volta sola nell'inizializzatore di `useState`. Una sola lettura transitoria
vuota di `localStorage` fa ruotare l'identità per sempre: nome sì, deviceId no, quindi
"Nome già in uso". È l'unico punto del codice che da solo produce il sintomo esatto.

**8. Su iPhone "un dispositivo" sono tre memorie separate [S]**
Stesso indirizzo, storage isolati: Safari, app salvata in Home, browser interno di
WhatsApp. L'app sostituisce il gruppo WhatsApp, quindi il link arriva da lì. Il socio
installa in Home e prende lo slot, poi ritocca il link su WhatsApp o apre Safari,
trova la memoria vuota e finisce su "Nome già in uso". Si somma alla purga iOS dei 7
giorni, che colpisce Safari ma non la PWA in Home. È la spiegazione più economica.

**9. Il nome dell'admin resta scritto nel telefono dopo il logout [V]**
`App.tsx` 234-239 scrive `riservapp_nome = 'Bruni Michele'`. Dopo il logout quel
telefono è un socio con quel nome. Se Michele ha riprodotto il bug sul proprio
iPhone, è la sequenza più probabile.

Nessun'altra strada: le rules non permettono di spostare uno slot su un altro
deviceId senza admin, `onboarding_reset` non tocca il nome, e due rivendicazioni
in corsa sono già protette.

## C. Spec notifiche generiche: regge con tre buchi

**10. Non dice quali eventi partono subito e quali dopo la quiete.** Contraddizione
interna: "restano i 5 minuti per ogni evento" contro `onPostCreate` che manda subito
e conserva la priorità alta sugli alert. Un messaggio urgente ritardato di 5 minuti
perde il senso; un post subito più una sospensione nello stesso quarto d'ora fa due
notifiche identiche. Da chiudere prima di implementare.

**11. Il conto in attesa si perde durante l'invio [V, preesistente]**
`index.ts` 266-276: il tick legge `pending`, manda la push, poi svuota **fuori
transazione**. Una crocetta arrivata in quella finestra viene accumulata e subito
cancellata. CLAUDE.md promette il contrario. Con `altro: boolean` la finestra vale
anche per le sospensioni, e `altro` va aggiunto ai `mergeFields` dello svuotamento,
altrimenti resta acceso per sempre e ogni tick manda una notifica vuota.

**12. `ts` diventa l'ora di consegna, non dell'evento [V]**
`sendPushToAll` (index.ts 77) mette l'istante dell'invio. Con la generica ritardata,
ogni notifica mostra un'ora falsa di almeno 5 minuti. Contraddice il vincolo scritto
in CLAUDE.md. `ultimaModifica` è già nel documento e si può passare.

**13. Notifiche identiche si impilano.** Il service worker (`firebase-messaging-sw.js`
50-57) non passa `tag`: tre "AGGIORNAMENTO BACHECA" diventano tre righe uguali sulla
schermata bloccata, che sembrano un errore.

**14. Cosa la spec rompe senza dirlo.** `TITOLO_AVVISO` e i test in `avvisoPiano.test.ts`
e `labels.test.ts` vanno riscritti. Una sospensione fatta all'inizio di una sessione
lunga arriva mezz'ora dopo, mentre oggi è immediata. La sezione "Avviso di
aggiornamento del piano" di CLAUDE.md non sarà più vera.

## D. Spec mappa a scia: non regge così com'è

**15. Contraddice il consenso che i soci hanno già accettato [V]**
`OnboardingScreen.tsx`, `PRIVACY_TEXT`: "cancellati automaticamente entro circa 35
minuti, senza creare uno storico permanente dei tuoi spostamenti", e la frase di
consenso finale ripete i 35 minuti. TASKS.md registra che il 17 ago quel testo è
stato corretto proprio per dire la verità. Una scia di 12 ore **è** lo storico della
giornata. Serve riscrivere il testo e raccogliere di nuovo il consenso: la chiave
`riservapp_geo` resta accesa per un trattamento diverso da quello accettato.

**16. Le rules di `user_locations` sono incompatibili, e già oggi sono vuote [V]**
`firestore.rules` 52-59 pretende che il campo `deviceId` sia uguale all'id del
documento. Con un documento per punto: collezione piatta, l'id non è il deviceId,
scrittura negata; sottocollezione, il `match` non è ricorsivo, negata, e `MappaScreen`
37 legge la collezione radice, servirebbe una collectionGroup.
Peggio: **nulla lega il deviceId all'utente autenticato**, quindi già oggi un client
anonimo scrive la posizione di chiunque con qualunque nome. Con la scia diventa una
scia falsa sulla mappa del Rettore.

**17. La pulizia a 12 ore dall'ultima posizione non si fa con una query sola [V]**
Una query sul timestamp cancella i punti vecchi uno per uno: il punto delle 6 sparisce
alle 18 e quello delle 17 resta, cioè il contrario di "o tutti o nessuno". Serve un
documento padre per dispositivo con l'ora dell'ultima posizione, poi una query sui
padri scaduti e una lettura dei punti per ogni padre scaduto. Inoltre
`cleanupOldLocations` (291-293) usa **un batch solo**: oltre 500 documenti il commit
fallisce e non cancella niente. Con 45 soci per 48 punti si supera al primo giro.

**18. Costo scritture.** A un punto ogni 15 minuti siamo intorno a 4.300 scritture al
giorno, dentro il piano gratuito. A un punto al minuto siamo a 65.000, fuori. Il
progetto è già a pagamento per le Functions, quindi sono centesimi, ma va deciso.

**19. "Vedo un solo socio" ha anche un'altra causa, che la scia non risolve [V]**
`useGeolocation.ts` 53-58 carica il poligono della riserva con una lettura asincrona e
`handlePosition` (75-85) tratta il poligono vuoto come "fuori riserva". Se il primo
aggancio GPS arriva prima del poligono, la posizione è scartata. Se quella lettura
fallisce offline senza cache, **non si scrive mai niente, in silenzio**.

**20. Intestazione della mappa.** Senza la cancellazione all'uscita, "N cacciatori in
riserva" (MappaScreen 77) diventa "N dispositivi visti nelle ultime 12 ore", e conta
documenti, non dispositivi.

## E. Regole aggirabili da un client anonimo

**21. Squatting degli slot [V]** `config/slots` accetta da un anonimo qualunque chiave
nuova con qualunque valore: non verifica che sia un nome della lista soci né che il
valore sia una stringa. Chi ha la configurazione Firebase (è nel service worker
pubblico, e va bene così) può occupare tutti i nomi liberi. Ogni socio non ancora
registrato leggerebbe "Nome già in uso", e servirebbe il Rettore per liberarli a uno
a uno.

**22. Varchi minori [V]** `fcm_tokens` accetta token arbitrari da un anonimo, che così
riceve tutte le push e gonfia la collezione che `sendPushToAll` legge per intero.
`posts` permette a un anonimo di aggiungere qualunque nome ai letti.
`config/onboarding_reset` permette a un anonimo di rimuovere **tutti** gli id, non
solo il proprio.

## F. Errori da cui l'utente non esce da solo

**23. Schermata vuota senza messaggio [V]** `App.tsx` 503-505: se l'accesso anonimo
fallisce o gli snapshot vanno in permission-denied, l'app mostra un rettangolo
verde-oliva per sempre. Nessun testo, nessun "riprova".

**24. Errori solo in console.** `handleToggleAbbattimento`, `handleUpdateText`,
`handleSaveSettings`, `handleNewSeason`, `handleUpdateRuota`, `handleAddPost`,
`handleReleaseSlot`: errore in console e niente per il Rettore, con lo stato locale
che resta ottimistico e mostra una crocetta che non esiste. `handleUpdateRegolamento`
(434-437) non ha nemmeno il try: il PDF nuovo finisce online senza essere referenziato,
e il messaggio parla di caricamento fallito. `useGeolocation` 62: chi ha negato il
permesso di sistema crede di essere sulla mappa.

## G. Documento contro codice

**25. CLAUDE.md dice `merge: true` per l'accumulo, il codice usa `mergeFields` [V]**
`index.ts` 238-242. Il codice è corretto, la somma è fatta in JavaScript dentro la
transazione: è il documento a descrivere un meccanismo che non c'è, e il commento nel
codice ripete la versione sbagliata.

**26. `riservapp_letti_${nome}` non esiste nel codice [V]** I letti stanno solo su
Firestore. `riservapp_fcm` è scritto e mai letto.

**27. Regione delle Functions.** `avvisoPianoTick` e `cleanupOldLocations` non hanno
regione, quindi girano negli Stati Uniti, mentre i due trigger sono in Europa. Le
posizioni dei soci sono lette e cancellate da una funzione americana.

## H. Codice morto

- `Header.tsx`: props `nomeInglese`, `onOpenSettings`, `onOpenMappa` accettate e mai
  usate, e `AssegnazioniScreen` le passa comunque. `Header` e `BachecaScreen`
  duplicano per intero il modale admin e il long-press.
- `Members.direttivo` (types 37) e la sua scrittura in `App.tsx` 145-149.
- `normalizeName` copiata in quattro file.
- `vite.config.ts` 14 espone `GEMINI_API_KEY`; `@google/genai`, `lucide-react` e
  `motion` non sono importati da nessuna parte; il pacchetto si chiama `react-example`.
- `OnboardingScreen` passa il consenso geo a `onDone`, che lo ignora.
- `SettingsScreen` 290-294: `handleAddMember` non normalizza, quindi "Mario Rossi" e
  "Rossi Mario" convivono nella lista con lo stesso slot.
- BachecaScreen: "Stagione venatoria 2026" cablato, mentre l'anno è per specie.
- Il sito morto `riservapp-6054c.web.app` è ancora servito e punta allo stesso Firestore.
