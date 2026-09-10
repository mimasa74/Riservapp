# Sull'ultimo capo di una classe si apre il tasto per scrivere l'avviso

Status: ready-for-human
Type: task

Idea di Michele, 10 set 2026: *"quando segno l'ultimo animale di una classe
invece del messaggio si apre il tasto per inviare l'avviso urgente di chiusura."*
E, chiesto il giorno stesso se il testo lo scrive l'app: *"l'annuncio lo compilo
io."*

## Cosa succede oggi

L'ultimo quadratino fa apparire una `window.confirm` ("Quota completata per
Maschi di prima classe (4/4). Confermi?", `confermaUltimoCapo` in
`src/utils/conferme.ts`). Poi non succede piu' niente: la classe resta aperta
finche' il Rettore non la chiude a mano dalle impostazioni, e l'avviso ai soci
lo scrive quando ci pensa. Fra il capo caduto e il "non sparare" ci sta tutto il
tempo che serve a sbagliare.

## Cosa deve succedere

1. La conferma di oggi **resta identica e resta prima**. Serve a fermare il
   tocco storto su un quadratino da 26px: se al suo posto si aprisse il foglio
   dell'avviso, un tocco per sbaglio completerebbe la quota in silenzio mentre
   il Rettore si chiede perche' gli si e' aperta una schermata.
2. Confermato, si apre il foglio del **messaggio urgente**, gia' impostato come
   URGENTE, **vuoto**: il testo lo scrive Michele. Nessuna frase precompilata,
   nessuna specie e nessuna classe messe li' dall'app.
3. C'e' una via d'uscita ("Non adesso") che chiude il foglio senza mandare
   niente. Il capo resta segnato: le due cose sono separate.
4. Il post di sistema automatico di quell'evento **non si scrive**. Il messaggio
   di Michele lo sostituisce, ed e' il senso della sua frase "invece del
   messaggio".

## Perche' toglie di mezzo l'ordine sbagliato

La spec dice che se il Rettore scrive il messaggio **prima** di crociare
l'ultimo capo, il conto riparte da zero e cinque minuti dopo arriva una seconda
notifica generica. Con questo tasto l'ordine giusto viene da se': prima la
crocetta, poi l'avviso. La push del post azzera il conto (biglietto 01) e ai
soci arriva una notifica sola.

## Da decidere guardando, non a parole

- **Dove sta la via d'uscita** e come si chiama. Michele guarda e decide.
- Se il foglio si apre **subito** dopo la conferma o dopo un attimo: in mano,
  due schermate che si succedono di colpo possono sembrare un errore.

## Punti di contatto nel codice

- `handleToggleAbbattimento` in `src/App.tsx`, il ramo
  `newCount === cat.totale && cat.abbattuti !== cat.totale`.
- Il foglio del nuovo messaggio urgente in bacheca, riusato com'e'.
- `confermaUltimoCapo` in `src/utils/conferme.ts`: **non si tocca**.

## Fatto il 10 set 2026

Scritto in `src/App.tsx` (bandierina `apriAvvisoUrgente`, alzata nel ramo
dell'ultimo capo dopo la scrittura su Firestore) e in
`src/components/BachecaScreen.tsx` (effetto che apre il foglio e sceglie
`alert`). La conferma `confermaUltimoCapo` non e' stata toccata.

Due scelte prese senza chiedere, da confermare guardando:

- Il foglio si apre **subito** dopo la conferma, senza attesa.
- La via d'uscita e' il pulsante **"Annulla"** che il foglio ha gia'; non e'
  stata aggiunta una scritta "Non adesso".

Non si apre in una classe **sospesa** (li' non si chiude niente) e non si apre
se il capo non e' arrivato al server.

Resta a Michele: provarlo. La prova sul server locale scrive sui dati veri e fa
partire la notifica "AGGIORNAMENTO PIANO" ai soci, quindi va fatta sapendolo o
su una copia con dati finti.
