# Chi viene buttato fuori con lo stesso telefono deve poter rientrare

Status: resolved
Type: task
Blocked by: 01

## Answer

Fatto nel commit `76a2ed1`, senza toccare le rules: `HunterNameModal` non
riscrive lo slot se è già del proprio telefono e chiama subito `onConfirm`;
`permission-denied` mostra "Nome già in uso da un altro dispositivo. Contatta
il Rettore." invece di "Errore di connessione". 7 test nuovi in
`HunterNameModal.test.tsx`. Le rules restano `addedKeys() == 1`: il punto 1 del
biglietto non serve più.

Quando la validazione in `App.tsx` butta fuori un socio, cancella il nome ma
**non** l'identità del telefono (`riservapp_device_id`). Il socio ritorna al
modale BENVENUTO, scrive il suo nome, e `HunterNameModal` prova a scrivere lo
slot con lo **stesso** valore di prima. Le rules di `config/slots` accettano
da un anonimo solo un update che **aggiunge** esattamente una chiave: una
chiave già presente con lo stesso valore non conta né come aggiunta né come
modifica, quindi la scrittura è rifiutata e il modale dice "Errore di
connessione. Riprova." per sempre. Il socio cerca la rete invece del Rettore.

Da fare:
1. `firestore.rules`, blocco `config/slots`: permettere anche l'update in cui
   nessuna chiave cambia (diff vuoto), così riscrivere il proprio slot con lo
   stesso valore passa. Le altre condizioni restano: mai modificare o togliere
   una chiave altrui.
2. `HunterNameModal.tsx`: se lo slot è già del proprio telefono, non scrivere
   niente e chiamare subito `onConfirm`.
3. Il messaggio "Errore di connessione" solo per errori di rete; per
   `permission-denied` dire "Nome già in uso da un altro dispositivo. Contatta
   il Rettore." — è l'unico caso in cui le rules rifiutano.
4. Test sulle rules (o almeno sul modale) per il caso "stesso valore".

Riferimento: revisione 9 set 2026, punto 2.
