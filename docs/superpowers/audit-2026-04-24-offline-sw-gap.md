# Audit — gap Service Worker in offline-first PWA

**Data**: 2026-04-24
**Worktree**: `.worktrees/offline-first` (branch `feat/offline-first`)
**Trigger**: QA manuale Punto 2 (Cache Storage `photos` vuota dopo delete post) — cache risulta vuota da subito.

## Sintesi in una frase

I Task 7 e 8 dipendono al 100% da un Service Worker Workbox che **non è ancora stato costruito** (è esattamente lo scope del Task 9). Il codice applicativo è corretto rispetto allo spec, ma senza Task 9 l'intero flusso cache foto/PDF è no-op.

## Stato atteso vs stato reale

### Atteso (spec + plan, post Task 9)

```
public/firebase-messaging-sw.js   (UN SOLO SW)
├── importScripts Workbox CDN
├── importScripts Firebase Messaging
├── workbox.precacheAndRoute(__WB_MANIFEST)    ← app shell
└── workbox.registerRoute(firebasestorage →
      CacheFirst { cacheName: 'photos' })       ← foto + PDF regolamento

Build pipeline:
  npm run build = vite build + workbox injectManifest
  vite-plugin-pwa RIMOSSO
```

Client registra `firebase-messaging-sw.js` (già oggi, via `useFCM`) → SW unifica FCM + cache.

### Reale (post Task 8, pre Task 9)

```
public/firebase-messaging-sw.js        (solo FCM, niente Workbox)
vite.config.ts → VitePWA(...)          (genera sw.js ma MAI REGISTRATO)
src/hooks/useFCM.ts → registra solo firebase-messaging-sw.js
```

Nessun SW che intercetta richieste Firebase Storage → Cache Storage `photos` **mai popolata** → tutto il codice `caches.open('photos')` è no-op.

## Inventario codice che dipende dal SW Workbox

| File:linea | Operazione | Impatto senza SW |
|---|---|---|
| `src/App.tsx:362-364` `handleDeletePost` | `cache.delete(foto_url/pdf_url)` post-cancellazione | No-op. Cache vuota, nulla da cancellare. |
| `src/App.tsx:185-193` prefetch useEffect | `fetch(url, {mode:'no-cors'})` × top 30 post + ruote + regolamento | Download eseguito ma risposte scartate (nessun SW che fa `cache.put`). Spreco bandwidth primo load, zero beneficio offline. |
| `src/App.tsx:198+` reconcile useEffect | chiama `reconcilePhotoCache` | No-op (cache vuota). |
| `src/utils/reconcilePhotoCache.ts:26` | `cache.delete(req)` per URL non più validi | No-op. |
| `src/components/BachecaScreen.tsx:101-104` | `cache.match(regolamentoUrl)` quando offline; se miss → alert "non disponibile offline" | **Sempre miss** → offline l'utente vede sempre l'alert, anche per regolamento "aperto online in passato". UX rotta in offline. |

Parte `<img>` di BachecaScreen ancora funzionerebbe offline se il browser avesse cached le foto via HTTP cache, ma **non è garantito** (HTTP cache ≠ Cache Storage; la HTTP cache può essere evicted aggressivamente).

## Cross-check Task 1-8

| Task | Descrizione | Dipende da SW? | Funziona oggi? |
|---|---|---|---|
| 1 | `useOnlineStatus` hook | No | ✅ |
| 2 | `OfflineBanner` component | No | ✅ |
| 3 | Banner + dispatch `lastSyncAt` | No | ✅ |
| 4 | `Post.foto_width/height` + `PhotoPlaceholder` + onError | No | ✅ |
| 5 | BachecaScreen dimensioni + guards | **Parziale** | Dimensioni foto ✅. Guard regolamento offline ❌ (alert sempre mostrato). |
| 6 | SettingsScreen disabled + `requireOnline` guards | No | ✅ |
| 7 | `reconcilePhotoCache` utility + test | **Totale** | ❌ no-op. Test unit pass perché mockano `caches`. |
| 8 | Integrazione prefetch + reconcile + delete cleanup | **Totale** | ❌ tutte le 3 integrazioni no-op. |

**I test unitari di Task 7/8 sono verdi perché mockano `caches`**. Sono test di contratto (la funzione chiama le API giuste), non test di integrazione (il SW intercetta davvero e popola la cache). Questo gap di copertura era atteso: integrazione SW end-to-end richiede browser reale + build di produzione.

