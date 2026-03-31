import React from 'react';
import { SpecieData, Categoria } from '../types';
import { AssignmentGrid } from './AssignmentGrid';
import { useAuth } from '../contexts/AuthContext';

interface AssignmentViewProps {
  data: SpecieData;
  selectedSubZone?: string;
  onSubZoneChange?: (zoneId: string) => void;
  onToggle: (catId: string, index: number) => void;
  onUpdateText?: (field: 'note' | 'alert' | 'penalita', value: string) => void;
}

export const AssignmentView = ({ data, selectedSubZone, onSubZoneChange, onToggle, onUpdateText }: AssignmentViewProps) => {
  const { isAdmin } = useAuth();
  
  const displayedCategories = data.categorie.filter(cat => {
    if (!data.subZone || !selectedSubZone) return true;
    const prefix = selectedSubZone === 'campa' ? 'cam1_' : 'cam2_';
    return cat.id.startsWith(prefix);
  });

  return (
    <div className="w-full flex flex-col gap-3 pb-8">
      
      {/* Camoscio Sub-tabs */}
      {data.subZone && (
        <div className="flex bg-[#e8ebe0] rounded-[24px] p-1 mb-2 shadow-inner">
          {data.subZone.map(sz => {
            const isSelected = selectedSubZone === (sz.id.includes('campa') ? 'campa' : 'tovel');
            return (
              <button
                key={sz.id}
                onClick={() => onSubZoneChange && onSubZoneChange(sz.id.includes('campa') ? 'campa' : 'tovel')}
                className={`flex-1 py-3 px-2 rounded-[20px] text-[13px] font-bold transition-all
                  ${isSelected ? 'bg-[#7a8861] text-white shadow-md' : 'text-[#6b7556]'}`}
              >
                 {sz.nome}
              </button>
            )
          })}
        </div>
      )}

      {/* Categorie Cards - Ogni categoria è una card autonoma */}
      <div className="flex flex-col gap-3">
        {displayedCategories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-[16px] p-4 shadow-sm border border-[#e5e5e0]">
            <div className="flex justify-between items-start">
              
              {/* Left side: Titles */}
              <div className="flex flex-col flex-1 pr-2">
                <h3 className="font-bold text-[14px] text-gray-900 leading-snug">
                  {cat.nome.toUpperCase()}
                </h3>
                {cat.descrizione && (
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    {cat.descrizione}
                  </p>
                )}
              </div>

              {/* Right side: Numbers, Status and Grid */}
              <div className="flex items-start flex-col items-end shrink-0 pl-2">
                {cat.stato === 'sospeso' ? (
                  <span className="text-[#8F2D2D] font-bold text-[14px] uppercase tracking-wide">Sospeso</span>
                ) : cat.stato === 'chiuso' ? (
                  <span className="text-[#8F2D2D] font-bold text-[14px] tracking-wide mb-2 uppercase">Chiusi</span>
                ) : (
                  <div className="flex items-center gap-2 mb-2 h-[20px]">
                     {/* Se non ci sono i pallini sotto, il numero deve stare qui. Se ci sono, lo spostiamo giù accanto alla griglia (come in Capriolo) */}
                  </div>
                )}

                {cat.stato !== 'sospeso' && (
                  <div className="mt-[-20px] flex items-center h-full">
                     <div className={`flex items-center ${cat.stato === 'chiuso' ? 'mt-6' : 'mt-5'} `}>
                       {cat.stato !== 'chiuso' && <span className="text-gray-700 font-medium text-[14px] mr-2">n. {cat.totale}</span>}
                       <AssignmentGrid 
                         totale={cat.totale} 
                         abbattuti={cat.abbattuti} 
                         catId={cat.id}
                         onToggle={onToggle} 
                       />
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note e Alert */}
      <div className="bg-[#fcfcf9] rounded-[20px] p-5 shadow-sm border border-[#e5e5e0] mt-4 flex flex-col gap-4">
        {data.penalita && (
          <div className="mb-2">
            {isAdmin && onUpdateText ? (
              <textarea 
                value={data.penalita}
                onChange={(e) => onUpdateText('penalita', e.target.value)}
                className="w-full text-[13px] font-medium text-gray-800 uppercase leading-relaxed bg-white border border-gray-200 p-3 rounded-xl focus:border-[#7a8861] outline-none resize-none"
                rows={2}
              />
            ) : (
              <p className="text-[13px] font-bold text-gray-800 uppercase leading-relaxed">
                {data.penalita}
              </p>
            )}
          </div>
        )}

        <div>
          {isAdmin && onUpdateText ? (
            <textarea 
              value={data.note}
              onChange={(e) => onUpdateText('note', e.target.value)}
              className="w-full text-[13px] text-gray-800 uppercase leading-relaxed bg-white border border-gray-200 p-3 rounded-xl focus:border-[#7a8861] outline-none"
              rows={4}
            />
          ) : (
            <p className="text-[13px] text-gray-800 uppercase leading-relaxed whitespace-pre-line">
              {data.note}
            </p>
          )}
        </div>

        <div className="w-full h-px bg-gray-200 my-1"></div>

        <div>
          {isAdmin && onUpdateText ? (
            <input 
              value={data.alert}
              onChange={(e) => onUpdateText('alert', e.target.value)}
              className="w-full text-[13px] font-bold text-[#8F2D2D] uppercase text-center bg-white border border-red-200 p-3 rounded-xl focus:border-red-400 outline-none"
            />
          ) : (
            <p className="text-[13px] font-bold text-[#8F2D2D] uppercase text-center">
              {data.alert}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
