# Avvio sicuro: cache vuota, rientro con lo stesso telefono, identità stabile

Status: ready-for-human

Tre correzioni piccole uscite dalla revisione del 9 set 2026. **Fatte** nel
commit `76a2ed1` (9 set 2026, 21:01), 7 test nuovi, 142 verdi. Restano da fare
due cose che toccano a Michele: provare sul telefono il rientro con lo stesso
iPhone, e decidere quando deployare. Nessun deploy senza il suo ok.

## Il filo che le lega

All'avvio l'app confronta il nome salvato sul telefono con la lista soci e con
gli slot su Firestore, e se non torna butta fuori il socio (BENVENUTO). Il
confronto si fida di dati che possono essere un buco di cache, il telefono
buttato fuori non può rientrare, e l'identità del telefono si rigenera troppo
facilmente. Sommate, producono il bug segnalato su iPhone: schermata BENVENUTO
e "Nome già in uso da un altro dispositivo".

## Biglietti

- `01` Uno snapshot vuoto dalla cache non è una verità: né per buttare fuori il
  socio, né — soprattutto — per far riscrivere al Rettore soci, slot e piano.
- `02` Chi viene buttato fuori con lo stesso telefono deve poter rientrare, e
  leggere il messaggio giusto.
- `03` L'identità del telefono si legge una volta sola all'avvio.

## Trovato nella stessa revisione, non ancora deciso (needs-triage)

Una riga ciascuno, perché non vadano persi con la sessione. Aprire un biglietto
solo quando Michele decide che si fa.

- Dopo Logout admin (o login con un account Google sbagliato) l'app resta senza
  utente: tutte le letture falliscono in silenzio finché non si ricarica.
- Impostazioni salva anche gli `abbattuti` da una copia fatta all'apertura:
  con telefono e PC insieme, "Salva" può cancellare crocette fatte dall'altro.
- Al primo avvio la fotografia dei capi parte da `data.json` (dati di marzo),
  non da Firestore: un socio nuovo vede pastiglie NUOVO false.
- Le rules di `config/slots` accettano qualunque chiave da un anonimo: si
  possono occupare tutti i nomi liberi con identità inventate.
- Schermata verde-oliva vuota, senza testo, se il login anonimo fallisce.
- Errori delle scritture del Rettore solo in console; il regolamento può
  risultare caricato su Storage ma non salvato in bacheca.
- CLAUDE.md dice `merge: true` per l'accumulo dell'avviso piano: il codice usa
  `mergeFields` (il codice è giusto, il documento no). `riservapp_letti_*` è
  elencato tra le chiavi localStorage ma non esiste nel codice.
- Le funzioni schedulate non hanno regione e girano negli Stati Uniti.
- Codice morto: prop inutilizzate in `Header.tsx`, `Members.direttivo`,
  `normalizeName` copiata in quattro file, `GEMINI_API_KEY` in vite.config,
  pacchetti `@google/genai`, `lucide-react`, `motion` mai importati.
- Il sito morto `riservapp-6054c.web.app` è ancora servito sullo stesso
  progetto Firestore.
- Il bug iPhone può avere anche una causa fuori dal codice: Safari, l'icona in
  Home e il browser interno di WhatsApp sono tre memorie separate, e per l'app
  tre telefoni. Chiedere al socio come ha aperto l'app.
