import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Post } from '../types';
import { PostCard } from './PostCard';
import { useAuth } from '../contexts/AuthContext';

function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/).filter(Boolean).sort().join('');
}

interface BachecaScreenProps {
  posts: Post[];
  hunterName: string;
  isModerator: boolean;
  onAddPost: (tipo: Post['tipo'], testo: string, foto_url?: string | null) => void;
  onDeletePost: (id: string) => void;
  onMarkRead: (postIds: string[]) => void;
  onOpenSettings: () => void;
  onOpenMappa: () => void;
}

export const BachecaScreen = ({ posts, hunterName, isModerator, onAddPost, onDeletePost, onMarkRead, onOpenSettings, onOpenMappa }: BachecaScreenProps) => {
  const { isAdmin, login, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-segna come letti tutti i post dove il nome non è ancora in post.letti
  React.useEffect(() => {
    if (!hunterName || posts.length === 0) return;
    const normalizedHunter = normalizeName(hunterName);
    const daLeggere = posts
      .filter(p => !(p.letti ?? []).some(n => normalizeName(n) === normalizedHunter))
      .map(p => p.id);
    if (daLeggere.length === 0) return;
    onMarkRead(daLeggere);
  }, [posts, hunterName]);
  const [formTipo, setFormTipo] = useState<Post['tipo']>('normale');
  const [formTesto, setFormTesto] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    timerRef.current = setTimeout(() => setShowAdminModal(true), 3000);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!formTesto.trim() && !selectedPhoto) return;
    setUploading(true);
    try {
      let foto_url: string | null = null;
      if (selectedPhoto) {
        const storageRef = ref(storage, `posts/${Date.now()}_${selectedPhoto.name}`);
        await uploadBytes(storageRef, selectedPhoto);
        foto_url = await getDownloadURL(storageRef);
      }
      onAddPost(formTipo, formTesto.trim(), foto_url);
      setFormTesto('');
      setFormTipo('normale');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setShowForm(false);
    } catch (e) {
      console.error(e);
      alert('Errore durante il caricamento della foto. Riprova.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
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

      {/* Header Bacheca */}
      <div style={{ background: '#ECEDE1', padding: '16px 18px', display: 'flex', alignItems: 'center' }}>
        <div
          style={{ width: 103, height: 103, flexShrink: 0, touchAction: 'none', position: 'relative', WebkitTouchCallout: 'none', userSelect: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <img
            src="/logo_tuenno_ui.png"
            alt="Cacciatori Tuenno"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', WebkitTouchCallout: 'none', userSelect: 'none', pointerEvents: 'none' }}
            draggable={false}
          />
          {isAdmin && (
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 12, height: 12, borderRadius: '50%',
              background: '#5C6B3A', border: '2px solid #ECEDE1',
            }} />
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: 'inherit', fontStyle: 'italic', lineHeight: 1.4, textAlign: 'center' }}>
            Riserva Val di Tovel
          </p>
          <p style={{ fontSize: 30, fontWeight: 800, color: '#1A1A14', textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.02em', textAlign: 'center' }}>
            Bacheca
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: '-apple-system, sans-serif', lineHeight: 1.4, textAlign: 'center' }}>
            Stagione venatoria 2026
          </p>
          {isAdmin && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: '-apple-system, sans-serif' }}>
              Modalità Rettore
            </span>
          )}
          {isModerator && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#5C6B3A', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: '-apple-system, sans-serif' }}>
              Direttivo
            </span>
          )}
        </div>
        {isAdmin ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#5C6B3A' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <button onClick={onOpenMappa} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#5C6B3A' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/>
                <line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
            </button>
          </div>
        ) : (
          <div style={{ width: 40, flexShrink: 0 }} />
        )}
      </div>

      {/* Form nuovo post (admin o direttivo) */}
      {(isAdmin || isModerator) && showForm && (
        <div style={{ background: '#fff', borderBottom: '1px solid #d0d5c4', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Selezione tipo */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['normale', 'avviso', 'alert'] as Post['tipo'][]).map(t => (
              <button
                key={t}
                onClick={() => setFormTipo(t)}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 8,
                  border: formTipo === t ? '2px solid #5C6B3A' : '1.5px solid #d0d5c4',
                  background: formTipo === t ? '#5C6B3A' : '#fff',
                  color: formTipo === t ? '#EDEEE6' : '#6B6B5A',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {t === 'normale' ? 'Info' : t === 'avviso' ? 'Avviso' : 'Urgente'}
              </button>
            ))}
          </div>

          {/* Testo */}
          <textarea
            value={formTesto}
            onChange={e => setFormTesto(e.target.value)}
            placeholder="Scrivi il messaggio..."
            rows={4}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 6,
              border: '1.5px solid #d0d5c4', fontFamily: 'inherit',
              fontSize: 15, color: '#1A1A14', resize: 'none', outline: 'none',
            }}
          />

          {/* Foto */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />

          {photoPreview ? (
            <div style={{ position: 'relative' }}>
              <img
                src={photoPreview}
                alt="anteprima"
                style={{ width: '100%', borderRadius: 6, maxHeight: 200, objectFit: 'cover', display: 'block' }}
              />
              <button
                onClick={handleRemovePhoto}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: '100%', padding: '11px', borderRadius: 8,
                border: '1.5px dashed #d0d5c4', background: 'transparent',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                color: '#6B6B5A', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Aggiungi foto
            </button>
          )}

          {/* Azioni */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowForm(false); setFormTesto(''); handleRemovePhoto(); }}
              style={{
                flex: 1, padding: '12px', borderRadius: 24,
                border: '1.5px solid #d0d5c4', background: 'transparent',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                color: '#6B6B5A', cursor: 'pointer',
              }}
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              style={{
                flex: 2, padding: '12px', borderRadius: 24,
                border: 'none', background: uploading ? '#9aad7a' : '#5C6B3A',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                color: '#EDEEE6', cursor: uploading ? 'default' : 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {uploading ? 'Caricamento...' : 'Pubblica'}
            </button>
          </div>
        </div>
      )}

      {/* Lista post */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Regolamento interno — sempre visibile */}
        <a
          href="/decreto%2086_TUENNO20.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 10,
            background: '#fff', border: '1.5px solid #d0d5c4',
            textDecoration: 'none', color: '#1A1A14',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: '#5C6B3A', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EDEEE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>Regolamento Interno</p>
            <p style={{ fontSize: 12, color: '#6B6B5A', margin: '2px 0 0', fontFamily: '-apple-system, sans-serif' }}>Decreto 86 — Tuenno</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>

        {/* Pulsante + (admin o direttivo, quando form chiuso) */}
        {(isAdmin || isModerator) && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: '100%', padding: '13px', borderRadius: 24,
              border: '1.5px dashed #5C6B3A', background: 'transparent',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              color: '#5C6B3A', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuovo messaggio
          </button>
        )}

        {posts.length === 0 && (
          <p style={{ textAlign: 'center', color: '#6B6B5A', fontSize: 14, padding: '32px 0' }}>
            Nessun messaggio pubblicato.
          </p>
        )}

        {posts.map(post => (
          <PostCard key={post.id} post={post} isAdmin={isAdmin} canDelete={isAdmin || isModerator} onDelete={onDeletePost} />
        ))}

      </div>
    </div>
  );
};
