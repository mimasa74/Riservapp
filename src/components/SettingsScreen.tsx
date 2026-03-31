import React, { useState } from 'react';
import { AppData, CategoriaStato } from '../types';

interface SettingsScreenProps {
  data: AppData;
  onClose: () => void;
  onSave: (updates: AppData) => void;
  onNewSeason: () => void;
}

const SPECIE_ORDER = ['capriolo', 'cervo', 'camoscio'];

const STATO_OPTIONS: { value: CategoriaStato; label: string; color: string }[] = [
  { value: 'aperto', label: 'Aperto', color: '#5C6B3A' },
  { value: 'sospeso', label: 'Sospeso', color: '#B8730A' },
  { value: 'chiuso', label: 'Chiuso', color: '#8B1A1A' },
];

export const SettingsScreen = ({ data, onClose, onSave, onNewSeason }: SettingsScreenProps) => {
  const [localData, setLocalData] = useState<AppData>(JSON.parse(JSON.stringify(data)));
  const [activeSpecie, setActiveSpecie] = useState(SPECIE_ORDER[0]);
  const [confirmNewSeason, setConfirmNewSeason] = useState(false);

  const specie = localData[activeSpecie];
  if (!specie) return null;

  const updateAnno = (value: string) => {
    setLocalData(prev => ({ ...prev, [activeSpecie]: { ...prev[activeSpecie], anno: value } }));
  };

  const updateTotale = (catId: string, value: number) => {
    setLocalData(prev => ({
      ...prev,
      [activeSpecie]: {
        ...prev[activeSpecie],
        categorie: prev[activeSpecie].categorie.map(c =>
          c.id === catId ? { ...c, totale: Math.max(0, value) } : c
        ),
      },
    }));
  };

  const updateStato = (catId: string, stato: CategoriaStato) => {
    setLocalData(prev => ({
      ...prev,
      [activeSpecie]: {
        ...prev[activeSpecie],
        categorie: prev[activeSpecie].categorie.map(c =>
          c.id === catId ? { ...c, stato } : c
        ),
      },
    }));
  };

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#EDEEE6' }}>

      {/* Header */}
      <div style={{ background: '#ECEDE1', borderBottom: '1px solid #d0d5c4', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: '#D6DBCA',
            border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: '-apple-system, sans-serif' }}>
            Modalità Rettore
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.1 }}>
            Impostazioni
          </p>
        </div>
      </div>

      {/* Tab specie */}
      <div style={{ display: 'flex', borderBottom: '1px solid #d0d5c4', background: '#ECEDE1' }}>
        {SPECIE_ORDER.map(id => (
          <button
            key={id}
            onClick={() => setActiveSpecie(id)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
              background: activeSpecie === id ? '#EDEEE6' : 'transparent',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              color: activeSpecie === id ? '#5C6B3A' : '#6B6B5A',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              borderBottom: activeSpecie === id ? '2px solid #5C6B3A' : '2px solid transparent',
            }}
          >
            {localData[id]?.nome}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Anno */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d0d5c4', padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, sans-serif', marginBottom: 10 }}>
            Anno stagione
          </p>
          <input
            type="text"
            value={specie.anno ?? '2026'}
            onChange={e => updateAnno(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 6,
              border: '1.5px solid #d0d5c4', fontFamily: 'inherit',
              fontSize: 16, color: '#1A1A14', outline: 'none', background: '#FAFAF8',
            }}
          />
        </div>

        {/* Categorie */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d0d5c4', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0ec' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, sans-serif' }}>
              Categorie
            </p>
          </div>
          {specie.categorie.map((cat, i) => (
            <div
              key={cat.id}
              style={{
                padding: '14px 16px',
                borderBottom: i < specie.categorie.length - 1 ? '1px solid #f0f0ec' : 'none',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A14', textTransform: 'uppercase', marginBottom: 10 }}>
                {cat.nome}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Totale capi */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#6B6B5A', fontFamily: '-apple-system, sans-serif' }}>Totale</span>
                  <button
                    onClick={() => updateTotale(cat.id, cat.totale - 1)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #d0d5c4',
                      background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#1A1A14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >−</button>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A14', minWidth: 24, textAlign: 'center' }}>
                    {cat.totale}
                  </span>
                  <button
                    onClick={() => updateTotale(cat.id, cat.totale + 1)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #d0d5c4',
                      background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#1A1A14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                </div>

                {/* Stato */}
                <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                  {STATO_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStato(cat.id, opt.value)}
                      style={{
                        padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        fontFamily: '-apple-system, sans-serif', textTransform: 'uppercase',
                        cursor: 'pointer', letterSpacing: '0.05em',
                        border: cat.stato === opt.value ? `2px solid ${opt.color}` : '1.5px solid #d0d5c4',
                        background: cat.stato === opt.value ? opt.color : 'transparent',
                        color: cat.stato === opt.value ? '#fff' : '#6B6B5A',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Salva */}
        <button
          onClick={() => onSave(localData)}
          style={{
            width: '100%', padding: '16px', borderRadius: 28,
            border: 'none', background: '#5C6B3A',
            fontFamily: 'inherit', fontSize: 16, fontWeight: 800,
            color: '#EDEEE6', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}
        >
          Salva impostazioni
        </button>

        {/* Nuova stagione */}
        {!confirmNewSeason ? (
          <button
            onClick={() => setConfirmNewSeason(true)}
            style={{
              width: '100%', padding: '16px', borderRadius: 28,
              border: '2px solid #8B1A1A', background: 'transparent',
              fontFamily: 'inherit', fontSize: 16, fontWeight: 800,
              color: '#8B1A1A', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}
          >
            Nuova stagione
          </button>
        ) : (
          <div style={{ background: '#FFF5F5', border: '2px solid #8B1A1A', borderRadius: 12, padding: '16px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#8B1A1A', textAlign: 'center', marginBottom: 14 }}>
              Azzera tutti gli abbattuti a zero?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmNewSeason(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 24,
                  border: '1.5px solid #d0d5c4', background: 'transparent',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  color: '#6B6B5A', cursor: 'pointer',
                }}
              >
                Annulla
              </button>
              <button
                onClick={() => { onNewSeason(); setConfirmNewSeason(false); }}
                style={{
                  flex: 2, padding: '12px', borderRadius: 24,
                  border: 'none', background: '#8B1A1A',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
                  color: '#fff', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                Conferma reset
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
