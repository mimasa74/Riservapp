# Notifica generica "AGGIORNAMENTO BACHECA"

Status: ready-for-agent

Deciso da Michele il 9 set 2026, dopo aver constatato che le notifiche di
categoria arrivano ma non lo spronano a nulla: le vuole **poche, sempre
visibili, e volutamente povere di contenuto**, così il socio incuriosito apre
l'app invece di leggere il titolo e rimettere il telefono in tasca.

## Forma decisa

- Titolo `AGGIORNAMENTO BACHECA`, corpo unico e generico, per **ogni** evento:
  nuovo post del Rettore, categoria sospesa, aggiornamento del piano.
- **Unica eccezione: la chiusura di una classe.** Resta come oggi, con specie
  (più zona sul camoscio) nel titolo e categoria + stato nel corpo. È la sola
  notifica che dice al socio di non sparare: deve leggersi sulla schermata
  bloccata senza aprire niente. Scelta di Michele, 9 set 2026.
- Restano i 5 minuti di quiete di `avvisoPiano.ts`. Non si manda subito.

## Conseguenze sul codice

- `onPostCreate`: un solo testo, via il preview di 80 caratteri e i tre rami
  per tipo. La priorità `high` resta sui post `alert`.
- `onConfigUpdate`, ramo **sospeso**: non manda più una push per ogni
  transizione. Segna che c'è qualcosa da annunciare in `config/avviso_piano` e
  lascia partire la notifica generica col resto. Il post di sistema in bacheca
  resta: è il fallback per chi non riceve le push.
- `onConfigUpdate`, ramo **chiuso**: invariato.
- `avvisoPianoTick`: manda il testo generico. Il conto per specie
  (`pending`) **non si butta**: continua a decidere *se* notificare, con le sue
  due regole (contano solo gli incrementi, categoria mai vista prima entra in
  silenzio). Serve anche a rimettere `Capriolo +2` nel corpo con una riga sola,
  se Michele cambia idea.
- Serve un secondo motivo di invio oltre a `pending`: le sospensioni non sono
  capi. Campo `altro: boolean` nello stesso documento.

## Cosa si perde, e va detto

Il socio che ignora la notifica non sa più che una classe è stata sospesa
finché non apre l'app. Prima lo leggeva sulla schermata bloccata. È il prezzo
che Michele ha accettato per avere notifiche che spronano invece di informare.
