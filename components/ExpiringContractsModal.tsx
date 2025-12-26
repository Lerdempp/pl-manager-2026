import React from 'react';
import { Team, Player, Position } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ExpiringContractsModalProps {
  team: Team;
  userTeamId: string;
  onPlayerInspect: (player: Player) => void;
  onRenewContract: (player: Player) => void;
  onReleasePlayer: (player: Player) => void;
  onComplete: () => void;
  translatePosition: (pos: Position) => string;
}

export const ExpiringContractsModal: React.FC<ExpiringContractsModalProps> = ({
  team,
  userTeamId,
  onPlayerInspect,
  onRenewContract,
  onReleasePlayer,
  onComplete,
  translatePosition
}) => {
  const { t } = useLanguage();

  const expiringPlayers = team.players.filter(p => (p.contract?.yearsLeft || 0) <= 0);
  const remainingPlayersCount = team.players.length - expiringPlayers.length;
  const minSquadSize = 20;

  const getPosColor = (pos: Position) => {
    if (pos === Position.GK) return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    if ([Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(pos)) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    if ([Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(pos)) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  };

  if (expiringPlayers.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-white mb-2">{t('expiringContracts')}</h2>
            <p className="text-zinc-400">{t('expiringContractsDescription')}</p>
          </div>
          <div className="text-center py-8">
            <div className="text-emerald-400 text-lg font-bold mb-2">{t('allContractsHandled')}</div>
            <button
              onClick={onComplete}
              className="mt-4 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition-all"
            >
              {t('continueToNewSeason')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-2">{t('expiringContracts')}</h2>
          <p className="text-zinc-400">{t('expiringContractsDescription')}</p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-rose-900/20 border border-rose-500/30 rounded-lg p-4 mb-4">
            <div className="text-rose-400 font-bold text-sm mb-2">
              {t('expiringContractsCount').replace('{count}', expiringPlayers.length.toString())}
            </div>
            {remainingPlayersCount < minSquadSize && (
              <div className="text-yellow-400 font-bold text-xs mt-2">
                {t('minimumSquadWarning')?.replace('{current}', remainingPlayersCount.toString())?.replace('{minimum}', minSquadSize.toString()) || 
                 `Warning: You will have ${remainingPlayersCount} players remaining. Minimum squad size is ${minSquadSize}.`}
              </div>
            )}
            {remainingPlayersCount >= minSquadSize && remainingPlayersCount === minSquadSize && (
              <div className="text-yellow-400 font-bold text-xs mt-2">
                {t('atMinimumSquad') || `You are at the minimum squad size of ${minSquadSize} players.`}
              </div>
            )}
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {expiringPlayers.map((player) => (
              <div 
                key={player.id}
                className="bg-zinc-800/50 rounded-xl p-4 border border-white/5 hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => onPlayerInspect(player)}
                        className="text-white font-bold text-lg hover:text-emerald-400 transition-colors cursor-pointer underline decoration-transparent hover:decoration-emerald-400"
                      >
                        {player.name}
                      </button>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${getPosColor(player.position)}`}>
                        {translatePosition(player.position)}
                      </span>
                      <div className="text-zinc-400 text-sm">{t('age')} {player.age}</div>
                      <div className="text-emerald-400 font-bold">{player.rating}</div>
                    </div>
                    <div className="text-zinc-500 text-xs">
                      {t('currentWage')}: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(player.contract?.wage || 0)}/wk
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onRenewContract(player)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                    >
                      {t('renewContract')}
                    </button>
                    <button
                      onClick={() => onReleasePlayer(player)}
                      disabled={remainingPlayersCount <= minSquadSize}
                      className="px-6 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold rounded-xl border border-rose-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-500/20"
                      title={remainingPlayersCount <= minSquadSize ? (t('cannotReleaseBelowMinimum') || `Cannot release player. You need at least ${minSquadSize} players.`) : undefined}
                    >
                      {t('release')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="text-zinc-500 text-sm mb-4">
              {t('cannotProceedUntilContractsHandled')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

