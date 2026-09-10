# Il messaggio in bacheca parte subito o dopo i 5 minuti di quiete?

Status: resolved
Type: grilling

Serve una risposta di Michele. Le due strade sono nella spec:

- **A.** Il messaggio parte subito; sospensioni e capi aspettano la quiete.
  L'URGENTE resta urgente. Nei giorni pieni possono arrivare due notifiche.
- **B.** Tutto aspetta la quiete, URGENTE compreso. Una notifica per sessione,
  ma "urgente" vuol dire "entro cinque minuti".

Paragone concreto: A è come il campanello, che suona quando suoni; B è come la
posta, che passa una volta e porta tutto insieme.

Finché non c'è la risposta, la spec resta `needs-info` e non si scrive codice.

## Answer

**A**, decisa da Michele il 10 set 2026: *"il messaggio deve arrivare subito
ovviamente."*

Con un'aggiunta sua che toglie di mezzo la doppia notifica: la generica appena
mandata **azzera il conto in attesa**, perché il messaggio del Rettore ha già
detto ai soci quello che la seconda notifica direbbe. Vedi la spec.
