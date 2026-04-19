# RiservApp — Offline-First PWA Design

**Data**: 2026-04-18
**Autore**: Michele Bruni + Claude (brainstorming skill)
**Target**: `riservapp_v2` PWA su `riservatuenno.web.app`

## Obiettivo

L'app deve essere **consultabile in full offline** in zone di montagna senza copertura. Tutti i dati letti (bacheca, foto, regolamento, ruote, squadre, abbattimenti) devono essere disponibili anche senza rete. Le scritture sono bloccate offline. Sync automatico all'apertura quando online.

## Decisioni di prodotto (confermate)

| Decisione | Valore |
|-----------|--------|
| Scritture offline | **Bloccate** con alert "Sei offline. Riprova quando torni online." |
| Trigger sync | Sempre all'apertura se online (Firestore nativo), no soglie temporali |
| Persistenza foto | Foto restano in cache finché il Rettore non le cancella lato server (prove legali — data fa fede) |
| Indicatore offline | Banner rosso in alto: "Sei offline. Ultimo aggiornamento: [timestamp]. Dati aggiornati disponibili quando torni online." |
| Mappa Google | Resta online-only (solo Rettore la usa) |
| Target piattaforma | PWA (iOS Safari + Android Chrome). APK Android via Capacitor rimandato a FASE 2 |

## Architettura

Tre livelli di cache, ognuno con responsabilità precisa:

```
┌─ App React ─────────────────────────────────┐
│  useOnlineStatus() → banner offline         │
│  useRegolamentoCached() → PDF da Cache API  │
└──────────────┬──────────────────────────────┘
               │
┌─ Firestore SDK v12 ──────────────────────────┐
│  persistentLocalCache (IndexedDB built-in)   │
│  onSnapshot offline-first: cache → server    │
│  Collections: config/main, members, slots,   │
│               posts, geofences               │
└──────────────┬──────────────────────────────┘
               │
┌─ Service Worker (firebase-messaging-sw.js)───┐
│  + Workbox runtime caching:                  │
│    - App shell (JS/CSS/HTML) — precache      │
│    - Foto bacheca (firebasestorage.*) —      │
│      CacheFirst, mai scade lato client       │
│    - PDF regolamento — CacheFirst per URL    │
│  (FCM resta invariato nello stesso SW)       │
└──────────────────────────────────────────────┘
```

**Vincolo critico**: UN SOLO Service Worker (`firebase-messaging-sw.js`). Aprile 2026 il conflitto con `vite-plugin-pwa` ha rotto le notifiche push. Workbox viene iniettato via `importScripts` nello stesso file, NON tramite plugin Vite.

## Service Worker — struttura finale

```js
// public/firebase-messaging-sw.js

// 1. Workbox prima di tutto
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

// 2. Firebase compat (SW non supporta modular)
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

// 3. Firebase init (config esistente)
firebase.initializeApp({ /* config esistente */ });
const messaging = firebase.messaging();

// 4. Workbox config
workbox.core.clientsClaim();  // NO skipWaiting — update al prossimo avvio
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// 5. Runtime cache per foto Firebase Storage
workbox.routing.registerRoute(
  ({url}) => url.hostname.includes('firebasestorage.googleapis.com'),
  new workbox.strategies.CacheFirst({
    cacheName: 'photos',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);

// 6. FCM handler — CODICE ESISTENTE INTATTO
messaging.onBackgroundMessage((payload) => {
  // esistente
});
```

**Vincoli**:
- Versione Firebase CDN (`12.10.0`) DEVE matchare `package.json`. Se aggiorni, aggiorna anche qui manualmente.
- `statuses: [0, 200]` supporta opaque responses da CDN Firebase Storage senza CORS.
- `clientsClaim()` senza `skipWaiting()`: nuovo SW aspetta chiusura tab → attivazione all'apertura successiva → nessun mismatch schema runtime.

## Build workflow

```json
// package.json
"scripts": {
  "build:vite": "vite build",
  "build:sw": "workbox injectManifest workbox-config.js",
  "build": "npm run build:vite && npm run build:sw"
}
```

`workbox-config.js`:
```js
module.exports = {
  mode: 'injectManifest',
  swSrc: 'public/firebase-messaging-sw.js',
  swDest: 'dist/firebase-messaging-sw.js',
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}']
};
```

