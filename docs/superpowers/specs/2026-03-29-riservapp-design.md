# RiservApp — Specifica di Design
**Data:** 2026-03-29
**Validato con:** Michele Bruni (Rettore)

---

## 1. Cos'è l'app

Bacheca digitale per la **Riserva di Caccia di Tuenno** (40-45 soci).
Sostituisce il gruppo WhatsApp con uno strumento strutturato, sempre aggiornato, accessibile a tutti.

Non sostituisce il registro ufficiale bd.cacciatoritrentini.it.

---

## 2. Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS v4 + Vite 6 |
| Animazioni | Framer Motion (swipe orizzontale) |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Auth — Google Sign-In (solo Rettore) |
| Storage | Firebase Storage (foto post + immagini ruote) |
| Notifiche | Firebase Cloud Messaging (FCM) |
| Mappe | Google Maps API (Fase 6) |
| Deploy | PWA installabile — Android primario, iOS limitato |

**Codebase:** si parte dalla v1 esistente (`C:\Users\mathi\Desktop\riservapp`) e si aggiorna per rispettare la grafica del prototipo HTML approvato (`riservapp-admin (3).html`).

---

## 3. Due modalità — una sola app

### Cacciatore (default, senza login)
- Apre l'app e vede tutto senza fare nulla
- Sola lettura — nessun controllo admin visibile
- Riceve notifiche push
- La sua posizione GPS viene tracciata (consenso al primo avvio)

### Rettore (admin)
- Accede con **long press 3 secondi sul logo riserva** nell'header Bacheca → Google Sign-In
- Vede gli stessi contenuti + controlli di editing
- Indicatore silenzioso: dot verde sul logo riserva
- Il cacciatore non deve mai sapere che esiste una modalità admin

---

## 4. Primo avvio — onboarding

File di riferimento: `riservapp-onboarding.html` (testi da completare da Michele).

**3 step:**
1. **Benvenuto** — logo riserva + testo di benvenuto
2. **Nome** — campo testo, obbligatorio, validato
3. **Permessi** — notifiche + posizione sulla stessa schermata, un solo pulsante "Accetta e continua" + "Non ora"

**Dati salvati in localStorage dopo onboarding:**
- `nome`: stringa inserita dall'utente
- `deviceId`: UUID generato una volta sola

---

## 5. Navigazione

### Struttura principale — swipe orizzontale
```
Bacheca → Capriolo → Cervo → Camoscio
   1          2         3        4
```
- Dots indicatori in cima (● ○ ○ ○), cliccabili
- **Nessuna bottom nav** — navigazione solo swipe e dots
- Swipe ← → per navigare tra le schermate

### Overlay (si aprono sopra la schermata corrente)
- **Ruota** — aperta da pulsante in fondo a ogni schermata specie (tutte e 3)
- **Impostazioni stagione** — aperta da icona ingranaggio in header specie (solo Rettore)

---

## 6. Firestore — struttura dati

### `/species/cervo` e `/species/capriolo`
```json
{
  "anno": 2026,
  "note": "testo libero",
  "alert": "testo libero",
  "updatedAt": "Timestamp",
  "categories": [
    {
      "id": "ce1",
      "nome": "PALCUTI",
      "descrizione": "(anni 2 e più)",
      "badgeChiusura": "CHIUSI",
      "totale": 6,
      "abbattuti": 6,
      "stato": "aperto"
    }
  ]
}
```

### `/species/camoscio`
```json
{
  "anno": 2026,
  "penalita": "testo libero",
  "note": "testo libero",
  "alert": "testo libero",
  "updatedAt": "Timestamp",
  "zone": {
    "campa": {
      "categories": []
    },
    "tovel": {
      "categories": []
    }
  }
}
```

### `/bacheca/{postId}`
```json
{
  "tipo": "normale | avviso | alert",
  "testo": "testo libero",
  "foto_url": "string | null",
  "pdf_url": "string | null",
  "data": "Timestamp",
  "notifica": true
}
```

### `/ruote/{specieId}`
```json
{
  "immagine_url": "string | null",
  "updatedAt": "Timestamp"
}
```
`specieId` è uno tra: `"cervo"`, `"capriolo"`, `"camoscio"`.

### `/users_locations/{deviceId}`
```json
{
  "nome": "Mario Rossi",
  "latitude": 46.123,
  "longitude": 10.987,
  "timestamp": "Timestamp"
}
```

### `/geofences/riserva-tuenno`
```json
{
  "vertices": [{ "lat": 0.0, "lng": 0.0 }]
}
```
32 vertici reali della riserva — caricati una volta sola.

---

## 7. Logica categorie

### Campi variabili vs fissi

