import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppData, Post } from './types';
import fallbackData from '../data.json';

import { AssegnazioniScreen } from './components/AssegnazioniScreen';
import { BachecaScreen } from './components/BachecaScreen';
import { HunterNameModal } from './components/HunterNameModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { RuotaView } from './components/RuotaView';
import { SettingsScreen } from './components/SettingsScreen';
import { SwipeContainer } from './components/SwipeContainer';

const ALL_SCREENS = ['bacheca', 'capriolo', 'cervo', 'camoscio'] as const;
type Screen = typeof ALL_SCREENS[number];


function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ore ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function MainApp() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AppData>((fallbackData as unknown) as AppData);
  const [hunterName, setHunterName] = useState<string>(
    () => localStorage.getItem('riservapp_nome') || ''
  );
  const [posts, setPosts] = useState<Post[]>([
    { id: 'demo1', tipo: 'alert', testo: 'ATTENZIONE!! SABATO SEI SETTEMBRE CACCIA CHIUSA!', data: Date.now() },
  ]);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(
    () => !!localStorage.getItem('riservapp_onboarding')
  );
  const [screenIndex, setScreenIndex] = useState(0);
  const [showRuota, setShowRuota] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSubZone, setSelectedSubZone] = useState('campa');

  const currentSpecieId: string =
    ALL_SCREENS[screenIndex] === 'bacheca' ? 'capriolo' : ALL_SCREENS[screenIndex];

  useEffect(() => {
    const docRef = doc(db, 'config', 'main');
    const unsubscribe = onSnapshot(docRef, snapshot => {
      if (snapshot.exists()) {
        setData(snapshot.data() as AppData);
      } else {
        // Documento non esiste — inizializza con i dati di default
        setDoc(docRef, fallbackData as unknown as Record<string, unknown>).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });
    return () => unsubscribe();
  }, []);

  const handleScreenChange = (index: number) => {
    setShowRuota(false);
    setScreenIndex(index);
  };

  const handleToggleAbbattimento = async (catId: string, index: number) => {
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
    try {
      const docRef = doc(db, 'config', 'main');
      await updateDoc(docRef, { [`${currentSpecieId}.${field}`]: value });
    } catch (e) { console.error(e); }
  };

  const handleSaveSettings = async (updatedData: AppData) => {
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
    try {
      const docRef = doc(db, 'config', 'main');
      await updateDoc(docRef, { [`${currentSpecieId}.ruota`]: { testo, foto } });
    } catch (e) { console.error(e); }
  };

  const handleAddPost = async (tipo: Post['tipo'], testo: string, foto_url?: string | null) => {
    try {
      await addDoc(collection(db, 'posts'), { tipo, testo, data: Date.now(), foto_url: foto_url ?? null, pdf_url: null });
    } catch (e) { console.error(e); }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (e) { console.error(e); }
  };

  const handleMarkRead = async (postIds: string[]) => {
    for (const id of postIds) {
      try {
        const { arrayUnion } = await import('firebase/firestore');
        await updateDoc(doc(db, 'posts', id), { letti: arrayUnion(hunterName) });
      } catch (e) { console.error(e); }
    }
  };

  const handleSetName = (nome: string) => {
    localStorage.setItem('riservapp_nome', nome);
    setHunterName(nome);
  };


  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  if (!hunterName && !isAdmin) {
    return <HunterNameModal onConfirm={handleSetName} />;
  }

  if (showSettings) {
    return (
      <div className="min-h-dvh bg-[#EDEEE6] text-[#1A1A14] max-w-lg mx-auto">
        <SettingsScreen
          data={data}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          onNewSeason={handleNewSeason}
        />
      </div>
    );
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

  return (
    <div className="min-h-dvh bg-[#EDEEE6] text-[#1A1A14] select-none">
      <div className="max-w-lg mx-auto">
        <SwipeContainer
          items={ALL_SCREENS as unknown as string[]}
          currentIndex={screenIndex}
          onChange={handleScreenChange}
        >
          {(screen: string) => {
            if (screen === 'bacheca') {
              return (
                <BachecaScreen
                  posts={posts}
                  hunterName={hunterName}
                  onAddPost={handleAddPost}
                  onDeletePost={handleDeletePost}
                  onMarkRead={handleMarkRead}
                />
              );
            }
            const spData = data[screen];
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
                isAdmin={isAdmin}
              />
            );
          }}
        </SwipeContainer>
      </div>
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
