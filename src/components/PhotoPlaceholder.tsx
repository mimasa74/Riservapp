export function PhotoPlaceholder({ aspectRatio = '4 / 3' }: { aspectRatio?: string }) {
  return (
    <div
      style={{
        aspectRatio,
        background: '#d0d5c4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#5C6B3A',
        flexDirection: 'column',
        gap: 8,
        borderRadius: 6,
        marginTop: 12,
      }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span style={{ fontSize: 14 }}>Foto non disponibile offline</span>
    </div>
  );
}
