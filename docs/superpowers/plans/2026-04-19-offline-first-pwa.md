# Offline-First PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RiservApp v2 deve funzionare full-offline in zone di montagna: letture (bacheca, foto, PDF, ruote, config) servite da Firestore IndexedDB + Cache API, scritture bloccate con alert italiano, banner rosso con `lastSyncAt`.

**Architecture:** Tre livelli di cache in ordine di intercettazione: (1) React+useOnlineStatus per UX, (2) Firestore SDK v12 con `persistentLocalCache` (già attivo) per dati, (3) Service Worker unico (`firebase-messaging-sw.js`) con Workbox iniettato via `importScripts` per app shell + foto + PDF. Un solo SW per evitare la regressione FCM di aprile 2026.

**Tech Stack:** React 19, TypeScript, Vite 6, Firebase 12.10.0 (Firestore + Auth + Storage + Messaging), Workbox 7 via CDN, Vitest + jsdom, Tailwind v4.

**Stato iniziale pre-plan:**
- ✅ `src/firebase.ts` già usa `initializeFirestore` + `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`
- ✅ `src/App.tsx` ha già `isOffline` state con event listeners `online`/`offline`
- ✅ `src/components/PostCard.tsx` è già `React.memo` con comparatore esplicito + `loading="lazy"`
- ✅ Anonymous Auth + Firestore rules `require auth` deployate (Fase 1 sicurezza, 2026-04-19)
- ❌ Nessun `OfflineBanner`, nessun `lastSyncAt`, nessun `useOnlineStatus` hook estratto
- ❌ `PhotoPlaceholder` assente, `Post.foto_width/foto_height` mancanti
- ❌ `BachecaScreen` / `SettingsScreen` senza guardie scritture offline
- ❌ `reconcilePhotoCache` + pre-fetch assenti
- ⚠️ `vite.config.ts` usa ancora `VitePWA` da `vite-plugin-pwa`; spec prevede rimozione e sostituzione con `workbox injectManifest` manuale in `public/firebase-messaging-sw.js` (Task 9)

---

## File Structure

**Nuovi file:**
- `src/hooks/useOnlineStatus.ts` — hook con `{ online, lastSyncAt }` e listener evento custom `lastSyncAt`
- `src/hooks/useOnlineStatus.test.ts` — unit test Vitest
- `src/components/OfflineBanner.tsx` — banner rosso animato con format IT del timestamp
- `src/components/OfflineBanner.test.tsx` — unit test render
- `src/components/PhotoPlaceholder.tsx` — placeholder foto non disponibile con aspect-ratio
- `src/utils/reconcilePhotoCache.ts` — `collectValidUrls` + `reconcilePhotoCache` (funzioni pure)
- `src/utils/reconcilePhotoCache.test.ts` — unit test con mock Cache
- `workbox-config.js` — config `workbox injectManifest`

**File modificati:**
- `src/types/index.ts` — aggiungere `foto_width?`, `foto_height?` a `Post`
- `src/App.tsx` — montare `<OfflineBanner/>`, dispatch `lastSyncAt` in onSnapshot quando `fromCache===false`, guardie scritture, cache cleanup in delete, pre-fetch + reconcile gated
- `src/components/BachecaScreen.tsx` — estrarre dimensioni foto prima dell'upload, guardie offline upload/PDF
- `src/components/PostCard.tsx` — `<img onError>` → `<PhotoPlaceholder/>`, aspect-ratio da `foto_width/height`
- `src/components/SettingsScreen.tsx` — stato `disabled` + `opacity 0.5` sui bottoni Firestore quando offline
- `public/firebase-messaging-sw.js` — `importScripts` Workbox + `clientsClaim()` + `precacheAndRoute(self.__WB_MANIFEST)` + `registerRoute` CacheFirst per `firebasestorage.googleapis.com`
- `vite.config.ts` — rimuovere plugin `VitePWA` (viene rimpiazzato dal SW manuale)
- `package.json` — aggiungere devDep `workbox-cli`, `workbox-build`; nuovi scripts `build:vite`, `build:sw`, `build`; rimuovere `vite-plugin-pwa` dopo verifica Task 9

**File NON modificati (esplicito):** `Header`, `BottomNav`, `AssegnazioniScreen`, `RuotaView`, `MappaScreen`, `OnboardingScreen`, `HunterNameModal`, `useFCM`, `useGeolocation`, `AuthContext`, `firestore.rules`.

---

## Conventions

- **Codice:** inline styles con px espliciti (font EB Garamond + Tailwind danno layout imprevedibili — vedi `memory/feedback_riservapp.md`). Stringhe utente in italiano.
- **Commit:** uno per ogni task. Formato: `feat(offline): <titolo task>` oppure `fix(offline):` / `chore(offline):`. Push NON richiesto dall'agente — solo commit locali. L'utente gestirà il deploy finale.
- **Test:** TDD dove ha senso (funzioni pure + hook + render componenti). SW e integrazioni = QA manuale (Chrome DevTools → Offline).
- **Comandi dev:** `npm run dev` → `http://localhost:3000`. Kill server Windows: `taskkill //F //PID <pid>` (bash/MINGW). Lint: `npm run lint`. Test: `npx vitest run`.

