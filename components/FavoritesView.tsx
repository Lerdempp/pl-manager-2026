
import React from 'react';
import { Player, Position, Team } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface FavoritesViewProps {
  favoritePlayerIds: Set<string>;
  allTeams: Team[];
  marketPlayers?: Player[];
  userTeamId?: string;
  onRemoveFavorite: (playerId: string) => void;
  onInspect: (player: Player) => void;
  onBack: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ 
  favoritePlayerIds, 
  allTeams,
  marketPlayers = [],
  userTeamId,
  onRemoveFavorite, 
  onInspect,
  onBack
}) => {
  const { t, translatePosition } = useLanguage();
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getPosColor = (pos: Position) => {
    if (pos === Position.GK) return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    if ([Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(pos)) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    if ([Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(pos)) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  };

  // Get all favorite players from all teams and market
  const favoritePlayers: (Player & { teamName: string; teamId: string })[] = [];
  
  // Check teams first (transfer list players are still on their teams)
  allTeams.forEach(team => {
    team.players.forEach(player => {
      if (favoritePlayerIds.has(player.id)) {
        // Preserve all player properties including onTransferList and onLoanList
        favoritePlayers.push({ 
          ...player, 
          teamName: team.name, 
          teamId: team.id 
        });
      }
    });
  });
  
  // Check market players (players moved to market, but still have team info)
  // But prioritize team players over market players if they exist in both
  marketPlayers.forEach(player => {
    if (favoritePlayerIds.has(player.id)) {
      // Check if player is already in favoritePlayers (from teams - this takes priority)
      const alreadyAdded = favoritePlayers.some(fp => fp.id === player.id);
      if (!alreadyAdded) {
        // Check if player has team info (from market generation)
        const marketPlayer = player as any;
        if (marketPlayer.teamId && marketPlayer.teamName) {
          // Player was moved to market but has team info
          favoritePlayers.push({ 
            ...player, 
            teamName: marketPlayer.teamName, 
            teamId: marketPlayer.teamId 
          });
        } else {
          // Double check: make sure player is not in any team
          const playerTeam = allTeams.find(t => t.players.some(p => p.id === player.id));
          if (!playerTeam) {
            // Only add if player is truly not on any team (true free agent)
            favoritePlayers.push({ 
              ...player, 
              teamName: t('freeAgent'), 
              teamId: "free-agent" 
            });
          }
        }
      }
    }
  });

  // Debug: Log favorite player IDs and found players
  console.log('[FavoritesView] favoritePlayerIds:', Array.from(favoritePlayerIds));
  console.log('[FavoritesView] Found favorite players:', favoritePlayers.length);
  console.log('[FavoritesView] favoritePlayers:', favoritePlayers.map(p => ({ id: p.id, name: p.name, team: p.teamName })));

  // Sort by rating (highest first)
  favoritePlayers.sort((a, b) => b.rating - a.rating);

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-2 landscape:p-3 md:p-8 gap-2 landscape:gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end bg-zinc-900/60 backdrop-blur-md p-3 landscape:p-4 md:p-8 rounded-xl landscape:rounded-2xl md:rounded-3xl border border-white/5 shadow-xl">
        <div>
          <h1 className="text-xl landscape:text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400 mb-1 landscape:mb-2">{t('favoritesTitle')}</h1>
          <p className="text-zinc-400 text-xs landscape:text-sm md:text-base font-light">{t('trackPlayersDescription')}</p>
        </div>
        <div className="mt-2 landscape:mt-3 md:mt-0 text-right p-2 landscape:p-3 md:p-4 bg-black/40 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5">
          <div className="text-[8px] landscape:text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5 landscape:mb-1">{t('totalFavorites')}</div>
          <div className="text-lg landscape:text-xl md:text-3xl font-mono font-bold text-yellow-400">{favoritePlayers.length}</div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden bg-zinc-900/40 backdrop-blur-sm rounded-lg landscape:rounded-xl md:rounded-3xl border border-white/5 shadow-2xl flex flex-col relative">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar p-1 landscape:p-2">
          {favoritePlayers.length === 0 ? (
            <div className="p-10 landscape:p-15 md:p-20 text-center text-zinc-600 text-xs landscape:text-sm md:text-base italic font-light">
              {t('noFavoritePlayersYet')}
            </div>
          ) : (
            <div className="min-w-full inline-block">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-zinc-950/50 sticky top-0 z-10 text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 tracking-wider font-bold backdrop-blur-md">
                  <tr>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('player')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden sm:table-cell">{t('team')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('age')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('pos')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('rating')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden landscape:table-cell">{t('potential')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden sm:table-cell">{t('value')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap hidden md:table-cell">{t('wage')}</th>
                    <th className="p-1.5 landscape:p-2 md:p-5 text-right whitespace-nowrap">{t('action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {favoritePlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-1.5 landscape:p-2 md:p-5">
                      <div className="font-bold text-zinc-100 text-[10px] landscape:text-xs md:text-lg group-hover:text-white truncate max-w-[100px] landscape:max-w-none">{player.name}</div>
                      {player.scoutReport && (
                        <div className="text-[8px] landscape:text-[10px] text-yellow-500/90 italic mt-0.5 landscape:mt-1 font-medium hidden sm:block">
                          <span className="inline-block mr-1">★</span>{player.scoutReport}
                        </div>
                      )}
                    </td>
                    <td className="p-1.5 landscape:p-2 md:p-5 text-zinc-400 text-[10px] landscape:text-xs md:text-base font-bold hidden sm:table-cell truncate max-w-[80px]">{player.teamName}</td>
                    <td className="p-1.5 landscape:p-2 md:p-5 text-zinc-400 text-[10px] landscape:text-xs md:text-base font-mono">{player.age}</td>
                    <td className="p-1.5 landscape:p-2 md:p-5">
                      <span className={`px-1 landscape:px-1.5 md:px-2.5 py-0.5 landscape:py-1 md:py-1 rounded text-[7px] landscape:text-[8px] md:text-[10px] font-black tracking-wider ${getPosColor(player.position)}`}>
                        {translatePosition(player.position)}
                      </span>
                    </td>
                    <td className="p-1.5 landscape:p-2 md:p-5 font-mono text-white text-[10px] landscape:text-xs md:text-base font-bold">{player.rating}</td>
                    <td className="p-1.5 landscape:p-2 md:p-5 font-mono hidden landscape:table-cell">
                      {(() => {
                        // Show stats if: scouted, user's team, on transfer/loan list, or has team info (not free agent)
                        const shouldShow = player.scouted || 
                                         player.teamId === userTeamId || 
                                         player.onTransferList || 
                                         player.onLoanList ||
                                         (player.teamId && player.teamId !== "free-agent" && player.teamName && player.teamName !== t('freeAgent'));
                        return shouldShow ? (
                          <span className={`${player.potential > 85 ? 'text-purple-400 font-bold shadow-purple-500/50 drop-shadow-sm' : 'text-zinc-400'}`}>
                            {player.potential}
                          </span>
                        ) : (
                          <span className="text-zinc-700">??</span>
                        );
                      })()}
                    </td>
                    <td className="p-1.5 landscape:p-2 md:p-5 font-mono text-emerald-400 text-[9px] landscape:text-xs md:text-base hidden sm:table-cell">
                      {(() => {
                        const shouldShow = player.scouted || 
                                         player.teamId === userTeamId || 
                                         player.onTransferList || 
                                         player.onLoanList ||
                                         (player.teamId && player.teamId !== "free-agent" && player.teamName && player.teamName !== t('freeAgent'));
                        return shouldShow ? formatMoney(player.marketValue) : '??';
                      })()}
                    </td>
                    <td className="p-1.5 landscape:p-2 md:p-5 font-mono text-zinc-400 text-[9px] landscape:text-xs md:text-xs hidden md:table-cell">
                      {(() => {
                        const shouldShow = player.scouted || 
                                         player.teamId === userTeamId || 
                                         player.onTransferList || 
                                         player.onLoanList ||
                                         (player.teamId && player.teamId !== "free-agent" && player.teamName && player.teamName !== t('freeAgent'));
                        return shouldShow ? formatMoney(player.contract?.wage || 0) + '/wk' : '??';
                      })()}
                    </td>
                    <td className="p-1.5 landscape:p-2 md:p-5 text-right space-x-0.5 landscape:space-x-1 md:space-x-3">
                      <button 
                        onClick={() => onInspect(player)}
                        className="px-1.5 landscape:px-2 md:px-4 py-0.5 landscape:py-1 md:py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[8px] landscape:text-[10px] md:text-xs uppercase font-bold rounded landscape:rounded-md md:rounded-lg transition-all border border-white/5 whitespace-nowrap"
                      >
                        {t('inspect')}
                      </button>
                      <button 
                        onClick={() => onRemoveFavorite(player.id)}
                        className="px-1.5 landscape:px-2 md:px-4 py-0.5 landscape:py-1 md:py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white text-[8px] landscape:text-[10px] md:text-xs uppercase font-bold rounded landscape:rounded-md md:rounded-lg transition-all border border-rose-500/30 whitespace-nowrap"
                      >
                        {t('remove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

