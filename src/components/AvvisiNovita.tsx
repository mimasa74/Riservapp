import React from 'react';
import { AvvisoNovita } from '../utils/novita';

interface AvvisiNovitaProps {
  avvisi: AvvisoNovita[];
  onApri: (specieId: string) => void;
}

/**
 * Avviso in cima alla bacheca: il piano di una specie è cambiato da quando il
 * socio ha guardato l'ultima volta. Si tocca e porta al piano della specie.
 *
 * Dice solo quale specie e quando: quanti capi e in quali categorie lo si legge
 * nel piano, dove ci sono la pastiglia NUOVO e le crocette rosse.
 */
export const AvvisiNovita = ({ avvisi, onApri }: AvvisiNovitaProps) => {
  if (avvisi.length === 0) return null;

  return (
    <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {avvisi.map(avviso => (
        <button
          key={avviso.specieId}
          onClick={() => onApri(avviso.specieId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            textAlign: 'left',
            background: '#ECEDE1',
            border: '1.5px solid #8B1A1A',
            borderRadius: 10,
            padding: '14px 16px',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <span style={{
            width: 12, height: 12, borderRadius: 6,
            background: '#8B1A1A', flexShrink: 0,
          }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block',
              fontSize: 20,
              fontWeight: 800,
              color: '#1A1A14',
              textTransform: 'uppercase',
              letterSpacing: '0.01em',
              lineHeight: 1.2,
            }}>
              {avviso.nomeSpecie}
            </span>
            <span style={{
              display: 'block',
              fontSize: 24,
              color: '#6B6B5A',
              lineHeight: 1.35,
              marginTop: 4,
            }}>
              Aggiornamento piano{avviso.aggiornato ? ` — ${avviso.aggiornato}` : ''}
            </span>
          </span>
          <span style={{ fontSize: 24, color: '#8B1A1A', flexShrink: 0, lineHeight: 1 }}>›</span>
        </button>
      ))}
    </div>
  );
};