Vite genera già asset con hash (`main.a1b2c3.js`), garantendo invalidazione corretta tra versioni.

## Firestore — init con cache persistente

Cambio singola riga in `src/firebase.ts`:

```ts
// prima
import { getFirestore } from 'firebase/firestore';
export const db = getFirestore(app);

// dopo
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
```

Tutti gli `onSnapshot` / `getDocs` esistenti continuano a funzionare senza modifiche. Diventano automaticamente offline-capable.

## Data flow — scenari

### 1. Prima installazione (online obbligatorio)
- Browser scarica shell → SW installa e precacha JS/CSS/HTML
- Firestore `persistentLocalCache` init → IndexedDB vuoto
- App.tsx monta `onSnapshot` su tutte le collections critiche **prima del gate onboarding** → IndexedDB si riempie mentre utente guarda video
- Pre-fetch risorse: loop su top 30 post per `data` desc, `fetch(post.foto_url)` + `fetch(post.pdf_url)` fire-and-forget → SW cacha
- Pre-fetch foto ruote: loop su `appData[specie].ruota.foto[]` per ogni specie
- PDF regolamento pre-fetchato in parallelo

**Documentazione utente**: "Installa l'app almeno una volta con connessione prima di andare in zona senza campo."

### 2. Apertura online (uso normale)
- SW serve shell instant → app visibile subito
- `onSnapshot` emette prima da IndexedDB (dati istantanei), poi da server appena disponibile → stesso hook, React ri-renderizza
- Quando `snapshot.metadata.fromCache === false && !hasPendingWrites` → `localStorage.setItem('lastSyncAt', Date.now())`
- Foto già viste servite da Cache API (zero rete). Nuove scaricate + cachate automaticamente.
- `reconcilePhotoCache()` chiamata una volta per rimuovere orfani.

### 3. Apertura offline
- SW serve shell dalla cache
- `onSnapshot` emette da IndexedDB (`metadata.fromCache === true`)
- `navigator.onLine === false` → `OfflineBanner` mostrato con `lastSyncAt` da localStorage
- Tutti i dati visibili come ultima sync. Foto da Cache API.
- Scritture bloccate con alert.

### 4. Online → offline durante uso
- Evento `window.offline` → banner appare
- `onSnapshot` resta attivo ma non riceve più dal server
- UI invariata, utente continua a leggere

### 5. Offline → online durante uso
- Evento `window.online` → banner sparisce
- Firestore riconnette automaticamente → `onSnapshot` emette dati aggiornati
- Foto nuove scaricate + cachate al primo render

### 6. Cancellazione post con foto (Rettore online)
- `deleteDoc(posts/xyz)` → Firestore notifica tutti i client via `onSnapshot`
- Client online in quel momento: handler locale rimuove entry Cache API
- Client offline in quel momento: al prossimo avvio online, `reconcilePhotoCache()` pulisce orfani

**Comportamento documentato**: "Le foto cancellate dal Rettore vengono rimosse dal tuo telefono al prossimo avvio online."

## Shape dati — URL da cacheare

Verificato in `src/types/index.ts`:

```ts
interface Post {
  foto_url?: string | null;  // singolo, non array
  pdf_url?: string | null;   // post può allegare PDF
}
interface RuotaData {
  foto?: string[];  // ruote specie: array foto
}
// + regolamento_url da config/main
```

Fonti URL da riconciliare nella cache:
1. `post.foto_url` per ogni post
2. `post.pdf_url` per ogni post
3. `specie.ruota.foto[]` per ogni specie in `config/main`
4. `config/main.regolamento_url`

## Garbage collection risorse

```ts
function collectValidUrls(posts: Post[], appData: AppData, regolamentoUrl?: string): Set<string> {
  const urls = new Set<string>();
  posts.forEach(p => {
    if (p.foto_url) urls.add(p.foto_url);
    if (p.pdf_url) urls.add(p.pdf_url);
  });
  Object.values(appData).forEach(specie => {
    specie.ruota?.foto?.forEach(url => urls.add(url));
  });
  if (regolamentoUrl) urls.add(regolamentoUrl);
  return urls;
}

async function reconcilePhotoCache(validUrls: Set<string>) {
  const cache = await caches.open('photos');
  const keys = await cache.keys();
  for (const req of keys) {
    if (!validUrls.has(req.url)) {
      await cache.delete(req);
    }
  }
}

// chiamata in App.tsx: eseguita solo quando TUTTI e 3 onSnapshot
// (posts + config/main) hanno emesso con fromCache === false
```

