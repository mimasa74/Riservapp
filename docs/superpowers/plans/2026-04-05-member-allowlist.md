# Member Allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Solo i cacciatori nella lista Firestore possono accedere all'app; "Ospite" ha uno slot unico; l'admin gestisce la lista da SettingsScreen.

**Architecture:** Due documenti Firestore separati: `config/members` (lista nomi, write solo admin) e `config/ospite` (slot ospite con device_id, write pubblico). App.tsx si iscrive a entrambi via onSnapshot, re-valida il nome già salvato in localStorage al primo caricamento, e passa i dati a HunterNameModal (validazione) e SettingsScreen (gestione lista).

**Tech Stack:** React 19 + TypeScript, Firebase Firestore, localStorage

---

## File Map

| File | Cosa cambia |
|------|-------------|
| `src/types/index.ts` | Aggiunge `Members` e `OspiteData` |
| `firestore.rules` | Aggiunge regole per `config/members` e `config/ospite` |
| `src/App.tsx` | Subscribe a members/ospite, re-validazione, handlers, passa props |
| `src/components/HunterNameModal.tsx` | Validazione nome + errori inline |
| `src/components/SettingsScreen.tsx` | Sezione Soci (aggiungi/rimuovi/libera ospite) |

---

### Task 1: Tipi e regole Firestore

**Files:**
- Modify: `src/types/index.ts`
- Modify: `firestore.rules`

- [ ] **Step 1: Aggiungi i tipi in `src/types/index.ts`**

Aggiungi in fondo al file:

```ts
export interface Members {
  nomi: string[];
}

export interface OspiteData {
  device_id: string | null;
}
```

- [ ] **Step 2: Aggiorna `firestore.rules`**

Aggiungi dopo il blocco `geofences`, prima della chiusura `}`:

```
// config/members: lista soci — lettura pubblica, scrittura solo admin
match /config/members {
  allow read: if true;
  allow write: if isAdmin();
}

// config/ospite: slot ospite — lettura e scrittura pubblica
// (qualsiasi dispositivo può reclamare o rilasciare lo slot)
match /config/ospite {
  allow read: if true;
  allow write: if true;
}
```

- [ ] **Step 3: Deploy regole Firestore**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npx firebase deploy --only firestore:rules
```

Expected: `Deploy complete!`

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
git add src/types/index.ts firestore.rules
git commit -m "feat: add Members/OspiteData types and Firestore rules for member allowlist"
```

---

### Task 2: Subscribe a members/ospite in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Aggiungi import tipi e funzione normalize**

In cima a `src/App.tsx`, aggiungi dopo gli import esistenti di firebase:

```ts
import { Members, OspiteData } from './types';
```

Aggiungi `arrayUnion, arrayRemove` agli import firebase già presenti:

```ts
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy, addDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
```

- [ ] **Step 2: Aggiungi la funzione normalizeName prima di `MainApp`**

```ts
function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}
```

- [ ] **Step 3: Aggiungi stato per members e ospite in `MainApp`**

Dopo `const [onboardingDone, setOnboardingDone] = useState...`:

```ts
const [members, setMembers] = useState<Members | null>(null);
const [ospite, setOspite] = useState<OspiteData | null>(null);
const membersValidated = React.useRef(false);
```

- [ ] **Step 4: Aggiungi useEffect per subscribe a `config/members`**

Dopo l'useEffect dei posts:

```ts
useEffect(() => {
  const docRef = doc(db, 'config', 'members');
  return onSnapshot(docRef, snapshot => {
    if (snapshot.exists()) {
      setMembers(snapshot.data() as Members);
    } else {
      setDoc(docRef, { nomi: [] }).catch(console.error);
      setMembers({ nomi: [] });
    }
  });
}, []);
```

- [ ] **Step 5: Aggiungi useEffect per subscribe a `config/ospite`**

