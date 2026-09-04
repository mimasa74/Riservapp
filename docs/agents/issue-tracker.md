# Issue tracker: file markdown locali

I lavori di questo repo vivono come file markdown sotto `.scratch/`, non su un
tracker esterno. Non c'è `gh` installato e su GitHub non è mai stata aperta una
issue: l'unico posto dove si tiene traccia del lavoro è questo albero.

`.scratch/` **non è in `.gitignore` ed è deliberato**: una mappa che vive solo su
questo computer sparisce insieme al computer. Va committata come `TASKS.md`.

## Convenzioni

- Una cosa per cartella: `.scratch/<nome-lavoro>/`
- La spec, se c'è, è `.scratch/<nome-lavoro>/spec.md`
- I biglietti sono un file ciascuno in `.scratch/<nome-lavoro>/issues/<NN>-<slug>.md`,
  numerati da `01`. Mai un unico file con dentro tutti i biglietti.
- Lo stato è una riga `Status:` in cima al file (i valori stanno in `triage-labels.md`)
- I commenti si aggiungono in fondo al file sotto un titolo `## Comments`

## Quando una skill dice "publish to the issue tracker"

Crea un file nuovo sotto `.scratch/<nome-lavoro>/`, creando la cartella se manca.

## Quando una skill dice "fetch the relevant ticket"

Leggi il file al percorso indicato. Di solito Michele passa direttamente il percorso
o il numero.

## Operazioni di wayfinding

Usate da `/wayfinder`. La **mappa** è un file, con un file **figlio** per biglietto.

- **Mappa**: `.scratch/<lavoro>/map.md` — corpo con Notes / Decisions-so-far / Fog.
- **Biglietto figlio**: `.scratch/<lavoro>/issues/NN-<slug>.md`, numerato da `01`, con
  la domanda nel corpo. Una riga `Type:` registra il tipo
  (`research`/`prototype`/`grilling`/`task`); una riga `Status:` registra
  `claimed`/`resolved`.
- **Blocchi**: una riga `Blocked by: NN, NN` in cima. Un biglietto è libero quando
  tutti i file elencati sono `resolved`.
- **Frontiera**: scorri `.scratch/<lavoro>/issues/` cercando i file aperti, liberi e
  non presi; vince il primo per numero.
- **Prendere in mano**: metti `Status: claimed` e salva **prima** di lavorare.
- **Chiudere**: aggiungi la risposta sotto un titolo `## Answer`, metti
  `Status: resolved`, poi aggiungi una riga di sintesi alle Decisions-so-far in
  `map.md`.

## Rapporto con TASKS.md

`TASKS.md` resta l'elenco dei lavori dell'app e il punto da cui si riprende una
sessione. `.scratch/` è il piano di **un** lavoro grosso spezzato in pezzi. Quando
una mappa si chiude, il risultato va riassunto in `TASKS.md` (e i perché in
`CLAUDE.md`): la mappa è l'impalcatura, non la documentazione.
