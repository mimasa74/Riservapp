import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  nome: string;
  nomeInglese?: string;
  logoUrl: string;
  year?: string;
  onOpenSettings?: () => void;
  onOpenMappa?: () => void;
}

export const Header = ({ nome, nomeInglese, logoUrl, year = '2026', onOpenSettings, onOpenMappa }: HeaderProps) => {
  const { isAdmin, login, logout } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    timerRef.current = setTimeout(() => setShowAdminModal(true), 3000);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const isCamoscio = nome.toUpperCase() === 'CAMOSCIO';

  return (
    <>
    {showAdminModal && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
      }}
        onClick={() => setShowAdminModal(false)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#EDEEE6', borderRadius: 16, padding: '28px 24px',
            width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16,
          }}
        >
          <p style={{ fontSize: 17, fontWeight: 700, color: '#1A1A14', textAlign: 'center' }}>
            {isAdmin ? 'Modalità Rettore attiva' : 'Accesso Rettore'}
          </p>
          {isAdmin ? (
            <button
              onClick={() => { logout(); setShowAdminModal(false); }}
              style={{
                padding: '14px', borderRadius: 24, border: 'none',
                background: '#8B1A1A', color: '#fff',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => { login(); setShowAdminModal(false); }}
              style={{
                padding: '14px', borderRadius: 24, border: 'none',
                background: '#5C6B3A', color: '#EDEEE6',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              Accedi con Google
            </button>
          )}
          <button
            onClick={() => setShowAdminModal(false)}
            style={{
              padding: '12px', borderRadius: 24,
              border: '1.5px solid #d0d5c4', background: 'transparent',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              color: '#6B6B5A', cursor: 'pointer',
            }}
          >
            Annulla
          </button>
        </div>
      </div>
    )}
    <div
      className="flex items-center gap-[16px] px-[18px] py-[16px]"
      style={{ background: '#ECEDE1' }}
    >
      {/* Logo — il PNG è già circolare, lo mostriamo a piena dimensione */}
      <div
        className="shrink-0 relative"
        style={{ width: 80, height: 80, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={logoUrl}
          alt={nome}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
        />
        {isAdmin && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#ECEDE1]"
            style={{ background: '#5C6B3A' }}
          />
        )}
      </div>

      {/* Testo — allineato a sinistra, +30px dal logo */}
      <div className="flex-1" style={{ paddingLeft: 30 }}>
        <p
          className="font-bold uppercase"
          style={{
            fontSize: 12,
            color: '#5C6B3A',
            letterSpacing: '0.09em',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            lineHeight: 1.4,
          }}
        >
          Assegnazioni {isCamoscio ? `${year} Estiva` : year}
        </p>
        <p
          className="font-extrabold uppercase"
          style={{ fontSize: 30, color: '#1A1A14', lineHeight: 1.05, letterSpacing: '-0.02em' }}
        >
          {nome}
        </p>
        {isAdmin && (
          <span
            className="font-bold uppercase"
            style={{ fontSize: 10, color: '#5C6B3A', letterSpacing: '0.12em', fontFamily: '-apple-system, sans-serif' }}
          >
            Modalità Rettore
          </span>
        )}
      </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            {onOpenMappa && (
              <button
                onClick={onOpenMappa}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 8, color: '#5C6B3A',
                }}
                title="Mappa"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                  <line x1="8" y1="2" x2="8" y2="18"/>
                  <line x1="16" y1="6" x2="16" y2="22"/>
                </svg>
              </button>
            )}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 8, color: '#5C6B3A', flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            )}
          </div>
        )}
    </div>
    </>
  );
};
