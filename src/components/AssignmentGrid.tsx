import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AssignmentGridProps {
  totale: number;
  abbattuti: number;
  catId: string;
  onToggle: (catId: string, index: number) => void;
}

export const AssignmentGrid = ({ totale, abbattuti, catId, onToggle }: AssignmentGridProps) => {
  const { isAdmin } = useAuth();

  return (
    <div className="flex gap-1 justify-end ml-4 shrink-0">
      {Array.from({ length: totale }).map((_, i) => {
        const isAbbattuto = i < abbattuti;
        return (
          <div
            key={i}
            onClick={() => isAdmin && onToggle(catId, i)}
            className={`
              w-6 h-6 border-[1.5px] flex items-center justify-center transition-colors
              ${isAbbattuto 
                ? 'bg-[#8F2D2D] border-[#8F2D2D]' // Exact red from screenshot (approx)
                : 'bg-transparent border-[#8b9772]'} 
              ${isAdmin ? 'cursor-pointer active:scale-90 hover:opacity-80' : 'cursor-default'}
            `}
          >
            {/* Vogliamo l'X o solo colore unito? La spec dice "rosso pieno" */}
            {isAbbattuto && <div className="w-full h-full bg-[#8F2D2D]" />}
          </div>
        );
      })}
    </div>
  );
};
