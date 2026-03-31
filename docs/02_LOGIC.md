# LOGIC.md — RiservApp
# Regole di business — nessuna UI, nessun database

---

## Ruoli

### Cacciatore
- Legge tutto
- Non modifica nulla

### Rettore
- Legge tutto
- Modifica tutto
- Accesso tramite login nascosto

---

## Regole per categoria

### Regola 1 — Abbattimento
```
SE Rettore tocca quadratino vuoto
  abbattuti = abbattuti + 1
SE Rettore tocca quadratino pieno
  abbattuti = abbattuti - 1
abbattuti non può essere < 0
abbattuti non può superare totale
```

### Regola 2 — Chiusura automatica
```
SE abbattuti == totale
  → notifica push a tutti i cacciatori
  → il Rettore decide se cambiare stato a "chiuso"
```

### Regola 3 — Stato
```
"aperto"  → caccia attiva, quadratini modificabili
"chiuso"  → caccia bloccata, Rettore può ancora vedere e modificare il conteggio
```

### Regola 4 — Reset stagione
```
Il Rettore avvia nuova stagione
→ richiede conferma esplicita
→ abbattuti = 0 per tutte le categorie
→ totale e stato rimangono quelli impostati
```

---

## Regole per bacheca

```
Chiunque può leggere i post
Solo il Rettore può creare / eliminare post
Post di tipo "alert" → notifica push immediata a tutti
```

---

## Regole per ruota

```
Chiunque può vedere la lista
Solo il Rettore può aggiungere / eliminare turni
```

---

## Regole di accesso

```
Rettore: long press 3 secondi sul logo → Google Sign-In
Cacciatore: nessun login, apre e vede tutto
Il cacciatore non sa che esiste una modalità admin
```

---

## Regole notifiche push

```
Evento 1: categoria si chiude (abbattuti == totale)
  → push a tutti: "Categoria X chiusa"
  → priorità: normale

Evento 2: Rettore pubblica post tipo "normale" (Info)
  → push silenziosa a tutti (notification senza suono)
  → testo: primi 80 caratteri del post

Evento 3: Rettore pubblica post tipo "avviso"
  → push normale a tutti (suono standard)
  → testo: primi 80 caratteri del post

Evento 4: Rettore pubblica post tipo "alert" (Urgente)
  → push ad alta priorità a tutti (suono + vibrazione, bypassa silenzioso)
  → testo: primi 80 caratteri del post
```
