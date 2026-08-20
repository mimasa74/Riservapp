import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy, addDoc, deleteDoc, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppData, Post, Members, Slots } from './types';
import fallbackData from '../data.json';

import { initFCM } from './hooks/useFCM';
import { useGeolocation } from './hooks/useGeolocation';
import { useNovita } from './hooks/useNovita';
import { avvisiDaNovita } from './utils/novita';
import {
  NoteRettorePerSpecie, creaNota, aggiungiNota, rimuoviNota, noteDiSpecie,
} from './utils/noteRettore';
import { requireOnline } from './utils/requireOnline';
import { PHOTO_CACHE } from './constants/cacheNames';

import { AssegnazioniScreen } from './components/AssegnazioniScreen';
import { BachecaScreen } from './components/BachecaScreen';
import { HunterNameModal } from './components/HunterNameModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { RuotaView } from './components/RuotaView';
import { MappaScreen } from './components/MappaScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { BottomNav } from './components/BottomNav';
import { AvvisiNovita } from './components/AvvisiNovita';
import { OfflineBanner } from './components/OfflineBanner';
import { UpdateBanner } from './components/UpdateBanner';

function markSynced() {
  localStorage.setItem('lastSyncAt', String(Date.now()));
  window.dispatchEvent(new Event('lastSyncAt'));
}

const ALL_SCREENS = ['bacheca', 'capriolo', 'cervo', 'camoscio'] as const;
type Screen = typeof ALL_SCREENS[number];


function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/).filter(Boolean).sort().join('');
}

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ore ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem('riservapp_device_id')
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem('riservapp_device_id', id)
  return id
}

