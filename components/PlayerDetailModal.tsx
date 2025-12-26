import React, { useState } from 'react';
import { Player, Team, Position, TransferOffer } from '../types';
import { PlayerCard } from './PlayerCard';
import { useLanguage } from '../contexts/LanguageContext';
// @ts-ignore
import mvpImage from './assets/MVP.png';
// @ts-ignore
import golkraliImage from './assets/golkrali.png';
// @ts-ignore
import asistImage from './assets/asist.png';
// @ts-ignore
import kaleImage from './assets/kale.png';

interface PlayerDetailModalProps {
  player: Player;
  teams: Team[];
  userTeamId: string;
  seasonYear: string;
  offerIndices: Record<string, number>;
  onClose: () => void;
  onSetOfferIndex: (playerId: string, index: number) => void;
  onOpenOfferModal: (offer: TransferOffer, player: Player) => void;
  onSetInspectTeam: (team: Team) => void;
  onSetNegotiation: (player: Player, sellerTeam: Team) => void;
  getPlayerStats: (player: Player) => { goals: number; assists: number; apps: number; cards: number };
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  teams,
  userTeamId,
  seasonYear,
  offerIndices,
  onClose,
  onSetOfferIndex,
  onOpenOfferModal,
  onSetInspectTeam,
  onSetNegotiation,
  getPlayerStats
}) => {
  const { t } = useLanguage();
  const playerTeam = teams.find(t => t.players.some(p => p.id === player.id));
  const isOwnPlayer = playerTeam?.id === userTeamId;
  const isOpponentPlayer = playerTeam && !isOwnPlayer;
  const pendingOffers = (player.offers || []).filter(o => o.status === 'PENDING' && !o.waitingForResponse);
  const currentIndex = offerIndices[player.id] || 0;
  const currentOffer = pendingOffers[currentIndex];

  const handleSetCurrentIndex = (index: number) => {
    onSetOfferIndex(player.id, index);
  };

  const handleApproachPlayer = () => {
    if (playerTeam) {
      onClose();
      onSetInspectTeam(playerTeam);
      setTimeout(() => {
        onSetNegotiation(player, playerTeam);
      }, 100);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 landscape:p-3 md:p-4 animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-white/10 rounded-3xl py-6 md:py-10 pl-4 landscape:pl-6 md:pl-8 pr-4 landscape:pr-6 md:pr-8 shadow-2xl flex flex-col relative my-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 'calc(100vw - 32px)', width: 'calc(100vw - 32px)', overflowX: 'hidden' }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-black/20 hover:bg-black/50 p-2 rounded-full transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 items-start sm:items-start w-full" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
          <>
            {/* Player Card */}
            {true && (
              <div className="flex flex-col items-center gap-2 flex-shrink-0 relative" style={{ width: '160px', maxWidth: '160px', overflow: 'visible', marginLeft: '0' }}>
                <div style={{ width: '280px', height: '373px', transform: 'scale(0.57)', transformOrigin: 'center top', overflow: 'visible', position: 'relative', marginLeft: '0' }}>
                  <div style={{ width: '280px', height: '373px', position: 'relative' }}>
                    <PlayerCard player={player} className="shadow-2xl" cardCount={getPlayerStats(player).cards} showInjuryStatus={false} />
                </div>
              </div>
              
              {/* Injury/Illness/Suspension Status Container */}
              {(player.injury || player.illness || (player.suspensionGames > 0)) && (
                <div className="bg-zinc-800/50 rounded landscape:rounded-lg md:rounded-2xl border border-white/10 p-1.5 landscape:p-2 md:p-3 w-full -mt-[130px] landscape:-mt-[140px] md:-mt-[150px] mb-1 landscape:mb-1.5 md:mb-2 relative z-10" style={{ width: '160px', maxWidth: '160px' }}>
                  {player.injury ? (
                    <div className="bg-red-500/20 border border-red-500/40 rounded-lg landscape:rounded-xl md:rounded-xl p-1.5 landscape:p-2 md:p-2.5">
                      <div className="text-[11px] landscape:text-[12px] md:text-sm font-bold text-red-400 uppercase tracking-wider mb-0.5 landscape:mb-1 md:mb-1.5 flex items-center gap-1.5">
                        <span>🏥</span>
                        <span>{t('injured')}</span>
                      </div>
                      <div className="text-[10px] landscape:text-[11px] md:text-base text-red-300 font-medium mb-0.5">{player.injury.type}</div>
                      <div className="text-[9px] landscape:text-[10px] md:text-sm text-red-400/90">
                        {player.injury.weeksOut} {player.injury.weeksOut > 1 ? t('weeksOut') : t('weekOut')}
                      </div>
                    </div>
                  ) : null}
                  {player.illness ? (
                    <div className={`bg-orange-500/20 border border-orange-500/40 rounded-lg landscape:rounded-xl md:rounded-xl p-1.5 landscape:p-2 md:p-2.5 ${player.injury ? 'mt-1.5 landscape:mt-2 md:mt-2.5' : ''}`}>
                      <div className="text-[11px] landscape:text-[12px] md:text-sm font-bold text-orange-400 uppercase tracking-wider mb-0.5 landscape:mb-1 md:mb-1.5 flex items-center gap-1.5">
                        <span>🤒</span>
                        <span>{t('ill')}</span>
                      </div>
                      <div className="text-[10px] landscape:text-[11px] md:text-base text-orange-300 font-medium mb-0.5">{player.illness.type}</div>
                      <div className="text-[9px] landscape:text-[10px] md:text-sm text-orange-400/90">
                        {player.illness.weeksOut} {player.illness.weeksOut > 1 ? t('weeksOut') : t('weekOut')}
                      </div>
                    </div>
                  ) : null}
                  {player.suspensionGames > 0 ? (
                    <div className={`bg-yellow-500/20 border border-yellow-500/40 rounded-lg landscape:rounded-xl md:rounded-xl p-1.5 landscape:p-2 md:p-2.5 ${(player.injury || player.illness) ? 'mt-1.5 landscape:mt-2 md:mt-2.5' : ''}`}>
                      <div className="text-[11px] landscape:text-[12px] md:text-sm font-bold text-yellow-400 uppercase tracking-wider mb-0.5 landscape:mb-1 md:mb-1.5 flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>{t('suspended')}</span>
                      </div>
                      <div className="text-[9px] landscape:text-[10px] md:text-sm text-yellow-400/90">
                        {player.suspensionGames} {player.suspensionGames > 1 ? t('games') : t('game')}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              
              {/* Contract Status */}
              <div className={`bg-zinc-800/30 rounded landscape:rounded-lg md:rounded-2xl border border-white/5 p-1 landscape:p-1.5 md:p-4 w-full ${(player.injury || player.illness || (player.suspensionGames && player.suspensionGames > 0)) ? 'mt-[14px] landscape:mt-[13.5px] md:mt-[13px]' : '-mt-[115px] landscape:-mt-[125px] md:-mt-[135px]'} relative z-0`} style={{ width: '160px', maxWidth: '160px' }}>
                  <h3 className="text-zinc-500 text-[9px] landscape:text-[10px] md:text-xs uppercase tracking-widest font-bold mb-1 landscape:mb-1.5 md:mb-2 pb-1 landscape:pb-1.5 md:pb-2 border-b border-white/5">{t('contractStatus')}</h3>
                  <div className="space-y-1 landscape:space-y-1.5 md:space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-[10px] landscape:text-[11px] md:text-xs">{t('weeklyWage')}</span>
                      <span className="text-emerald-400 font-mono font-bold text-[11px] landscape:text-[12px] md:text-sm">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(player.contract?.wage || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-[10px] landscape:text-[11px] md:text-xs">{t('duration')}</span>
                      <span className="text-white font-mono font-bold text-[11px] landscape:text-[12px] md:text-sm">
                        {player.contract?.yearsLeft || 0} {t('years')}
                      </span>
                    </div>
                    {player.contract?.releaseClause && player.contract.releaseClause > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-[10px] landscape:text-[11px] md:text-xs">{t('releaseClause')}</span>
                        <span className="text-blue-400 font-mono font-bold text-[11px] landscape:text-[12px] md:text-sm">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(player.contract.releaseClause)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Awards Section */}
            {player.awards && player.awards.length > 0 && (
              <div className="w-full bg-zinc-800/30 rounded landscape:rounded-lg md:rounded-2xl border border-white/5 p-1.5 landscape:p-2 md:p-4 mt-1 landscape:mt-1.5 md:mt-4">
                <h3 className="text-zinc-500 text-[7px] landscape:text-[8px] md:text-[10px] uppercase tracking-widest font-bold mb-1 landscape:mb-1.5 md:mb-3 pb-0.5 landscape:pb-1 md:pb-2 border-b border-white/5">
                  {t('awards') || 'Awards'}
                </h3>
                <div className="space-y-1 landscape:space-y-1 md:space-y-2">
                  {['mvp', 'topScorer', 'topAssister', 'seasonGoalkeeper']
                    .map(awardType => {
                      const awardsOfType = player.awards?.filter(a => a.type === awardType) || [];
                      if (awardsOfType.length === 0) return null;
                      
                      let awardImage;
                      let awardName;
                      switch(awardType) {
                        case 'mvp':
                          awardImage = mvpImage;
                          awardName = t('seasonPlayer') || 'Season Player';
                          break;
                        case 'topScorer':
                          awardImage = golkraliImage;
                          awardName = t('topScorer') || 'Top Scorer';
                          break;
                        case 'topAssister':
                          awardImage = asistImage;
                          awardName = t('topAssister') || 'Top Assister';
                          break;
                        case 'seasonGoalkeeper':
                          awardImage = kaleImage;
                          awardName = t('seasonGoalkeeper') || 'Season Goalkeeper';
                          break;
                      }
                      
                      return (
                        <div key={awardType} className="flex items-center gap-1 landscape:gap-1.5 md:gap-3 p-0.5 landscape:p-1 md:p-2 bg-zinc-900/50 rounded landscape:rounded-lg">
                          <img src={awardImage} alt={awardName} className="w-4 h-4 landscape:w-5 landscape:h-5 md:w-8 md:h-8 object-contain" />
                          <div className="flex-1">
                            <div className="text-white text-[8px] landscape:text-[9px] md:text-xs font-bold">{awardName}</div>
                            <div className="text-zinc-500 text-[7px] landscape:text-[8px] md:text-[10px]">{awardsOfType.length}x</div>
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean)}
                </div>
              </div>
            )}
          </>

          <div className="flex-1 w-full flex flex-col min-w-0">
            {/* Season Statistics - Aligned with player card top */}
            <div className="mb-2 landscape:mb-3 md:mb-4">
              <h3 className="text-zinc-500 text-[8px] landscape:text-[9px] md:text-xs uppercase tracking-widest font-bold mb-1.5 landscape:mb-2 md:mb-4 pb-0.5 landscape:pb-1 md:pb-2 border-b border-white/5">
                {t('seasonStatistics')} ({seasonYear})
              </h3>
              <div className="grid grid-cols-4 gap-0.5 landscape:gap-1 md:gap-3 mb-2 landscape:mb-4 md:mb-6">
                <div className="bg-zinc-800/50 p-1 landscape:p-1.5 md:p-4 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 text-center">
                  <div className="text-sm landscape:text-base md:text-3xl font-black text-white">{getPlayerStats(player).goals}</div>
                  <div className="text-[6px] landscape:text-[7px] md:text-[9px] uppercase text-zinc-500 font-bold leading-none">{t('goals')}</div>
                </div>
                <div className="bg-zinc-800/50 p-1 landscape:p-1.5 md:p-4 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 text-center">
                  <div className="text-sm landscape:text-base md:text-3xl font-black text-white">{getPlayerStats(player).assists}</div>
                  <div className="text-[6px] landscape:text-[7px] md:text-[9px] uppercase text-zinc-500 font-bold leading-none">{t('assists')}</div>
                </div>
                <div className="bg-zinc-800/50 p-1 landscape:p-1.5 md:p-4 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 text-center">
                  <div className="text-sm landscape:text-base md:text-3xl font-black text-zinc-400">{getPlayerStats(player).apps}</div>
                  <div className="text-[6px] landscape:text-[7px] md:text-[9px] uppercase text-zinc-500 font-bold leading-none">{t('matches')}</div>
                </div>
                <div className="bg-zinc-800/50 p-1 landscape:p-1.5 md:p-4 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 text-center">
                  <div className="text-sm landscape:text-base md:text-3xl font-black text-yellow-400">
                    {player.matchPerformances ? player.matchPerformances.filter(p => p.manOfTheMatch).length : 0}
                  </div>
                  <div className="text-[6px] landscape:text-[7px] md:text-[9px] uppercase text-zinc-500 font-bold leading-none">EDO</div>
                </div>
              </div>
              {getPlayerStats(player).cards > 0 && (
                <div className="mb-2 landscape:mb-4 md:mb-6">
                  <div className="bg-zinc-800/50 p-1.5 landscape:p-2 md:p-4 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 text-center">
                    <div className="text-base landscape:text-lg md:text-3xl font-black text-yellow-400">{getPlayerStats(player).cards}</div>
                    <div className="text-[8px] landscape:text-[9px] md:text-[10px] uppercase text-zinc-500 font-bold mt-0.5 landscape:mt-1">{t('cards')}</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-black/20 p-2 landscape:p-3 md:p-6 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 mb-2 landscape:mb-4 md:mb-8">
              <div className="flex justify-between items-center mb-1 landscape:mb-1.5 md:mb-2">
                <span className="text-zinc-400 text-[9px] landscape:text-[10px] md:text-sm font-medium">{t('currentAbility')}</span>
                <span className="text-white font-bold text-[10px] landscape:text-xs md:text-base">{player.rating}/99</span>
              </div>
              <div className="w-full h-1 landscape:h-1.5 md:h-2 bg-zinc-800 rounded-full overflow-hidden mb-2 landscape:mb-3 md:mb-4">
                <div style={{ width: `${player.rating}%` }} className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
              </div>
              <div className="flex justify-between items-center mb-1 landscape:mb-1.5 md:mb-2">
                <span className="text-zinc-400 text-[9px] landscape:text-[10px] md:text-sm font-medium">{t('potential')}</span>
                <span className="text-purple-300 font-bold text-[10px] landscape:text-xs md:text-base">{player.potential}/99</span>
              </div>
              <div className="w-full h-1 landscape:h-1.5 md:h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div style={{ width: `${player.potential}%` }} className="h-full bg-gradient-to-r from-purple-600 to-purple-400"></div>
              </div>
            </div>
            
            {/* Match Performance History */}
            {player.matchPerformances && player.matchPerformances.length > 0 && (
              <div className="bg-zinc-800/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 mb-2 landscape:mb-4 md:mb-8">
                <h3 className="text-zinc-500 text-[8px] landscape:text-[9px] md:text-xs uppercase tracking-widest font-bold mb-1.5 landscape:mb-2 md:mb-4 pb-1 landscape:pb-1.5 md:pb-2 pt-1 landscape:pt-2 md:pt-4 pl-1.5 landscape:pl-2 md:pl-3 border-b border-white/5">
                  {t('matchPerformanceHistory')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 'auto', maxWidth: '100%' }}>
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('week')}</th>
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('opponent')}</th>
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('result')}</th>
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('rating')}</th>
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">G</th>
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">A</th>
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('shots')}</th>
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('passPercent')}</th>
                        {player.position === Position.GK && (
                          <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('saves')}</th>
                        )}
                        {[Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(player.position) && (
                          <>
                            <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('tackles')}</th>
                            <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('interceptions')}</th>
                          </>
                        )}
                        <th className="pb-1 landscape:pb-1.5 md:pb-2 pl-1 landscape:pl-2 md:pl-3 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 font-bold">{t('minutes')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {player.matchPerformances
                        .sort((a, b) => b.week - a.week)
                        .slice(0, 10)
                        .map((perf, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-zinc-400 font-mono">{perf.week}</td>
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-white font-medium">
                              {perf.opponentTeamName}
                            </td>
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3">
                              <span className={`text-[8px] landscape:text-[9px] md:text-xs font-bold px-1 landscape:px-1.5 md:px-2 py-0 rounded landscape:rounded-lg ${
                                perf.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                perf.result === 'DRAW' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {perf.teamScore}-{perf.opponentScore}
                              </span>
                            </td>
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3">
                              <span className={`text-[8px] landscape:text-[9px] md:text-xs font-bold ${
                                perf.rating >= 8.0 ? 'text-emerald-400' :
                                perf.rating >= 7.0 ? 'text-green-400' :
                                perf.rating >= 6.5 ? 'text-yellow-400' :
                                'text-zinc-400'
                              }`}>
                                {perf.rating.toFixed(1)}
                                {perf.manOfTheMatch && <span className="ml-0.5 landscape:ml-1 text-yellow-400">⭐</span>}
                              </span>
                            </td>
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-white font-bold">{perf.goals > 0 ? perf.goals : '-'}</td>
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-white font-bold">{perf.assists > 0 ? perf.assists : '-'}</td>
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-zinc-400">{perf.shots > 0 ? perf.shots : '-'}</td>
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-zinc-400">{perf.passAccuracy > 0 ? `${perf.passAccuracy}%` : '-'}</td>
                            {player.position === Position.GK && (
                              <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-zinc-400">{perf.saves > 0 ? perf.saves : '-'}</td>
                            )}
                            {[Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(player.position) && (
                              <>
                                <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-zinc-400">{perf.tackles > 0 ? perf.tackles : '-'}</td>
                                <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-zinc-400">{perf.interceptions > 0 ? perf.interceptions : '-'}</td>
                              </>
                            )}
                            <td className="py-0.5 landscape:py-1 md:py-2 pl-1 landscape:pl-2 md:pl-3 text-[8px] landscape:text-[9px] md:text-xs text-zinc-400">{perf.minutesPlayed}'</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {player.matchPerformances.length > 10 && (
                  <div className="mt-1.5 landscape:mt-2 md:mt-3 text-center text-[9px] landscape:text-[10px] md:text-xs text-zinc-500">
                    {t('showingLastMatches')} 10 {t('ofMatches')} {player.matchPerformances.length} {t('matchesLower')}
                  </div>
                )}
              </div>
            )}
            
            {/* Approach Button - Only show if player is from an opponent team */}
            {isOpponentPlayer && (
              <div className="flex justify-end mt-2 landscape:mt-3 md:mt-6">
                <button
                  onClick={handleApproachPlayer}
                  className="px-3 landscape:px-5 md:px-8 py-1.5 landscape:py-2 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider rounded-lg landscape:rounded-xl md:rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-105 flex items-center gap-1 landscape:gap-1.5 md:gap-2 text-[9px] landscape:text-[10px] md:text-sm"
                >
                  <svg className="w-3 h-3 landscape:w-4 landscape:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  {t('approachPlayer')}
                </button>
              </div>
            )}
            
            {/* Offers Section - Show for own players with offers */}
            {isOwnPlayer && (
              <div className="mt-1 landscape:mt-2 md:mt-4 bg-zinc-800/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 p-1.5 landscape:p-2 md:p-3 min-h-[80px] landscape:min-h-[90px] md:min-h-[120px]">
                {/* Show message if player is sold (has pendingTransfer to another team) */}
                {player.pendingTransfer && player.pendingTransfer.targetTeamId !== userTeamId ? (
                  <div className="bg-yellow-900/20 border border-yellow-700/30 rounded landscape:rounded-lg p-1 landscape:p-1.5 md:p-2">
                    <div className="text-yellow-400 text-[9px] landscape:text-[10px] md:text-xs font-bold">
                      {player.name} {player.pendingTransfer.targetTeamName} takımına satıldı önümüzdeki transfer penceresinde takımdan ayrılacak.
                    </div>
                  </div>
                ) : pendingOffers.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-1 landscape:mb-1.5 md:mb-2 pb-0.5 landscape:pb-1 md:pb-1.5 border-b border-white/5">
                      <h3 className="text-zinc-500 text-[8px] landscape:text-[9px] md:text-xs uppercase tracking-widest font-bold">
                        {t('pendingOffers')} ({pendingOffers.length})
                      </h3>
                      {pendingOffers.length > 1 && (
                        <div className="text-zinc-500 text-[8px] landscape:text-[9px] md:text-xs">
                          {currentIndex + 1} / {pendingOffers.length}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 landscape:gap-1.5 md:gap-2 w-full">
                  {pendingOffers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCurrentIndex((currentIndex + 1) % pendingOffers.length);
                      }}
                      className="bg-zinc-700/30 hover:bg-zinc-600/50 text-white rounded-full w-5 h-5 landscape:w-6 landscape:h-6 md:w-8 md:h-8 flex items-center justify-center transition-all z-10 shadow-lg backdrop-blur-sm flex-shrink-0"
                    >
                      <svg className="w-3 h-3 landscape:w-4 landscape:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                  <div 
                    className="bg-zinc-900/50 rounded-lg landscape:rounded-xl md:rounded-xl pt-2 landscape:pt-2.5 md:pt-3 pb-2 landscape:pb-2.5 md:pb-3 px-2.5 landscape:px-3 md:px-4 border border-white/5 hover:border-emerald-500/50 transition-all cursor-pointer flex-1 min-w-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOfferModal(currentOffer, player);
                    }}
                  >
                    <div className="flex justify-between items-start mb-0.5 landscape:mb-1 md:mb-1.5">
                      <div>
                        <div className="text-white font-bold text-[10px] landscape:text-xs md:text-sm">{currentOffer.teamName}</div>
                        <div className="text-zinc-400 text-[9px] landscape:text-[10px] md:text-xs mt-0.5">
                          {currentOffer.type === 'TRANSFER' ? t('transfer') : t('loan')}
                        </div>
                      </div>
                      <span className={`px-1 landscape:px-1.5 md:px-2 py-0.5 landscape:py-1 rounded text-[8px] landscape:text-[9px] md:text-[10px] font-bold ${
                        currentOffer.type === 'TRANSFER' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {currentOffer.type === 'TRANSFER' ? t('transfer').toUpperCase() : t('loan').toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 landscape:mt-1.5 md:mt-2 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 text-[9px] landscape:text-[10px] md:text-xs">
                          {currentOffer.type === 'TRANSFER' ? t('transferFee') : t('loanFee')}
                        </span>
                        <span className="text-emerald-400 font-mono font-bold text-[10px] landscape:text-xs md:text-sm">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(currentOffer.fee)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 landscape:mt-2 md:mt-3 text-zinc-600 text-[8px] landscape:text-[9px] md:text-[10px] text-center">
                      {t('clickToRespond')}
                    </div>
                  </div>
                </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