---

### Task 1: `useOnlineStatus` hook con `lastSyncAt`

**Files:**
- Create: `src/hooks/useOnlineStatus.ts`
- Create: `src/hooks/useOnlineStatus.test.ts`

- [ ] **Step 1: Scrivi il test fallito**

```ts
// src/hooks/useOnlineStatus.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  });

  it('restituisce online=true quando navigator.onLine è true', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.online).toBe(true);
  });

  it('reagisce all evento offline/online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.online).toBe(true);
  });

  it('legge lastSyncAt da localStorage al mount', () => {
    localStorage.setItem('lastSyncAt', '1700000000000');
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.lastSyncAt).toBe(1700000000000);
  });

  it('aggiorna lastSyncAt al dispatch evento lastSyncAt', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.lastSyncAt).toBe(null);

    act(() => {
      localStorage.setItem('lastSyncAt', '1800000000000');
      window.dispatchEvent(new Event('lastSyncAt'));
    });
    expect(result.current.lastSyncAt).toBe(1800000000000);
  });
});
```

- [ ] **Step 2: Installa `@testing-library/react` se mancante, esegui il test**

```bash
npm ls @testing-library/react 2>&1 | head -5
```

Se NON presente (`(empty)` o errore): `npm i -D @testing-library/react @testing-library/dom`.

Poi: `npx vitest run src/hooks/useOnlineStatus.test.ts`

Expected: FAIL — modulo `./useOnlineStatus` non trovato.

- [ ] **Step 3: Implementa il hook**

```ts
// src/hooks/useOnlineStatus.ts
import { useEffect, useState } from 'react';

function readLastSync(): number | null {
  const v = localStorage.getItem('lastSyncAt');
  return v ? Number(v) : null;
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(readLastSync);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    const onSync = () => setLastSyncAt(readLastSync());

    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    window.addEventListener('lastSyncAt', onSync);

    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      window.removeEventListener('lastSyncAt', onSync);
    };
  }, []);

  return { online, lastSyncAt };
}
```

- [ ] **Step 4: Esegui i test e verifica PASS**

Run: `npx vitest run src/hooks/useOnlineStatus.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useOnlineStatus.ts src/hooks/useOnlineStatus.test.ts package.json package-lock.json
git commit -m "feat(offline): add useOnlineStatus hook with lastSyncAt tracking"
```

---

### Task 2: `OfflineBanner` component

**Files:**
- Create: `src/components/OfflineBanner.tsx`
- Create: `src/components/OfflineBanner.test.tsx`

- [ ] **Step 1: Scrivi il test**

```tsx
// src/components/OfflineBanner.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
  });

  it('mostra "mai" se non c è lastSyncAt', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.textContent).toContain('Sei offline');
    expect(container.textContent).toContain('mai');
  });

  it('formatta lastSyncAt in italiano gg mese, hh:mm', () => {
    // 15 gennaio 2026 14:30 UTC — verifichiamo la presenza di indicatori it-IT
    localStorage.setItem('lastSyncAt', String(new Date('2026-01-15T14:30:00Z').getTime()));
    const { container } = render(<OfflineBanner />);
    // data formattata con Intl it-IT: deve contenere "gen" (gennaio abbreviato)
    expect(container.textContent?.toLowerCase()).toMatch(/gen/);
  });

  it('resta montato quando online (maxHeight 0)', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    render(<OfflineBanner />);
    const banner = screen.getByText(/Sei offline/i, { exact: false });
    expect(banner).toBeTruthy(); // DOM presente, CSS maxHeight 0 nasconde
  });
});
```

- [ ] **Step 2: Run test, verifica FAIL**

Run: `npx vitest run src/components/OfflineBanner.test.tsx`
Expected: FAIL — modulo non esiste.

- [ ] **Step 3: Implementa il componente**

```tsx
// src/components/OfflineBanner.tsx
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function formatLastSync(ts: number | null): string {
  if (!ts) return 'mai';
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(ts));
}

export function OfflineBanner() {
  const { online, lastSyncAt } = useOnlineStatus();
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: '#8B1A1A',
        color: '#fff',
        padding: online ? '0 16px' : '12px 16px',
        maxHeight: online ? 0 : 100,
        overflow: 'hidden',
        fontSize: 15,
        fontWeight: 600,
        textAlign: 'center',
        transition: 'max-height 0.3s ease-in-out, padding 0.3s ease-in-out',
      }}
    >
      Sei offline. Ultimo aggiornamento: {formatLastSync(lastSyncAt)}. Dati aggiornati disponibili quando torni online.
    </div>
  );
}
```

- [ ] **Step 4: Run test, verifica PASS**

Run: `npx vitest run src/components/OfflineBanner.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/OfflineBanner.tsx src/components/OfflineBanner.test.tsx
git commit -m "feat(offline): add OfflineBanner component with IT date format"
```

---

### Task 3: Montare OfflineBanner in App.tsx e dispatch `lastSyncAt`