function MainApp() {
  const deviceId = getOrCreateDeviceId()
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AppData>((fallbackData as unknown) as AppData);
  const [regolamentoUrl, setRegolamentoUrl] = useState<string | null>(null);
  const [hunterName, setHunterName] = useState<string>(
    () => localStorage.getItem('riservapp_nome') || ''
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(
    () => !!localStorage.getItem('riservapp_onboarding')
  );
  const [members, setMembers] = useState<Members | null>(null);
  const [membersFromServer, setMembersFromServer] = useState(false);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [slotsFromServer, setSlotsFromServer] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [postsSynced, setPostsSynced] = useState(false);
  const [configSynced, setConfigSynced] = useState(false);
  const [noteRettore, setNoteRettore] = useState<NoteRettorePerSpecie>({});
  const [prefetchDone, setPrefetchDone] = useState(false);
  const reconcileDone = React.useRef(false);
  const membersValidated = React.useRef(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const isAdminRef = React.useRef(isAdmin);
  isAdminRef.current = isAdmin;

  useGeolocation({ deviceId, nome: hunterName });

  const [screenIndex, setScreenIndex] = useState(0);
  const [showRuota, setShowRuota] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMappa, setShowMappa] = useState(false);
  const [selectedSubZone, setSelectedSubZone] = useState('campa');

  const currentSpecieId: string =
    ALL_SCREENS[screenIndex] === 'bacheca' ? 'capriolo' : ALL_SCREENS[screenIndex];

  // Avviso "il Rettore ha segnato dei capi": confronto locale, niente push
  const novita = useNovita(data, ALL_SCREENS[screenIndex]);
  const capiNuoviPerSpecie = Object.fromEntries(
    Object.entries(novita).map(([specieId, n]) => [specieId, n.capi]),
  );

  useEffect(() => {
    const docRef = doc(db, 'config', 'main');
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, snapshot => {
      if (snapshot.exists()) {
        const raw = snapshot.data();
        setRegolamentoUrl(raw.regolamento_url ?? null);
        const { regolamento_url, ...specieData } = raw;
        setData(specieData as AppData);
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) { markSynced(); setConfigSynced(true); }
      } else {
        // Documento non esiste — inizializza con i dati di default
        if (isAdminRef.current) setDoc(docRef, fallbackData as unknown as Record<string, unknown>).catch(console.error);
      }
    }, (err) => console.error('[snapshot:config/main]', err.code, err.message));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
      if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) { markSynced(); setPostsSynced(true); }
    }, (err) => console.error('[snapshot:posts]', err.code, err.message));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const docRef = doc(db, 'config', 'members');
    return onSnapshot(docRef, { includeMetadataChanges: true }, snapshot => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        setMembers({ nomi: d.nomi ?? [], direttivo: d.direttivo ?? [] });
        if (!snapshot.metadata.fromCache) { setMembersFromServer(true); markSynced(); }
      } else {
        if (isAdminRef.current) setDoc(docRef, { nomi: [], direttivo: [] }).catch(console.error);
        setMembers({ nomi: [], direttivo: [] });
        setMembersFromServer(true);
      }
    }, (err) => console.error('[snapshot:config/members]', err.code, err.message));
  }, []);

  useEffect(() => {
    const docRef = doc(db, 'config', 'slots');
    return onSnapshot(docRef, { includeMetadataChanges: true }, snapshot => {
      if (snapshot.exists()) {
        setSlots(snapshot.data() as Slots);
        if (!snapshot.metadata.fromCache) { setSlotsFromServer(true); markSynced(); }
      } else {
        if (isAdminRef.current) setDoc(docRef, {}).catch(console.error);
        setSlots({});
        setSlotsFromServer(true);
      }
    }, (err) => console.error('[snapshot:config/slots]', err.code, err.message));
  }, []);

  // Diario privato del Rettore: documento a parte, aperto dalle rules al solo
  // admin. Il socio non lo sottoscrive proprio — non avrebbe il permesso.
  useEffect(() => {
    if (!isAdmin) { setNoteRettore({}); return; }
    const docRef = doc(db, 'config', 'note_rettore');
    return onSnapshot(docRef, snapshot => {
      setNoteRettore(snapshot.exists() ? (snapshot.data() as NoteRettorePerSpecie) : {});
    }, (err) => console.error('[snapshot:config/note_rettore]', err.code, err.message));
  }, [isAdmin]);

  // Pre-fetch top-30 recent post assets al primo sync server
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

    (Object.values(data as AppData)).forEach(sp => {
      sp?.ruota?.foto?.forEach(u => u && fetch(u, opts).catch(() => {}));
    });

    if (regolamentoUrl) fetch(regolamentoUrl, opts).catch(() => {});

    setPrefetchDone(true);
  }, [postsSynced, configSynced, prefetchDone, posts, data, regolamentoUrl]);

  // Reconcile photo cache una volta, sync-gated
  useEffect(() => {
    if (!postsSynced || !configSynced) return;
    if (reconcileDone.current) return;
    reconcileDone.current = true;

    import('./utils/reconcilePhotoCache').then(({ collectValidUrls, reconcilePhotoCache }) => {
      const valid = collectValidUrls(posts, data, regolamentoUrl);
      reconcilePhotoCache(valid).catch((e) => console.error('[reconcile]', e));
    });
  }, [postsSynced, configSynced, posts, data, regolamentoUrl]);

  // Controlla se questo dispositivo deve rifare l'onboarding
  useEffect(() => {
    const docRef = doc(db, 'config', 'onboarding_reset');
    return onSnapshot(docRef, snapshot => {
      if (!snapshot.exists()) return;
      const deviceIds: string[] = snapshot.data().deviceIds ?? [];
      if (deviceIds.includes(deviceId)) {
        localStorage.removeItem('riservapp_onboarding');
        setOnboardingDone(false);
        // Rimuove il proprio deviceId dalla lista
        updateDoc(docRef, { deviceIds: arrayRemove(deviceId) }).catch(console.error);
      }
    }, (err) => console.error('[snapshot:config/onboarding_reset]', err.code, err.message));
  }, []);

  // Quando l'admin si logga, setta solo il nome — NON occupa lo slot
  // (l'admin usa Google Auth, non ha bisogno del sistema slot)
  useEffect(() => {
    if (!isAdmin) return;
    const adminName = 'Bruni Michele';
    localStorage.setItem('riservapp_nome', adminName);
    setHunterName(adminName);
  }, [isAdmin]);

  // Migrazione one-shot (solo admin): slot liberi come valore null → chiave rimossa.
  // Le nuove rules permettono al socio solo di AGGIUNGERE chiavi, quindi uno slot
  // "null" residuo non sarebbe più rivendicabile.
  useEffect(() => {
    if (!isAdmin || !slots || !slotsFromServer || !navigator.onLine) return;
    const nulls = Object.entries(slots).filter(([, v]) => v === null).map(([k]) => k);
    if (nulls.length === 0) return;
    updateDoc(doc(db, 'config', 'slots'),
      Object.fromEntries(nulls.map(k => [k, deleteField()]))
    ).catch(console.error);
  }, [isAdmin, slots, slotsFromServer]);

  useEffect(() => {
    if (!members || !slots || !membersFromServer || !slotsFromServer || isOffline) return;
    if (membersValidated.current || isAdmin) return;
    membersValidated.current = true;
    if (!hunterName) return;

    const norm = normalizeName(hunterName);
    const inList = members.nomi.some(n => normalizeName(n) === norm);
    const slotOwner = slots[norm] ?? null;
    const isAllowed = inList && (slotOwner === deviceId || slotOwner === null);

    if (!isAllowed || slotOwner === null) {
      // slot non valido o slot rilasciato dall'admin → ricomincia da capo
      localStorage.removeItem('riservapp_nome');
      localStorage.removeItem('riservapp_onboarding');
      localStorage.removeItem('riservapp_geo');
      setHunterName('');
      setOnboardingDone(false);
    }
  }, [members, slots, membersFromServer, slotsFromServer]);

  const handleScreenChange = (index: number) => {
    setShowRuota(false);
    setScreenIndex(index);
  };

  const handleToggleAbbattimento = async (catId: string, index: number) => {
    if (!requireOnline()) return;
    const sData = data[currentSpecieId];
    const catIndex = sData.categorie.findIndex(c => c.id === catId);
    if (catIndex === -1) return;

    const cat = sData.categorie[catIndex];
    let newCount = index + 1;
    if (index === cat.abbattuti - 1) newCount = index;
    newCount = Math.min(Math.max(newCount, 0), cat.totale);

    // I quadratini sono piccoli e un tap impreciso completerebbe il piano di
    // prelievo per sbaglio: chiedi conferma. Dal 18 ago 2026 la quota completata
    // NON manda piu' alcuna notifica — quella parte solo alla chiusura della
    // categoria — quindi il messaggio non deve piu' prometterla.
    if (newCount === cat.totale && cat.abbattuti !== cat.totale) {
      const ok = window.confirm(
        `Quota completata per ${cat.nome} (${newCount}/${cat.totale}). Confermi?`
      );
      if (!ok) return;
    }

    setData(prev => {
      const p = { ...prev };
      p[currentSpecieId] = { ...p[currentSpecieId] };
      p[currentSpecieId].categorie = p[currentSpecieId].categorie.map((c, i) =>
        i === catIndex ? { ...c, abbattuti: newCount } : c
      );
      return p;
    });

    try {
      const docRef = doc(db, 'config', 'main');
      await updateDoc(docRef, {
        [`${currentSpecieId}.categorie`]: sData.categorie.map((c, i) =>
          i === catIndex ? { ...c, abbattuti: newCount } : c
        ),
        [`${currentSpecieId}.lastUpdated`]: formatTimestamp(),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateText = async (field: 'note' | 'alert' | 'penalita', value: string) => {
    if (!requireOnline()) return;
    try {
      const docRef = doc(db, 'config', 'main');
      await updateDoc(docRef, { [`${currentSpecieId}.${field}`]: value });
    } catch (e) { console.error(e); }
  };

  const salvaNote = async (specieId: string, note: ReturnType<typeof noteDiSpecie>) => {
    if (!requireOnline()) return;
    try {
      // setDoc con merge: il documento può non esistere ancora alla prima nota
      await setDoc(doc(db, 'config', 'note_rettore'), { [specieId]: note }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const handleAggiungiNota = (testo: string) =>
    salvaNote(currentSpecieId, aggiungiNota(
      noteDiSpecie(noteRettore, currentSpecieId),
      creaNota(testo, new Date()),
    ));

  const handleRimuoviNota = (id: string) =>
    salvaNote(currentSpecieId, rimuoviNota(noteDiSpecie(noteRettore, currentSpecieId), id));

  const handleSaveSettings = async (updatedData: AppData) => {
    if (!requireOnline()) return;
    try {
      const docRef = doc(db, 'config', 'main');
      const updates: Record<string, unknown> = {};
      Object.keys(updatedData).forEach(specieId => {
        updates[`${specieId}.anno`] = updatedData[specieId].anno ?? '2026';
        updates[`${specieId}.categorie`] = updatedData[specieId].categorie;
      });
      await updateDoc(docRef, updates);
      setShowSettings(false);
    } catch (e) { console.error(e); }
  };

  const handleNewSeason = async () => {
    if (!requireOnline()) return;
    try {
      const docRef = doc(db, 'config', 'main');
      const updates: Record<string, unknown> = {};
      Object.keys(data).forEach(specieId => {
        updates[`${specieId}.categorie`] = data[specieId].categorie.map(c => ({ ...c, abbattuti: 0 }));
      });
      await updateDoc(docRef, updates);
      setShowSettings(false);
    } catch (e) { console.error(e); }
  };

  const handleUpdateRuota = async (testo: string, foto: string[]) => {
    if (!requireOnline()) return;
    try {
      const docRef = doc(db, 'config', 'main');
      await updateDoc(docRef, { [`${currentSpecieId}.ruota`]: { testo, foto } });
    } catch (e) { console.error(e); }
  };

  const handleAddPost = async (
    tipo: Post['tipo'],
    testo: string,
    foto_url?: string | null,
    foto_width?: number,
    foto_height?: number,
  ) => {
    if (!requireOnline()) return;
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

  const handleDeletePost = useCallback(async (id: string) => {
    if (!requireOnline()) return;
    const target = posts.find(p => p.id === id);
    try {
      await deleteDoc(doc(db, 'posts', id));
      if (target && (target.foto_url || target.pdf_url)) {
        try {
          const cache = await caches.open(PHOTO_CACHE);
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

  const handleMarkRead = async (postIds: string[]) => {
    if (!navigator.onLine) return;  // silent — fires from auto-useEffect, not user action
    for (const id of postIds) {
      try {
        await updateDoc(doc(db, 'posts', id), { letti: arrayUnion(hunterName) });
      } catch (e) { console.error(e); }
    }
  };

  const handleUpdateRegolamento = async (url: string) => {
    if (!requireOnline()) return;
    await updateDoc(doc(db, 'config', 'main'), { regolamento_url: url });
  };

  const handleSetName = (nome: string) => {
    localStorage.setItem('riservapp_nome', nome);
    setHunterName(nome);
    // Prompt del permesso QUI, dentro il gesto utente (tap "Entra"): su iOS
    // requestPermission fuori da user activation fallisce silenziosamente.
    initFCM(deviceId, nome).catch(console.warn);
  };

  const handleEnableNotifications = async () => {
    if (!hunterName) return;
    await initFCM(deviceId, hunterName);
  };

  useEffect(() => {
    if (!hunterName) return;
    // Rinnovo token a ogni apertura, ma SOLO se il permesso è già concesso:
    // il prompt parte solo da gesti utente (handleSetName / banner in bacheca).
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    initFCM(deviceId, hunterName).catch(console.warn);
  }, [hunterName]);

  const handleAddMember = async (nome: string) => {
    if (!requireOnline()) return;
    try {
      await updateDoc(doc(db, 'config', 'members'), { nomi: arrayUnion(nome) });
    } catch (e) { console.error(e); }
  };

  const handleRemoveMember = async (nome: string) => {
    if (!requireOnline()) return;
    try {
      await updateDoc(doc(db, 'config', 'members'), { nomi: arrayRemove(nome) });
    } catch (e) { console.error(e); }
  };

  const handleReleaseSlot = async (normalizedName: string) => {
    if (!requireOnline()) return;
    try {
      // deleteField, NON null: slot libero = chiave assente (vincolo delle rules)
      await updateDoc(doc(db, 'config', 'slots'), { [normalizedName]: deleteField() });
    } catch (e) { console.error(e); }
  };

  const handleResetOnboarding = async (normalizedName: string) => {
    if (!requireOnline()) return;
    const targetDeviceId = slots?.[normalizedName];
    if (!targetDeviceId) {
      alert('Nessun dispositivo associato a questo socio.');
      return;
    }
    try {
      const docRef = doc(db, 'config', 'onboarding_reset');
      await setDoc(docRef, { deviceIds: arrayUnion(targetDeviceId) }, { merge: true });
      alert('Reset inviato. Il socio rifarà l\'onboarding alla prossima apertura.');
    } catch (e) {
      console.error(e);
      alert('Errore durante il reset.');
    }
  };

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  if (!isAdmin && (members === null || slots === null || (!membersFromServer && !isOffline))) {
    return <div style={{ background: '#EDEEE6', height: '100dvh' }} />;
  }

  if (!hunterName && !isAdmin) {
    return (
      <HunterNameModal
        members={members!}
        slots={slots!}
        deviceId={deviceId}
        onConfirm={handleSetName}
      />
    );
  }

  if (showSettings) {
    return (
      <div className="min-h-dvh bg-[#EDEEE6] text-[#1A1A14] max-w-lg mx-auto">
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
          onResetOnboarding={handleResetOnboarding}
        />
      </div>
    );
  }

  if (showMappa) {
    return <MappaScreen onBack={() => setShowMappa(false)} />;
  }

  if (showRuota) {
    return (
      <div className="min-h-dvh bg-[#EDEEE6] text-[#1A1A14]">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <RuotaView
            data={data[currentSpecieId]}
            onClose={() => setShowRuota(false)}
            onUpdateRuota={handleUpdateRuota}
          />
        </div>
      </div>
    );
  }

  const currentScreen = ALL_SCREENS[screenIndex];

  return (
    <div className="h-dvh bg-[#EDEEE6] text-[#1A1A14] select-none flex flex-col max-w-lg mx-auto">
      <UpdateBanner />
      <OfflineBanner />
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        {currentScreen === 'bacheca' ? (
          <BachecaScreen
            avvisiNovita={avvisiDaNovita(data, novita)}
            onApriSpecie={specieId => {
              const idx = ALL_SCREENS.indexOf(specieId as typeof ALL_SCREENS[number]);
              if (idx >= 0) handleScreenChange(idx);
            }}
            posts={posts}
            hunterName={hunterName}
            onEnableNotifications={handleEnableNotifications}
            onAddPost={handleAddPost}
            onDeletePost={handleDeletePost}
            onMarkRead={handleMarkRead}
            onOpenSettings={() => setShowSettings(true)}
            onOpenMappa={() => setShowMappa(true)}
            regolamentoUrl={regolamentoUrl}
            onUpdateRegolamento={handleUpdateRegolamento}
          />
        ) : (
          (() => {
            const spData = data[currentScreen];
            if (!spData) return <div />;
            return (
              <AssegnazioniScreen
                data={spData}
                capiNuovi={novita[currentScreen]?.categorie ?? {}}
                noteRettore={noteDiSpecie(noteRettore, currentScreen)}
                onAggiungiNota={handleAggiungiNota}
                onRimuoviNota={handleRimuoviNota}
                selectedSubZone={selectedSubZone}
                onSubZoneChange={setSelectedSubZone}
                onToggle={handleToggleAbbattimento}
                onUpdateText={handleUpdateText}
                onOpenRuota={() => setShowRuota(true)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenMappa={() => setShowMappa(true)}
                isAdmin={isAdmin}
              />
            );
          })()
        )}
      </div>
      <BottomNav currentScreenIndex={screenIndex} onNavigate={handleScreenChange} novita={capiNuoviPerSpecie} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
