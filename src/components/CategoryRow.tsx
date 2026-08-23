import React from 'react';
import { Categoria } from '../types';
import { AssignmentBoxes } from './AssignmentBoxes';

interface CategoryRowProps {
  cat: Categoria;
  onToggle: (catId: string, index: number) => void;
  isAdmin: boolean;
  /** capi segnati in questa categoria da quando il socio ha guardato l'ultima volta */
  capiNuovi?: number;
}

const PastigliaNuovo = () => (
  <span style={{
    display: 'inline-block',
    background: '#8B1A1A',
    color: '#FDFDFC',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    padding: '2px 7px',
    borderRadius: 4,
    flexShrink: 0,
  }}>
    NUOVO
  </span>
);

// Nelle classi sospese il quadratino prende l'arancione della scritta SOSPESI:
// il rosso resta libero di significare una cosa sola, "questo capo è nuovo".
const COLORE_SOSPESO = { bordo: '#B8730A', croce: '#B8730A' };

export const CategoryRow = ({ cat, onToggle, isAdmin, capiNuovi = 0 }: CategoryRowProps) => {
  const isChiuso  = cat.stato === 'chiuso';
  const isSospeso = cat.stato === 'sospeso';
  const isAperto  = cat.stato === 'aperto';

  return (
    <div className="bg-[#EDEEE6]" style={{ padding: '16px 20px' }}>

      {/* ── APERTO ─────────────────────────────────────────── */}
      {isAperto && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1A1A14', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, margin: 0 }}>
              {cat.nome}
              {capiNuovi > 0 && <> <PastigliaNuovo /></>}
            </p>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1A1A14', textTransform: 'uppercase', flexShrink: 0, margin: 0 }}>
              N.{cat.totale}
            </span>
          </div>
          {cat.descrizione && (
            <p style={{ fontSize: 13, color: '#6B6B5A', marginTop: 5, lineHeight: 1.4 }}>
              {cat.descrizione}
            </p>
          )}
          <div style={{ marginTop: 10 }}>
            <AssignmentBoxes
              totale={cat.totale}
              abbattuti={cat.abbattuti}
              catId={cat.id}
              onToggle={onToggle}
              isAdmin={isAdmin}
              capiNuovi={capiNuovi}
            />
          </div>
        </>
      )}

      {/* ── CHIUSO ─────────────────────────────────────────── */}
      {isChiuso && (
        <>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1A1A14', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, margin: 0 }}>
            {cat.nome}
            {capiNuovi > 0 && <> <PastigliaNuovo /></>}
          </p>
          {cat.descrizione && (
            <p style={{ fontSize: 13, color: '#6B6B5A', marginTop: 5, lineHeight: 1.4 }}>
              {cat.descrizione}
            </p>
          )}
          <span style={{ display: 'inline-block', fontWeight: 700, fontSize: 15, color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 8 }}>
            {cat.badgeChiusura}
          </span>
          {isAdmin && (
            <div style={{ marginTop: 10 }}>
              <AssignmentBoxes
                totale={cat.totale}
                abbattuti={cat.abbattuti}
                catId={cat.id}
                onToggle={onToggle}
                isAdmin={isAdmin}
                capiNuovi={capiNuovi}
              />
            </div>
          )}
        </>
      )}

      {/* ── SOSPESO ────────────────────────────────────────── */}
      {/* Un capo può cadere anche in una classe sospesa (errore del cacciatore):
          il Rettore deve poterlo segnare. Al socio però il piano non si mostra —
          la classe per lui resta sospesa — quindi compaiono i soli capi caduti,
          accanto alla scritta SOSPESI. */}
      {isSospeso && (
        <>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1A1A14', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, margin: 0 }}>
            {cat.nome}
            {capiNuovi > 0 && <> <PastigliaNuovo /></>}
          </p>
          {cat.descrizione && (
            <p style={{ fontSize: 13, color: '#6B6B5A', marginTop: 5, lineHeight: 1.4 }}>
              {cat.descrizione}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#B8730A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cat.badgeChiusura === 'CHIUSE' ? 'SOSPESE' : 'SOSPESI'}
            </span>
            <AssignmentBoxes
              totale={cat.totale}
              abbattuti={cat.abbattuti}
              catId={cat.id}
              onToggle={onToggle}
              isAdmin={isAdmin}
              capiNuovi={capiNuovi}
              soloAbbattuti={!isAdmin}
              colore={COLORE_SOSPESO}
            />
          </div>
        </>
      )}

    </div>
  );
};
