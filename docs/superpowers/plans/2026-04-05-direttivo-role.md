# Ruolo Direttivo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere il ruolo "direttivo" che permette a 5 soci di pubblicare post sulla bacheca senza accesso admin.

**Architecture:** Il campo `direttivo: string[]` viene aggiunto a `config/members` (già esistente). App.tsx calcola `isModerator` dal nome dell'utente e lo passa a BachecaScreen e SettingsScreen. BachecaScreen mostra il form di pubblicazione se `isAdmin || isModerator`.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, Tailwind CSS

---

## File Map

| File | Modifica |
|------|---------|
| `src/types/index.ts` | Aggiunge `direttivo: string[]` a `Members` |
| `src/App.tsx` | Calcola `isModerator`, passa a BachecaScreen e SettingsScreen |
| `src/components/BachecaScreen.tsx` | Accetta `isModerator` prop, mostra form se `isAdmin || isModerator` |
| `src/components/SettingsScreen.tsx` | Sezione "Direttivo" con add/remove nomi |

---

### Task 1: Tipo + isModerator in App.tsx

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Aggiorna `Members` in `src/types/index.ts`**

Sostituisci:
```ts
export interface Members {
  nomi: string[];
}
```
Con:
```ts
export interface Members {
  nomi: string[];
  direttivo: string[];
}
```

- [ ] **Step 2: Calcola `isModerator` in `src/App.tsx`**

In `MainApp`, dopo `const { isAdmin } = useAuth();`, aggiungi:

```ts
const isModerator = !isAdmin && (members?.direttivo ?? []).some(
  n => normalizeName(n) === normalizeName(hunterName)
);
```

- [ ] **Step 3: Passa `isModerator` a BachecaScreen**

Trova il render di `<BachecaScreen` e aggiungi la prop:

```tsx
<BachecaScreen
  posts={posts}
  hunterName={hunterName}
  isModerator={isModerator}
  onAddPost={handleAddPost}
  onDeletePost={handleDeletePost}
  onMarkRead={handleMarkRead}
  onOpenSettings={() => setShowSettings(true)}
  onOpenMappa={() => setShowMappa(true)}
/>
```

- [ ] **Step 4: Aggiungi handlers direttivo in App.tsx**

Dopo `handleReleaseSlot`, aggiungi:

```ts
const handleAddDirettivo = async (nome: string) => {
  try {
    await updateDoc(doc(db, 'config', 'members'), { direttivo: arrayUnion(nome) });
  } catch (e) { console.error(e); }
};

const handleRemoveDirettivo = async (nome: string) => {
  try {
    await updateDoc(doc(db, 'config', 'members'), { direttivo: arrayRemove(nome) });
  } catch (e) { console.error(e); }
};
```

- [ ] **Step 5: Passa handlers a SettingsScreen**