**Files:**
- Modify: `src/App.tsx` (import + mount banner + dispatch event in onSnapshot posts/config/main)

- [ ] **Step 1: Aggiungi helper di update + import**

In cima a `src/App.tsx`, dopo gli import esistenti:

```tsx
import { OfflineBanner } from './components/OfflineBanner';

function markSynced() {
  localStorage.setItem('lastSyncAt', String(Date.now()));
  window.dispatchEvent(new Event('lastSyncAt'));
}
```

- [ ] **Step 2: Trigger `markSynced()` negli onSnapshot critici**

In `src/App.tsx`:

1. L'`onSnapshot` su `config/main` (riga ~95): aggiungi `{ includeMetadataChanges: true }` come secondo argomento E nel callback, dopo `setData(...)`, aggiungi:

```ts
if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) markSynced();
```

2. L'`onSnapshot` su `posts` (riga ~111): stesso pattern:

```ts
const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, snapshot => {
  setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
  if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) markSynced();
}, (err) => console.error('[snapshot:posts]', err.code, err.message));
```

3. L'`onSnapshot` su `config/members` (riga ~119) e `config/slots` (riga ~146) hanno già `{ includeMetadataChanges: true }` — aggiungi `markSynced()` nel branch `if (snapshot.exists())` dopo `setMembersFromServer(true)` e `setSlotsFromServer(true)` rispettivamente (solo quando `!snapshot.metadata.fromCache`):

```ts
if (!snapshot.metadata.fromCache) {
  setMembersFromServer(true);
  markSynced();
}
```

(stessa modifica per slots)

- [ ] **Step 3: Mount `<OfflineBanner/>` nel layout principale**

Nel JSX del return in fondo a `MainApp()` (`<div className="h-dvh bg-[#EDEEE6]...>`), inserisci il banner come primo figlio del wrapper:

```tsx
return (
  <div className="h-dvh bg-[#EDEEE6] text-[#1A1A14] select-none flex flex-col max-w-lg mx-auto">
    <OfflineBanner />
    <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      {/* ...contenuto esistente invariato... */}
    </div>
    <BottomNav currentScreenIndex={screenIndex} onNavigate={handleScreenChange} />
  </div>
);
```

**Non** mettere il banner sopra `OnboardingScreen`, `HunterNameModal`, `SettingsScreen`, `MappaScreen`, `RuotaView` — sono schermate full-screen indipendenti. (Se Michele vuole il banner anche lì in una seconda iterazione, si può estrarre in un layout condiviso.)

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: zero errori.

- [ ] **Step 5: QA manuale in DevTools**

1. `npm run dev` → apri `http://localhost:3000`
2. DevTools → Network → seleziona "Offline" → ricarica → verifica banner rosso appare
3. Riporta "Online" → banner si ripiega a 0 entro 300ms
4. Apri LocalStorage → verifica key `lastSyncAt` con timestamp recente dopo snapshot dal server

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(offline): mount OfflineBanner and dispatch lastSyncAt on fresh snapshots"
```

---

### Task 4: Tipi `Post.foto_width/height` + `PhotoPlaceholder` + PostCard onError

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/components/PhotoPlaceholder.tsx`
- Modify: `src/components/PostCard.tsx`

- [ ] **Step 1: Aggiorna il tipo Post**

In `src/types/index.ts`, nell'interfaccia `Post`, aggiungi:

```ts
export interface Post {
  id: string;
  tipo: 'normale' | 'avviso' | 'alert';
  testo: string;
  foto_url?: string | null;
  pdf_url?: string | null;
  foto_width?: number;
  foto_height?: number;
  data: number;
  letti?: string[];
  autore?: string;
}
```

- [ ] **Step 2: Crea PhotoPlaceholder**

```tsx
// src/components/PhotoPlaceholder.tsx
export function PhotoPlaceholder({ aspectRatio = '4 / 3' }: { aspectRatio?: string }) {
  return (
    <div
      style={{
        aspectRatio,
        background: '#d0d5c4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#5C6B3A',
        flexDirection: 'column',
        gap: 8,
        borderRadius: 6,
        marginTop: 12,
      }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span style={{ fontSize: 14 }}>Foto non disponibile offline</span>
    </div>
  );
}
```

- [ ] **Step 3: Aggiorna PostCard con onError + aspect-ratio**

In `src/components/PostCard.tsx`:

1. Aggiungi import: `import { PhotoPlaceholder } from './PhotoPlaceholder';`

2. Introduci stato errore foto (funzionale, dentro `PostCardInner`):

```tsx
const [fotoFailed, setFotoFailed] = useState(false);
```

3. Sostituisci il blocco `{post.foto_url && (...)}`:

```tsx
{post.foto_url && !fotoFailed && (
  <img
    src={post.foto_url}
    alt="foto"
    loading="lazy"
    style={{
      marginTop: 12,
      width: '100%',
      aspectRatio: post.foto_width && post.foto_height
        ? `${post.foto_width} / ${post.foto_height}`
        : '4 / 3',
      objectFit: 'cover',
      borderRadius: 6,
      display: 'block',
    }}
    onError={() => setFotoFailed(true)}
  />
)}
{post.foto_url && fotoFailed && (
  <PhotoPlaceholder
    aspectRatio={
      post.foto_width && post.foto_height
        ? `${post.foto_width} / ${post.foto_height}`
        : '4 / 3'
    }
  />
)}
```

