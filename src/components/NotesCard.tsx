import React from 'react';

interface NotesCardProps {
  note: string;
  alert: string;
  penalita?: string;
  onUpdateText?: (field: 'note' | 'alert' | 'penalita', value: string) => void;
  isAdmin: boolean;
}

export const NotesCard = ({ note, alert, penalita, onUpdateText, isAdmin }: NotesCardProps) => {
  const canEdit = isAdmin && !!onUpdateText;

  return (
    <div style={{ background: '#EDEEE6', borderTop: '1px solid #d0d5c4', padding: '16px 20px' }}>

      {/* Penalità (solo Camoscio) */}
      {penalita !== undefined && penalita !== '' && (
        <>
          {canEdit ? (
            <textarea
              value={penalita}
              onChange={e => onUpdateText!('penalita', e.target.value)}
              style={{ width: '100%', fontSize: 13, fontWeight: 700, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.65, background: '#fff', border: '1px solid #d0d5c4', borderRadius: 4, padding: '8px 10px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              rows={2}
            />
          ) : (
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.65 }}>
              {penalita}
            </p>
          )}
          <div style={{ height: 1, background: '#d0d5c4', margin: '14px 0' }} />
        </>
      )}

      {/* Note */}
      {canEdit ? (
        <textarea
          value={note}
          onChange={e => onUpdateText!('note', e.target.value)}
          style={{ width: '100%', fontSize: 13, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.65, background: '#fff', border: '1px solid #d0d5c4', borderRadius: 4, padding: '8px 10px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
          rows={4}
        />
      ) : (
        <p style={{ fontSize: 13, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
          {note}
        </p>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: '#d0d5c4', margin: '14px 0' }} />

      {/* Alert */}
      {canEdit ? (
        <input
          value={alert}
          onChange={e => onUpdateText!('alert', e.target.value)}
          style={{ width: '100%', fontSize: 13, fontWeight: 700, color: '#8B1A1A', textTransform: 'uppercase', textAlign: 'center', background: '#fff', border: '1px solid #d0d5c4', borderRadius: 4, padding: '8px 10px', outline: 'none', fontFamily: 'inherit' }}
        />
      ) : (
        <p style={{ fontSize: 13, fontWeight: 700, color: '#8B1A1A', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.02em', lineHeight: 1.5 }}>
          {alert}
        </p>
      )}

    </div>
  );
};
