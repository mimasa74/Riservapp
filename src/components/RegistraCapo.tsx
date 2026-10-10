import React, { useMemo, useState } from 'react';

interface RegistraCapoProps {
  /** es. "Capriolo — Maschi di prima classe": il Rettore vede dove sta segnando */
  titolo: string;
  soci: string[];
  onSalva: (cacciatore: string, note: string) => void;
  onAnnulla: () => void;
  /** scrittura in corso: i tasti si fermano, niente doppio capo per un doppio tocco */
  salvando?: boolean;
}

const cerca = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Foglio che si apre quando il Rettore tocca un quadratino vuoto.
 * Due domande, non una (deciso da Michele il 16 set 2026): prima il nome del
 * cacciatore, scelto dalla lista soci, poi le note, che possono restare vuote.
 * Annullando il capo non viene segnato.
 */
export const RegistraCapo = ({ titolo, soci, onSalva, onAnnulla, salvando = false }: RegistraCapoProps) => {
  const [filtro, setFiltro] = useState('');
  const [cacciatore, setCacciatore] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const elenco = useMemo(() => {
    const f = cerca(filtro.trim());
    return [...soci]
      .sort((a, b) => a.localeCompare(b, 'it'))
      .filter(n => !f || cerca(n).includes(f));
  }, [soci, filtro]);

  const tastoSecondario: React.CSSProperties = {
    flex: 1, padding: '14px', borderRadius: 24,
    border: '1.5px solid #d0d5c4', background: 'transparent',
    fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
    color: '#6B6B5A', cursor: 'pointer',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div
        role="dialog"
        aria-label="Registra il capo"
        style={{
          background: '#EDEEE6', borderRadius: '16px 16px 0 0',
          width: '100%', maxWidth: 512, maxHeight: '90dvh',
          display: 'flex', flexDirection: 'column',
          padding: '20px 16px calc(16px + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
      >
        <p style={{
          fontSize: 13, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase',
          letterSpacing: '0.09em', margin: '0 0 4px',
        }}>
          {titolo}
        </p>

        {cacciatore === null ? (
          <>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#1A1A14', margin: '0 0 12px' }}>
              Chi l'ha abbattuto?
            </p>
            <input
              type="text"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Cerca il nome"
              aria-label="Cerca il nome"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                fontSize: 18, fontFamily: 'inherit', color: '#1A1A14',
                background: '#fff', border: '1.5px solid #d0d5c4', borderRadius: 8,
                outline: 'none', marginBottom: 8,
              }}
            />
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: 12 }}>
              {elenco.map(nome => (
                <button
                  key={nome}
                  onClick={() => setCacciatore(nome)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '14px 8px', background: 'transparent',
                    border: 'none', borderBottom: '1px solid #d0d5c4',
                    fontFamily: 'inherit', fontSize: 20, color: '#1A1A14', cursor: 'pointer',
                  }}
                >
                  {nome}
                </button>
              ))}
              {elenco.length === 0 && (
                <p style={{ fontSize: 16, color: '#6B6B5A', padding: '14px 8px', margin: 0 }}>
                  Nessun socio con questo nome.
                </p>
              )}
            </div>
            <div style={{ display: 'flex' }}>
              <button onClick={onAnnulla} style={tastoSecondario}>Annulla</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#1A1A14', margin: '0 0 12px' }}>
              {cacciatore}
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Note (facoltative)"
              aria-label="Note"
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: '#FDFDFC', border: '1.5px solid #d0d5c4', borderRadius: 8,
                padding: '10px 12px', fontFamily: 'inherit', fontSize: 18,
                color: '#1A1A14', lineHeight: 1.45, marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCacciatore(null)}
                disabled={salvando}
                style={tastoSecondario}
              >
                Indietro
              </button>
              <button
                onClick={() => onSalva(cacciatore, note.trim())}
                disabled={salvando}
                style={{
                  flex: 2, padding: '14px', borderRadius: 24, border: 'none',
                  background: salvando ? '#9aad7a' : '#5C6B3A', color: '#EDEEE6',
                  fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  cursor: salvando ? 'default' : 'pointer',
                }}
              >
                {salvando ? 'Salvataggio…' : 'Segna il capo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
