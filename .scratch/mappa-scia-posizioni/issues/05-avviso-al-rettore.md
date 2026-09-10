# Quando un socio compare in riserva, il Rettore lo sa

Status: resolved
Type: task
Blocked by: 02

Deciso da Michele il 10 set 2026 sera, scegliendo fra "nessuna notifica", "una a
ogni punto" e "una quando compare": *"solo quando compare"*.

## Cosa deve succedere

- Un socio manda un punto e **non era sulla mappa**: parte una notifica al solo
  Rettore. Titolo `IN RISERVA`, corpo `Mario Rossi, 9:12`.
- Finche' quel socio resta sulla mappa, altre notifiche **non partono**, anche se
  manda un punto ogni 15 minuti.
- Se sparisce (35 minuti senza punti, quindi cancellato dalla pulizia) e poi
  ricompare, la notifica parte di nuovo. E' voluto: e' un rientro.
- Circa venti notifiche in una giornata piena. Michele lo ha scelto sapendolo.

## Come si fa a mandarla solo a lui

Il campo `nome` in `fcm_tokens/{deviceId}` lo scrive il client e chiunque puo'
metterci "Bruni Michele": mandare la posizione dei soci a chi indovina il nome
sarebbe una falla. Serve invece che l'app, **quando Michele entra come Rettore**,
scriva il proprio `deviceId` in un documento che le rules aprono al solo
`isAdmin()` (per esempio `config/rettore`). Il trigger legge quel documento,
conserva direttamente il token in quel documento protetto e manda lì.
Non leggere fcm_tokens: anche il token pubblico può essere sovrascritto da un socio.

## Punti di contatto

- Trigger `onCreate` su `user_locations/{id}` in `functions/src/index.ts`,
  regione `europe-west12` come gli altri.
- "Non era sulla mappa" si decide **guardando i punti**: se non esiste nessun
  altro punto di quel `deviceId` piu' recente di 35 minuti, e' comparso adesso.
  Nessuna memoria a parte da tenere allineata.
- Push **data-only**, come tutte le altre: la notifica la costruisce il service
  worker. Vedi CLAUDE.md.

## Implementato — Codex, 10 set 2026

Vedere ../HANDOFF.md per prove e limiti. Il punto stesso porta il claim server
avvisoRettoreGestito: serializza le riconsegne senza una memoria di presenze
separata. La precedenza createTime/id impedisce che due primi punti si zittiscano
a vicenda. Solo Google verificato di Michele può scrivere il destinatario.
Da provare sul telefono, non ancora deployato.
