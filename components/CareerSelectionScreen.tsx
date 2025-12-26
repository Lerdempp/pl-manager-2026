import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface CareerSlot {
  slot: number;
  teamName: string;
  season: string;
  lastPlayed: string;
}

interface CareerSelectionScreenProps {
  careerSlots: Array<CareerSlot | null>;
  deleteConfirmSlot: number | null;
  setDeleteConfirmSlot: (slot: number | null) => void;
  loading: boolean;
  onSlotSelect: (slotIndex: number, isEmpty: boolean) => Promise<void>;
  onDeleteConfirm: (slot: number) => void;
  onDeleteClick: (slot: number, e: React.MouseEvent) => void;
}

export const CareerSelectionScreen: React.FC<CareerSelectionScreenProps> = ({
  careerSlots,
  deleteConfirmSlot,
  setDeleteConfirmSlot,
  loading,
  onSlotSelect,
  onDeleteConfirm,
  onDeleteClick
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="h-screen w-full bg-zinc-950 relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>
      
      <div className="z-10 flex flex-col items-center gap-8 p-8 pb-12 max-w-4xl w-full">
        {/* Language Toggle Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => {
              const newLang = language === 'en' ? 'tr' : 'en';
              setLanguage(newLang);
            }}
            className="px-4 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white font-bold text-sm transition-all flex items-center gap-2"
            title={language === 'en' ? 'Switch to Turkish' : 'Türkçe\'ye Geç'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {language === 'en' ? '🇬🇧 EN' : '🇹🇷 TR'}
          </button>
        </div>
        
        <h1 className="text-5xl font-black text-white mt-5 mb-6">{t('selectCareerSlot')}</h1>
        <p className="text-zinc-400 text-lg mb-4 -mt-4">{t('chooseSlot')}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-0">
          {[0, 1, 2].map((slotIndex) => {
            const slot = careerSlots[slotIndex];
            const isEmpty = !slot;
            
            return (
              <div
                key={slotIndex}
                className={`relative p-6 rounded-2xl border-2 transition-all ${
                  isEmpty
                    ? 'bg-zinc-900/50 border-zinc-700'
                    : 'bg-zinc-900/80 border-emerald-500/30'
                }`}
              >
                {/* Delete button - only show if slot is not empty */}
                {!isEmpty && (
                  <button
                    onClick={(e) => onDeleteClick(slotIndex, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/50 flex items-center justify-center transition-all z-10"
                  >
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={async () => await onSlotSelect(slotIndex, isEmpty)}
                  disabled={loading}
                  className="w-full text-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-2xl font-black text-emerald-400 mb-4">{t('slot')} {slotIndex + 1}</div>
                  {isEmpty ? (
                    <div className="text-zinc-500 text-sm">{t('empty')}</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-white font-bold text-lg">{slot!.teamName}</div>
                      <div className="text-zinc-400 text-sm">{slot!.season}</div>
                      <div className="text-zinc-500 text-xs">{t('lastPlayed')}: {new Date(slot!.lastPlayed).toLocaleDateString()}</div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        
        {/* Delete Confirmation Modal */}
        {deleteConfirmSlot !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-black text-white mb-4">{t('deleteCareer')}</h3>
              <p className="text-zinc-400 mb-6">
                {t('deleteCareerConfirm')}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirmSlot(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => {
                    onDeleteConfirm(deleteConfirmSlot);
                    setDeleteConfirmSlot(null);
                  }}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-xl transition-all"
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

