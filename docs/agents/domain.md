# Documenti di dominio

Come le skill devono usare la documentazione di questo repo prima di esplorare il
codice.

## Prima di esplorare, leggi

- **`CLAUDE.md`** alla radice — è la vera fonte: glossario, decisioni e soprattutto
  i **perché**. Qui prende il posto di `CONTEXT.md` e degli ADR di altri progetti.
- **`TASKS.md`** — stato di avanzamento e da dove si riprende.
- **`CONTEXT.md`** e **`docs/adr/`** se un giorno esisteranno.

Se `CONTEXT.md` o `docs/adr/` non ci sono, **tira dritto in silenzio**: non
segnalarne l'assenza e non proporre di crearli. Nascono da soli, quando una parola
o una decisione ha davvero bisogno di un posto suo.

## Struttura

Progetto a contesto singolo (nessun monorepo):

```
/
├── CLAUDE.md          ← glossario + decisioni + perché
├── TASKS.md           ← stato di avanzamento
├── docs/agents/       ← questi file di configurazione
├── docs/adr/          ← (non esiste ancora)
└── src/
```

## Usa le parole del progetto

Quando scrivi qualcosa che nomina un concetto dell'app (il titolo di un biglietto,
una proposta, il nome di un test), usa la parola che si usa qui: *capo*, *classe*,
*categoria*, *piano*, *Rettore*, *socio*, *bacheca*, *subzona*. Non inventare
sinonimi: se il socio in app legge "SOSPESI", il codice e i biglietti non dicono
"disabilitato".

Se il concetto che ti serve non è ancora nominato da nessuna parte, è un segnale:
o stai inventando una parola che il progetto non usa, oppure c'è un buco vero da
colmare in `CLAUDE.md`.

## Segnala i conflitti con le decisioni già prese

`CLAUDE.md` è pieno di decisioni prese guardando l'app in mano, spesso col motivo
scritto accanto. Se quello che stai per fare le contraddice, **dillo prima**,
invece di scavalcarle in silenzio:

> _Va contro "il rosso #8B1A1A significa solo capo nuovo", ma vale la pena
> riaprirlo perché…_
