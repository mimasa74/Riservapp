# Uno snapshot vuoto dalla cache non è una verità

Status: resolved
Type: task

## Answer

Fatto nel commit `76a2ed1`: nei tre listener il ramo "documento assente" esce
se `snapshot.metadata.fromCache`, e i flag `membersFromServer`/`slotsFromServer`
non diventano più veri su un dato non confermato dal server. Da deployare
con l'ok di Michele.

In `src/App.tsx`, i tre `onSnapshot` su `config/main`, `config/members` e
`config/slots` hanno un ramo `else` per "il documento non esiste". Quel ramo
scatta anche quando il documento **non è in cache e il server non risponde**
(Firestore consegna uno snapshot con `exists() === false` e
`metadata.fromCache === true` dopo una decina di secondi di attesa).

Oggi in quel ramo:
- se l'utente è il Rettore, l'app **riscrive** il documento: `{}` sugli slot,
  `{nomi: []}` sui soci, `data.json` sul piano. Vuol dire cancellare tutti gli
  slot, tutta la lista soci, e sostituire il piano vero con dati di marzo —
  con la raffica di notifiche di chiusura/sospensione che `onConfigUpdate`
  manderebbe a 45 soci;
- per tutti, `membersFromServer` e `slotsFromServer` vanno a `true` come se il
  dato fosse arrivato dal server, e la validazione del nome butta fuori il
  socio (lista vuota → "nome non in lista").

Da fare:
1. Nel ramo `else` di tutti e tre, **non fare nulla** se `snapshot.metadata.fromCache`
   è `true`: né scrivere, né dichiarare "dal server".
2. La scrittura di ripristino del Rettore va tenuta solo per il caso in cui il
   server dice davvero che il documento non c'è (`fromCache === false`).
3. Un test per il caso "snapshot vuoto dalla cache mentre è admin": nessuna
   scrittura.

Riferimento: revisione 9 set 2026, punti 1 e 6.
