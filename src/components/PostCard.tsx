import React, { useEffect, useRef, useState } from 'react';
import { Post } from '../types';
import { PhotoPlaceholder } from './PhotoPlaceholder';

interface PostCardProps {
  post: Post;
  isAdmin: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

function formatData(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SWIPE_DISMISS_PX = 60;

const TIPO_LABEL: Record<Post['tipo'], string> = {
  normale: 'INFO',
  avviso: 'AVVISO',
  alert: 'URGENTE',
};

const TIPO_STYLE: Record<Post['tipo'], React.CSSProperties> = {
  normale: { background: '#fff', border: '1px solid #d0d5c4' },
  avviso:  { background: '#fff', border: '2px solid #5C6B3A' },
  alert:   { background: '#FFF5F5', border: '2px solid #8B1A1A' },
};

const BADGE_STYLE: Record<Post['tipo'], React.CSSProperties> = {
  normale: { background: '#E8EBE0', color: '#5C6B3A' },
  avviso:  { background: '#5C6B3A', color: '#EDEEE6' },
  alert:   { background: '#8B1A1A', color: '#fff' },
};

const PostCardInner = ({ post, isAdmin, canDelete, onDelete }: PostCardProps) => {
  const [showLetti, setShowLetti] = useState(false);
  const [fotoFailed, setFotoFailed] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const letti: string[] = post.letti ?? [];
  const fotoUrl = post.foto_url;

  useEffect(() => {
    if (!showLightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLightbox(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [showLightbox]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (dy < -SWIPE_DISMISS_PX) setShowLightbox(false);
  };

  return (
    <div style={{ ...TIPO_STYLE[post.tipo], borderRadius: 8, padding: '14px 16px' }}>

      {/* Riga superiore: badge tipo + data + cestino */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <span style={{
          ...BADGE_STYLE[post.tipo],
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 20,
          fontFamily: '-apple-system, sans-serif',
        }}>
          {TIPO_LABEL[post.tipo]}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, color: '#6B6B5A', fontFamily: '-apple-system, sans-serif' }}>
            {formatData(post.data)}
          </span>
          {canDelete && (
            <button
              onClick={() => onDelete(post.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#8B1A1A', display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Testo */}
      <p style={{ fontSize: 30, color: '#1A1A14', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {post.testo}
      </p>

      {/* Foto */}
      {fotoUrl && !fotoFailed && (
        <img
          src={fotoUrl}
          alt="foto"
          loading="lazy"
          onClick={() => setShowLightbox(true)}
          style={{
            marginTop: 12,
            width: '100%',
            aspectRatio: post.foto_width && post.foto_height
              ? `${post.foto_width} / ${post.foto_height}`
              : '4 / 3',
            objectFit: 'cover',
            borderRadius: 6,
            display: 'block',
            cursor: 'zoom-in',
          }}
          onError={() => setFotoFailed(true)}
        />
      )}
      {showLightbox && fotoUrl && (
        <div
          onClick={() => setShowLightbox(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'pan-y',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
            aria-label="Chiudi"
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 1,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <img
            src={fotoUrl}
            alt="foto"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '100%',
              objectFit: 'contain', display: 'block',
            }}
          />
        </div>
      )}
      {fotoUrl && fotoFailed && (
        <PhotoPlaceholder
          aspectRatio={
            post.foto_width && post.foto_height
              ? `${post.foto_width} / ${post.foto_height}`
              : '4 / 3'
          }
        />
      )}

      {/* PDF */}
      {post.pdf_url && (
        <a href={post.pdf_url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, color: '#5C6B3A', fontWeight: 700, textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Apri allegato PDF
        </a>
      )}

      {/* Conferme lettura — solo admin */}
      {isAdmin && (
        <div style={{ marginTop: 12, borderTop: '1px solid #e8ebe0', paddingTop: 10 }}>
          <button
            onClick={() => setShowLetti(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: '#5C6B3A', fontFamily: 'inherit',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {letti.length} {letti.length === 1 ? 'ha letto' : 'hanno letto'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showLetti ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showLetti && letti.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {letti.map((nome, i) => (
                <span key={i} style={{ fontSize: 13, color: '#6B6B5A', paddingLeft: 20 }}>
                  • {nome}
                </span>
              ))}
            </div>
          )}

          {showLetti && letti.length === 0 && (
            <p style={{ fontSize: 13, color: '#6B6B5A', marginTop: 6, paddingLeft: 20 }}>
              Nessuno ha ancora letto questo messaggio.
            </p>
          )}
        </div>
      )}

    </div>
  );
};

// onSnapshot rigenera gli oggetti Post a ogni tick: senza comparatore esplicito
// React.memo fallirebbe sempre. Confronto i campi che PostCard rende davvero.
export const PostCard = React.memo(PostCardInner, (prev, next) =>
  prev.post.id === next.post.id &&
  prev.post.tipo === next.post.tipo &&
  prev.post.testo === next.post.testo &&
  prev.post.foto_url === next.post.foto_url &&
  prev.post.pdf_url === next.post.pdf_url &&
  prev.post.foto_width === next.post.foto_width &&
  prev.post.foto_height === next.post.foto_height &&
  prev.post.data === next.post.data &&
  (prev.post.letti?.length ?? 0) === (next.post.letti?.length ?? 0) &&
  prev.canDelete === next.canDelete &&
  prev.isAdmin === next.isAdmin &&
  prev.onDelete === next.onDelete
);
