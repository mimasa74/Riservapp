# Informativa: da "35 minuti dalla raccolta" a "entro le 00:35 del giorno dopo"

Status: resolved
Type: task

In `src/components/OnboardingScreen.tsx`, dentro `PRIVACY_TEXT`, sostituire le
due promesse sui 35 minuti. Il testo qui sotto è una PROPOSTA della revisione,
non un testo deciso da Michele: una sessione precedente gliel'ha attribuito per
errore. Va sottoposto a lui prima di toccare il file.

> cancellato entro 35 minuti dalle ore 24:00 del giorno della localizzazione,
> nessuno storico

Punti da toccare:
1. Sezione 4 ("Modalità di trattamento e conservazione dei dati"), il paragrafo
   sui dati di geolocalizzazione: oggi dice "vengono cancellati automaticamente
   entro circa 35 minuti dalla loro raccolta, senza creare uno storico
   permanente dei tuoi spostamenti".
2. Il paragrafo subito dopo: "non conserva un archivio storico dettagliato
   delle tue posizioni" — resta vero (tutto sparisce ogni notte), ma va
   allineato alle stesse parole.
3. Sezione 8, la frase di consenso tra virgolette: "con cancellazione
   automatica dei dati di posizione entro circa 35 minuti dalla raccolta".

Non cambiare altro dell'informativa.

## Domanda aperta (non blocca il biglietto)

I soci hanno accettato il testo con i 35 minuti. Con il nuovo testo la
conservazione è più lunga. Far rivedere l'informativa una volta a tutti (il
Rettore ha già il tasto "↺ Onb." per singolo socio in Impostazioni, ma non uno
per tutti) è una scelta di Michele: da segnare in un biglietto `needs-info`
separato se la vuole.

## Answer

Tre passaggi riscritti, nient'altro toccato.

Sezione 4, primo paragrafo:
> I dati di geolocalizzazione sono utilizzati solo per il tempo strettamente
> necessario a fornire le funzionalità di sicurezza e coordinamento delle
> battute e vengono cancellati automaticamente entro 35 minuti dalle ore 24:00
> del giorno della localizzazione. Nel corso della giornata il Rettore può
> vedere sulla mappa i punti rilevati all'interno della riserva; dopo la
> cancellazione non resta alcuno storico dei tuoi spostamenti.

La frase sul Rettore non era nella proposta ed è stata aggiunta apposta: la
scia della giornata **è** uno storico della giornata, e un'informativa che
dicesse solo "nessuno storico" ripeterebbe l'errore corretto il 17 ago 2026.

Sezione 4, secondo paragrafo: "archivio storico dettagliato" → "archivio storico
delle tue posizioni **oltre la giornata in cui sono state rilevate**", e via
"in tempo reale", che con la scia non descrive più quello che succede.

Sezione 8, frase di consenso: "entro circa 35 minuti dalla raccolta" → "entro
35 minuti dalle ore 24:00 del giorno della localizzazione e senza conservazione
di alcuno storico oltre tale giornata".

Michele ha detto che non serve far rivedere l'informativa ai soci già dentro.
Resta scritto qui perché la conservazione si allunga da 35 minuti a un giorno:
se un domani qualcuno chiede quando è cambiato il testo, la risposta è questa
riga.

## Annullato la sera del 10 set 2026

Michele ha scelto di tenere la cancellazione a **35 minuti dalla raccolta**, non
la pulizia notturna. Il testo dei 35 minuti che i soci hanno gia' accettato
ridiventa vero, quindi le tre riscritture di `PRIVACY_TEXT` fatte al mattino sono
state riportate indietro (`git checkout be8a80c^ -- src/components/OnboardingScreen.tsx`).
In produzione il testo nuovo non era mai arrivato: nessun socio deve riaccettare
nulla. Questo biglietto resta come memoria, non c'e' piu' niente da fare.