| Campo | Fisso | Chi cambia | Quando |
|---|---|---|---|
| `nome` | ✅ | nessuno | mai |
| `descrizione` | ✅ | nessuno | mai |
| `badgeChiusura` | ✅ | nessuno | mai |
| `totale` | ❌ | Rettore | inizio stagione |
| `abbattuti` | ❌ | Rettore | durante stagione |
| `stato` | ❌ | Rettore | quando vuole |
| `anno`, `note`, `alert`, `penalita` | ❌ | Rettore | quando vuole |

### Stati e badge

| Condizione | Badge | Colore | Come scatta |
|---|---|---|---|
| `abbattuti == totale` | FINITI / FINITE | rosso `#8B1A1A` | automatico (calcolato) |
| `stato == "chiuso"` | CHIUSI / CHIUSE | rosso `#8B1A1A` | Rettore manualmente |
| `stato == "sospeso"` | SOSPESO | arancione `#B8730A` | Rettore manualmente |
| `stato == "aperto"` | nessuno | — | — |

FINITI/FINITE e stato sono **mutuamente esclusivi in pratica**: il Rettore chiude o sospende solo categorie non ancora finite.

### Visibilità quadratini

| Stato | Cacciatore | Rettore |
|---|---|---|
| aperto | quadratini visivi (non tappabili) | quadratini tappabili |
| sospeso / chiuso / finiti | solo nome + badge, zero quadratini | nome + badge + quadratini tappabili |

### Regole abbattimento (Rettore)
- Tocco su quadratino vuoto → `abbattuti + 1`
- Tocco su quadratino pieno → `abbattuti - 1`
- `abbattuti` non può essere < 0 né > `totale`
- `updateDoc` con array aggiornato + `updatedAt: serverTimestamp()`

### Reset stagione
- `abbattuti = 0` per tutte le categorie
- `stato = "aperto"` per tutte
- `totale`, `note`, `alert` rimangono invariati
- Richiede conferma esplicita con dialog

---

## 8. Schermata Bacheca

### Header
```
┌─────────────────────────────────────┐
│ Riserva di Caccia di Tuenno         │
│ BACHECA          [logo riserva 64px]│ ← long press 3s → login admin
└─────────────────────────────────────┘
```
- Logo riserva: `logo_tuenno.png` in `public/`
- Modalità admin: dot verde sul logo, FAB `+` in basso

### Feed
- Post in ordine cronologico inverso (più recente in cima)
- Scroll verticale infinito

### Tipi post

| Tipo | Stile card |
|---|---|
| normale | bianca, barra grigia in cima |
| avviso | bordo verde `#5C6B3A` |
| alert | bordo rosso, sfondo `#FDF0F0`, testo rosso bold |

Ogni post: barra colorata + tipo + data + testo + foto (opzionale) + PDF (opzionale).

### Vista Rettore
- FAB `+` verde fisso in basso (solo sulla Bacheca, solo admin)
- Tocco FAB → modal bottom sheet "Nuovo post"
  - Scelta tipo (Normale / Avviso / Alert)
  - Textarea testo
  - Allegato foto da galleria
  - Allegato PDF
  - Toggle "Invia notifica"
- Cestino su ogni post per eliminare

---

## 9. Schermata Assegnazioni

### Header specie
```
┌─────────────────────────────────────┐
│ [logo 72px]  ASSEGNAZIONI 2026      │ ← logo: long press → login (fallback)
│  (dot verde)  CERVO            [⚙️] │ ← ingranaggio solo admin
└─────────────────────────────────────┘
```

### Solo Camoscio
Tab zone: `Zona Campa - Spora` | `Zona Tovel - Mondifrà`

### Blocco categoria
```
┌─────────────────────────────────────┐
│ PALCUTI: N. 6                CHIUSI │
│ (anni 2 e più)                      │
│ ☒ ☒ ☒ ☒ ☒ ☒                        │
└─────────────────────────────────────┘
```

### Note card (in fondo alla schermata)
- Solo Camoscio: sezione Penalità (sfondo diverso)
- Note (textarea editabile dal Rettore)
- Alert (input rosso bold, editabile dal Rettore)

### Elementi finali
- Timestamp `Ultimo aggiornamento: GG/MM/AAAA ore HH:MM`
- Pulsante `Ruote e Squadre →` (tutte e 3 le specie)

---

## 10. Overlay Ruote e Squadre

- Freccia indietro in cima
- **1 immagine** a schermo intero (foto della ruota preparata esternamente)
- Se nessuna immagine: messaggio "Nessuna ruota disponibile"
- Vista Rettore: pulsante per sostituire l'immagine (galleria → Firebase Storage)

