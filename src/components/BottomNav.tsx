import React from 'react';

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24"
       fill={active ? '#5C6B3A' : 'none'}
       stroke={active ? 'none' : '#5C6B3A'}
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const DocIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24"
       fill={active ? '#5C6B3A' : 'none'}
       stroke={active ? 'none' : '#5C6B3A'}
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const CalendarIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24"
       fill={active ? '#5C6B3A' : 'none'}
       stroke={active ? 'none' : '#5C6B3A'}
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

interface BottomNavProps {
  currentScreenIndex: number;
  onNavigate: (index: number) => void;
}

export const BottomNav = ({ currentScreenIndex, onNavigate }: BottomNavProps) => {
  const isSpecies = currentScreenIndex === 1 || currentScreenIndex === 2;

  return (
    <div className="bg-[#fdfdfc] border-t border-[#d0d5c4]
                    pt-2 px-6 flex justify-around items-center h-16 shrink-0
                    shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">

      {/* Casa → Bacheca (index 0) */}
      <button
        onClick={() => onNavigate(0)}
        className="flex flex-col items-center justify-center p-2 transition-transform active:scale-90"
      >
        <div className={`p-1 rounded-md ${currentScreenIndex === 0 ? 'bg-[#D6DBCA]' : ''}`}>
          <HomeIcon active={currentScreenIndex === 0} />
        </div>
      </button>

      {/* Lista → Capriolo (1) o Cervo (2), mantiene la specie corrente */}
      <button
        onClick={() => onNavigate(isSpecies ? currentScreenIndex : 1)}
        className="flex flex-col items-center justify-center p-2 transition-transform active:scale-90"
      >
        <div className={`p-1 rounded-md ${isSpecies ? 'bg-[#D6DBCA]' : ''}`}>
          <DocIcon active={isSpecies} />
        </div>
      </button>

      {/* Calendario → Camoscio (index 3) */}
      <button
        onClick={() => onNavigate(3)}
        className="flex flex-col items-center justify-center p-2 transition-transform active:scale-90"
      >
        <div className={`p-1 rounded-md ${currentScreenIndex === 3 ? 'bg-[#D6DBCA]' : ''}`}>
          <CalendarIcon active={currentScreenIndex === 3} />
        </div>
      </button>

    </div>
  );
};
