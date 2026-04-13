import React from 'react';
import { Categoria } from '../types';
import { AssignmentBoxes } from './AssignmentBoxes';

interface CategoryRowProps {
  cat: Categoria;
  onToggle: (catId: string, index: number) => void;
  isAdmin: boolean;
}

export const CategoryRow = ({ cat, onToggle, isAdmin }: CategoryRowProps) => {
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
            />
          </div>
        </>
      )}

      {/* ── CHIUSO ─────────────────────────────────────────── */}
      {isChiuso && (
        <>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1A1A14', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, margin: 0 }}>
            {cat.nome}
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
              />
            </div>
          )}
        </>
      )}

      {/* ── SOSPESO ────────────────────────────────────────── */}
      {isSospeso && (
        <>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#1A1A14', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.3, margin: 0 }}>
            {cat.nome}
          </p>
          {cat.descrizione && (
            <p style={{ fontSize: 13, color: '#6B6B5A', marginTop: 5, lineHeight: 1.4 }}>
              {cat.descrizione}
            </p>
          )}
          <span style={{ display: 'inline-block', fontWeight: 700, fontSize: 15, color: '#B8730A', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 8 }}>
            {cat.badgeChiusura === 'CHIUSE' ? 'SOSPESE' : 'SOSPESI'}
          </span>
        </>
      )}

    </div>
  );
};
