# Ruolo Direttivo — Design Spec

**Data:** 2026-04-05

## Obiettivo

Aggiungere un ruolo intermedio "direttivo" per 4 membri della riserva (Bergamo Nicola, Martini Mattia, Dallago Bruno, Quaresima Rudi + Bruni Michele) che possono pubblicare post sulla bacheca senza avere accesso admin completo.

## Ruoli esistenti

| Ruolo | Accesso | Login |
|-------|---------|-------|
| Cacciatore | Legge tutto, nessuna modifica | Solo nome |
| Direttivo | Cacciatore + pubblica post bacheca | Solo nome |
| Rettore | Tutto (impostazioni, mappa, soci, bacheca) | Google Sign-In |

## Struttura dati

`config/members` (documento Firestore esistente) — aggiunge campo `direttivo`:

```json
{
  "nomi": ["Bruni Michele", "Bergamo Nicola", ...],
  "direttivo": ["Bruni Michele", "Bergamo Nicola", "Martini Mattia", "Dallago Bruno", "Quaresima Rudi"]
}
```

- Il campo `direttivo` è un array di nomi canonici (come salvati in `nomi`)
- Gestito solo dal Rettore da SettingsScreen
- Scrittura admin-only (regole Firestore già esistenti per `config/members`)

## Normalizzazione nomi

Stessa funzione usata per i soci: lowercase + rimozione accenti + sort parole + join.

`"Bergamo Nicola"` = `"Nicola Bergamo"` = `"bergamo nicola"` → `"bergamonicola"`

## Riconoscimento ruolo

In `App.tsx`, dopo validazione nome:

```ts
const isModerator = members?.direttivo.some(
  n => normalizeName(n) === normalizeName(hunterName)
) ?? false;
```

- `isAdmin` → Google Sign-In Michele Bruni (invariato)
- `isModerator` → nome in `direttivo` array
- I due ruoli sono indipendenti: Michele può essere admin (login Google) O moderatore (solo nome)

## Comportamento UI

**BachecaScreen:** form pubblicazione post visibile se `isAdmin || isModerator`

**Tutto il resto invariato:** mappa, ingranaggio impostazioni, gestione soci — solo admin.

## Gestione direttivo in SettingsScreen

Nuova sezione "Direttivo" (sotto "Soci"), visibile solo al Rettore:

- Lista nomi direttivo con pulsante ✕ rimozione
- Campo + pulsante "Aggiungi" per nuovi nomi
- Handlers: `onAddDirettivo(nome)`, `onRemoveDirettivo(nome)` → `arrayUnion/arrayRemove` su `config/members.direttivo`

## File modificati

| File | Modifica |
|------|----------|
| `src/types/index.ts` | Aggiunge `direttivo: string[]` a `Members` |
| `src/App.tsx` | Calcola `isModerator`, passa a BachecaScreen e SettingsScreen |
| `src/components/BachecaScreen.tsx` | Accetta `isModerator` prop, mostra form se `isAdmin \|\| isModerator` |
| `src/components/SettingsScreen.tsx` | Sezione Direttivo con add/remove |