**Guardia critica**: `reconcilePhotoCache` gira SOLO quando tutti gli `onSnapshot` rilevanti hanno `fromCache === false`. Se girasse su cache stale cancellerebbe URL validi server-side.

**Nome cache Workbox**: `'photos'` copre anche PDF — nome storico mantenuto per semplicità.

## Pre-fetch risorse con limite

```ts
// on first online open, warm cache for top 30 recent posts
// mode: 'no-cors' → opaque response, SW la intercetta senza blocchi CORS
const opts: RequestInit = { mode: 'no-cors' };

const recentPosts = posts
  .filter(p => p.foto_url || p.pdf_url)
  .sort((a, b) => b.data - a.data)
  .slice(0, 30);

recentPosts.forEach(p => {
  if (p.foto_url) fetch(p.foto_url, opts);
  if (p.pdf_url) fetch(p.pdf_url, opts);
});

// foto ruote (sempre tutte, sono poche)
Object.values(appData).forEach(specie => {
  specie.ruota?.foto?.forEach(url => fetch(url, opts));
});

// regolamento
if (regolamentoUrl) fetch(regolamentoUrl, opts);
```

`mode: 'no-cors'` + `statuses: [0, 200]` in Workbox → cacha opaque responses senza header CORS completi (Firebase Storage CDN li serve spesso così).

Caccia dura 3 mesi, ~15 foto post attese → 30 è copertura ampia. Ruote hanno poche foto → tutte cacheate.

## Invariante upload risorse

Ogni upload Storage deve usare path univoco: `posts/{uuid}-{timestamp}.{ext}`, `ruote/{specie}/{uuid}.jpg`, `regolamento/{timestamp}.pdf`. Mai sovrascrivere file con stesso nome — `CacheFirst` non vedrebbe la modifica.

Azione implementazione: verificare handler upload in `BachecaScreen.tsx` e `SettingsScreen.tsx` → confermare pattern univoco.

## Nuovi componenti

### `src/hooks/useOnlineStatus.ts`

```ts
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const v = localStorage.getItem('lastSyncAt');
    return v ? Number(v) : null;
  });

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    const onSync = () => {
      const v = localStorage.getItem('lastSyncAt');
      if (v) setLastSyncAt(Number(v));
    };

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

**Pattern evento custom** (no polling). In `App.tsx` dopo setItem:
```ts
localStorage.setItem('lastSyncAt', String(Date.now()));
window.dispatchEvent(new Event('lastSyncAt'));
```

### `src/components/OfflineBanner.tsx`

```tsx
export function OfflineBanner() {
  const { online, lastSyncAt } = useOnlineStatus();

  const formatted = lastSyncAt
    ? new Intl.DateTimeFormat('it-IT', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(lastSyncAt))
    : 'mai';

  return (
    <div style={{
      background: '#8B1A1A', color: '#fff',
      padding: online ? '0 16px' : '12px 16px',
      maxHeight: online ? 0 : 100,
      overflow: 'hidden',
      fontSize: 15, fontWeight: 600, textAlign: 'center',
      transition: 'max-height 0.3s ease-in-out, padding 0.3s ease-in-out'
    }}>
      Sei offline. Ultimo aggiornamento: {formatted}.
      Dati aggiornati disponibili quando torni online.
    </div>
  );
}
```

Banner sempre montato (no conditional render) per permettere transizione fluida height 0 ↔ auto. Posizionato subito sotto `<Header />` in `App.tsx`.

### `src/components/PhotoPlaceholder.tsx`

```tsx
export function PhotoPlaceholder({ aspectRatio = '4/3' }: { aspectRatio?: string }) {
  return (
    <div style={{
      aspectRatio,
      background: '#d0d5c4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#5C6B3A',
      flexDirection: 'column',
      gap: 8
    }}>
      <Camera size={48} />
      <span style={{ fontSize: 14 }}>Non disponibile offline</span>
    </div>
  );
}
```

Aspect-ratio da metadata post. Default `4/3` per post legacy senza dati.

**Aggiunta ai type + upload handler**:
```ts
// types/index.ts
interface Post {
  // ...esistenti
  foto_width?: number;
  foto_height?: number;
}

