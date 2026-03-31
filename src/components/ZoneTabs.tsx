import React from 'react';

interface ZoneTabsProps {
  zones: { id: string; nome: string }[];
  selected: string;
  onChange: (zoneId: string) => void;
}

export const ZoneTabs = ({ zones, selected, onChange }: ZoneTabsProps) => {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {zones.map(zone => {
        const isSelected = selected === zone.id;
        return (
          <button
            key={zone.id}
            onClick={() => onChange(zone.id)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: isSelected ? 'none' : '1.5px solid #5C6B3A',
              background: isSelected ? '#5C6B3A' : 'transparent',
              color: isSelected ? '#EDEEE6' : '#5C6B3A',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.03em',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {zone.nome}
          </button>
        );
      })}
    </div>
  );
};
