import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy, addDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppData, Post, Members, OspiteData, Slots } from './types';
import fallbackData from '../data.json';

import { initFCM } from './hooks/useFCM';
import { useGeolocation } from './hooks/useGeolocation';
import { requireOnline } from './utils/requireOnline';

import { AssegnazioniScreen } from './components/AssegnazioniScreen';
import { BachecaScreen } from './components/BachecaScreen';
import { HunterNameModal } from './components/HunterNameModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { RuotaView } from './components/RuotaView';
import { MappaScreen } from './components/MappaScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';

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
  const [posts, setPosts] = useState<Post[]>([
    { id: 'demo1', tipo: 'alert', testo: 'ATTENZIONE!! SABATO SEI SETTEMBRE CACCIA CHIUSA!', data: Date.now() },
  ]);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(
    () => !!localStorage.getItem('riservapp_onboarding')
  );
  const [members, setMembers] = useState<Members | null>(null);
  const [membersFromServer, setMembersFromServer] = useState(false);
  const [ospite, setOspite] = useState<OspiteData | null>(null);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [slotsFromServer, setSlotsFromServer] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
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

  const isModerator = !isAdmin && (members?.direttivo ?? []).some(
    n => normalizeName(n) === normalizeName(hunterName)
  );
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

  useEffect(() => {
    const docRef = doc(db, 'config', 'main');
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, snapshot => {
      if (snapshot.exists()) {
        const raw = snapshot.data();
        setRegolamentoUrl(raw.regolamento_url ?? null);
        const { regolamento_url, ...specieData } = raw;
        setData(specieData as AppData);
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) markSynced();
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
      if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) markSynced();
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
    const docRef = doc(db, 'config', 'ospite');
    return onSnapshot(docRef, snapshot => {
      if (snapshot.exists()) {
        setOspite(snapshot.data() as OspiteData);
      } else {
        if (isAdminRef.current) setDoc(docRef, { device_id: null }).catch(console.error);
        setOspite({ device_id: null });
      }
    }, (err) => console.error('[snapshot:config/ospite]', err.code, err.message));
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
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (e) {
      console.error(e);
      alert('Errore durante la cancellazione del messaggio. Riprova.');
    }
  }, []);

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
    // initFCM viene chiamato dal useEffect([hunterName]) — non chiamare qui per evitare doppio getToken()
  };


  useEffect(() => {
    if (!hunterName) return;
    if (localStorage.getItem('riservapp_fcm') === 'denied') return;
    // Chiama sempre initFCM per rinnovare il token (gestisce internamente il caso già-granted)
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

  const handleReleaseOspite = async () => {
    if (!requireOnline()) return;
    try {
      await updateDoc(doc(db, 'config', 'ospite'), { device_id: null });
    } catch (e) { console.error(e); }
  };

  const handleReleaseSlot = async (normalizedName: string) => {
    if (!requireOnline()) return;
    try {
      await updateDoc(doc(db, 'config', 'slots'), { [normalizedName]: null });
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

  const handleAddDirettivo = async (nome: string) => {
    if (!requireOnline()) return;
    try {
      await updateDoc(doc(db, 'config', 'members'), { direttivo: arrayUnion(nome) });
    } catch (e) { console.error(e); }
  };

  const handleRemoveDirettivo = async (nome: string) => {
    if (!requireOnline()) return;
    try {
      await updateDoc(doc(db, 'config', 'members'), { direttivo: arrayRemove(nome) });
    } catch (e) { console.error(e); }
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
          onAddDirettivo={handleAddDirettivo}
          onRemoveDirettivo={handleRemoveDirettivo}
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
      <OfflineBanner />
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        {currentScreen === 'bacheca' ? (
          <BachecaScreen
            posts={posts}
            hunterName={hunterName}
            isModerator={isModerator}
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
      <BottomNav currentScreenIndex={screenIndex} onNavigate={handleScreenChange} />
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
