import React, { useState } from 'react';
import { NotaRettore } from '../utils/noteRettore';

interface NoteRettoreProps {
  note: NotaRettore[];
  onAggiungi: (testo: string) => void;
  onRimuovi: (id: string) => void;
}

/**
 * Diario privato del Rettore in fondo alla scheda della specie.
 *
 * Lo monta solo AssegnazioniScreen quando isAdmin: il socio non vede il blocco
 * e, grazie alle rules su `config/note_rettore`, non ne scarica nemmeno il testo.
 */
export const NoteRettore = ({ note, onAggiungi, onRimuovi }: NoteRettoreProps) => {
  const [scrivendo, setScrivendo] = useState(false);
  const [bozza, setBozza] = useState('');

  const chiudi = () => { setScrivendo(false); setBozza(''); };

  const salva = () => {
    if (!bozza.trim()) return;
    onAggiungi(bozza.trim());
    chiudi();
  };

  const cancella = (nota: NotaRettore) => {
    // niente cestino: una nota cancellata è persa, quindi si chiede prima
    if (window.confirm(`Cancellare la nota del ${nota.data}?`)) onRimuovi(nota.id);
  };

  return (
    <div style={{ borderTop: '1px solid #d0d5c4', margin: '0 16px', padding: '14px 0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{
          fontSize: 13, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase',
          letterSpacing: '0.09em', margin: 0,
        }}>
          Note del Rettore
        </p>
        <button
          onClick={() => setScrivendo(true)}
          aria-label="Aggiungi una nota"
          style={{
            width: 44, height: 44, borderRadius: 22, flexShrink: 0,
            background: '#5C6B3A', border: 'none', color: '#EDEEE6',
            fontSize: 26, lineHeight: 1, fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>

      {scrivendo && (
        <div style={{ marginTop: 12 }}>
          <textarea
            value={bozza}
            onChange={e => setBozza(e.target.value)}
            autoFocus
            rows={3}
            placeholder="Cos'è cambiato e perché"
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              background: '#FDFDFC', border: '1.5px solid #d0d5c4', borderRadius: 8,
              padding: '10px 12px', fontFamily: 'inherit', fontSize: 18,
              color: '#1A1A14', lineHeight: 1.45,
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              onClick={salva}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                background: '#5C6B3A', color: '#EDEEE6', fontFamily: 'inherit',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Salva
            </button>
            <button
              onClick={chiudi}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                background: 'transparent', border: '1.5px solid #d0d5c4',
                color: '#6B6B5A', fontFamily: 'inherit', fontSize: 16,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {note.map(nota => (
        <div
          key={nota.id}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            marginTop: 14, paddingTop: 14, borderTop: '1px solid #e3e6d8',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block', fontSize: 13, fontWeight: 700, color: '#6B6B5A',
              letterSpacing: '0.04em', marginBottom: 3,
            }}>
              {nota.data}
            </span>
            <span style={{
              display: 'block', fontSize: 18, color: '#1A1A14',
              lineHeight: 1.45, whiteSpace: 'pre-wrap',
            }}>
              {nota.testo}
            </span>
          </span>
          <button
            onClick={() => cancella(nota)}
            aria-label="Cancella questa nota"
            style={{
              width: 44, height: 44, flexShrink: 0, marginTop: -8,
              background: 'transparent', border: 'none', color: '#8B1A1A',
              fontSize: 20, lineHeight: 1, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
