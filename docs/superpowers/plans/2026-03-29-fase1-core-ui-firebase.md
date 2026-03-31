# Fase 1 — Core UI + Firebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare la v1 esistente in un'app funzionante con navigazione swipe, categorie corrette, badge logic aggiornata e Firebase real-time su struttura `/species/{id}`.

**Architecture:** Si parte dal codebase v1 (`C:\Users\mathi\Desktop\riservapp`). Si rimuove la bottom nav, si sposta il long press sul logo riserva nell'header Bacheca, si migra Firestore da `/config/main` a `/species/{id}`, si aggiorna la badge logic. I componenti esistenti vengono aggiornati, non riscritti da zero.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion, Firebase Firestore, Vite 6

**Reference files:**
- Grafica: `C:\Users\mathi\Desktop\riservapp-admin (3).html`
- Spec: `docs/superpowers/specs/2026-03-29-riservapp-design.md`
- Dati: `C:\Users\mathi\Desktop\riservapp\hunting_data.json`

---

## File Map

**Modificare (esistenti):**
- `src/types/index.ts` — aggiornare interfacce TypeScript
- `src/firebase.ts` — già ok, nessuna modifica
- `src/contexts/AuthContext.tsx` — già ok, nessuna modifica
- `src/App.tsx` — rimuovere BottomNav, aggiornare struttura schermate
- `src/components/SwipeContainer.tsx` — rimuovere dipendenza da BottomNav
- `src/components/AssignmentBoxes.tsx` — aggiornare dimensioni e logica
- `src/components/CategoryRow.tsx` — aggiornare badge logic (FINITI/FINITE/SOSPESO)
- `src/components/AssegnazioniScreen.tsx` — aggiornare props e struttura
- `src/components/Header.tsx` — aggiornare per specie (non più Bacheca)
- `src/components/NotesCard.tsx` — aggiornare per modalità admin/cacciatore
- `src/components/RuotaView.tsx` — semplificare (solo immagine)

**Creare (nuovi):**
- `src/hooks/useSpecies.ts` — onSnapshot real-time per `/species/{id}`
- `src/hooks/useAuth.ts` — wrapper per AuthContext
- `src/lib/firestore.ts` — tutte le operazioni Firestore (updateDoc, etc.)
- `src/lib/seedData.ts` — dati iniziali da caricare in Firestore (una tantum)
- `src/components/BachecaScreen.tsx` — schermata Bacheca (placeholder feed)
- `src/components/RiserveLogo.tsx` — logo riserva con long press → login admin

**Eliminare:**
- `src/components/BottomNav.tsx` — rimossa (navigazione solo swipe)
- `src/components/AssignmentGrid.tsx` — sostituito da AssignmentBoxes
- `src/components/AssignmentView.tsx` — sostituito da AssegnazioniScreen

---

## Task 1: Aggiornare i tipi TypeScript

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Sostituire il contenuto di `src/types/index.ts`**

```typescript
// src/types/index.ts

export interface Categoria {
  id: string;
  nome: string;
  descrizione: string;
  badgeChiusura: 'CHIUSI' | 'CHIUSE'; // fisso per categoria
  totale: number;
  abbattuti: number;
  stato: 'aperto' | 'sospeso' | 'chiuso';
}

export interface ZonaCamoscio {
  categories: Categoria[];
}

export interface SpecieBase {
  anno: number;
  note: string;
  alert: string;
  updatedAt: Date | null;
}

export interface SpecieCervoCapriolo extends SpecieBase {
  categories: Categoria[];
}

export interface SpecieCamoscio extends SpecieBase {
  penalita: string;
  zone: {
    campa: ZonaCamoscio;
    tovel: ZonaCamoscio;
  };
}

export type SpecieId = 'cervo' | 'capriolo' | 'camoscio';

// Badge derivato — non salvato in Firestore, calcolato nel codice
export function getBadge(cat: Categoria): string | null {
  if (cat.totale > 0 && cat.abbattuti >= cat.totale) {
    return cat.badgeChiusura === 'CHIUSE' ? 'FINITE' : 'FINITI';
  }
  if (cat.stato === 'chiuso') return cat.badgeChiusura; // CHIUSI o CHIUSE
  if (cat.stato === 'sospeso') return 'SOSPESO';
  return null;
}

export function getBadgeColor(badge: string | null): string {
  if (!badge) return '';
  if (badge === 'SOSPESO') return '#B8730A';
  return '#8B1A1A';
}
```

