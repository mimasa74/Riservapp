import React, { useState } from 'react';
import { AppData, CategoriaStato, Members, Slots } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/).filter(Boolean).sort().join('');
}

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
  onResetOnboarding: (normalizedName: string) => void;
}

const SPECIE_ORDER = ['capriolo', 'cervo', 'camoscio'];

function getStatoOptions(badgeChiusura: string) {
  const female = badgeChiusura === 'CHIUSE';
  return [
    { value: 'aperto' as CategoriaStato, label: female ? 'Aperte' : 'Aperti', color: '#5C6B3A' },
    { value: 'sospeso' as CategoriaStato, label: female ? 'Sospese' : 'Sospesi', color: '#B8730A' },
    { value: 'chiuso' as CategoriaStato, label: female ? 'Chiuse' : 'Chiusi', color: '#8B1A1A' },
  ];
}

const CAMOSCIO_ORDER: Record<string, number> = { m1: 0, m2: 1, m3: 2, f1: 3, f2: 4, f3: 5 };
function camoscioSortKey(id: string): number {
  const suffix = id.replace(/^cam[12]_/, '');
  return CAMOSCIO_ORDER[suffix] ?? 99;
}

export const SettingsScreen = ({
  data, members, slots, onClose, onSave, onNewSeason,
  onAddMember, onRemoveMember, onReleaseSlot, onResetOnboarding,
}: SettingsScreenProps) => {
  const { online } = useOnlineStatus();
  const [localData, setLocalData] = useState<AppData>(JSON.parse(JSON.stringify(data)));
  const [activeSpecie, setActiveSpecie] = useState(SPECIE_ORDER[0]);
  const [confirmNewSeason, setConfirmNewSeason] = useState(false);
  const [newMember, setNewMember] = useState('');

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

        {!online && (
          <div style={{ background: '#8B1A1A20', color: '#8B1A1A', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
            Sei offline — le modifiche sono bloccate fino al ritorno della connessione.
          </div>
        )}

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
        {(() => {
          const isCamoscio = activeSpecie === 'camoscio';
          const zone = isCamoscio
            ? [
                { prefix: 'cam1_', label: specie.subZone?.[0]?.nome ?? 'Zona 1' },
                { prefix: 'cam2_', label: specie.subZone?.[1]?.nome ?? 'Zona 2' },
              ]
            : [{ prefix: '', label: '' }];

          return zone.map(({ prefix, label }) => {
            const cats = specie.categorie
              .filter(c => isCamoscio ? c.id.startsWith(prefix) : true)
              .sort((a, b) => isCamoscio ? camoscioSortKey(a.id) - camoscioSortKey(b.id) : 0);

            return (
              <div key={prefix} style={{ background: '#fff', borderRadius: 10, border: '1px solid #d0d5c4', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0ec', background: '#F5F6F0' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, sans-serif' }}>
                    {isCamoscio ? label : 'Categorie'}
                  </p>
                </div>
                {cats.map((cat, i) => (
                  <div
                    key={cat.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom: i < cats.length - 1 ? '1px solid #f0f0ec' : 'none',
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A14', textTransform: 'uppercase', marginBottom: 10 }}>
                      {cat.nome}
                    </p>
                    {/* Totale capi */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#6B6B5A', fontFamily: '-apple-system, sans-serif' }}>Totale capi</span>
                      <button
                        onClick={() => updateTotale(cat.id, cat.totale - 1)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #d0d5c4',
                          background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#1A1A14',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >−</button>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#1A1A14', minWidth: 28, textAlign: 'center' }}>
                        {cat.totale}
                      </span>
                      <button
                        onClick={() => updateTotale(cat.id, cat.totale + 1)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #d0d5c4',
                          background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#1A1A14',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >+</button>
                    </div>
                    {/* Stato — riga separata con desinenze corrette */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {getStatoOptions(cat.badgeChiusura).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateStato(cat.id, opt.value)}
                          style={{
                            flex: 1, padding: '8px 4px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                            fontFamily: '-apple-system, sans-serif', textTransform: 'uppercase',
                            cursor: 'pointer', letterSpacing: '0.03em',
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
                ))}
              </div>
            );
          });
        })()}

        {/* Soci */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d0d5c4', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0ec' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: '-apple-system, sans-serif' }}>
              Soci ({members.nomi.length})
            </p>
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
              disabled={!newMember.trim() || !online}
              style={{
                padding: '9px 16px', borderRadius: 6, border: 'none',
                background: newMember.trim() && online ? '#5C6B3A' : '#d0d5c4',
                color: '#EDEEE6', fontFamily: 'inherit', fontSize: 18, fontWeight: 700,
                cursor: newMember.trim() && online ? 'pointer' : 'not-allowed',
                opacity: online ? 1 : 0.5,
                pointerEvents: online ? 'auto' : 'none',
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
          {members.nomi.map((nome, i) => {
            const norm = normalizeName(nome);
            const occupied = slots[norm] != null;
            return (
              <div
                key={nome}
                style={{
                  padding: '10px 16px',
                  borderBottom: i < members.nomi.length - 1 ? '1px solid #f0f0ec' : 'none',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {/* Pallino stato */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: occupied ? '#5C6B3A' : '#d0d5c4',
                }} />
                <span style={{ fontSize: 15, color: '#1A1A14', fontFamily: '-apple-system, sans-serif', flex: 1 }}>{nome}</span>
                {occupied && (
                  <>
                    <button
                      onClick={() => onResetOnboarding(norm)}
                      disabled={!online}
                      style={{
                        fontSize: 10, fontWeight: 700, color: '#5C6B3A',
                        background: 'transparent', border: '1px solid #5C6B3A',
                        borderRadius: 10, padding: '3px 8px', cursor: online ? 'pointer' : 'not-allowed',
                        fontFamily: '-apple-system, sans-serif', textTransform: 'uppercase',
                        letterSpacing: '0.04em', flexShrink: 0,
                        opacity: online ? 1 : 0.5,
                        pointerEvents: online ? 'auto' : 'none',
                      }}
                    >
                      ↺ Onb.
                    </button>
                    <button
                      onClick={() => onReleaseSlot(norm)}
                      disabled={!online}
                      style={{
                        fontSize: 10, fontWeight: 700, color: '#8B1A1A',
                        background: 'transparent', border: '1px solid #8B1A1A',
                        borderRadius: 10, padding: '3px 8px', cursor: online ? 'pointer' : 'not-allowed',
                        fontFamily: '-apple-system, sans-serif', textTransform: 'uppercase',
                        letterSpacing: '0.04em', flexShrink: 0,
                        opacity: online ? 1 : 0.5,
                        pointerEvents: online ? 'auto' : 'none',
                      }}
                    >
                      Libera
                    </button>
                  </>
                )}
                <button
                  onClick={() => onRemoveMember(nome)}
                  disabled={!online}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: '1px solid #d0d5c4', background: 'transparent',
                    cursor: online ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#8B1A1A', fontSize: 18, lineHeight: 1,
                    flexShrink: 0,
                    opacity: online ? 1 : 0.5,
                    pointerEvents: online ? 'auto' : 'none',
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Salva */}
        <button
          onClick={() => onSave(localData)}
          disabled={!online}
          style={{
            width: '100%', padding: '16px', borderRadius: 28,
            border: 'none', background: '#5C6B3A',
            fontFamily: 'inherit', fontSize: 16, fontWeight: 800,
            color: '#EDEEE6', cursor: online ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            opacity: online ? 1 : 0.5,
            pointerEvents: online ? 'auto' : 'none',
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
                disabled={!online}
                style={{
                  flex: 2, padding: '12px', borderRadius: 24,
                  border: 'none', background: '#8B1A1A',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
                  color: '#fff', cursor: online ? 'pointer' : 'not-allowed',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  opacity: online ? 1 : 0.5,
                  pointerEvents: online ? 'auto' : 'none',
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
