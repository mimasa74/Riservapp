import React from 'react';

interface AssignmentBoxesProps {
  totale: number;
  abbattuti: number;
  catId: string;
  onToggle: (catId: string, index: number) => void;
  isAdmin: boolean;
}

export const AssignmentBoxes = ({ totale, abbattuti, catId, onToggle, isAdmin }: AssignmentBoxesProps) => {
  return (
    <div className="flex flex-wrap gap-[5px]">
      {Array.from({ length: totale }).map((_, i) => {
        const isAbbattuto = i < abbattuti;
        return (
          <div
            key={i}
            onClick={isAdmin ? () => onToggle(catId, i) : undefined}
            className={[
              'w-[26px] h-[26px] rounded-[3px] shrink-0 flex items-center justify-center',
              isAbbattuto
                ? 'bg-[#EDEEE6] border-[1.5px] border-[#5C6B3A]'
                : 'bg-transparent border-[1.5px] border-[#5C6B3A]',
              isAdmin ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            {isAbbattuto && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="3" y1="3" x2="17" y2="17" stroke="#1A1A14" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="17" y1="3" x2="3" y2="17" stroke="#1A1A14" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};
