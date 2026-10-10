import React, { useState } from 'react';
import {
  VoceRegistro, vociDelGiorno, vociPerGiorno, testoReport, formatOra, nomeSpecie,
} from '../utils/registroAbbattimenti';

interface RegistroScreenProps {
  voci: VoceRegistro[];
  /** capi del piano segnati prima che il registro esistesse */
  senzaRegistro: number;
  onBack: () => void;
  /** iniettabile per i test; di norma è adesso */
  oggi?: Date;
}

const Riga = ({ v }: { v: VoceRegistro }) => (
  <div style={{ padding: '12px 0', borderTop: '1px solid #e3e6d8' }}>
    <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1A14', margin: 0, lineHeight: 1.3 }}>
      {v.cacciatore}
    </p>
    <p style={{ fontSize: 17, color: '#1A1A14', margin: '2px 0 0', lineHeight: 1.4 }}>
      {v.quando ? formatOra(v.quando) : '…'} · {nomeSpecie(v.specieId)}, {v.categoria}
      {v.zona ? ` (${v.zona})` : ''}
    </p>
    {v.note && (
      <p style={{ fontSize: 17, color: '#6B6B5A', margin: '4px 0 0', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
        {v.note}
      </p>
    )}
  </div>
);

const titoloSezione: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase',
  letterSpacing: '0.09em', margin: 0,
};

/**
 * Report degli abbattimenti, solo per il Rettore. In cima i capi di oggi —
 * quelli che la sera ricopia su bd.cacciatoritrentini.it — col tasto per
 * copiarli; sotto tutto l'archivio, giorno per giorno.
 * È una schermata che apre lui, non una notifica (deciso il 16 set 2026).
 */
export const RegistroScreen = ({ voci, senzaRegistro, onBack, oggi = new Date() }: RegistroScreenProps) => {
  const [copiato, setCopiato] = useState(false);
  const diOggi = vociDelGiorno(voci, oggi);
  const giorni = vociPerGiorno(voci);

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(testoReport(diOggi));
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      alert('Copia non riuscita su questo telefono.');
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#EDEEE6', color: '#1A1A14' }}>
      <div style={{
        background: '#ECEDE1', padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid #d0d5c4',
      }}>
        <button
          onClick={onBack}
          aria-label="Indietro"
          style={{
            width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer',
            color: '#5C6B3A', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p style={{ fontSize: 24, fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
          Registro abbattimenti
        </p>
      </div>

      <div style={{ padding: '16px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={titoloSezione}>Oggi</p>
          {diOggi.length > 0 && (
            <button
              onClick={copia}
              style={{
                padding: '10px 18px', borderRadius: 22, border: 'none',
                background: '#5C6B3A', color: '#EDEEE6', fontFamily: 'inherit',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {copiato ? 'Copiato' : 'Copia'}
            </button>
          )}
        </div>
        {diOggi.length === 0 ? (
          <p style={{ fontSize: 17, color: '#6B6B5A', margin: '10px 0 0' }}>
            Nessun capo segnato oggi.
          </p>
        ) : (
          diOggi.map(v => <Riga key={v.id} v={v} />)
        )}

        <p style={{ ...titoloSezione, marginTop: 32 }}>Archivio</p>
        {senzaRegistro > 0 && (
          <p style={{ fontSize: 16, color: '#6B6B5A', margin: '10px 0 0', lineHeight: 1.4 }}>
            {senzaRegistro === 1
              ? '1 capo della stagione è stato segnato prima del registro: senza nome e data.'
              : `${senzaRegistro} capi della stagione sono stati segnati prima del registro: senza nome e data.`}
          </p>
        )}
        {giorni.length === 0 && (
          <p style={{ fontSize: 17, color: '#6B6B5A', margin: '10px 0 0' }}>
            Il registro è vuoto.
          </p>
        )}
        {giorni.map(g => (
          <div key={g.giorno} style={{ marginTop: 18 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#6B6B5A', margin: '0 0 2px' }}>{g.giorno}</p>
            {g.voci.map(v => <Riga key={v.id} v={v} />)}
          </div>
        ))}
      </div>
    </div>
  );
};
