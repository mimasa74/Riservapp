# Notifica generica "AGGIORNAMENTO BACHECA"

Status: ready-for-agent

Deciso da Michele il 9 set 2026, dopo aver constatato che le notifiche di
categoria arrivano ma non lo spronano a nulla: le vuole **poche, sempre
visibili, e volutamente povere di contenuto**, così il socio incuriosito apre
l'app invece di leggere il titolo e rimettere il telefono in tasca.

Rivista il 9 set 2026 sera dopo la revisione del codice. La domanda del
biglietto 01 è chiusa: **il messaggio del Rettore parte subito** (strada A,
decisa da Michele il 10 set 2026). Restano quattro cose che la prima versione
non aveva visto, e un'idea nuova di Michele nel biglietto 02.

## Forma decisa

- Titolo `AGGIORNAMENTO BACHECA`, corpo unico e generico, per **ogni** evento:
  nuovo post del Rettore, categoria sospesa, aggiornamento del piano.
- **Nessuna eccezione, nemmeno la chiusura di una classe** (decisione più
  recente di Michele, 9 set 2026 sera, registrata in TASKS.md): la chiusura
  non manda più la notifica con specie e categoria. L'avviso "non sparare" lo
  scrive Michele stesso come messaggio in bacheca, e quel messaggio fa partire
  la generica come ogni altro post. Una versione precedente di questa spec
  teneva la chiusura come unica notifica parlante: superata.
- Restano i 5 minuti di quiete di `avvisoPiano.ts` per i capi e le sospensioni.

Conseguenza da tenere a mente: il socio che ignora la generica non sa più
nemmeno che una classe è chiusa. Il post in bacheca e la riga CHIUSI nel piano
sono le sole fonti. Il messaggio del Rettore però parte subito, quindi il
"non sparare" non arriva in ritardo: vedi qui sotto.

## Chiusa il 10 set 2026: il messaggio in bacheca parte subito

**Strada A.** Il messaggio del Rettore fa partire la notifica nell'istante in
cui lo pubblica. Capi e sospensioni continuano ad aspettare i 5 minuti di
quiete. Un "non sparare" che arriva cinque minuti dopo non è un "non sparare".

E la doppia notifica sparisce da sola, perché Michele ha aggiunto una regola:
**una notifica generica appena partita azzera il conto in attesa.** Il post ha
già avvisato tutti; i capi che il Rettore stava segnando erano il motivo per
cui stava scrivendo. In pratica `onPostCreate`, dopo aver mandato la push,
svuota `pending` e `altro` in `config/avviso_piano` e porta `ultimoInvio` a
adesso. Parole di Michele: *"l'aggiornamento degli ultimi abbattimenti
disponibili sarebbe superfluo perché anticipato dal mio messaggio."*

Resta il caso opposto, e va accettato: se il Rettore scrive il messaggio
**prima** di crociare l'ultimo capo, il conto riparte da zero dopo il post e
cinque minuti dopo arriva una seconda generica. Il biglietto 02 è l'idea di
Michele per non trovarsi mai in quell'ordine.

## Com'era scritta la domanda, prima che la chiudesse

La prima versione diceva due cose che non stanno insieme: "non si manda subito"
per ogni evento, e "la priorità alta resta sui post URGENTE". Un URGENTE
ritardato di 5 minuti non è urgente. E se il post parte subito mentre la
sospensione aspetta la quiete, un Rettore che scrive un messaggio e sospende
una classe nello stesso quarto d'ora fa arrivare **due** notifiche identiche,
il contrario dello scopo.

Le due strade, da far scegliere a Michele:
- **A. Il post parte subito**, sospensioni e capi aspettano la quiete. Più
  notifiche nei giorni in cui succede tutto insieme, ma l'URGENTE resta urgente.
- **B. Tutto aspetta la quiete**, URGENTE compreso. Una notifica sola per
  sessione di lavoro, ma "urgente" vuol dire "entro cinque minuti".

## Conseguenze sul codice

- `onPostCreate`: un solo testo, via il preview di 80 caratteri e i tre rami
  per tipo. La priorità `high` resta sui post `alert`. Manda **subito**, e
  subito dopo azzera `pending` e `altro` e porta `ultimoInvio` a adesso.
- `onConfigUpdate`, ramo **sospeso**: non manda più una push per ogni
  transizione. Segna che c'è qualcosa da annunciare in `config/avviso_piano`
  con un campo `altro: true` e aggiorna `ultimaModifica`, così la quiete
  riparte. Il post di sistema in bacheca resta: è il fallback per chi non
  riceve le push.
- `onConfigUpdate`, ramo **chiuso**: come il ramo sospeso — niente push
  propria, segna `altro: true` e lascia il post di sistema in bacheca come
  fallback. `titoloNotifica`/`corpoNotifica` in `labels.ts` restano solo se
  servono al post di sistema; altrimenti sono codice morto da togliere con i
  loro test.
- `avvisoPianoTick`: manda il testo generico quando c'è `pending` **oppure**
  `altro`. Il conto per specie (`pending`) **non si butta**: continua a
  decidere *se* notificare, con le sue due regole (contano solo gli incrementi,
  categoria mai vista prima entra in silenzio). Serve anche a rimettere
  `Capriolo +2` nel corpo con una riga sola, se Michele cambia idea.

## Quattro cose che la prima versione non aveva visto

1. **Lo svuotamento perde le crocette arrivate durante l'invio.** Oggi il tick
   legge `pending`, manda la push (uno o due secondi), poi azzera con un `set`
   fuori transazione: una crocetta accumulata in quella finestra sparisce.
   CLAUDE.md promette il contrario. Lo svuotamento va in transazione, e deve
   azzerare anche `altro` (aggiungerlo ai `mergeFields`), altrimenti resta
   `true` per sempre e ogni quarto d'ora parte una notifica vuota.
2. **L'ora della notifica è quella dell'invio, non dell'evento.**
   `sendPushToAll` mette `ts: Date.now()`. Con la quiete ogni notifica generica
   mostra un'ora falsa di almeno 5 minuti: va contro "ts è l'istante
   dell'evento" di CLAUDE.md. Passare `ultimaModifica` come `ts`.
3. **Notifiche uguali si impilano.** Il service worker non passa `tag` a
   `showNotification`: tre "AGGIORNAMENTO BACHECA" identiche diventano tre righe
   uguali sulla schermata bloccata, che sembrano un errore. Con `tag` e
   `renotify` il telefono ne tiene una e la fa vibrare di nuovo. Da mostrare a
   Michele sul telefono, perché "sempre visibili" potrebbe volere anche il
   contrario.
4. **La quiete si allunga con le crocette.** Una sospensione fatta all'inizio
   di venti minuti di crocette arriva dopo venticinque, mentre oggi è
   immediata. Michele ha accettato di perdere il contenuto; va detto che si
   perde anche la prontezza.

## Da rifare insieme al codice

- `TITOLO_AVVISO` in `avvisoPiano.ts` e i test in `avvisoPiano.test.ts` e
  `labels.test.ts` che asseriscono i testi.
- `CLAUDE.md`, sezione "Avviso di aggiornamento del piano": "una sola per
  sessione, col conto per specie" non sarà più vero; e la sezione "Testo delle
  notifiche di categoria" vale solo per la chiusura.

## Cosa si perde, e va detto

Il socio che ignora la notifica non sa più che una classe è stata sospesa
finché non apre l'app. Prima lo leggeva sulla schermata bloccata. È il prezzo
che Michele ha accettato per avere notifiche che spronano invece di informare.