| Specie | Frequenza aggiornamento |
|---|---|
| Cervo | ~1 volta a settimana (ruota palcuti) |
| Camoscio | ~ogni 2 mesi |
| Capriolo | raramente / comunicazioni via Bacheca |

---

## 11. Overlay Impostazioni Stagione (solo Rettore)

- Icona ingranaggio nell'header specie → overlay
- Per ogni categoria: campo `totale`, toggle `stato`
- Campo `anno` stagione
- Note e alert editabili (anche modificabili dalla schermata principale)
- Pulsante **"Avvia nuova stagione"** → dialog conferma → azzera abbattuti

---

## 12. Notifiche push (FCM)

| Evento | Testo notifica | Obbligatoria |
|---|---|---|
| `abbattuti == totale` | "NOME CATEGORIA — finiti" | ✅ automatica |
| `stato` → `"chiuso"` | "NOME CATEGORIA — chiusa" | ✅ automatica |
| `stato` → `"sospeso"` | "NOME CATEGORIA — sospesa" | ✅ automatica |
| Post tipo alert | testo del post | ✅ automatica |
| Post tipo avviso/normale | testo del post | ⚙️ toggle Rettore |

**Note:**
- Telefono silenzioso → notifica appare senza suono (non aggirabile)
- iOS: funziona solo su PWA installata da Safari (iOS 16.4+)
- Utente deve accettare permesso al primo avvio

---

## 13. Geolocalizzazione — Fase 6 (sicurezza)

**Scopo:** sicurezza soci in luoghi impervi — il Rettore vede chi è in riserva.

### Funzionamento
- App invia posizione GPS a Firebase ogni 5 minuti
- Android: **notifica persistente** ("RiservApp — tracciamento attivo") mantiene GPS attivo in background
- Cloud Function `checkGeofence` confronta posizione con poligono 32 vertici
- Se dentro → `/users_locations/{deviceId}` aggiornato e visibile sulla mappa
- Se fuori → documento rimosso

### Identificazione cacciatori
- `deviceId` generato al primo avvio (UUID, localStorage)
- `nome` inserito al primo avvio (localStorage)
- Zero login richiesto

### Mappa Rettore
- Google Maps con poligono riserva sovrapposto
- Marker per ogni cacciatore dentro la riserva, con nome
- Aggiornamento ogni 5 minuti
- Solo il Rettore vede la mappa — i cacciatori non si vedono tra loro

### Compatibilità
- Android PWA: ✅ affidabile con notifica persistente
- iOS PWA: ⚠️ GPS background non affidabile — funzionalità assente

---

## 14. Grafica — riferimento

File di riferimento: `riservapp-admin (3).html`

```
Sfondo app:       #EDEEE6
Sfondo header:    #D6DBCA  (#ECEDE1 per header specie)
Verde primario:   #5C6B3A
Card sfondo:      #FFFFFF
Card bordo:       #d0d5c4
Testo:            #1A1A14
Testo grigio:     #6B6B5A
Rosso danger:     #8B1A1A
Rosso bg:         #FDF0F0
Arancione sospeso:#B8730A

Font:             EB Garamond (Google Fonts), bold uppercase per titoli
Card:             border-radius 12px, bordo 1px #d0d5c4
Quadratini:       24×24px, gap 5px, flex-wrap
  vuoto:          bordo #5C6B3A, sfondo trasparente
  pieno:          bordo #8B1A1A, sfondo #fff, X nera 11px
Logo riserva:     logo_tuenno.png — 64px Bacheca, 72px header specie
```

---

## 15. Asset

| File | Percorso | Uso |
|---|---|---|
| `logo_tuenno.png` | `public/` | Logo riserva (provvisorio) |
| `cervo.png` | `public/icons/` | Logo specie |
| `capriolo.png` | `public/icons/` | Logo specie |
| `camoscio.png` | `public/icons/` | Logo specie |

---

## 16. Priorità di sviluppo

| Fase | Cosa |
|---|---|
| 1 | UI base: navigazione swipe, header, quadratini, Firebase real-time |
| 2 | Bacheca: feed, post con foto/PDF, FAB admin |
| 3 | Ruote: overlay con immagine, upload Rettore |
| 4 | Notifiche push FCM |
| 5 | Impostazioni stagione + reset |
| 6 | Mappa + geofencing GPS (sicurezza) |

---

## 17. Cosa l'app NON fa

- Non sostituisce il registro ufficiale bd.cacciatoritrentini.it
- Non gestisce pagamenti quote soci
- Non ha registrazione cacciatori (aprono e basta)
- Non mostra ai cacciatori la posizione degli altri
- Non funziona offline (richiede connessione per dati real-time)