4. Aggiorna il comparatore `React.memo` in fondo al file per includere `foto_width/foto_height`:

```tsx
export const PostCard = React.memo(PostCardInner, (prev, next) =>
  prev.post.id === next.post.id &&
  prev.post.tipo === next.post.tipo &&
  prev.post.testo === next.post.testo &&
  prev.post.foto_url === next.post.foto_url &&
  prev.post.pdf_url === next.post.pdf_url &&
  prev.post.foto_width === next.post.foto_width &&
  prev.post.foto_height === next.post.foto_height &&
  prev.post.data === next.post.data &&
  (prev.post.letti?.length ?? 0) === (next.post.letti?.length ?? 0) &&
  prev.canDelete === next.canDelete &&
  prev.isAdmin === next.isAdmin &&
  prev.onDelete === next.onDelete
);
```

- [ ] **Step 4: Type-check e test**

Run: `npm run lint && npx vitest run`
Expected: zero errori TS, test esistenti PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/components/PhotoPlaceholder.tsx src/components/PostCard.tsx
git commit -m "feat(offline): add PhotoPlaceholder fallback and foto_width/height aspect-ratio"
```

---

### Task 5: `BachecaScreen` — estrai dimensioni foto + guardie offline

**Files:**
- Modify: `src/components/BachecaScreen.tsx`
- Modify: `src/App.tsx` (firma `handleAddPost` accetta width/height)

- [ ] **Step 1: Aggiorna firma `handleAddPost` in App.tsx**

In `src/App.tsx` cambia `handleAddPost`:

```tsx
const handleAddPost = async (
  tipo: Post['tipo'],
  testo: string,
  foto_url?: string | null,
  foto_width?: number,
  foto_height?: number,
) => {
  if (!navigator.onLine) {
    alert('Sei offline. Riprova quando torni online.');
    return;
  }
  try {
    await addDoc(collection(db, 'posts'), {
      tipo, testo, data: Date.now(),
      foto_url: foto_url ?? null,
      pdf_url: null,
      autore: hunterName,
      ...(foto_width && foto_height ? { foto_width, foto_height } : {}),
    });
  } catch (e) { console.error(e); }
};
```

Aggiorna anche il tipo della prop in `BachecaScreenProps` del componente (Step 2).

- [ ] **Step 2: Leggi BachecaScreen per individuare handler upload**

Run: `grep -n "uploadBytes\|handleUpload\|onAddPost\|interface.*Props" src/components/BachecaScreen.tsx | head -40`

Identifica l'handler che prende il `File` della foto e chiama `onAddPost`. Tipicamente: seleziona file → `uploadBytes` Storage → `getDownloadURL` → `onAddPost(tipo, testo, url)`.

- [ ] **Step 3: Estrai dimensioni prima dell upload foto**

Nel modulo `BachecaScreen.tsx`, aggiungi questa helper in cima (fuori dal componente):

```ts
async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
```

Nell'handler upload foto (prima di `uploadBytes`):

```ts
if (!navigator.onLine) {
  alert('Sei offline. Riprova quando torni online.');
  return;
}
let width: number | undefined;
let height: number | undefined;
try {
  const dim = await readImageSize(file);
  width = dim.width;
  height = dim.height;
} catch {
  // file corrotto o non-immagine — procedi senza dimensioni (PostCard userà fallback 4/3)
}
```

E nella chiamata finale a `onAddPost`, passa `width, height`:

```ts
await onAddPost(tipo, testo, fotoUrl, width, height);
```

Aggiorna la firma prop:

```ts
interface BachecaScreenProps {
  // ...esistenti
  onAddPost: (tipo: Post['tipo'], testo: string, foto_url?: string | null, foto_width?: number, foto_height?: number) => Promise<void> | void;
}
```

- [ ] **Step 4: Aggiungi guardia offline anche su upload PDF (regolamento)**

Individua l'handler upload PDF regolamento (chiama `onUpdateRegolamento`). In cima:

```ts
if (!navigator.onLine) {
  alert('Sei offline. Riprova quando torni online.');
  return;
}
```

E sul click per APRIRE il PDF regolamento, se offline + URL non in cache mostra `alert('Regolamento non disponibile offline. Aprilo una volta con connessione.')` (verifica con `caches.open('photos').then(c => c.match(url)).then(r => !!r)`).

Pattern nel click handler:

```tsx
const handleOpenRegolamento = async () => {
  if (!regolamentoUrl) return;
  if (!navigator.onLine) {
    const cache = await caches.open('photos');
    const hit = await cache.match(regolamentoUrl);
    if (!hit) {
      alert('Regolamento non disponibile offline. Aprilo una volta con connessione.');
      return;
    }
  }
  window.open(regolamentoUrl, '_blank', 'noopener,noreferrer');
};
```

Sostituisci l'anchor corrente con un `<button>` che chiama `handleOpenRegolamento`, oppure intercetta `onClick` dell'anchor con `e.preventDefault()`. (La scelta dipende dall'attuale markup — vedi Step 2.)

- [ ] **Step 5: Verifica path upload univoci**

Run: `grep -n "ref.*storage\|uploadBytes" src/components/BachecaScreen.tsx src/components/SettingsScreen.tsx src/components/RuotaView.tsx`

Ogni path Storage deve contenere `crypto.randomUUID()` o `Date.now()` (niente sovrascrittura). Se trovi path fissi (es. `posts/foto.jpg`), cambiali in `posts/${crypto.randomUUID()}-${Date.now()}.${ext}`. Documenta eventuali path fissi come issue separato se complesso.

- [ ] **Step 6: Type-check + QA manuale**

Run: `npm run lint && npm run dev`
- DevTools → Offline → prova a postare → alert italiano.
- Online → post con foto → verifica Firestore document ha `foto_width`/`foto_height`.
- Offline + PDF mai aperto → alert "non disponibile offline".

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/BachecaScreen.tsx
git commit -m "feat(offline): extract photo dimensions on upload and guard writes when offline"
```

