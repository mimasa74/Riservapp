import React from 'react';

interface BottomNavProps {
  currentScreenIndex: number;
  onNavigate: (index: number) => void;
}

const BachecaIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24"
       fill={active ? '#5C6B3A' : 'none'}
       stroke={active ? 'none' : '#6B6B5A'}
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const NAV_ITEMS = [
  { label: 'Bacheca',  icon: (active: boolean) => <BachecaIcon active={active} />, img: null },
  { label: 'Capriolo', icon: null, img: '/icons/capriolo.png' },
  { label: 'Cervo',    icon: null, img: '/icons/cervo.png' },
  { label: 'Camoscio', icon: null, img: '/icons/camoscio.png' },
];

export const BottomNav = ({ currentScreenIndex, onNavigate }: BottomNavProps) => {
  return (
    <div style={{
      background: '#fdfdfc',
      borderTop: '1px solid #d0d5c4',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 68,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
      flexShrink: 0,
    }}>
      {NAV_ITEMS.map((item, idx) => {
        const active = currentScreenIndex === idx;
        return (
          <button
            key={item.label}
            onClick={() => onNavigate(idx)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              flex: 1,
              height: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 4px 4px',
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: active ? '#D6DBCA' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {item.img ? (
                <img
                  src={item.img}
                  alt={item.label}
                  style={{
                    width: 24,
                    height: 24,
                    objectFit: 'contain',
                    opacity: active ? 1 : 0.45,
                  }}
                />
              ) : (
                item.icon!(active)
              )}
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              color: active ? '#5C6B3A' : '#6B6B5A',
              fontFamily: '-apple-system, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
