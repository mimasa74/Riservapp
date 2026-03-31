import React from 'react';
import { SpecieData } from '../types';
import { Header } from './Header';
import { ZoneTabs } from './ZoneTabs';
import { CategoryRow } from './CategoryRow';
import { NotesCard } from './NotesCard';

interface AssegnazioniScreenProps {
  data: SpecieData;
  selectedSubZone: string;
  onSubZoneChange: (zoneId: string) => void;
  onToggle: (catId: string, index: number) => void;
  onUpdateText: (field: 'note' | 'alert' | 'penalita', value: string) => void;
  onOpenRuota: () => void;
  onOpenSettings: () => void;
  onOpenMappa: () => void;
  isAdmin: boolean;
}

export const AssegnazioniScreen = ({
  data,
  selectedSubZone,
  onSubZoneChange,
  onToggle,
  onUpdateText,
  onOpenRuota,
  onOpenSettings,
  onOpenMappa,
  isAdmin,
}: AssegnazioniScreenProps) => {

  const haZone = !!data.subZone;

  const displayedCategories = data.categorie.filter(cat => {
    if (!haZone) return true;
    const prefix = selectedSubZone === 'campa' ? 'cam1_' : 'cam2_';
    return cat.id.startsWith(prefix);
  });

  return (
    <div className="w-full flex flex-col pb-6">

      {/* Header specie */}
      <Header
        nome={data.nome}
        nomeInglese={data.nomeInglese}
        logoUrl={data.logoUrl}
        year={data.anno ?? '2026'}
        onOpenSettings={onOpenSettings}
        onOpenMappa={onOpenMappa}
      />

      {/* ZoneTabs solo per Camoscio */}
      {haZone && (
        <div className="px-[18px] pt-3 pb-1">
          <ZoneTabs
            zones={data.subZone!.map(sz => ({
              id: sz.id.includes('campa') ? 'campa' : 'tovel',
              nome: sz.nome,
            }))}
            selected={selectedSubZone}
            onChange={onSubZoneChange}
          />
        </div>
      )}

      {/* Categorie — linee di separazione, niente card */}
      <div className="divide-y divide-[#d0d5c4] border-t border-[#d0d5c4]">
        {displayedCategories.map(cat => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            onToggle={onToggle}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {/* Note + Alert + Penalità */}
      <NotesCard
        note={data.note}
        alert={data.alert}
        penalita={data.penalita}
        onUpdateText={isAdmin ? onUpdateText : undefined}
        isAdmin={isAdmin}
      />

      {/* Timestamp */}
      {data.lastUpdated && (
        <p className="text-center text-[11px] text-[#6B6B5A] italic px-[18px] pb-2">
          Ultimo aggiornamento: {data.lastUpdated}
        </p>
      )}

      {/* Pulsante Ruota — visibile sempre all'admin, ai cacciatori solo se c'è contenuto */}
      {(isAdmin || (data.ruota && ((data.ruota.foto ?? []).length > 0 || (data.ruota.testo ?? '').trim() !== ''))) && (
        <div className="px-4 pt-2 pb-4">
          <button
            onClick={onOpenRuota}
            style={{
              width: '100%', padding: '18px', borderRadius: 28,
              background: '#5C6B3A', border: 'none',
              fontFamily: 'inherit', fontSize: 18, fontWeight: 800,
              color: '#EDEEE6', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            {data.id === 'capriolo' ? 'Assegnazioni' : 'Ruota'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

    </div>
  );
};