---

### Task 6: `SettingsScreen` + App handlers — disabled states offline + guardie writes

**Files:**
- Modify: `src/App.tsx` (guardia offline su TUTTI gli handler scritture Firestore)
- Modify: `src/components/SettingsScreen.tsx` (disabled UI)

- [ ] **Step 1: Guardia `if (!navigator.onLine) { alert(...); return; }` in tutti gli handler write di App.tsx**

In `src/App.tsx`, aggiungi la guardia come prima riga dei seguenti handler:
- `handleToggleAbbattimento`
- `handleUpdateText`
- `handleSaveSettings`
- `handleNewSeason`
- `handleUpdateRuota`
- `handleDeletePost` (già `useCallback`)
- `handleMarkRead`
- `handleUpdateRegolamento`
- `handleAddMember`, `handleRemoveMember`
- `handleReleaseOspite`, `handleReleaseSlot`
- `handleResetOnboarding`
- `handleAddDirettivo`, `handleRemoveDirettivo`

Esempio:

```tsx
const handleSaveSettings = async (updatedData: AppData) => {
  if (!navigator.onLine) {
    alert('Sei offline. Riprova quando torni online.');
    return;
  }
  // ...resto invariato
};
```

**Eccezione:** `handleAddPost` già modificato in Task 5. Non duplicare.

**Nota:** `handleToggleAbbattimento` attualmente fa optimistic update locale prima di `updateDoc`. Con la guardia offline saltiamo entrambi — questo è il comportamento voluto (niente update offline).

- [ ] **Step 2: Disabled + opacity sui bottoni SettingsScreen quando offline**

Apri `src/components/SettingsScreen.tsx` e al top del componente:

```tsx
import { useOnlineStatus } from '../hooks/useOnlineStatus';
// ...
const { online } = useOnlineStatus();
```

Identifica i bottoni che chiamano `onSave`, `onNewSeason`, `onAddMember`, `onRemoveMember`, `onReleaseSlot`, `onResetOnboarding`, `onAddDirettivo`, `onRemoveDirettivo`. Per ciascuno:

```tsx
<button
  onClick={...}
  disabled={!online}
  style={{
    ...stileEsistente,
    opacity: online ? 1 : 0.5,
    cursor: online ? 'pointer' : 'not-allowed',
    pointerEvents: online ? 'auto' : 'none',
  }}
>
```

Se i bottoni hanno già uno `style={{...}}` inline, fai merge dei due oggetti.

Se c'è un banner di stato in cima a `SettingsScreen`, aggiungi (opzionale, a discrezione ma utile UX):

```tsx
{!online && (
  <div style={{ background: '#8B1A1A20', color: '#8B1A1A', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
    Sei offline — le modifiche sono bloccate fino al ritorno della connessione.
  </div>
)}
```

- [ ] **Step 3: Type-check + QA**

Run: `npm run lint && npm run dev`
- DevTools → Offline → apri Impostazioni → bottoni grigi + non cliccabili.
- Toggle abbattimento offline → alert, zero update Firestore.
- Online → tutto torna normale.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/SettingsScreen.tsx
git commit -m "feat(offline): guard all Firestore writes with online check and disable Settings buttons"
```

---

### Task 7: `reconcilePhotoCache` utility + test

**Files:**
- Create: `src/utils/reconcilePhotoCache.ts`
- Create: `src/utils/reconcilePhotoCache.test.ts`

- [ ] **Step 1: Scrivi il test**

```ts
// src/utils/reconcilePhotoCache.test.ts
import { describe, it, expect, vi } from 'vitest';
import { collectValidUrls, reconcilePhotoCache } from './reconcilePhotoCache';
import type { Post, AppData } from '../types';