```ts
useEffect(() => {
  const docRef = doc(db, 'config', 'ospite');
  return onSnapshot(docRef, snapshot => {
    if (snapshot.exists()) {
      setOspite(snapshot.data() as OspiteData);
    } else {
      setDoc(docRef, { device_id: null }).catch(console.error);
      setOspite({ device_id: null });
    }
  });
}, []);
```

- [ ] **Step 6: Aggiungi useEffect per re-validare il nome esistente**

```ts
useEffect(() => {
  if (!members || !ospite || membersValidated.current || isAdmin) return;
  membersValidated.current = true;
  if (!hunterName) return;

  const norm = normalizeName(hunterName);
  const isOspite = norm === 'ospite';
  const isAllowed = isOspite
    ? ospite.device_id === deviceId
    : members.nomi.some(n => normalizeName(n) === norm);

  if (!isAllowed) {
    localStorage.removeItem('riservapp_nome');
    setHunterName('');
  }
}, [members, ospite]);
```

- [ ] **Step 7: Aggiungi handlers per gestione soci**

Dopo `handleSetName`:

```ts
const handleAddMember = async (nome: string) => {
  try {
    await updateDoc(doc(db, 'config', 'members'), { nomi: arrayUnion(nome) });
  } catch (e) { console.error(e); }
};

const handleRemoveMember = async (nome: string) => {
  try {
    await updateDoc(doc(db, 'config', 'members'), { nomi: arrayRemove(nome) });
  } catch (e) { console.error(e); }
};

const handleReleaseOspite = async () => {
  try {
    await updateDoc(doc(db, 'config', 'ospite'), { device_id: null });
  } catch (e) { console.error(e); }
};
```

- [ ] **Step 8: Aggiorna la condizione di rendering**

Sostituisci:

```ts
if (!hunterName && !isAdmin) {
  return <HunterNameModal onConfirm={handleSetName} />;
}
```

Con:

```ts
// Aspetta che members e ospite siano caricati prima di mostrare il modal
if (!isAdmin && (members === null || ospite === null)) {
  return <div style={{ background: '#EDEEE6', height: '100dvh' }} />;
}

if (!hunterName && !isAdmin) {
  return (
    <HunterNameModal
      members={members!}
      ospite={ospite!}
      deviceId={deviceId}
      onConfirm={handleSetName}
    />
  );
}
```

- [ ] **Step 9: Aggiorna il passaggio di props a SettingsScreen**

Sostituisci il `<SettingsScreen .../>` esistente con:

```tsx
<SettingsScreen
  data={data}
  members={members ?? { nomi: [] }}
  ospite={ospite ?? { device_id: null }}
  onClose={() => setShowSettings(false)}
  onSave={handleSaveSettings}
  onNewSeason={handleNewSeason}
  onAddMember={handleAddMember}
  onRemoveMember={handleRemoveMember}
  onReleaseOspite={handleReleaseOspite}
/>
```

- [ ] **Step 10: Commit**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
git add src/App.tsx
git commit -m "feat: subscribe to members/ospite, re-validate name on load, add member handlers"
```

---

### Task 3: Aggiorna HunterNameModal

**Files:**
- Modify: `src/components/HunterNameModal.tsx`

- [ ] **Step 1: Riscrivi il componente con validazione**

Sostituisci l'intero contenuto di `src/components/HunterNameModal.tsx` con:

```tsx
import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Members, OspiteData } from '../types';

interface HunterNameModalProps {
  members: Members;
  ospite: OspiteData;
  deviceId: string;
  onConfirm: (nome: string) => void;
}

function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}

