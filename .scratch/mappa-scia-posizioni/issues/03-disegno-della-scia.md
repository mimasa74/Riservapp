# Come si disegna la mappa: guardato con Michele

Status: resolved
Type: prototype
Blocked by: 02

Michele ha guardato l'anteprima il 14 set 2026 e ha deciso: **niente scia**.

Motivo suo: i soci non sono quasi mai in riserva tutti insieme, quasi mai
camminano con l'app aperta, spesso non hanno campo o non aprono l'app. Una linea
fra i punti prometteva un percorso che non c'e'.

Come resta:
- un puntino per socio, il piu' recente, rosso col bordo bianco;
- niente linea, niente pallini della mezz'ora;
- nome **bianco** sopra il puntino, con ombra scura per il satellite, e l'ora
  piu' piccola sotto;
- il nome **cresce con lo zoom** (`dimensioneNome`, src/utils/posizioni.ts): da
  15px visto da lontano a 40px da vicino. L'etichetta standard di Google resta
  sempre della stessa misura, per questo il nome se lo disegna l'app.
- la push di ingresso dice **solo MAPPA**: chi sia, il Rettore lo legge aprendo
  la mappa.

Revisione Codex sul diff non committato: al primo giro un [P2] (l'etichetta
ancorata con `getPixelPositionOffset`, che su un overlay largo e alto zero torna
sempre zero: il nome sarebbe finito sopra il puntino). Corretto ancorando col
CSS. Secondo giro pulito.