describe('collectValidUrls', () => {
  it('raccoglie foto_url e pdf_url dai post', () => {
    const posts: Post[] = [
      { id: '1', tipo: 'normale', testo: 'a', data: 1, foto_url: 'https://fb/foto1.jpg', pdf_url: null },
      { id: '2', tipo: 'avviso', testo: 'b', data: 2, foto_url: null, pdf_url: 'https://fb/doc.pdf' },
      { id: '3', tipo: 'alert', testo: 'c', data: 3 },
    ];
    const urls = collectValidUrls(posts, {}, undefined);
    expect(urls.has('https://fb/foto1.jpg')).toBe(true);
    expect(urls.has('https://fb/doc.pdf')).toBe(true);
    expect(urls.size).toBe(2);
  });

  it('include foto ruote e regolamento', () => {
    const appData = {
      capriolo: { ruota: { foto: ['https://fb/ruota1.jpg', 'https://fb/ruota2.jpg'] } },
    } as unknown as AppData;
    const urls = collectValidUrls([], appData, 'https://fb/reg.pdf');
    expect(urls.has('https://fb/ruota1.jpg')).toBe(true);
    expect(urls.has('https://fb/ruota2.jpg')).toBe(true);
    expect(urls.has('https://fb/reg.pdf')).toBe(true);
    expect(urls.size).toBe(3);
  });
});

