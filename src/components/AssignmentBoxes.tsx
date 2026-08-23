import React from 'react';

interface AssignmentBoxesProps {
  totale: number;
  abbattuti: number;
  catId: string;
  onToggle: (catId: string, index: number) => void;
  isAdmin: boolean;
  /** quanti degli ultimi capi abbattuti sono nuovi per questo socio */
  capiNuovi?: number;
  /** Mostra solo i capi caduti, non il piano. Serve nelle classi sospese: al socio
   *  la classe resta sospesa, e dei quadratini vuoti gli direbbero il contrario. */
  soloAbbattuti?: boolean;
  /** Colore del bordo e della croce. Arancione nelle classi sospese, per legarsi
   *  alla scritta SOSPESI. Il rosso non si usa qui: è riservato ai capi nuovi. */
  colore?: { bordo: string; croce: string };
}

const COLORE_NORMALE = { bordo: '#5C6B3A', croce: '#1A1A14' };
const COLORE_NUOVO = { bordo: '#8B1A1A', croce: '#8B1A1A' };

export const AssignmentBoxes = ({
  totale,
  abbattuti,
  catId,
  onToggle,
  isAdmin,
  capiNuovi = 0,
  soloAbbattuti = false,
  colore = COLORE_NORMALE,
}: AssignmentBoxesProps) => {
  const caselle = soloAbbattuti ? abbattuti : totale;
  return (
    <div className="flex flex-wrap gap-[5px]">
      {Array.from({ length: caselle }).map((_, i) => {
        const isAbbattuto = i < abbattuti;
        // i capi nuovi sono gli ultimi registrati: quelli in coda ai riquadri pieni
        const isNuovo = isAbbattuto && i >= abbattuti - capiNuovi;
        const c = isNuovo ? COLORE_NUOVO : colore;
        return (
          <div
            key={i}
            data-testid="casella"
            onClick={isAdmin ? () => onToggle(catId, i) : undefined}
            style={{ borderColor: c.bordo }}
            className={[
              'w-[26px] h-[26px] rounded-[3px] shrink-0 flex items-center justify-center',
              isAbbattuto
                ? 'bg-[#EDEEE6] border-[1.5px]'
                : 'bg-transparent border-[1.5px]',
              isAdmin ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            {isAbbattuto && (
              <svg
                width="20" height="20" viewBox="0 0 20 20" fill="none"
                data-testid={isNuovo ? 'capo-nuovo' : 'capo-abbattuto'}
              >
                <line x1="3" y1="3" x2="17" y2="17" stroke={c.croce} strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="17" y1="3" x2="3" y2="17" stroke={c.croce} strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};