## I "fix" temporanei fatti in questa sessione

Durante il QA ho fatto due edit a `vite.config.ts`:

1. Rinominato `cacheName: 'firebase-storage'` → `'photos'` (riallineamento con spec)
2. Aggiunto `devOptions: { enabled: true, type: 'module' }` al plugin `VitePWA`

**Raccomandazione**: **rollback entrambi**. Motivi:
- Task 9 rimuoverà completamente `vite-plugin-pwa` dalla config → entrambi gli edit diventano dead code.
- Il `devOptions.enabled` rischia di registrare un secondo SW in conflitto col `firebase-messaging-sw.js` già registrato da `useFCM`, causando flakiness durante i prossimi dev test.
- Meglio non spostare ancora pezzi finché Task 9 non è scritto.

## Opzioni per procedere

### Opzione A — Procedere con Task 9 come da plan (raccomandato)

Il plan in `docs/superpowers/plans/2026-04-19-offline-first-pwa.md:981+` contiene già Step 1-6 dettagliati. È un task ben specificato.

**Effort**: ~1-2 ore implementazione + QA.
**Sequenza**:
1. Rollback dei miei 2 edit a `vite.config.ts`
2. Implementare Task 9 seguendo il plan (install `workbox-cli`/`workbox-build`, riscrivere `public/firebase-messaging-sw.js`, creare `workbox-config.js`, aggiornare `package.json` scripts, rimuovere plugin `VitePWA`)
3. Build di produzione (`npm run build`) → servire `dist/` via preview server
4. Rifare QA Punti 1-3 in preview, non in dev

**Rischio FCM**: spec segnala "regressione FCM di aprile 2026" quando i due SW si sono scontrati. Il plan mitiga con un solo SW che fa sia FCM sia Workbox. QA post-Task 9 deve includere test push notification foreground + background (spec:442-443, plan:1172).

### Opzione B — `devOptions.enabled` + SW custom dev-only

Tenere `vite-plugin-pwa` per dev + installare Workbox-in-FCM-SW solo in build produzione. Complessità doppia (due percorsi), disallineamento dev/prod, rischio bug che appaiono solo in prod. **Sconsigliato**.

### Opzione C — Rinunciare al caching foto/PDF via SW

Rimuovere Task 7 e 8 dal branch, accettare che l'offline funziona solo per dati Firestore (via `persistentLocalCache`) e app shell (se precached altrove). Foto/PDF richiedono sempre rete. Stravolge lo spec originale → **non compatibile con il mandato "offline-first" del progetto**.

## Raccomandazione

**Opzione A**. Sequenza:

1. Rollback 2 edit a `vite.config.ts` (annullare `cacheName: 'photos'` e `devOptions`)
2. Implementare Task 9 esattamente come da plan
3. Build produzione
4. QA Punti 1-3 in preview
5. QA aggiuntivo: push notification foreground + background (verificare no regressione FCM)
6. Commit + merge

## Note per Task 9

- **Non** aggiungere `skipWaiting` (spec:91 motivazione: evitare mismatch schema runtime).
- Verificare che `useFCM.ts:44` continui a registrare `/firebase-messaging-sw.js` — quello stesso file ora contiene anche Workbox.
- In dev locale il SW Workbox **non gira** — `workbox injectManifest` produce SW solo in build. Per test locale: `npm run build && npm run preview`.
- `manifest: false` in VitePWA diventa irrilevante dopo rimozione plugin. `public/manifest.json` esistente è sufficiente (spec conferma).

## Checklist post-Task 9 (QA)

- [ ] DevTools → Application → Service Workers → `firebase-messaging-sw.js` è **l'unico** SW, status `activated`.
- [ ] Cache Storage contiene `workbox-precache-v2-*` (o simile) **e** `photos`.
- [ ] Apri app online → log Network mostra richieste Firebase Storage con `(ServiceWorker)` come source dopo primo load.
- [ ] Offline → ricarica → bacheca + foto visibili.
- [ ] Admin cancella post con foto → Cache Storage `photos` → entry sparita (riesegue Punto 2 del QA originale).
- [ ] `reconcilePhotoCache` gira 1 sola volta dopo sync (Punto 3).
- [ ] Push notification foreground arriva.
- [ ] Push notification background arriva (app chiusa).

---

**Conclusione operativa**: lo stato "Task 1-8 completati, Task 9 in attesa" non è un bug — è un stato intermedio previsto dal plan. Il QA manuale end-to-end era prematuro. Procedere con Task 9.