describe('reconcilePhotoCache', () => {
  it('cancella solo entry non in validUrls', async () => {
    const keep = new Request('https://fb/keep.jpg');
    const del = new Request('https://fb/del.jpg');
    const deleteMock = vi.fn().mockResolvedValue(true);
    const mockCache = {
      keys: vi.fn().mockResolvedValue([keep, del]),
      delete: deleteMock,
    };
    const mockCaches = { open: vi.fn().mockResolvedValue(mockCache) };

    await reconcilePhotoCache(new Set(['https://fb/keep.jpg']), mockCaches as unknown as CacheStorage);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(del);
  });

  it('no-op se tutte le entry sono valide', async () => {
    const a = new Request('https://fb/a.jpg');
    const deleteMock = vi.fn();
    const mockCache = { keys: vi.fn().mockResolvedValue([a]), delete: deleteMock };
    const mockCaches = { open: vi.fn().mockResolvedValue(mockCache) };

    await reconcilePhotoCache(new Set(['https://fb/a.jpg']), mockCaches as unknown as CacheStorage);

    expect(deleteMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verifica FAIL**

Run: `npx vitest run src/utils/reconcilePhotoCache.test.ts`
Expected: FAIL — modulo non esiste.

- [ ] **Step 3: Implementa l'utility**

```ts
// src/utils/reconcilePhotoCache.ts
import type { Post, AppData } from '../types';

export function collectValidUrls(posts: Post[], appData: AppData, regolamentoUrl?: string | null): Set<string> {
  const urls = new Set<string>();
  for (const p of posts) {
    if (p.foto_url) urls.add(p.foto_url);
    if (p.pdf_url) urls.add(p.pdf_url);
  }
  for (const specie of Object.values(appData)) {
    specie?.ruota?.foto?.forEach((u) => u && urls.add(u));
  }
  if (regolamentoUrl) urls.add(regolamentoUrl);
  return urls;
}

export async function reconcilePhotoCache(
  validUrls: Set<string>,
  cacheStorage: CacheStorage = caches,
  cacheName: string = 'photos',
): Promise<void> {
  const cache = await cacheStorage.open(cacheName);
  const keys = await cache.keys();
  for (const req of keys) {
    if (!validUrls.has(req.url)) {
      await cache.delete(req);
    }
  }
}
```

- [ ] **Step 4: Run test, verifica PASS**

Run: `npx vitest run src/utils/reconcilePhotoCache.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/reconcilePhotoCache.ts src/utils/reconcilePhotoCache.test.ts
git commit -m "feat(offline): add reconcilePhotoCache utility with pure collector and async GC"
```

---

### Task 8: Integrazione reconcile + pre-fetch + delete cleanup in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Flag sync-gate per reconcile**

In `MainApp()`, aggiungi uno state che traccia quando posts + config/main sono arrivati dal server (non da cache) almeno una volta:

```tsx
const [postsSynced, setPostsSynced] = useState(false);
const [configSynced, setConfigSynced] = useState(false);
const [prefetchDone, setPrefetchDone] = useState(false);
const reconcileDone = React.useRef(false);
```

Nei rispettivi `onSnapshot` (modificati in Task 3):

- `posts`: quando `!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites` chiama `markSynced()` **e** `setPostsSynced(true)`.
- `config/main`: stessa logica → `setConfigSynced(true)`.

- [ ] **Step 2: Pre-fetch al primo sync server**

Aggiungi un `useEffect` dedicato:

```tsx
useEffect(() => {
  if (!postsSynced || !configSynced) return;
  if (prefetchDone) return;
  if (!navigator.onLine) return;

  const opts: RequestInit = { mode: 'no-cors' };

  const recent = [...posts]
    .filter(p => p.foto_url || p.pdf_url)
    .sort((a, b) => b.data - a.data)
    .slice(0, 30);
  recent.forEach(p => {
    if (p.foto_url) fetch(p.foto_url, opts).catch(() => {});
    if (p.pdf_url) fetch(p.pdf_url, opts).catch(() => {});
  });

  Object.values(data).forEach(sp => {
    sp?.ruota?.foto?.forEach(u => u && fetch(u, opts).catch(() => {}));
  });

  if (regolamentoUrl) fetch(regolamentoUrl, opts).catch(() => {});

  setPrefetchDone(true);
}, [postsSynced, configSynced, prefetchDone, posts, data, regolamentoUrl]);
```

- [ ] **Step 3: reconcilePhotoCache una volta, sync-gated**

```tsx
useEffect(() => {
  if (!postsSynced || !configSynced) return;
  if (reconcileDone.current) return;
  reconcileDone.current = true;

  import('./utils/reconcilePhotoCache').then(({ collectValidUrls, reconcilePhotoCache }) => {
    const valid = collectValidUrls(posts, data, regolamentoUrl);
    reconcilePhotoCache(valid).catch((e) => console.error('[reconcile]', e));
  });
}, [postsSynced, configSynced, posts, data, regolamentoUrl]);
```

Lazy import (`import(...)`) mantiene il codice di reconcile fuori dal main bundle per chi non lo attiva.

- [ ] **Step 4: Cache cleanup in `handleDeletePost`**

Aggiorna `handleDeletePost`:

```tsx
const handleDeletePost = useCallback(async (id: string) => {
  if (!navigator.onLine) {
    alert('Sei offline. Riprova quando torni online.');
    return;
  }
  const target = posts.find(p => p.id === id);
  try {
    await deleteDoc(doc(db, 'posts', id));
    if (target && (target.foto_url || target.pdf_url)) {
      try {
        const cache = await caches.open('photos');
        if (target.foto_url) await cache.delete(target.foto_url);
        if (target.pdf_url) await cache.delete(target.pdf_url);
      } catch (e) {
        console.warn('[cache cleanup]', e);
      }
    }
  } catch (e) {
    console.error(e);
    alert('Errore durante la cancellazione del messaggio. Riprova.');
  }
}, [posts]);
```

(Aggiorna la deps array di `useCallback` a `[posts]`.)

- [ ] **Step 5: Type-check + test + QA**

Run: `npm run lint && npx vitest run`

QA manuale:
1. Apri app online → verifica log Network: `fetch(...)` no-cors su foto/PDF recenti.
2. Cancella un post con foto → DevTools Application → Cache Storage → verifica entry sparita.
3. Verifica che reconcile giri UNA volta (console.log aggiuntivo se dubbio).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(offline): prefetch top-30 recent posts, gated reconcile, cache cleanup on delete"
```

---

### Task 9: Service Worker Workbox + build pipeline + rimozione `vite-plugin-pwa`

⚠️ **Alto rischio FCM.** Rimuovere `vite-plugin-pwa` e migrare al SW manuale è l'unico step che può rompere le notifiche push (regressione documentata aprile 2026). Deve essere fatto con QA push manuale immediato. Se Michele è incerto, può fermarsi qui e mantenere i Task 1-8 — servono comunque e riducono drasticamente lo scope offline.

**Files:**
- Modify: `public/firebase-messaging-sw.js`
- Create: `workbox-config.js`
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Installa workbox tooling**

```bash
npm i -D workbox-cli workbox-build
```

- [ ] **Step 2: Rimuovi `VitePWA` da `vite.config.ts`**

Apri `vite.config.ts` e:
1. Rimuovi l'import: `import { VitePWA } from 'vite-plugin-pwa';`
2. Rimuovi l'intero blocco `VitePWA({ ... })` dall'array `plugins`.
3. Lascia `react()`, `tailwindcss()`, `define`, `resolve.alias`, `server`, `test` invariati.

Dopo la modifica l'array `plugins` sarà: `[react(), tailwindcss()]`.

- [ ] **Step 3: Riscrivi `public/firebase-messaging-sw.js`**

Sostituisci il contenuto attuale con:

```js
// public/firebase-messaging-sw.js
// UN SOLO Service Worker: FCM + Workbox precache/runtime.
// NON aggiungere skipWaiting: vogliamo che il nuovo SW attenda la chiusura dei tab.

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDuygauGnMqxL8Rf6QvyVgnRTwDbZ20VbI',
  authDomain: 'riservapp-6054c.firebaseapp.com',
  projectId: 'riservapp-6054c',
  storageBucket: 'riservapp-6054c.firebasestorage.app',
  messagingSenderId: '62159000134',
  appId: '1:62159000134:web:2e87a9ace109c58c45f047',
});

const messaging = firebase.messaging();

workbox.core.clientsClaim();
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

workbox.routing.registerRoute(
  ({ url }) => url.hostname.includes('firebasestorage.googleapis.com') || url.hostname.includes('firebasestorage.app'),
  new workbox.strategies.CacheFirst({
    cacheName: 'photos',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Riserva Tuenno';
  const body = payload.notification?.body || '';
  const isAlert = payload.data?.priority === 'high';
  self.registration.showNotification(title, {
    body,
    icon: '/logo_tuenno_ui.png',
    vibrate: isAlert ? [200, 100, 200, 100, 200] : [100],
    requireInteraction: isAlert,
    data: { url: 'https://riservatuenno.web.app' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://riservatuenno.web.app';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0 && 'focus' in clientList[0]) {
        return clientList[0].focus();
      }
      return clients.openWindow(url);
    })
  );
});
```

**Versione Firebase CDN (12.10.0)** deve matchare `package.json` — se in futuro bumpi firebase, ricorda di bumpare anche qui manualmente.

- [ ] **Step 4: Crea `workbox-config.js` in root**

```js
// workbox-config.js
module.exports = {
  mode: 'injectManifest',
  swSrc: 'public/firebase-messaging-sw.js',
  swDest: 'dist/firebase-messaging-sw.js',
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
  globIgnores: ['**/firebase-messaging-sw.js'],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
};
```

- [ ] **Step 5: Aggiorna `package.json` scripts e devDeps**

Sostituisci il blocco `scripts`:

```json
"scripts": {
  "dev": "tsx server.ts",
  "build:vite": "vite build",
  "build:sw": "workbox injectManifest workbox-config.js",
  "build": "npm run build:vite && npm run build:sw",
  "preview": "vite preview",
  "clean": "rm -rf dist",
  "lint": "tsc --noEmit",
  "test": "vitest run"
}
```

Rimuovi `vite-plugin-pwa` da `devDependencies` (già non referenziato ora):

```bash
npm remove vite-plugin-pwa
```

- [ ] **Step 6: Build e ispeziona output**

Run: `npm run clean && npm run build`

Verifica:
1. `dist/firebase-messaging-sw.js` esiste ed è più grande dell'input (Workbox ha iniettato `__WB_MANIFEST`).
2. `grep -c "__WB_MANIFEST" dist/firebase-messaging-sw.js` → deve restituire 0 (il placeholder è stato sostituito).
3. `grep -o "precacheAndRoute(\[" dist/firebase-messaging-sw.js` → presente.
4. `dist/index.html` + asset hashati ci sono.

Se il build fallisce per `globPatterns` vuoti, assicurati che `npm run build:vite` giri prima di `build:sw`.

- [ ] **Step 7: QA locale con preview**

Run: `npm run preview`
1. Apri l'URL di preview.
2. DevTools → Application → Service Workers → verifica `firebase-messaging-sw.js` è l'UNICO SW, status `activated`.
3. Network → Offline → ricarica → app renderizza da cache (bacheca + specie + foto già viste).
4. Verifica Cache Storage contiene bucket `workbox-precache-v2` (o simile) con gli asset hashati **e** bucket `photos`.

- [ ] **Step 8: QA FCM — obbligatorio prima del commit**

Con app aperta in preview (online):
1. Firebase Console → Cloud Messaging → Send test message al device token Michele.
2. App in foreground → deve arrivare notifica.
3. App in background/tab chiuso → deve arrivare notifica di sistema.

Se UNA delle due fallisce: STOP, rollback (`git checkout -- .`), apri issue separato. Non proseguire.

- [ ] **Step 9: Commit**

```bash
git add public/firebase-messaging-sw.js workbox-config.js vite.config.ts package.json package-lock.json
git commit -m "feat(offline): migrate to manual Workbox injectManifest, remove vite-plugin-pwa"
```

- [ ] **Step 10: Deploy di preview su vecchio dominio**

Solo dopo QA FCM OK.

```bash
firebase deploy --only hosting:riservapp-6054c
```

Test 48h su iPhone + Android reale. Se tutto OK → deploy anche su `riservatuenno` con `firebase deploy --only hosting:riservatuenno` (o config equivalente in `firebase.json`).

---

## Criteri di accettazione (dal spec)

Dopo Task 1-8:
- [ ] Banner offline appare con timestamp formato IT (`15 gen, 14:30`)
- [ ] `lastSyncAt` aggiornato solo quando `metadata.fromCache === false`
- [ ] Scritture offline → alert italiano ovunque
- [ ] PostCard mostra `<PhotoPlaceholder>` quando foto fallisce il load
- [ ] Cancellazione post → entry rimossa da `caches.open('photos')`

Dopo Task 9 (completo):
- [ ] Apertura offline → tutte e 4 le schermate renderizzano contenuti
- [ ] Foto bacheca visibili offline dopo almeno una apertura online
- [ ] PDF regolamento apribile offline se aperto almeno una volta
- [ ] FCM push test arriva foreground + background
- [ ] Un solo SW attivo (`firebase-messaging-sw.js`)
- [ ] Nessun flash visibile su PostCard durante transizione cache → server

## Non testato automaticamente

- Interazione reale `onSnapshot` con IndexedDB (richiederebbe Firestore emulator + setup heavy — vedi `Fase 2` come out-of-scope)
- Service Worker scope isolation (richiede browser reale)
- FCM delivery (solo manual QA)

## Out of scope (dal spec)

- APK Android via Capacitor
- Background sync nativo a orari fissi
- Push silenziosi FCM per cache refresh
- Mappa Google offline
- Bottone "Aggiorna ora" manuale
