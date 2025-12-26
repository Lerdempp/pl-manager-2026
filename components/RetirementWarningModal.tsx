import React, { useState } from 'react';
import { Player } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { attemptPersuasion } from '../services/retirementService';

interface RetirementWarningModalProps {
  players: Player[];
  onPersuade: (player: Player, success: boolean) => void;
  onAccept: (player: Player) => void;
  onClose: () => void;
}

export const RetirementWarningModal: React.FC<RetirementWarningModalProps> = ({
  players,
  onPersuade,
  onAccept,
  onClose
}) => {
  const { t } = useLanguage();
  const [processingPlayer, setProcessingPlayer] = useState<string | null>(null);

  const handlePersuade = (player: Player) => {
    setProcessingPlayer(player.id);
    const success = attemptPersuasion(player);
    setTimeout(() => {
      onPersuade(player, success);
      setProcessingPlayer(null);
    }, 500);
  };

  const handleAccept = (player: Player) => {
    onAccept(player);
  };

  if (players.length === 0) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-2">{t('retirementWarning')}</h2>
          <p className="text-zinc-400">{t('retirementWarningDescription')}</p>
        </div>
        
        <div className="space-y-4">
          {players.map((player) => (
            <div 
              key={player.id}
              className="bg-zinc-800/50 rounded-xl p-6 border border-white/5 hover:border-yellow-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-white font-bold text-lg">{player.name}</div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                      player.position === 'GK' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(player.position) ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                      ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(player.position) ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {player.position}
                    </span>
                    <div className="text-zinc-400 text-sm">Age {player.age}</div>
                    <div className="text-emerald-400 font-bold">{player.rating} OVR</div>
                  </div>
                  <div className="text-zinc-500 text-sm italic">
                    {t('retirementMessage').replace('{name}', player.name)}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handlePersuade(player)}
                  disabled={processingPlayer === player.id}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                >
                  {processingPlayer === player.id ? t('processing') : t('persuadeToContinue')}
                </button>
                <button
                  onClick={() => handleAccept(player)}
                  className="flex-1 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl transition-all"
                >
                  {t('respectDecision')}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-6 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

