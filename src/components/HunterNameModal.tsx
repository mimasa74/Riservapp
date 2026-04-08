import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Members, Slots } from '../types';

interface HunterNameModalProps {
  members: Members;
  slots: Slots;
  deviceId: string;
  onConfirm: (nome: string) => void;
}

function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/).filter(Boolean).sort().join('');
}

export const HunterNameModal = ({ members, slots, deviceId, onConfirm }: HunterNameModalProps) => {
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const trimmed = nome.trim();
    if (!trimmed || loading) return;
    setError('');

    const norm = normalizeName(trimmed);

    // Controlla che il nome sia nella lista
    const match = members.nomi.find(n => normalizeName(n) === norm);
    if (!match) {
      setError('Nome non riconosciuto. Contatta il Rettore.');
      return;
    }

    // Controlla lo slot
    const slotOwner = slots[norm] ?? null;
    if (slotOwner !== null && slotOwner !== deviceId) {
      setError('Nome già in uso da un altro dispositivo. Contatta il Rettore.');
      return;
    }

    // Occupa lo slot
    setLoading(true);
    try {
      await updateDoc(doc(db, 'config', 'slots'), { [norm]: deviceId });
      onConfirm(match);
    } catch {
      setError('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
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
          Inserisci il tuo nome e cognome per accedere. Viene chiesto una sola volta.
        </p>

        <input
          type="text"
          value={nome}
          onChange={e => { setNome(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="Nome e Cognome"
          autoFocus
          style={{
            width: '100%', padding: '13px 14px',
            fontSize: 16, fontFamily: 'inherit',
            color: '#1A1A14', background: '#fff',
            border: `1.5px solid ${error ? '#8B1A1A' : '#d0d5c4'}`, borderRadius: 8,
            outline: 'none', marginBottom: error ? 8 : 14,
          }}
        />

        {error && (
          <p style={{
            fontSize: 13, color: '#8B1A1A', fontFamily: '-apple-system, sans-serif',
            marginBottom: 14, lineHeight: 1.4,
          }}>
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!nome.trim() || loading}
          style={{
            width: '100%', padding: '14px',
            background: nome.trim() && !loading ? '#5C6B3A' : '#d0d5c4',
            color: nome.trim() && !loading ? '#EDEEE6' : '#fff',
            border: 'none', borderRadius: 24,
            fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: nome.trim() && !loading ? 'pointer' : 'default',
          }}
        >
          {loading ? 'Accesso...' : 'Entra'}
        </button>
      </div>
    </div>
  );
};
