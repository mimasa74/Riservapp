# 01_DATA.md — RiservApp
# Struttura dati — solo dati, nessuna UI

---

## Specie e categorie

### CERVO
Categorie (nessuna descrizione per ora):
```
1. PALCUTI          → badge chiusura: CHIUSI
2. FUSONI           → badge chiusura: CHIUSI
3. FEMMINE          → badge chiusura: CHIUSE
4. PICCOLI          → badge chiusura: CHIUSI
```

### CAPRIOLO
Categorie (nessuna descrizione per ora):
```
1. MASCHI DI PRIMA CLASSE    → badge chiusura: CHIUSI
2. MASCHI DI SECONDA CLASSE  → badge chiusura: CHIUSI
3. FEMMINE ADULTE            → badge chiusura: CHIUSE
4. FEMMINE PICCOLE           → badge chiusura: CHIUSE
```

### CAMOSCIO
Stesse categorie per entrambe le zone — Zona Campa - Spora e Zona Tovel - Mondifrà:
```
1. FEMMINE DI TERZA CLASSE     (capi di 1 anno)   → badge: CHIUSE
2. FEMMINE DI SECONDA          (dai 2 ai 10 anni) → badge: CHIUSE
3. FEMMINE DI PRIMA CLASSE     (11 anni e più)    → badge: CHIUSE
4. MASCHI DI TERZA CLASSE      (capi di 1 anno)   → badge: CHIUSI
5. MASCHI DI SECONDA CLASSE    (dai 2 ai 5 anni)  → badge: CHIUSI
6. MASCHI DI PRIMA CLASSE      (6 anni e più)     → badge: CHIUSI
```

---

## Struttura dati — una categoria

```
id            : stringa interna (es. "ce1") — solo per il database
nome          : stringa fissa (vedi liste sopra)
descrizione   : stringa fissa | null (solo Camoscio ha descrizioni)
badgeChiusura : stringa fissa — "CHIUSI" o "CHIUSE" (definito a priori per ogni categoria)
totale        : numero intero — variabile
abbattuti     : numero intero — variabile
stato         : "aperto" | "chiuso"
```

---

## Struttura dati — una specie

```
id          : "cervo" | "capriolo" | "camoscio"
nome        : stringa fissa
icona       : file PNG in assets/icons/
categorie   : lista di Categoria
zone        : lista di Zone (solo Camoscio)
note        : testo libero
alert       : testo libero
anno        : numero intero (es. 2026) — il Rettore lo imposta a inizio stagione
```

---

## Struttura dati — una zona (solo Camoscio)

```
id          : "campa" | "tovel"
nome        : "Zona Campa - Spora" | "Zona Tovel - Mondifrà"
categorie   : lista di Categoria (stesse 6 categorie, dati indipendenti per zona)
```

---

## Struttura dati — Post Bacheca

```
id          : stringa
tipo        : "normale" | "avviso" | "alert"
testo       : testo libero
foto_url    : stringa | null
pdf_url     : stringa | null
data        : timestamp
```

---

## Struttura dati — Turno Ruote e Squadre

```
id          : stringa
nome        : stringa (nome cacciatore)
data        : stringa (GG/MM/AAAA)
specie_id   : "cervo" | "capriolo" | "camoscio"
```

---

## Cosa è fisso e cosa cambia

| Campo | Fisso | Chi cambia | Quando |
|-------|-------|-----------|--------|
| nome categoria | ✅ | nessuno | mai |
| descrizione | ✅ | nessuno | mai |
| badgeChiusura | ✅ | nessuno | mai |
| totale | ❌ | Rettore | inizio stagione |
| abbattuti | ❌ | Rettore | durante stagione |
| stato | ❌ | Rettore | quando vuole |
| anno | ❌ | Rettore | inizio stagione |
| note / alert | ❌ | Rettore | quando vuole |

---

## Dove vivono i dati

Tutto su Firebase Firestore — sincronizzazione real-time.
Quando un dato cambia → tutti i dispositivi connessi si aggiornano in millisecondi.