export const HunterNameModal = ({ members, ospite, deviceId, onConfirm }: HunterNameModalProps) => {
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const trimmed = nome.trim();
    if (!trimmed || loading) return;
    setError('');

    const norm = normalizeName(trimmed);

    if (norm === 'ospite') {
      // Controlla slot ospite
      if (ospite.device_id !== null && ospite.device_id !== deviceId) {
        setError('Accesso ospite già occupato.');
        return;
      }
      setLoading(true);
      try {
        await updateDoc(doc(db, 'config', 'ospite'), { device_id: deviceId });
        onConfirm('Ospite');
      } catch {
        setError('Errore di connessione. Riprova.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Controlla lista soci
    const match = members.nomi.find(n => normalizeName(n) === norm);
    if (!match) {
      setError('Nome non riconosciuto. Contatta il Rettore.');
      return;
    }
    onConfirm(match);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{
        background: '#EDEEE6', borderRadius: 16,
        padding: '28px 24px', width: '100%', maxWidth: 360,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '-apple-system, sans-serif', marginBottom: 6 }}>
          Riserva Val di Tovel
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 6 }}>
          Benvenuto
        </p>
        <p style={{ fontSize: 14, color: '#6B6B5A', lineHeight: 1.5, marginBottom: 20 }}>
          Inserisci il tuo nome per accedere. Viene chiesto una sola volta.
        </p>

        <input
          type="text"
          value={nome}
          onChange={e => { setNome(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="Nome e Cognome"
          autoFocus
          style={{
            width: '100%', padding: '13px 14px',
            fontSize: 16, fontFamily: 'inherit',
            color: '#1A1A14', background: '#fff',
            border: `1.5px solid ${error ? '#8B1A1A' : '#d0d5c4'}`, borderRadius: 8,
            outline: 'none', marginBottom: error ? 8 : 14,
          }}
        />

        {error && (
          <p style={{
            fontSize: 13, color: '#8B1A1A', fontFamily: '-apple-system, sans-serif',
            marginBottom: 14, lineHeight: 1.4,
          }}>
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!nome.trim() || loading}
          style={{
            width: '100%', padding: '14px',
            background: nome.trim() && !loading ? '#5C6B3A' : '#d0d5c4',
            color: nome.trim() && !loading ? '#EDEEE6' : '#fff',
            border: 'none', borderRadius: 24,
            fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: nome.trim() && !loading ? 'pointer' : 'default',
          }}
        >
          {loading ? 'Accesso...' : 'Entra'}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verifica TypeScript**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npx tsc --noEmit
```

Expected: nessun errore

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
git add src/components/HunterNameModal.tsx
git commit -m "feat: validate hunter name against Firestore members list, handle Ospite slot"
```

---

### Task 4: Sezione Soci in SettingsScreen

**Files:**
- Modify: `src/components/SettingsScreen.tsx`

- [ ] **Step 1: Aggiorna le props di SettingsScreen**

Sostituisci l'interfaccia esistente:

```ts
import { AppData, CategoriaStato, Members, OspiteData } from '../types';

interface SettingsScreenProps {
  data: AppData;
  members: Members;
  ospite: OspiteData;
  onClose: () => void;
  onSave: (updates: AppData) => void;
  onNewSeason: () => void;
  onAddMember: (nome: string) => void;
  onRemoveMember: (nome: string) => void;
  onReleaseOspite: () => void;
}
```

Aggiorna la firma della funzione:

```ts
export const SettingsScreen = ({
  data, members, ospite, onClose, onSave, onNewSeason,
  onAddMember, onRemoveMember, onReleaseOspite,
}: SettingsScreenProps) => {
```

- [ ] **Step 2: Aggiungi stato per il nuovo membro**

Dopo `const [confirmNewSeason, setConfirmNewSeason] = useState(false);`:

```ts
const [newMember, setNewMember] = useState('');
```

- [ ] **Step 3: Aggiungi la sezione Soci nel JSX**

Inserisci questo blocco **dopo** il blocco Categorie e **prima** del pulsante "Salva impostazioni":

```tsx
{/* Soci */}
<div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d0d5c4', overflow: 'hidden' }}>
  <div style={{
    padding: '12px 16px', borderBottom: '1px solid #f0f0ec',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    <p style={{ fontSize: 12, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, sans-serif' }}>
      Soci ({members.nomi.length})
    </p>
    {ospite.device_id && (
      <button
        onClick={onReleaseOspite}
        style={{
          fontSize: 11, fontWeight: 700, color: '#8B1A1A',
          background: 'transparent', border: '1px solid #8B1A1A',
          borderRadius: 12, padding: '4px 10px', cursor: 'pointer',
          fontFamily: '-apple-system, sans-serif', textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Libera ospite
      </button>
    )}
  </div>

  {/* Campo aggiungi */}
  <div style={{
    padding: '12px 16px',
    borderBottom: members.nomi.length > 0 ? '1px solid #f0f0ec' : 'none',
    display: 'flex', gap: 8,
  }}>
    <input
      type="text"
      value={newMember}
      onChange={e => setNewMember(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && newMember.trim()) {
          onAddMember(newMember.trim());
          setNewMember('');
        }
      }}
      placeholder="Nome e Cognome"
      style={{
        flex: 1, padding: '9px 12px', borderRadius: 6,
        border: '1.5px solid #d0d5c4', fontFamily: 'inherit',
        fontSize: 15, color: '#1A1A14', outline: 'none', background: '#FAFAF8',
      }}
    />
    <button
      onClick={() => { if (newMember.trim()) { onAddMember(newMember.trim()); setNewMember(''); } }}
      disabled={!newMember.trim()}
      style={{
        padding: '9px 16px', borderRadius: 6, border: 'none',
        background: newMember.trim() ? '#5C6B3A' : '#d0d5c4',
        color: '#EDEEE6', fontFamily: 'inherit', fontSize: 18, fontWeight: 700,
        cursor: newMember.trim() ? 'pointer' : 'default',
      }}
    >
      +
    </button>
  </div>

  {/* Lista soci */}
  {members.nomi.length === 0 && (
    <div style={{ padding: '14px 16px' }}>
      <p style={{ fontSize: 14, color: '#9B9B8A', fontStyle: 'italic', fontFamily: '-apple-system, sans-serif' }}>
        Nessun socio aggiunto
      </p>
    </div>
  )}
  {members.nomi.map((nome, i) => (
    <div
      key={nome}
      style={{
        padding: '12px 16px',
        borderBottom: i < members.nomi.length - 1 ? '1px solid #f0f0ec' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 15, color: '#1A1A14', fontFamily: '-apple-system, sans-serif' }}>{nome}</span>
      <button
        onClick={() => onRemoveMember(nome)}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '1px solid #d0d5c4', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#8B1A1A', fontSize: 18, lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npx tsc --noEmit
```

Expected: nessun errore

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
git add src/components/SettingsScreen.tsx
git commit -m "feat: add Soci section to SettingsScreen with add/remove members and release guest slot"
```

---

### Task 5: Test locale e deploy

**Files:** nessun file nuovo

- [ ] **Step 1: Avvia il dev server**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npx tsx server.ts
```

- [ ] **Step 2: Verifica flusso nuovo utente**

Apri http://localhost:3000 in incognito:
- Completa onboarding
- Scrivi un nome non nella lista → deve apparire "Nome non riconosciuto. Contatta il Rettore."
- Scrivi "Ospite" → deve entrare (slot libero)
- Apri secondo incognito, scrivi "Ospite" → deve apparire "Accesso ospite già occupato."

- [ ] **Step 3: Verifica admin**

Long press sul logo → accedi come Michele → vai in Impostazioni → sezione Soci visibile → aggiungi un nome → esci → nuovo incognito → scrivi il nome appena aggiunto → deve entrare

- [ ] **Step 4: Verifica "Libera ospite"**

Da admin in Impostazioni → sezione Soci → se ospite occupato appare "Libera ospite" → cliccalo → il secondo incognito ricarica e può entrare di nuovo come Ospite

- [ ] **Step 5: Build**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npm run build
```

Expected: `dist/` aggiornata, nessun errore TypeScript

- [ ] **Step 6: Deploy**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npx firebase deploy --only hosting
```

Expected: `Deploy complete!` → https://riservatuenno.web.app aggiornato
