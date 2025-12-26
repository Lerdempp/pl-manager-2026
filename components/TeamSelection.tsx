
import React, { useState, useMemo, useCallback } from 'react';
import { Team, Player, Position } from '../types';
import { TacticsBoard } from './TacticsBoard';
import { useLanguage } from '../contexts/LanguageContext';

interface TeamSelectionProps {
  teams: Team[];
  onSelect: (team: Team) => void;
  onInspect?: (player: Player) => void;
}

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

const getPosColor = (pos: Position) => {
  if (pos === Position.GK) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if ([Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(pos)) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  if ([Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(pos)) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
};

const TeamCard = React.memo<{ team: Team; onPreview: (team: Team) => void; t: (key: string) => string }>(({ team, onPreview, t }) => {
  return (
    <button
      onClick={() => onPreview(team)}
      style={{ 
        background: team.color || 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
      className="group relative overflow-hidden border border-white/10 rounded-3xl p-6 text-left transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col h-[280px]"
    >
      {/* Dark Overlay to ensure text readability over colorful gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90 group-hover:opacity-80 transition-opacity duration-500" style={{ transform: 'translateZ(0)' }}></div>
      
      {/* Card Highlight Effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-30 transition-all duration-500" style={{ transform: 'translateZ(0)' }}></div>
      
      <div className="relative z-10 flex justify-between items-start mb-6" style={{ transform: 'translateZ(0)' }}>
        <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-xl font-bold text-white/80 group-hover:text-white group-hover:scale-110 transition-all shadow-lg">
          {team.name.charAt(0)}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">{t('budget')}</div>
          <div className="text-xl font-mono font-bold text-white group-hover:text-emerald-300 transition-colors">
            ${(team.budget / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>
      
      <div className="relative z-10 mt-auto" style={{ transform: 'translateZ(0)' }}>
        <h2 className="text-3xl font-black text-white mb-2 leading-none">{team.name}</h2>
        <div className="h-1 w-8 bg-white/50 rounded-full mb-4 group-hover:w-16 group-hover:bg-emerald-400 transition-all duration-300"></div>
        
        <div className="flex flex-wrap gap-2">
          <span className="bg-black/60 text-white px-2 py-1 rounded text-xs border border-white/10 font-mono">
            {t('overallRatingShort')} <span className="text-emerald-300 font-bold">{team.baseRating}</span>
          </span>
          <div className="flex items-center gap-1 bg-black/60 text-zinc-300 px-2 py-1 rounded text-xs border border-white/10">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            <span>{t('inspect')}</span>
          </div>
        </div>
      </div>
    </button>
  );
});

export const TeamSelection: React.FC<TeamSelectionProps> = ({ teams, onSelect, onInspect }) => {
  const { t, translatePosition } = useLanguage();
  const leagues = useMemo(() => Array.from(new Set(teams.map(t => t.league))), [teams]);
  const [selectedLeague, setSelectedLeague] = useState<string>(leagues[0] || "");
  const [previewTeam, setPreviewTeam] = useState<Team | null>(null);

  const displayedTeams = useMemo(() => 
    teams
      .filter(t => t.league === selectedLeague)
      .sort((a, b) => a.name.localeCompare(b.name))
  , [teams, selectedLeague]);
  
  const handlePreview = useCallback((team: Team) => {
    setPreviewTeam(team);
  }, []);


  // Parse formation string
  const parseFormation = (form: string): { def: number; mid: number; fwd: number } => {
      const parts = form.split('-').map(Number);
      if (parts.length === 3) {
          return { def: parts[0], mid: parts[1], fwd: parts[2] };
      } else if (parts.length === 4) {
          return { def: parts[0], mid: parts[1] + parts[2], fwd: parts[3] };
      }
      return { def: 4, mid: 3, fwd: 3 };
  };

  // Calculate Best XI for display based on team's formation
  const getStartingXI = useCallback((team: Team) => {
      const formation = team.tactics?.formation || "4-3-3";
      const { def: defCount, mid: midCount, fwd: fwdCount } = parseFormation(formation);
      
      // Filter out unavailable players (suspended, injured, or ill)
      const availablePlayers = team.players.filter(p => 
          (!p.suspensionGames || p.suspensionGames === 0) &&
          !p.injury &&
          !p.illness
      );
      
      const sorted = [...availablePlayers].sort((a, b) => b.rating - a.rating);
      
      // Helper functions
      const isGK = (p: Player) => p.position === Position.GK;
      const isDef = (p: Player) => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(p.position);
      const isMid = (p: Player) => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position);
      const isFwd = (p: Player) => [Position.ST, Position.CF, Position.RW, Position.LW].includes(p.position);
      
      // Get best players for each position
      const gk = sorted.filter(isGK).slice(0, 1);
      const def = sorted.filter(isDef).slice(0, defCount);
      const mid = sorted.filter(isMid).slice(0, midCount);
      
      // Forward selection: prioritize specific positions (LW, ST, RW)
      const lwPlayers = sorted.filter(p => p.position === Position.LW);
      const stPlayers = sorted.filter(p => [Position.ST, Position.CF].includes(p.position)).sort((a, b) => b.rating - a.rating);
      const rwPlayers = sorted.filter(p => p.position === Position.RW);
      
      const fwdUsedIds = new Set<string>();
      const fwd: Player[] = [];
      
      // Select forwards based on formation requirements
      if (fwdCount >= 3) {
          // 3 forwards: LW, ST, RW
          if (lwPlayers.length > 0 && !fwdUsedIds.has(lwPlayers[0].id)) {
              fwd.push(lwPlayers[0]);
              fwdUsedIds.add(lwPlayers[0].id);
          }
          if (stPlayers.length > 0 && !fwdUsedIds.has(stPlayers[0].id)) {
              fwd.push(stPlayers[0]);
              fwdUsedIds.add(stPlayers[0].id);
          }
          if (rwPlayers.length > 0 && !fwdUsedIds.has(rwPlayers[0].id)) {
              fwd.push(rwPlayers[0]);
              fwdUsedIds.add(rwPlayers[0].id);
          }
      } else if (fwdCount === 2) {
          // 2 forwards: ST, then best wing
          if (stPlayers.length > 0 && !fwdUsedIds.has(stPlayers[0].id)) {
              fwd.push(stPlayers[0]);
              fwdUsedIds.add(stPlayers[0].id);
          }
          const wings = [...lwPlayers, ...rwPlayers].filter(p => !fwdUsedIds.has(p.id));
          if (wings.length > 0) {
              fwd.push(wings[0]);
              fwdUsedIds.add(wings[0].id);
          }
      } else if (fwdCount === 1) {
          // 1 forward: ST
          if (stPlayers.length > 0 && !fwdUsedIds.has(stPlayers[0].id)) {
              fwd.push(stPlayers[0]);
              fwdUsedIds.add(stPlayers[0].id);
          }
      }
      
      // Fill remaining forward slots
      while (fwd.length < fwdCount) {
          const remaining = sorted.filter(p => isFwd(p) && !fwdUsedIds.has(p.id));
          if (remaining.length > 0) {
              fwd.push(remaining[0]);
              fwdUsedIds.add(remaining[0].id);
          } else break;
      }

      // Combine all positions and remove duplicates
      const allSelected = [...gk, ...def, ...mid, ...fwd];
      const usedIds = new Set<string>();
      const xi: Player[] = [];
      
      allSelected.forEach(p => {
          if (!usedIds.has(p.id)) {
              usedIds.add(p.id);
              xi.push(p);
          }
      });
      
      // Fill if missing
      if (xi.length < 11) {
          const remaining = sorted.filter(p => !usedIds.has(p.id));
          xi.push(...remaining.slice(0, 11 - xi.length));
      }
      
      return xi;
  }, []);

  // --- PREVIEW MODAL ---
  if (previewTeam) {
      const startingXI = getStartingXI(previewTeam);
      
      return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            <div className="w-full max-w-6xl h-full max-h-[90vh] bg-zinc-900 border border-white/10 rounded-3xl flex flex-col overflow-y-auto shadow-2xl relative">

                 {/* Modal Header */}
                 <div className="relative z-10 p-8 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 bg-gradient-to-b from-transparent to-zinc-900/90">
                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            onClick={() => setPreviewTeam(null)}
                            className="self-start text-zinc-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors bg-black/30 px-3 py-1 rounded-full border border-white/5 hover:bg-black/50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            {t('backToTeams')}
                        </button>
                        
                        <div className="flex justify-between items-end w-full">
                            <div>
                                <h2 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight drop-shadow-xl">{previewTeam.name}</h2>
                                <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-zinc-200 border border-white/5">{t('overallRatingShort')} <strong className="text-emerald-400 text-lg ml-1">{previewTeam.baseRating}</strong></span>
                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-zinc-200 border border-white/5">{previewTeam.league === 'Premier League' ? t('premierLeague') : previewTeam.league}</span>
                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-zinc-200 border border-white/5">{previewTeam.players.length} {t('players')}</span>
                                </div>
                            </div>
                            <div className="text-right hidden md:block">
                                {previewTeam.manager && (
                                    <div className="mb-4">
                                        <div className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1">{t('manager')}</div>
                                        <div className="text-xl font-bold text-white">{previewTeam.manager}</div>
                                    </div>
                                )}
                                <div className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1">{t('startingBudget')}</div>
                                <div className="text-5xl font-mono font-bold text-emerald-400 drop-shadow-lg tracking-tighter">{formatMoney(previewTeam.budget)}</div>
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 {/* Mobile Budget (Visible only on small screens) */}
                 <div className="md:hidden px-8 pb-4 relative z-10 bg-zinc-900/90">
                    {previewTeam.manager && (
                        <div className="mb-4">
                            <div className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1">{t('manager')}</div>
                            <div className="text-xl font-bold text-white">{previewTeam.manager}</div>
                        </div>
                    )}
                    <div className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1">{t('startingBudget')}</div>
                    <div className="text-4xl font-mono font-bold text-emerald-400">{formatMoney(previewTeam.budget)}</div>
                 </div>

                 {/* Content: Formation + Squad Table */}
                 <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/30 relative">
                    <div className="flex flex-col lg:flex-row gap-8 p-8">
                        {/* Left: Starting XI Formation */}
                        <div className="flex-1 flex flex-col items-center">
                            <div className="flex justify-between items-center mb-4 w-full max-w-md">
                                <div className="text-xs uppercase font-bold text-zinc-500">{t('formation')}</div>
                                <div className="text-white font-bold font-mono bg-black/40 px-3 py-1 rounded-full border border-white/5 text-sm">
                                    {previewTeam.tactics?.formation || "4-3-3"}
                                </div>
                            </div>
                            <TacticsBoard players={startingXI} formation={previewTeam.tactics?.formation || "4-3-3"} />
                            <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-lg">
                                <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 text-center">
                                    <div className="text-[10px] uppercase font-bold text-zinc-500">{t('attackRating')}</div>
                                    <div className="text-xl font-black text-white">
                                        {(() => {
                                            const attackers = startingXI.filter(p => [Position.ST, Position.LW, Position.RW, Position.CF].includes(p.position));
                                            return attackers.length > 0 
                                                ? Math.round(attackers.reduce((acc, p) => acc + p.rating, 0) / attackers.length)
                                                : 0;
                                        })()}
                                    </div>
                                </div>
                                <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 text-center">
                                    <div className="text-[10px] uppercase font-bold text-zinc-500">{t('defenseRating')}</div>
                                    <div className="text-xl font-black text-white">
                                        {(() => {
                                            const defenders = startingXI.filter(p => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.GK].includes(p.position));
                                            return defenders.length > 0
                                                ? Math.round(defenders.reduce((acc, p) => acc + p.rating, 0) / defenders.length)
                                                : 0;
                                        })()}
                                    </div>
                                </div>
                                <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 text-center">
                                    <div className="text-[10px] uppercase font-bold text-zinc-500">{t('midfieldRating')}</div>
                                    <div className="text-xl font-black text-white">
                                        {(() => {
                                            const midfielders = startingXI.filter(p => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position));
                                            return midfielders.length > 0
                                                ? Math.round(midfielders.reduce((acc, p) => acc + p.rating, 0) / midfielders.length)
                                                : 0;
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-center">
                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-center">
                                    <div className="text-[10px] uppercase font-bold text-emerald-400">{t('overallRating')}</div>
                                    <div className="text-2xl font-black text-emerald-400">
                                        {(() => {
                                            const attackers = startingXI.filter(p => [Position.ST, Position.LW, Position.RW, Position.CF].includes(p.position));
                                            const defenders = startingXI.filter(p => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.GK].includes(p.position));
                                            const midfielders = startingXI.filter(p => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position));
                                            
                                            const attackRating = attackers.length > 0 
                                                ? Math.round(attackers.reduce((acc, p) => acc + p.rating, 0) / attackers.length)
                                                : 0;
                                            const defenseRating = defenders.length > 0
                                                ? Math.round(defenders.reduce((acc, p) => acc + p.rating, 0) / defenders.length)
                                                : 0;
                                            const midfieldRating = midfielders.length > 0
                                                ? Math.round(midfielders.reduce((acc, p) => acc + p.rating, 0) / midfielders.length)
                                                : 0;
                                            
                                            const ratings = [attackRating, defenseRating, midfieldRating].filter(r => r > 0);
                                            return ratings.length > 0 
                                                ? Math.round(ratings.reduce((acc, r) => acc + r, 0) / ratings.length)
                                                : 0;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Full Squad List */}
                        <div className="flex-1 lg:max-w-md">
                            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                <div className="bg-zinc-950/50 p-4 border-b border-white/5">
                                    <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-widest">{t('fullSquad')}</h3>
                                </div>
                                <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-zinc-950/30 sticky top-0 text-[10px] uppercase text-zinc-500 tracking-widest font-bold z-10">
                                            <tr>
                                                <th className="p-3 pl-4">{t('pos')}</th>
                                                <th className="p-3">{t('player')}</th>
                                                <th className="p-3">{t('age')}</th>
                                                <th className="p-3">{t('rating')}</th>
                                                <th className="p-3">{t('value')}</th>
                                                <th className="p-3 text-right pr-4">{t('wage')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm">
                                            {previewTeam.players.length > 0 ? (
                                                previewTeam.players
                                                .sort((a,b) => b.rating - a.rating)
                                                .map(player => {
                                                    const isInXI = startingXI.some(p => p.id === player.id);
                                                    return (
                                                        <tr 
                                                          key={player.id} 
                                                          onClick={() => onInspect && onInspect(player)}
                                                          className={`hover:bg-white/5 transition-colors group cursor-pointer ${isInXI ? 'bg-emerald-500/5' : ''}`}
                                                        >
                                                            <td className="p-3 pl-4">
                                                                <span className={`px-2 py-1 rounded text-[10px] font-black tracking-wider border ${getPosColor(player.position)}`}>
                                                                    {translatePosition(player.position)}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 font-bold text-zinc-300 group-hover:text-white text-sm flex items-center gap-2">
                                                                {player.name}
                                                                {isInXI && <span className="text-[10px] text-emerald-400">★</span>}
                                                                <span className="text-zinc-600 opacity-0 group-hover:opacity-100 text-[10px] uppercase tracking-widest border border-zinc-700 px-1 rounded">{t('view')}</span>
                                                            </td>
                                                            <td className="p-3 text-zinc-500 font-mono text-xs">{player.age}</td>
                                                            <td className="p-3 font-mono font-bold text-white text-sm">
                                                                {player.rating}
                                                                {player.rating >= 85 && <span className="ml-2 text-[10px] text-amber-400">★</span>}
                                                            </td>
                                                            <td className="p-3 font-mono text-emerald-500/80 group-hover:text-emerald-400 text-xs">{formatMoney(player.marketValue)}</td>
                                                            <td className="p-3 text-right pr-4 font-mono text-zinc-400 text-xs">{formatMoney(player.contract?.wage || 0)}/wk</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-zinc-500 italic">
                                                        {t('squadDetailsUnavailable')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Footer Action */}
                 <div className="p-6 border-t border-white/5 bg-zinc-900 flex justify-end gap-4 relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                     <button 
                        onClick={() => setPreviewTeam(null)}
                        className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:bg-white/5 transition-colors"
                     >
                        {t('cancel')}
                     </button>
                     <button 
                        onClick={() => onSelect(previewTeam)}
                        className="px-10 py-4 bg-white text-black rounded-xl font-black hover:bg-emerald-400 transition-all hover:scale-[1.02] shadow-xl flex items-center gap-3"
                     >
                        <span>{t('takeControl')}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                     </button>
                 </div>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full w-full flex flex-col animate-in fade-in duration-700 overflow-y-auto">
      
      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="p-8 md:p-10 flex flex-col items-center justify-center z-10 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 mb-4 tracking-tight text-center">
            {t('selectClub')}
          </h1>
          <p className="text-zinc-400 mb-8 text-center text-lg font-light tracking-wide">{t('chooseYourLegacy')}</p>
          
          {/* League Selector */}
          <div className="flex flex-wrap gap-2 justify-center p-1 bg-zinc-900/80 rounded-full border border-white/5 shadow-lg">
              {leagues.map(league => (
                  <button
                    key={league}
                    onClick={() => setSelectedLeague(league)}
                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
                        selectedLeague === league 
                        ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                      {league === 'Premier League' ? t('premierLeague') : league}
                  </button>
              ))}
          </div>
        </div>

        {/* Grid */}
        <div className="p-6 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto pb-20">
            {displayedTeams.map((team) => (
                <TeamCard key={team.id} team={team} onPreview={handlePreview} t={t} />
            ))}
        </div>
        </div>
      </div>
    </div>
  );
};
