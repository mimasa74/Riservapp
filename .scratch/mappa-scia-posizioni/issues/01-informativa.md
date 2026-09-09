# Informativa: da "35 minuti dalla raccolta" a "entro le 00:35 del giorno dopo"

Status: needs-info
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