- [ ] **Step 2: Verificare che il file compili**

```bash
cd C:\Users\mathi\Desktop\riservapp
npx tsc --noEmit 2>&1 | head -30
```

I tipi appena definiti non sono ancora usati — ci saranno errori sui file che usano i vecchi tipi. È normale, li risolviamo nei task successivi.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor: update TypeScript types for new data model"
```

---

## Task 2: Operazioni Firestore

**Files:**
- Create: `src/lib/firestore.ts`

- [ ] **Step 1: Creare `src/lib/firestore.ts`**

```typescript
// src/lib/firestore.ts
import {
  doc, getDoc, updateDoc, serverTimestamp, onSnapshot, Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import { Categoria, SpecieCervoCapriolo, SpecieCamoscio, SpecieId } from '../types';

// ─── READ ────────────────────────────────────────────────────────────────────

export function subscribeToSpecies(
  specieId: SpecieId,
  callback: (data: SpecieCervoCapriolo | SpecieCamoscio | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'species', specieId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback(snap.data() as SpecieCervoCapriolo | SpecieCamoscio);
  });
}

// ─── WRITE — abbattimento ────────────────────────────────────────────────────

export async function toggleAbbattimento(
  specieId: 'cervo' | 'capriolo',
  catId: string,
  categories: Categoria[],
  boxIndex: number
): Promise<void> {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  const newAbbattuti = boxIndex < cat.abbattuti
    ? boxIndex         // click su pieno → decrementa
    : Math.min(boxIndex + 1, cat.totale); // click su vuoto → incrementa

  const newCategories = categories.map(c =>
    c.id === catId ? { ...c, abbattuti: newAbbattuti } : c
  );

  await updateDoc(doc(db, 'species', specieId), {
    categories: newCategories,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleAbbattimentoCamoscio(
  zona: 'campa' | 'tovel',
  catId: string,
  categories: Categoria[],
  boxIndex: number
): Promise<void> {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  const newAbbattuti = boxIndex < cat.abbattuti
    ? boxIndex
    : Math.min(boxIndex + 1, cat.totale);

  const newCategories = categories.map(c =>
    c.id === catId ? { ...c, abbattuti: newAbbattuti } : c
  );

  await updateDoc(doc(db, 'species', 'camoscio'), {
    [`zone.${zona}.categories`]: newCategories,
    updatedAt: serverTimestamp(),
  });
}

// ─── WRITE — stato categoria ─────────────────────────────────────────────────

export async function setStatoCategoria(
  specieId: 'cervo' | 'capriolo',
  catId: string,
  categories: Categoria[],
  stato: 'aperto' | 'sospeso' | 'chiuso'
): Promise<void> {
  const newCategories = categories.map(c =>
    c.id === catId ? { ...c, stato } : c
  );
  await updateDoc(doc(db, 'species', specieId), {
    categories: newCategories,
    updatedAt: serverTimestamp(),
  });
}

// ─── WRITE — note / alert / penalità ─────────────────────────────────────────

export async function updateNote(
  specieId: SpecieId,
  field: 'note' | 'alert' | 'penalita',
  value: string
): Promise<void> {
  await updateDoc(doc(db, 'species', specieId), {
    [field]: value,
    updatedAt: serverTimestamp(),
  });
}

// ─── WRITE — reset stagione ───────────────────────────────────────────────────

export async function resetStagione(
  specieId: 'cervo' | 'capriolo',
  categories: Categoria[]
): Promise<void> {
  const reset = categories.map(c => ({ ...c, abbattuti: 0, stato: 'aperto' as const }));
  await updateDoc(doc(db, 'species', specieId), {
    categories: reset,
    updatedAt: serverTimestamp(),
  });
}
```

- [ ] **Step 2: Compilare**

```bash
npx tsc --noEmit 2>&1 | grep firestore
```

Nessun errore atteso su questo file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firestore.ts
git commit -m "feat: add Firestore operations module"
```

---

## Task 3: Hook useSpecies (real-time)

**Files:**
- Create: `src/hooks/useSpecies.ts`

- [ ] **Step 1: Creare `src/hooks/useSpecies.ts`**

```typescript
// src/hooks/useSpecies.ts
import { useState, useEffect } from 'react';
import { subscribeToSpecies } from '../lib/firestore';
import { SpecieCervoCapriolo, SpecieCamoscio, SpecieId } from '../types';

export function useSpecies(specieId: SpecieId) {
  const [data, setData] = useState<SpecieCervoCapriolo | SpecieCamoscio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToSpecies(specieId, (d) => {
      setData(d);
      setLoading(false);
    });
    return unsub;
  }, [specieId]);

  return { data, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSpecies.ts
git commit -m "feat: add useSpecies real-time hook"
```

---

## Task 4: Seed dati iniziali in Firestore

**Files:**
- Create: `src/lib/seedData.ts`

Questo script carica i dati iniziali in Firestore. Va eseguito **una volta sola** dall'admin.

- [ ] **Step 1: Creare `src/lib/seedData.ts`**

```typescript
// src/lib/seedData.ts
// Eseguire UNA SOLA VOLTA per popolare Firestore con i dati iniziali.
// Chiamare seedAll() dalla console del browser dopo il login admin.
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const cervo = {
  anno: 2026,
  note: 'I GIORNI DI CACCIA SONO: MERCOLEDÌ E SABATO FINO A FINE AGOSTO 2026.\nDAL 01 SETTEMBRE I GIORNI DI CACCIA SONO MERCOLEDÌ, SABATO E DOMENICA.',
  alert: '',
  updatedAt: serverTimestamp(),
  categories: [
    { id: 'ce1', nome: 'PALCUTI', descrizione: '(anni 2 e più)', badgeChiusura: 'CHIUSI', totale: 6, abbattuti: 0, stato: 'aperto' },
    { id: 'ce2', nome: 'FUSONI', descrizione: '(capi di 1 anno)', badgeChiusura: 'CHIUSI', totale: 4, abbattuti: 0, stato: 'aperto' },
    { id: 'ce3', nome: 'FEMMINE', descrizione: '', badgeChiusura: 'CHIUSE', totale: 8, abbattuti: 0, stato: 'aperto' },
    { id: 'ce4', nome: 'PICCOLI', descrizione: '', badgeChiusura: 'CHIUSI', totale: 11, abbattuti: 0, stato: 'aperto' },
  ],
};

const capriolo = {
  anno: 2026,
  note: 'I GIORNI DI CACCIA SONO: MERCOLEDÌ E SABATO FINO A FINE AGOSTO 2026.\nDAL 01 SETTEMBRE I GIORNI DI CACCIA SONO MERCOLEDÌ, SABATO E DOMENICA.',
  alert: '',
  updatedAt: serverTimestamp(),
  categories: [
    { id: 'ca1', nome: 'MASCHI DI PRIMA CLASSE', descrizione: '(anni 2 e più)', badgeChiusura: 'CHIUSI', totale: 9, abbattuti: 0, stato: 'aperto' },
    { id: 'ca2', nome: 'MASCHI DI SECONDA CLASSE', descrizione: '(capi di 1 anno)', badgeChiusura: 'CHIUSI', totale: 13, abbattuti: 0, stato: 'aperto' },
    { id: 'ca3', nome: 'FEMMINE ADULTE', descrizione: '', badgeChiusura: 'CHIUSE', totale: 8, abbattuti: 0, stato: 'aperto' },
    { id: 'ca4', nome: 'FEMMINE PICCOLE', descrizione: '', badgeChiusura: 'CHIUSE', totale: 8, abbattuti: 0, stato: 'aperto' },
  ],
};

const camoscio6 = (prefix: string) => [
  { id: `${prefix}1`, nome: 'FEMMINE DI TERZA CLASSE', descrizione: '(capi di 1 anno)', badgeChiusura: 'CHIUSE', totale: 4, abbattuti: 0, stato: 'aperto' },
  { id: `${prefix}2`, nome: 'FEMMINE DI SECONDA', descrizione: '(dai 2 ai 10 anni)', badgeChiusura: 'CHIUSE', totale: 0, abbattuti: 0, stato: 'chiuso' },
  { id: `${prefix}3`, nome: 'FEMMINE DI PRIMA CLASSE', descrizione: '(11 anni e più)', badgeChiusura: 'CHIUSE', totale: 4, abbattuti: 0, stato: 'aperto' },
  { id: `${prefix}4`, nome: 'MASCHI DI TERZA CLASSE', descrizione: '(capi di 1 anno)', badgeChiusura: 'CHIUSI', totale: 4, abbattuti: 0, stato: 'aperto' },
  { id: `${prefix}5`, nome: 'MASCHI DI SECONDA CLASSE', descrizione: '(dai 2 ai 5 anni)', badgeChiusura: 'CHIUSI', totale: 0, abbattuti: 0, stato: 'chiuso' },
  { id: `${prefix}6`, nome: 'MASCHI DI PRIMA CLASSE', descrizione: '(6 anni e più)', badgeChiusura: 'CHIUSI', totale: 4, abbattuti: 0, stato: 'aperto' },
];

const camoscio = {
  anno: 2026,
  penalita: '',
  note: '',
  alert: '',
  updatedAt: serverTimestamp(),
  zone: {
    campa: { categories: camoscio6('cp') },
    tovel: { categories: camoscio6('tv') },
  },
};

export async function seedAll() {
  await setDoc(doc(db, 'species', 'cervo'), cervo);
  await setDoc(doc(db, 'species', 'capriolo'), capriolo);
  await setDoc(doc(db, 'species', 'camoscio'), camoscio);
  console.log('✅ Seed completato');
}

// Esporre globalmente per uso dalla console del browser
(window as any).seedAll = seedAll;
```

- [ ] **Step 2: Importare seedData in main.tsx (solo dev)**

In `src/main.tsx` aggiungere in fondo:

```typescript
// Solo in development — rimuovere prima del deploy
if (import.meta.env.DEV) {
  import('./lib/seedData');
}
```

- [ ] **Step 3: Avviare l'app, fare login admin, aprire console browser ed eseguire**

```
seedAll()
```

Verificare in Firebase Console che i 3 documenti `/species/cervo`, `/species/capriolo`, `/species/camoscio` esistano.

- [ ] **Step 4: Commit**

```bash
git add src/lib/seedData.ts src/main.tsx
git commit -m "feat: add Firestore seed data for initial setup"
```

---

## Task 5: Componente RiserveLogo (long press → login admin)

**Files:**
- Create: `src/components/RiserveLogo.tsx`

- [ ] **Step 1: Creare `src/components/RiserveLogo.tsx`**

```tsx
// src/components/RiserveLogo.tsx
import { useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

const LONG_PRESS_MS = 3000;

export function RiserveLogo() {
  const { isAdmin, login } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startPress() {
    timerRef.current = setTimeout(() => {
      login(); // apre Google Sign-In
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
    >
      <img
        src="/logo_tuenno.png"
        alt="Cacciatori Tuenno"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2.5px solid #d0d5c4',
          boxShadow: '0 2px 8px rgba(0,0,0,.1)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
          cursor: 'default',
        }}
        draggable={false}
      />
      {/* Dot verde silenzioso — visibile solo in modalità admin */}
      {isAdmin && (
        <div style={{
          position: 'absolute',
          bottom: 3,
          right: 3,
          width: 11,
          height: 11,
          background: '#5C6B3A',
          borderRadius: '50%',
          border: '2px solid #EDEEE6',
        }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Creare `src/hooks/useAuth.ts`**

```typescript
// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Copiare `logo_tuenno.png` in `public/`**

```bash
cp "C:\Users\mathi\Downloads\logo_tuenno.png" "C:\Users\mathi\Desktop\riservapp\public\logo_tuenno.png"
```

- [ ] **Step 4: Compilare**

```bash
npx tsc --noEmit 2>&1 | grep -i riserveLogo
```

- [ ] **Step 5: Commit**

```bash
git add src/components/RiserveLogo.tsx src/hooks/useAuth.ts public/logo_tuenno.png
git commit -m "feat: add RiserveLogo with long-press admin login"
```

---

## Task 6: Aggiornare CategoryRow con nuova badge logic

**Files:**
- Modify: `src/components/CategoryRow.tsx`

- [ ] **Step 1: Riscrivere `src/components/CategoryRow.tsx`**

```tsx
// src/components/CategoryRow.tsx
import { Categoria, getBadge, getBadgeColor } from '../types';
import { AssignmentBoxes } from './AssignmentBoxes';
import { useAuth } from '../hooks/useAuth';

interface Props {
  categoria: Categoria;
  onToggle?: (catId: string, boxIndex: number) => void;
}

export function CategoryRow({ categoria, onToggle }: Props) {
  const { isAdmin } = useAuth();
  const badge = getBadge(categoria);
  const badgeColor = getBadgeColor(badge);
  const showBoxes = categoria.totale > 0 && (isAdmin || !badge);

  const nameWithN = categoria.totale > 0
    ? `${categoria.nome}: N.\u00a0${categoria.totale}`
    : categoria.nome;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d0d5c4',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1A1A14',
            textTransform: 'uppercase',
            letterSpacing: '.02em',
            lineHeight: 1.4,
          }}>
            {nameWithN}
          </div>
          {categoria.descrizione && (
            <div style={{ fontSize: 12, color: '#6B6B5A', marginTop: 2 }}>
              {categoria.descrizione}
            </div>
          )}
        </div>
        {badge && (
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: badgeColor,
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            flexShrink: 0,
          }}>
            {badge}
          </span>
        )}
      </div>

      {showBoxes && (
        <div style={{ marginTop: 4 }}>
          <AssignmentBoxes
            totale={categoria.totale}
            abbattuti={categoria.abbattuti}
            tappable={isAdmin}
            onToggle={onToggle ? (i) => onToggle(categoria.id, i) : undefined}
          />
        </div>
      )}

      {categoria.totale === 0 && (
        <div style={{ fontSize: 12, color: '#6B6B5A', fontStyle: 'italic', marginTop: 2 }}>
          Nessun capo assegnato
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Aggiornare `src/components/AssignmentBoxes.tsx`**

```tsx
// src/components/AssignmentBoxes.tsx
interface Props {
  totale: number;
  abbattuti: number;
  tappable: boolean;
  onToggle?: (boxIndex: number) => void;
}

export function AssignmentBoxes({ totale, abbattuti, tappable, onToggle }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {Array.from({ length: totale }, (_, i) => {
        const filled = i < abbattuti;
        return (
          <div
            key={i}
            onClick={tappable && onToggle ? () => onToggle(i) : undefined}
            style={{
              width: 24,
              height: 24,
              border: `1.5px solid ${filled ? '#8B1A1A' : '#5C6B3A'}`,
              borderRadius: 3,
              background: filled ? '#fff' : 'transparent',
              cursor: tappable ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all .12s',
            }}
          >
            {filled && (
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                <line x1="1" y1="1" x2="9" y2="9" stroke="#1A1A14" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="9" y1="1" x2="1" y2="9" stroke="#1A1A14" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Compilare**

```bash
npx tsc --noEmit 2>&1 | grep -i categoryrow
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CategoryRow.tsx src/components/AssignmentBoxes.tsx
git commit -m "feat: update CategoryRow with FINITI/SOSPESO/CHIUSO badge logic"
```

---

## Task 7: Schermata BachecaScreen (placeholder)

**Files:**
- Create: `src/components/BachecaScreen.tsx`

La Bacheca completa è Fase 2. Qui creiamo solo lo scheletro con l'header corretto e il logo riserva.

- [ ] **Step 1: Creare `src/components/BachecaScreen.tsx`**

```tsx
// src/components/BachecaScreen.tsx
import { RiserveLogo } from './RiserveLogo';
import { useAuth } from '../hooks/useAuth';

export function BachecaScreen() {
  const { isAdmin } = useAuth();

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 80px' }}>
      {/* Header Bacheca */}
      <div style={{
        background: '#D6DBCA',
        borderRadius: 18,
        padding: '14px 16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#5C6B3A',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontFamily: 'system-ui, sans-serif',
          }}>
            Riserva di Caccia di Tuenno
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#1A1A14',
            textTransform: 'uppercase',
          }}>
            Bacheca
          </div>
        </div>
        <RiserveLogo />
      </div>

      {/* Feed placeholder */}
      <div style={{
        textAlign: 'center',
        color: '#6B6B5A',
        fontSize: 14,
        fontStyle: 'italic',
        paddingTop: 40,
      }}>
        Nessun messaggio ancora.
      </div>

      {/* FAB + solo admin */}
      {isAdmin && (
        <button
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#5C6B3A',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(92,107,58,.4)',
            zIndex: 50,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BachecaScreen.tsx
git commit -m "feat: add BachecaScreen placeholder with RiserveLogo header"
```

---

## Task 8: Aggiornare AssegnazioniScreen con dati reali da Firebase

**Files:**
- Modify: `src/components/AssegnazioniScreen.tsx`

- [ ] **Step 1: Riscrivere `src/components/AssegnazioniScreen.tsx`**

```tsx
// src/components/AssegnazioniScreen.tsx
import { useState } from 'react';
import { useSpecies } from '../hooks/useSpecies';
import { useAuth } from '../hooks/useAuth';
import { CategoryRow } from './CategoryRow';
import { ZoneTabs } from './ZoneTabs';
import { NotesCard } from './NotesCard';
import { toggleAbbattimento, toggleAbbattimentoCamoscio } from '../lib/firestore';
import { SpecieCervoCapriolo, SpecieCamoscio, Categoria } from '../types';

interface Props {
  specieId: 'cervo' | 'capriolo' | 'camoscio';
  onRuota: () => void;
}

export function AssegnazioniScreen({ specieId, onRuota }: Props) {
  const { data, loading } = useSpecies(specieId);
  const { isAdmin } = useAuth();
  const [zonaAttiva, setZonaAttiva] = useState<'campa' | 'tovel'>('campa');

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B5A' }}>Caricamento...</div>;
  if (!data) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B1A1A' }}>Errore caricamento dati.</div>;

  const isCamoscio = specieId === 'camoscio';
  const cam = isCamoscio ? data as SpecieCamoscio : null;
  const std = !isCamoscio ? data as SpecieCervoCapriolo : null;

  const categories: Categoria[] = isCamoscio
    ? cam!.zone[zonaAttiva].categories
    : std!.categories;

  function handleToggle(catId: string, boxIndex: number) {
    if (!isAdmin) return;
    if (isCamoscio) {
      toggleAbbattimentoCamoscio(zonaAttiva, catId, categories, boxIndex);
    } else {
      toggleAbbattimento(specieId as 'cervo' | 'capriolo', catId, categories, boxIndex);
    }
  }

  const nomeSpecie = specieId.charAt(0).toUpperCase() + specieId.slice(1);
  const logoSrc = `/icons/${specieId}.png`;

  const updatedAt = data.updatedAt
    ? new Date(data.updatedAt as any).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 16px', display: 'flex', flexDirection: 'column' }}>
      {/* Header specie */}
      <div style={{
        background: '#ECEDE1',
        borderRadius: 18,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 14,
        position: 'relative',
      }}>
        <img
          src={logoSrc}
          alt={nomeSpecie}
          style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #5C6B3A', background: '#fff' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'system-ui' }}>
            Assegnazioni {data.anno}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.1 }}>
            {nomeSpecie}
          </div>
          {isAdmin && (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'system-ui', marginTop: 2 }}>
              ● Modalità Rettore
            </div>
          )}
        </div>
      </div>

      {/* Zone tabs (solo camoscio) */}
      {isCamoscio && (
        <ZoneTabs zonaAttiva={zonaAttiva} onChange={setZonaAttiva} />
      )}

      {/* Categorie */}
      {categories.map(cat => (
        <CategoryRow
          key={cat.id}
          categoria={cat}
          onToggle={isAdmin ? handleToggle : undefined}
        />
      ))}

      {/* Note card */}
      <NotesCard
        penalita={isCamoscio ? cam!.penalita : undefined}
        note={data.note}
        alert={data.alert}
        isAdmin={isAdmin}
        specieId={specieId}
      />

      {/* Timestamp */}
      {updatedAt && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#6B6B5A', fontStyle: 'italic', padding: '4px 0 8px' }}>
          Ultimo aggiornamento: {updatedAt}
        </div>
      )}

      {/* Pulsante Ruota */}
      <button
        onClick={onRuota}
        style={{
          width: '100%',
          padding: 14,
          background: '#5C6B3A',
          color: '#EDEEE6',
          border: 'none',
          borderRadius: 24,
          fontFamily: 'EB Garamond, serif',
          fontSize: 15,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 4,
        }}
      >
        Ruote e Squadre
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Compilare**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AssegnazioniScreen.tsx
git commit -m "feat: wire AssegnazioniScreen to Firebase real-time data"
```

---

## Task 9: Aggiornare App.tsx — rimuovere BottomNav, aggiungere BachecaScreen

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Aggiornare le import e la struttura di `src/App.tsx`**

Trovare il blocco che definisce le schermate e sostituire con:

```tsx
// src/App.tsx — struttura principale
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { BachecaScreen } from './components/BachecaScreen';
import { AssegnazioniScreen } from './components/AssegnazioniScreen';
import { RuotaView } from './components/RuotaView';

const SCHERMATE = ['bacheca', 'capriolo', 'cervo', 'camoscio'] as const;
type Schermata = typeof SCHERMATE[number];

export default function App() {
  const [current, setCurrent] = useState<number>(0);
  const [ruotaSpecie, setRuotaSpecie] = useState<'cervo' | 'capriolo' | 'camoscio' | null>(null);

  return (
    <AuthProvider>
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        height: '100dvh',
        background: '#EDEEE6',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Dots navigazione */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, padding: '8px 0', background: '#EDEEE6', flexShrink: 0 }}>
          {SCHERMATE.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 20 : 7,
                height: 7,
                borderRadius: i === current ? 4 : '50%',
                background: i === current ? '#5C6B3A' : '#d0d5c4',
                cursor: 'pointer',
                transition: 'all .2s',
              }}
            />
          ))}
        </div>

        {/* Schermate — swipe con Framer Motion */}
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50 && current < SCHERMATE.length - 1) setCurrent(c => c + 1);
            if (info.offset.x > 50 && current > 0) setCurrent(c => c - 1);
          }}
        >
          {current === 0 && <BachecaScreen />}
          {current === 1 && <AssegnazioniScreen specieId="capriolo" onRuota={() => setRuotaSpecie('capriolo')} />}
          {current === 2 && <AssegnazioniScreen specieId="cervo" onRuota={() => setRuotaSpecie('cervo')} />}
          {current === 3 && <AssegnazioniScreen specieId="camoscio" onRuota={() => setRuotaSpecie('camoscio')} />}
        </motion.div>

        {/* Overlay Ruota */}
        {ruotaSpecie && (
          <RuotaView specieId={ruotaSpecie} onClose={() => setRuotaSpecie(null)} />
        )}
      </div>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Avviare l'app e verificare visivamente**

```bash
npm run dev
```

Aprire `http://localhost:5173` e verificare:
- ✅ Dots in cima, swipe tra le 4 schermate
- ✅ Nessuna bottom nav
- ✅ BachecaScreen con logo riserva
- ✅ AssegnazioniScreen con dati Firebase (dopo seed)
- ✅ Long press 3s sul logo → apre Google Sign-In

- [ ] **Step 3: Compilare**

```bash
npx tsc --noEmit
npm run build
```

Build deve completare senza errori.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: remove BottomNav, add swipe-only navigation with BachecaScreen"
```

---

## Task 10: RuotaView semplificata (solo immagine)

**Files:**
- Modify: `src/components/RuotaView.tsx`

- [ ] **Step 1: Riscrivere `src/components/RuotaView.tsx`**

```tsx
// src/components/RuotaView.tsx
import { useAuth } from '../hooks/useAuth';

interface Props {
  specieId: 'cervo' | 'capriolo' | 'camoscio';
  onClose: () => void;
}

const NOMI: Record<string, string> = {
  cervo: 'Cervo',
  capriolo: 'Capriolo',
  camoscio: 'Camoscio',
};

export function RuotaView({ specieId, onClose }: Props) {
  const { isAdmin } = useAuth();

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#EDEEE6',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 8px' }}>
        <button
          onClick={onClose}
          style={{
            width: 38, height: 38,
            background: '#D6DBCA',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A14', textTransform: 'uppercase', letterSpacing: '.03em' }}>
          Ruote e Squadre — {NOMI[specieId]}
        </div>
      </div>

      {/* Immagine ruota */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        {/* TODO Fase 3: caricare immagine da /ruote/{specieId} in Firestore */}
        <div style={{
          width: '100%',
          aspectRatio: '3/4',
          background: '#fff',
          border: '1px solid #d0d5c4',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B6B5A',
          fontSize: 14,
          fontStyle: 'italic',
        }}>
          Nessuna ruota disponibile.
        </div>
      </div>

      {/* Upload solo admin — TODO Fase 3 */}
      {isAdmin && (
        <div style={{ padding: '0 16px 24px' }}>
          <button
            style={{
              width: '100%',
              padding: 14,
              background: 'transparent',
              border: '1.5px dashed #d0d5c4',
              borderRadius: 12,
              color: '#6B6B5A',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'system-ui',
            }}
          >
            + Carica immagine ruota
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compilare e verificare**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RuotaView.tsx
git commit -m "feat: simplify RuotaView to image-only overlay"
```

---

## Task 11: Build finale e verifica

- [ ] **Step 1: Build produzione**

```bash
npm run build
```

Output atteso: build completata in `dist/`, 0 errori TypeScript.

- [ ] **Step 2: Preview build**

```bash
npm run preview
```

Aprire `http://localhost:4173` e verificare manualmente:
- ✅ App si apre sulla Bacheca
- ✅ Swipe porta a Capriolo → Cervo → Camoscio
- ✅ Dots mostrano la posizione corretta
- ✅ Nessuna bottom nav
- ✅ Long press 3s sul logo riserva → Google Sign-In
- ✅ Dopo login: dot verde, badge "Modalità Rettore", quadratini tappabili
- ✅ Badge FINITI (automatico), SOSPESO (arancione), CHIUSO (rosso)
- ✅ Cacciatore: nessun quadratino su categorie con badge
- ✅ Pulsante Ruote e Squadre apre overlay
- ✅ Freccia indietro chiude overlay

- [ ] **Step 3: Commit finale Fase 1**

```bash
git add -A
git commit -m "feat: complete Phase 1 — core UI + Firebase real-time"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Swipe navigation + dots (Task 9)
- ✅ No bottom nav (Task 9)
- ✅ Long press logo riserva → admin login (Task 5)
- ✅ Badge FINITI/FINITE automatico (Task 6 — `getBadge()`)
- ✅ Badge SOSPESO arancione (Task 1 + 6)
- ✅ Badge CHIUSO rosso (Task 1 + 6)
- ✅ Cacciatore: no quadratini con badge (Task 6)
- ✅ Rettore: sempre quadratini (Task 6)
- ✅ Firebase real-time onSnapshot (Task 3)
- ✅ updateDoc (non persistData) (Task 2)
- ✅ Firestore `/species/{id}` (Task 2 + 4)
- ✅ Camoscio zone campa/tovel (Task 8)
- ✅ Ruota overlay semplificata (Task 10)
- ✅ logo_tuenno.png in public/ (Task 5)
- ⏭️ Bacheca feed completa → Fase 2
- ⏭️ Ruota immagine reale → Fase 3
- ⏭️ Notifiche → Fase 4
- ⏭️ Impostazioni stagione → Fase 5
- ⏭️ GPS/mappa → Fase 6
