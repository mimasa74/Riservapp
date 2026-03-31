import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { SpecieData } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface RuotaViewProps {
  data: SpecieData;
  onClose: () => void;
  onUpdateRuota: (testo: string, foto: string[]) => void;
}

export const RuotaView = ({ data, onClose, onUpdateRuota }: RuotaViewProps) => {
  const { isAdmin } = useAuth();
  const ruota = data.ruota ?? { testo: '', foto: [] };
  const foto = ruota.foto ?? [];
  const testo = ruota.testo ?? '';

  const [editingTesto, setEditingTesto] = useState(false);
  const [testoValue, setTestoValue] = useState(testo);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleSaveTesto = () => {
    setEditingTesto(false);
    onUpdateRuota(testoValue, foto);
  };

  const handleAddFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `ruote/${data.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onUpdateRuota(testo, [...foto, url]);
    } catch (e) {
      console.error(e);
      alert('Errore caricamento foto.');
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDeleteFoto = (url: string) => {
    onUpdateRuota(testo, foto.filter(f => f !== url));
  };

  return (
    <div style={{ width: '100%', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '0 4px' }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#D6DBCA', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A14', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          Ruote e Squadre — {data.nome}
        </h2>
      </div>

      {/* Testo */}
      {(testo || isAdmin) && (
        <div style={{ marginBottom: 20, background: '#EDEEE6', borderRadius: 10, border: '1px solid #d0d5c4', overflow: 'hidden' }}>
          {editingTesto ? (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={testoValue}
                onChange={e => setTestoValue(e.target.value)}
                rows={5}
                autoFocus
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  border: '1.5px solid #d0d5c4', fontFamily: 'inherit',
                  fontSize: 15, color: '#1A1A14', resize: 'none', outline: 'none',
                  background: '#fff',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setEditingTesto(false); setTestoValue(testo); }}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 24,
                    border: '1.5px solid #d0d5c4', background: 'transparent',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#6B6B5A', cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveTesto}
                  style={{
                    flex: 2, padding: '10px', borderRadius: 24,
                    border: 'none', background: '#5C6B3A',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    color: '#EDEEE6', cursor: 'pointer', textTransform: 'uppercase',
                  }}
                >
                  Salva
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{ padding: '14px 16px', cursor: isAdmin ? 'pointer' : 'default' }}
              onClick={() => isAdmin && setEditingTesto(true)}
            >
              {testo ? (
                <p style={{ fontSize: 15, color: '#1A1A14', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{testo}</p>
              ) : (
                <p style={{ fontSize: 14, color: '#6B6B5A', fontStyle: 'italic' }}>Tocca per aggiungere testo...</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Foto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {foto.map((url, i) => (
          <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
            <img
              src={url}
              alt={`foto ${i + 1}`}
              style={{ width: '100%', display: 'block' }}
            />
            {isAdmin && (
              <button
                onClick={() => handleDeleteFoto(url)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(139,26,26,0.85)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        ))}

        {/* Pulsante aggiungi foto (solo admin) */}
        {isAdmin && (
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAddFoto}
            />
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '13px', borderRadius: 24,
                border: '1.5px dashed #5C6B3A', background: 'transparent',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                color: uploading ? '#9aad7a' : '#5C6B3A', cursor: uploading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              {uploading ? 'Caricamento...' : 'Aggiungi foto'}
            </button>
          </>
        )}

        {/* Vuoto — solo cacciatori */}
        {!isAdmin && foto.length === 0 && !testo && (
          <p style={{ textAlign: 'center', color: '#6B6B5A', fontSize: 14, padding: '32px 0' }}>
            Nessuna informazione disponibile.
          </p>
        )}
      </div>
    </div>
  );
};