```tsx
<SettingsScreen
  data={data}
  members={members ?? { nomi: [], direttivo: [] }}
  slots={slots ?? {}}
  onClose={() => setShowSettings(false)}
  onSave={handleSaveSettings}
  onNewSeason={handleNewSeason}
  onAddMember={handleAddMember}
  onRemoveMember={handleRemoveMember}
  onReleaseSlot={handleReleaseSlot}
  onAddDirettivo={handleAddDirettivo}
  onRemoveDirettivo={handleRemoveDirettivo}
/>
```

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
git add src/types/index.ts src/App.tsx
git commit -m "feat: add isModerator role derived from config/members.direttivo"
```

---

### Task 2: BachecaScreen — form visibile al direttivo

**Files:**
- Modify: `src/components/BachecaScreen.tsx`

- [ ] **Step 1: Aggiungi `isModerator` alle props**

Sostituisci l'interfaccia esistente:

```ts
interface BachecaScreenProps {
  posts: Post[];
  hunterName: string;
  isModerator: boolean;
  onAddPost: (tipo: Post['tipo'], testo: string, foto_url?: string | null) => void;
  onDeletePost: (id: string) => void;
  onMarkRead: (postIds: string[]) => void;
  onOpenSettings: () => void;
  onOpenMappa: () => void;
}
```

Aggiorna la firma della funzione:

```ts
export const BachecaScreen = ({ posts, hunterName, isModerator, onAddPost, onDeletePost, onMarkRead, onOpenSettings, onOpenMappa }: BachecaScreenProps) => {
```

- [ ] **Step 2: Mostra il form anche al direttivo**

Riga 210 — sostituisci:
```tsx
{isAdmin && showForm && (
```
Con:
```tsx
{(isAdmin || isModerator) && showForm && (
```

Riga 363 — sostituisci:
```tsx
{isAdmin && !showForm && (
```
Con:
```tsx
{(isAdmin || isModerator) && !showForm && (
```

- [ ] **Step 3: Mostra badge "Modalità Direttivo" nell'header per i moderatori**

Subito dopo il blocco `{isAdmin && (` che mostra "Modalità Rettore" (riga 182), aggiungi:

```tsx
{isModerator && (
  <span style={{ fontSize: 10, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: '-apple-system, sans-serif' }}>
    Direttivo
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
git add src/components/BachecaScreen.tsx
git commit -m "feat: show post form to direttivo members in BachecaScreen"
```

---

### Task 3: SettingsScreen — sezione Direttivo

**Files:**
- Modify: `src/components/SettingsScreen.tsx`

- [ ] **Step 1: Aggiorna props SettingsScreen**

Sostituisci l'interfaccia esistente:

```ts
interface SettingsScreenProps {
  data: AppData;
  members: Members;
  slots: Slots;
  onClose: () => void;
  onSave: (updates: AppData) => void;
  onNewSeason: () => void;
  onAddMember: (nome: string) => void;
  onRemoveMember: (nome: string) => void;
  onReleaseSlot: (normalizedName: string) => void;
  onAddDirettivo: (nome: string) => void;
  onRemoveDirettivo: (nome: string) => void;
}
```

Aggiorna la firma della funzione:

```ts
export const SettingsScreen = ({
  data, members, slots, onClose, onSave, onNewSeason,
  onAddMember, onRemoveMember, onReleaseSlot,
  onAddDirettivo, onRemoveDirettivo,
}: SettingsScreenProps) => {
```

- [ ] **Step 2: Aggiungi stato per nuovo membro direttivo**

Dopo `const [newMember, setNewMember] = useState('');`:

```ts
const [newDirettivo, setNewDirettivo] = useState('');
```

- [ ] **Step 3: Aggiungi sezione Direttivo nel JSX**

Inserisci questo blocco **dopo** la sezione Soci e **prima** di "Salva impostazioni":

```tsx
{/* Direttivo */}
<div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d0d5c4', overflow: 'hidden' }}>
  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0ec' }}>
    <p style={{ fontSize: 12, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, sans-serif' }}>
      Direttivo ({members.direttivo.length})
    </p>
  </div>

  {/* Campo aggiungi */}
  <div style={{
    padding: '12px 16px',
    borderBottom: members.direttivo.length > 0 ? '1px solid #f0f0ec' : 'none',
    display: 'flex', gap: 8,
  }}>
    <input
      type="text"
      value={newDirettivo}
      onChange={e => setNewDirettivo(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && newDirettivo.trim()) {
          onAddDirettivo(newDirettivo.trim());
          setNewDirettivo('');
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
      onClick={() => { if (newDirettivo.trim()) { onAddDirettivo(newDirettivo.trim()); setNewDirettivo(''); } }}
      disabled={!newDirettivo.trim()}
      style={{
        padding: '9px 16px', borderRadius: 6, border: 'none',
        background: newDirettivo.trim() ? '#5C6B3A' : '#d0d5c4',
        color: '#EDEEE6', fontFamily: 'inherit', fontSize: 18, fontWeight: 700,
        cursor: newDirettivo.trim() ? 'pointer' : 'default',
      }}
    >
      +
    </button>
  </div>

  {/* Lista direttivo */}
  {members.direttivo.length === 0 && (
    <div style={{ padding: '14px 16px' }}>
      <p style={{ fontSize: 14, color: '#9B9B8A', fontStyle: 'italic', fontFamily: '-apple-system, sans-serif' }}>
        Nessun membro direttivo
      </p>
    </div>
  )}
  {members.direttivo.map((nome, i) => (
    <div
      key={nome}
      style={{
        padding: '12px 16px',
        borderBottom: i < members.direttivo.length - 1 ? '1px solid #f0f0ec' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 15, color: '#1A1A14', fontFamily: '-apple-system, sans-serif' }}>{nome}</span>
      <button
        onClick={() => onRemoveDirettivo(nome)}
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

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
git add src/components/SettingsScreen.tsx
git commit -m "feat: add Direttivo management section to SettingsScreen"
```

---

### Task 4: Seed direttivo + build + deploy

**Files:** nessuno

- [ ] **Step 1: Verifica TypeScript**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npx tsc --noEmit 2>&1 | grep -v "ImportMeta\|key.*exist\|letti"
```

Expected: nessun nuovo errore legato alle modifiche

- [ ] **Step 2: Aggiorna `config/members` in Firestore con il campo direttivo**

Apri Firebase Console → Firestore → `config/members` → modifica documento → aggiungi campo:

```
direttivo: ["Bruni Michele", "Bergamo Nicola", "Martini Mattia", "Dallago Bruno", "Quaresima Rudi"]
```

(tipo: array)

- [ ] **Step 3: Build**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npm run build
```

Expected: `✓ built in` — nessun errore

- [ ] **Step 4: Deploy**

```bash
cd "C:/Users/mathi/Desktop/riservapp_v2"
npx firebase deploy --only hosting
```

Expected: `Deploy complete!` → https://riservatuenno.web.app
