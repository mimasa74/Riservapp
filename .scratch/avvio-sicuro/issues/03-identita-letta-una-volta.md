# L'identità del telefono si legge una volta sola

Status: resolved
Type: task

## Answer

Fatto nel commit `76a2ed1`: `const [deviceId] = useState(getOrCreateDeviceId)`,
letto una volta al montaggio. Il punto 2 del biglietto (localStorage che
lancia) non è stato affrontato: se serve, biglietto nuovo.

In `src/App.tsx`, `getOrCreateDeviceId()` è chiamata **nel corpo del
componente**, quindi a ogni render, e se la lettura di `localStorage` torna
vuota scrive subito un'identità nuova. Il nome invece è letto una volta sola
nell'inizializzatore di `useState`.

Basta una lettura transitoria fallita (Safari ne ha avute, al ritorno della
pagina dal background) perché l'identità cambi per sempre: il nome resta, il
telefono no, e alla prossima apertura la validazione vede lo slot occupato da
"un altro dispositivo" → BENVENUTO → "Nome già in uso". È l'unico punto del
codice che, da solo, produce esattamente il sintomo segnalato su iPhone.

Da fare:
1. Leggere/creare l'identità **una volta**, nell'inizializzatore di `useState`
   (o in un modulo caricato una volta), come per il nome.
2. Se `localStorage` non è disponibile (lancia), non crollare: usare
   un'identità di sessione e mostrare il banner "questo dispositivo non può
   salvare l'accesso", invece di una pagina bianca.
3. Un test: due render consecutivi restituiscono la stessa identità anche se
   `localStorage.getItem` torna `null` al secondo.

Riferimento: revisione 9 set 2026, punto 7.
