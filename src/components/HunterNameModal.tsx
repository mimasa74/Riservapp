import React, { useState } from 'react';

interface HunterNameModalProps {
  onConfirm: (nome: string) => void;
}

export const HunterNameModal = ({ onConfirm }: HunterNameModalProps) => {
  const [nome, setNome] = useState('');

  const handleConfirm = () => {
    const trimmed = nome.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{
        background: '#EDEEE6', borderRadius: 16,
        padding: '28px 24px', width: '100%', maxWidth: 360,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '-apple-system, sans-serif', marginBottom: 6 }}>
          Riserva Val di Tovel
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 6 }}>
          Benvenuto
        </p>
        <p style={{ fontSize: 14, color: '#6B6B5A', lineHeight: 1.5, marginBottom: 20 }}>
          Inserisci il tuo nome per ricevere le conferme di lettura. Viene chiesto una sola volta.
        </p>

        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="Nome e Cognome"
          autoFocus
          style={{
            width: '100%', padding: '13px 14px',
            fontSize: 16, fontFamily: 'inherit',
            color: '#1A1A14', background: '#fff',
            border: '1.5px solid #d0d5c4', borderRadius: 8,
            outline: 'none', marginBottom: 14,
          }}
        />

        <button
          onClick={handleConfirm}
          disabled={!nome.trim()}
          style={{
            width: '100%', padding: '14px',
            background: nome.trim() ? '#5C6B3A' : '#d0d5c4',
            color: nome.trim() ? '#EDEEE6' : '#fff',
            border: 'none', borderRadius: 24,
            fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: nome.trim() ? 'pointer' : 'default',
          }}
        >
          Entra
        </button>
      </div>
    </div>
  );
};
