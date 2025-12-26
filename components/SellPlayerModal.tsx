import React from 'react';
import { Player } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SellPlayerModalProps {
  player: Player;
  onAddToLoanList: (player: Player) => void;
  onAddToTransferList: (player: Player) => void;
  onReleasePlayerFromSquad: (player: Player) => void;
  onClose: () => void;
}

export const SellPlayerModal: React.FC<SellPlayerModalProps> = ({
  player,
  onAddToLoanList,
  onAddToTransferList,
  onReleasePlayerFromSquad,
  onClose
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-black text-white mb-2">{t('listPlayerTitle')}</h2>
        <p className="text-zinc-400 mb-6">{t('listPlayerDescription', { playerName: player.name })}</p>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={() => onAddToLoanList(player)}
            className="px-6 py-4 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl font-bold border border-blue-500/30 hover:border-blue-500 transition-all"
          >
            {t('addToLoanList')}
          </button>
          <button
            onClick={() => onAddToTransferList(player)}
            className="px-6 py-4 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl font-bold border border-emerald-500/30 hover:border-emerald-500 transition-all"
          >
            {t('addToTransferList')}
          </button>
          <button
            onClick={() => onReleasePlayerFromSquad(player)}
            className="px-6 py-4 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl font-bold border border-rose-500/30 hover:border-rose-500 transition-all"
          >
            {t('releasePlayer') || 'Release Player'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold border border-white/5 transition-all"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