// BachecaScreen.tsx handleUploadPhoto — estrai dimensioni prima upload
const img = new Image();
img.src = URL.createObjectURL(file);
await new Promise(res => img.onload = res);
const width = img.naturalWidth;
const height = img.naturalHeight;
URL.revokeObjectURL(img.src);

// poi uploadBytes + setDoc con foto_url, foto_width, foto_height
```

Legacy: post esistenti senza dimensioni usano fallback `4/3`. Solo i post nuovi hanno aspect-ratio preciso.

## Modifiche componenti esistenti

### `src/App.tsx`
- Mount `<OfflineBanner />` subito sotto `<Header />`
- `onSnapshot` per tutte le collections critiche dichiarati PRIMA del gate onboarding (warmup IndexedDB durante video)
- `useCallback` su ogni handler passato a `PostCard` (`handleDeletePost`, ecc.)
- Handler scritture: guardia `if (!navigator.onLine) { alert('Sei offline. Riprova quando torni online.'); return; }`
- Handler cancellazione post: dopo `deleteDoc`, chiama `caches.open('photos').then(c => { if (post.foto_url) c.delete(post.foto_url); if (post.pdf_url) c.delete(post.pdf_url); })`
- Stato condiviso: tenere flag `syncedCollections` per chiamare `reconcilePhotoCache` solo quando `posts`, `config/main` e `regolamento_url` sono tutti arrivati dal server (non da cache)

### `src/components/BachecaScreen.tsx`
- `handleUploadPhoto` / `handleUploadPdf`: guardia offline in cima
- Click PDF regolamento: se offline + non in cache → toast "Regolamento non disponibile offline. Aprilo una volta con connessione."

### `src/components/PostCard.tsx`
- Wrap con `React.memo`, comparatore: `prev.post.id === next.post.id && prev.post.updatedAt === next.post.updatedAt`
- `<img loading="lazy" />`
- `onError` → `<PhotoPlaceholder aspectRatio={...} />`

### `src/components/SettingsScreen.tsx` (Rettore)
- Bottoni che salvano Firestore: `disabled={!online}` + style `opacity: 0.5; cursor: not-allowed; pointerEvents: none` quando offline
- Nessun tooltip (mobile non ha hover)

### `src/firebase.ts`
- Swap `getFirestore` → `initializeFirestore(app, { localCache: persistentLocalCache() })`

## Non cambia

- Header, BottomNav, schermate specie (Capriolo/Cervo/Camoscio)
- OnboardingScreen, HunterNameModal
- `src/hooks/useFCM.ts` e flusso notifiche
- Auth flow Rettore
- Firestore rules, geofencing
- localStorage keys esistenti (si aggiunge solo `lastSyncAt`)

## Error handling & edge cases

| Situazione | Comportamento |
|------------|---------------|
| Prima visita offline | App non carica (errore rete nativo browser). Documentato: "Installa l'app almeno una volta con connessione." |
| Storage pieno | Browser evicta Cache API in LRU. IndexedDB degrada a memory se quota piena. Foto vecchie possono sparire, riappaiono al prossimo online. Nessuna gestione custom. |
| Safari privacy mode (IndexedDB bloccato) | `persistentLocalCache` cade su memory cache. App funziona online, offline vuota. Caso raro, non target primario. |
| SW update race | Nuovo SW installa ma resta in `waiting` finché tab chiuse. Al prossimo avvio, `clientsClaim()` attiva nuovo SW su tutti i client. |
| FCM regression | **Rischio alto**. Mitigazione: un solo SW, test manuale post-deploy (invio push, verifica foreground + background). |
| Auth Rettore offline | Sessione persiste in localStorage. Admin vede UI ma tutti i write bloccati da `navigator.onLine` guard. |
| Foto non in cache + offline | `<img onError>` → `<PhotoPlaceholder>` con stesso aspect-ratio (no layout shift) |
| PDF mai scaricato + offline | Toast "Regolamento non disponibile offline. Aprilo una volta con connessione." |

## Testing

### Unit (Vitest)
- `reconcilePhotoCache(posts, mockCache)` → verifica `delete` su orfani, no-op su validi
- `OfflineBanner` render: con/senza `lastSyncAt`, formato data IT corretto

### Manual QA (Chrome DevTools)
1. Application → Service Workers → verifica `firebase-messaging-sw.js` attivo, nessun altro SW
2. Network → Offline → ricarica app → tutte e 4 le schermate + foto + PDF disponibili
3. Application → Storage → IndexedDB popolato con prefisso `firestore/`, Cache Storage con bucket `photos`
4. Admin cancella post con foto (online) → verifica entry sparita da Cache Storage (con client aperto)
5. FCM: invia test push da Firebase Console → arriva in foreground + background

### Rollout
- Deploy anteprima su `riservapp-6054c.web.app` (vecchio dominio ancora attivo)
- Test personale Michele 48h su iPhone + Android
- Se ok, deploy su `riservatuenno.web.app`

## Out of scope (rimandato)

- APK Android via Capacitor (FASE 2 dopo validazione PWA)
- Background sync nativo a mezzanotte/mezzogiorno (solo con APK)
- Push silenziosi FCM per aggiornamento cache (complessità alta, benefit basso)
- Mappa Google offline (tiles online-only, solo Rettore)
- Bottone "Aggiorna ora" per sessioni long-lived (valutare se utenti segnalano il problema)

## Dipendenze

Nuovi pacchetti:
```bash
npm i -D workbox-cli workbox-build
```

Esistenti invariati: `firebase ^12.10.0` (usa già le API nuove).

## File impattati (totale: ~8)

**Modifiche**:
- `src/firebase.ts` — 1 riga
- `src/App.tsx` — banner mount, useCallback handlers, warm cache subscriptions, guardia scritture
- `src/components/BachecaScreen.tsx` — guardia upload, gestione PDF offline
- `src/components/PostCard.tsx` — React.memo, lazy loading, onError placeholder
- `src/components/SettingsScreen.tsx` — disabled states con opacity
- `public/firebase-messaging-sw.js` — importScripts Workbox + config cache
- `package.json` — scripts build + devDep workbox
- `vite.config.ts` — probabilmente invariato

**Nuovi**:
- `src/hooks/useOnlineStatus.ts`
- `src/components/OfflineBanner.tsx`
- `src/components/PhotoPlaceholder.tsx`
- `workbox-config.js`

## Sicurezza — Hardening accesso Firestore

**Aggiunta 2026-04-19.** Problema identificato durante review: le `firestore.rules` attuali espongono dati a chiunque conosca il Project ID Firebase (estraibile dal bundle JS). Esempio di attacco banale oggi possibile:

```
GET https://firestore.googleapis.com/v1/projects/<PROJECT_ID>/databases/(default)/documents/posts
→ risposta: tutti i post, foto, autori, date
```

Non serve aprire l'app. Un bot scraper trova il dominio Firebase e scarica tutto l'archivio.

### Modello di minaccia

| Attaccante | Capacità | Blocco attuale | Blocco dopo hardening |
|-----------|----------|----------------|----------------------|
| Bot di massa (scanner internet) | `curl` a endpoint pubblici | ❌ nessuno | ✅ Anonymous Auth |
| Curioso con browser | Apre app, guarda Network tab | ❌ legge tutto | ✅ token anon scade, rules chiuse |
| Tecnico motivato | Estrae token da IndexedDB, rifà richieste | ❌ legge tutto | ⚠️ passa (serve App Check) |
| Socio interno (dei 45) | Ha slot, conosce UX | già limitato a scritture proprie | invariato |
| Cancellazione malevola via API | `DELETE` su `/posts/{id}` | ❌ chiunque | ✅ solo admin/direttivo |

### Fase 1 — Anonymous Auth + Rules `require auth` (questo giro)

**Obiettivo**: bloccare scraping automatico/bot. Impatto UX soci: zero.

**Modifiche:**

1. `src/firebase.ts` — aggiungere:
   ```ts
   import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

   export const auth = getAuth(app);

   // Sign-in anonimo all'avvio. Deve completare prima delle letture Firestore.
   export const authReady = new Promise<void>((resolve) => {
     onAuthStateChanged(auth, (user) => {
       if (user) return resolve();
       signInAnonymously(auth).catch((err) => {
         console.error('[auth] anonymous sign-in failed', err);
         resolve(); // non bloccare l'app — rules daranno 403 visibile
       });
     });
   });
   ```

2. `src/main.tsx` o `App.tsx` — attendere `authReady` prima di renderizzare contenuti che leggono Firestore (oppure mostrare loader).

3. `firestore.rules` — sostituire `allow read: if true` con `allow read: if request.auth != null` su:
   - `/posts/{postId}` (read)
   - `/config/main` (read)
   - `/config/members` (read)
   - `/geofences/{docId}` (read)
   - `/config/slots` (read + write)
   - `/config/onboarding_reset` (read + write)

4. `/posts/{postId}` — cambiare `allow delete: if true` → `allow delete: if isAdmin() || isDirettivo()`. Aggiungere helper:
   ```
   function isDirettivo() {
     return request.auth != null &&
       get(/databases/$(database)/documents/config/members).data.direttivo.hasAny([resource.data.autore]);
   }
   ```
   **Nota**: il campo `autore` è stringa nome+cognome, non UID. L'utente anonimo non ha modo di provare di essere l'autore. Quindi delete via API rimane possibile solo per l'admin Google. Il direttivo cancella SOLO tramite UI admin dopo long-press + login Google (stato attuale dell'UX). Accettabile.

5. Enable Anonymous Auth in Firebase Console → Authentication → Sign-in method → Anonymous → Enable.

**Interazione con offline-first**: l'anonymous auth sfrutta la persistenza Firebase (IndexedDB). Una volta firmato, il token resta valido anche offline finché Firebase non decide di rinnovarlo (automatico). Zero impatto su cache Firestore / Workbox.

**Criteri di accettazione Fase 1:**
- A1. `curl` all'endpoint REST `/posts` senza token → 403
- A2. Apertura app sul browser → sign-in trasparente, nessun prompt utente
- A3. Admin login Google continua a funzionare (isAdmin() resta priorità)
- A4. Post delete via API REST senza token admin → 403
- A5. Post delete tramite UI admin autenticata → 200 OK
- A6. Prima apertura app online → contenuti caricano normalmente
- A7. App aperta, dispositivo passa offline → contenuti da cache continuano a funzionare (token anon persistito)

### Fase 2 — Firebase App Check (rimandata)

**Quando**: se emerge rischio reale di token extraction (es. socio tecnico esfiltra dati) o se ruolo app cresce (più di 45 utenti, dati più sensibili).

**Come**: Firebase App Check con reCAPTCHA v3 provider.
- Google verifica che richieste Firestore arrivino da origine `riservatuenno.web.app`
- Blocca chiamate con token estratto ma fatte da `curl`/Postman
- Setup: ~45 min, gratis
- Impatto UX: zero

**Tracciato per il futuro.** Non implementato in questa fase per evitare dipendenza da reCAPTCHA + complessità extra non giustificata da 45 utenti.

### Fase 3 — Password condivisa (opzionale)

Se in futuro serve "barriera visibile" lato utente (es. per comunicare "non condividere questo link"): password statica hardcoded in env → check prima di anonymous sign-in. Upgrade successivo: Cloud Function + custom token per password ruotabile.

**Non pianificato.** L'attuale filtro slot (nome+cognome, 45 posti) è già barriera sociale sufficiente.

## Criteri di accettazione

1. Apertura app con rete off in DevTools → tutte e 4 le schermate renderizzano contenuti
2. Banner offline appare con timestamp leggibile formato IT
3. Foto bacheca visibili offline (dopo almeno una apertura online)
4. PDF regolamento apribile offline (dopo almeno una apertura online)
5. Tentativo post/upload offline → alert italiano corretto
6. FCM push test arriva correttamente foreground + background
7. Cancellazione post admin → foto rimossa da Cache API client
8. `lastSyncAt` aggiornato solo quando `metadata.fromCache === false`
9. Nessun re-render visibile flash su PostCard quando `onSnapshot` emette cache→server
10. SW update: deploy v2 → utente con v1 aperto vede v2 solo dopo chiusura + riapertura app
11. **Sicurezza**: `curl` non autenticato su `/posts` → 403; app reale carica contenuti normalmente
12. **Sicurezza**: cancellazione post via API non autenticata → 403
