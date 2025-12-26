
import React, { useState } from 'react';
import { Team, Player, Position } from '../types';
import { TacticsBoard } from './TacticsBoard';
import { useLanguage } from '../contexts/LanguageContext';

interface TeamDetailModalProps {
    team: Team;
    onClose: () => void;
    onApproachPlayer: (player: Player) => void;
    onScout?: (player: Player) => void;
    userTeamBudget?: number;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, onClose, onApproachPlayer, onScout, userTeamBudget, onToggleFavorite, favoritePlayerIds = new Set() }) => {
    const { t, translatePosition } = useLanguage();
    const [activeTab, setActiveTab] = useState<'SQUAD' | 'LINEUP'>('SQUAD');
    
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

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
    const getStartingXI = () => {
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
    };

    const startingXI = getStartingXI();

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-zinc-900 border border-white/10 w-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-2 landscape:p-3 md:p-8 pb-0 bg-zinc-950 relative overflow-hidden flex-shrink-0">
                     <div 
                        className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
                        style={{ background: team.color || '#333' }}
                     ></div>
                     
                     <div className="relative z-10 flex justify-between items-start mb-2 landscape:mb-3 md:mb-6">
                        <div>
                            <h2 className="text-zinc-400 text-[8px] landscape:text-[9px] md:text-xs uppercase tracking-widest font-bold mb-0.5 landscape:mb-1 md:mb-2">{t('opponentSquad')}</h2>
                            <h1 className="text-lg landscape:text-xl md:text-5xl font-black text-white">{team.name}</h1>
                        </div>
                        <button onClick={onClose} className="bg-black/40 hover:bg-black/60 text-white p-1 landscape:p-1.5 md:p-2 rounded-full transition-colors">
                            <svg className="w-4 h-4 landscape:w-5 landscape:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                     </div>

                     {/* Tabs */}
                     <div className="relative z-10 flex gap-2 landscape:gap-3 md:gap-6 border-b border-white/10">
                        <button 
                            onClick={() => setActiveTab('SQUAD')}
                            className={`pb-1.5 landscape:pb-2 md:pb-4 text-[9px] landscape:text-[10px] md:text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'SQUAD' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {t('fullSquad')}
                            {activeTab === 'SQUAD' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
                        </button>
                        <button 
                            onClick={() => setActiveTab('LINEUP')}
                            className={`pb-1.5 landscape:pb-2 md:pb-4 text-[9px] landscape:text-[10px] md:text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'LINEUP' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {t('startingXIAndTactics')}
                            {activeTab === 'LINEUP' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
                        </button>
                     </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900 relative">
                    {activeTab === 'SQUAD' ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-950/50 sticky top-0 text-[10px] uppercase text-zinc-500 tracking-widest font-bold z-10">
                                <tr>
                                    <th className="p-4 pl-6">{t('pos')}</th>
                                    <th className="p-4">{t('player')}</th>
                                    <th className="p-4">{t('age')}</th>
                                    <th className="p-4">{t('rating')}</th>
                                    <th className="p-4">{t('potential')}</th>
                                    <th className="p-4">{t('value')}</th>
                                    <th className="p-4">{t('wage')}</th>
                                    <th className="p-4 text-right">{t('action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {team.players.sort((a,b) => b.rating - a.rating).map(player => {
                                    const isScouted = player.scouted;
                                    const isScouting = player.pendingScout !== undefined;
                                    return (
                                        <tr 
                                            key={player.id} 
                                            onClick={() => {
                                                if (isScouted) {
                                                    onApproachPlayer(player);
                                                }
                                            }}
                                            className={`hover:bg-white/5 group transition-all duration-200 ${isScouted ? 'cursor-pointer' : ''}`}
                                        >
                                            <td className="p-4 pl-6">
                                                <span className="font-bold text-xs text-zinc-500">{translatePosition(player.position)}</span>
                                            </td>
                                            <td className="p-4 font-bold text-zinc-200 group-hover:text-white transition-colors">
                                                {player.name}
                                                {isScouted && <span className="ml-2 text-xs text-zinc-500 opacity-0 group-hover:opacity-100">{t('view')}</span>}
                                            </td>
                                            <td className="p-4 text-zinc-500 font-mono">{player.age}</td>
                                            <td className="p-4 font-mono font-bold text-white">{player.rating}</td>
                                            <td className="p-4 font-mono">
                                                {isScouted ? (
                                                    <span className={`${player.potential > 85 ? 'text-purple-400 font-bold' : 'text-zinc-400'}`}>
                                                        {player.potential}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-700">??</span>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono">
                                                {isScouted ? (
                                                    <span className="text-emerald-500/80">{formatMoney(player.marketValue)}</span>
                                                ) : (
                                                    <span className="text-zinc-700">??</span>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono text-xs">
                                                {isScouted ? (
                                                    <span className="text-zinc-400">{formatMoney(player.contract?.wage || 0)}/wk</span>
                                                ) : (
                                                    <span className="text-zinc-700">??</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    {onToggleFavorite && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onToggleFavorite(player);
                                                            }}
                                                            className={`px-3 py-2 rounded-lg text-xs uppercase font-bold transition-all border ${
                                                                favoritePlayerIds.has(player.id)
                                                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30'
                                                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-white/5'
                                                            }`}
                                                        >
                                                            {favoritePlayerIds.has(player.id) ? '★' : '☆'}
                                                        </button>
                                                    )}
                                                    {isScouting ? (
                                                        <span className="text-xs text-zinc-500 italic">{t('scouting')}</span>
                                                    ) : !isScouted ? (
                                                        onScout ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onScout(player);
                                                                }}
                                                                disabled={!userTeamBudget || userTeamBudget < 50000}
                                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:opacity-50 text-white text-xs uppercase font-bold rounded-lg transition-all border border-white/5"
                                                            >
                                                                {t('scout')}
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-zinc-500">-</span>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onApproachPlayer(player);
                                                            }}
                                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase font-bold rounded-lg transition-all border border-white/5"
                                                        >
                                                            {t('approach')}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-2 landscape:p-3 md:p-8 min-h-full bg-zinc-950/30">
                            <div className="flex flex-row gap-2 landscape:gap-3 md:gap-8 items-start">
                                {/* Left: Starting XI Formation */}
                                <div className="w-1/2 flex flex-col items-start" id="formation-container">
                                    <div className="flex justify-between items-center mb-2 landscape:mb-3 md:mb-4 w-full">
                                        <div className="text-[8px] landscape:text-[9px] md:text-xs uppercase font-bold text-zinc-500">{t('formation')}</div>
                                        <div className="text-white font-bold font-mono bg-black/40 px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1 rounded landscape:rounded-lg md:rounded-full border border-white/5 text-[8px] landscape:text-[9px] md:text-sm">{team.tactics?.formation || "4-3-3"}</div>
                                    </div>
                                    <div className="scale-[0.91] landscape:scale-[0.99] md:scale-100 origin-top-left w-full ml-[2px]">
                                        <TacticsBoard players={startingXI} formation={team.tactics?.formation || "4-3-3"} />
                                    </div>
                                    <div className="mt-0.5 landscape:mt-1 md:mt-3 grid grid-cols-3 gap-1.5 landscape:gap-2 md:gap-4 w-full">
                                        <div className="bg-zinc-800/50 p-1.5 landscape:p-2 md:p-3 rounded-lg landscape:rounded-xl md:rounded-xl border border-white/5 text-center">
                                            <div className="text-[7px] landscape:text-[8px] md:text-[10px] uppercase font-bold text-zinc-500">{t('attackRating')}</div>
                                            <div className="text-sm landscape:text-base md:text-2xl font-black text-white">
                                                {(() => {
                                                    const attackers = startingXI.filter(p => [Position.ST, Position.LW, Position.RW, Position.CF].includes(p.position));
                                                    return attackers.length > 0 
                                                        ? Math.round(attackers.reduce((acc, p) => acc + p.rating, 0) / attackers.length)
                                                        : 0;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="bg-zinc-800/50 p-1.5 landscape:p-2 md:p-3 rounded-lg landscape:rounded-xl md:rounded-xl border border-white/5 text-center">
                                            <div className="text-[7px] landscape:text-[8px] md:text-[10px] uppercase font-bold text-zinc-500">{t('defenseRating')}</div>
                                            <div className="text-sm landscape:text-base md:text-2xl font-black text-white">
                                                {(() => {
                                                    const defenders = startingXI.filter(p => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.GK].includes(p.position));
                                                    return defenders.length > 0
                                                        ? Math.round(defenders.reduce((acc, p) => acc + p.rating, 0) / defenders.length)
                                                        : 0;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="bg-zinc-800/50 p-1.5 landscape:p-2 md:p-3 rounded-lg landscape:rounded-xl md:rounded-xl border border-white/5 text-center">
                                            <div className="text-[7px] landscape:text-[8px] md:text-[10px] uppercase font-bold text-zinc-500">{t('midfieldRating')}</div>
                                            <div className="text-sm landscape:text-base md:text-2xl font-black text-white">
                                                {(() => {
                                                    const midfielders = startingXI.filter(p => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position));
                                                    return midfielders.length > 0
                                                        ? Math.round(midfielders.reduce((acc, p) => acc + p.rating, 0) / midfielders.length)
                                                        : 0;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 landscape:mt-3 md:mt-4 flex justify-center w-full">
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-1.5 landscape:p-2 md:p-3 rounded-lg landscape:rounded-xl md:rounded-xl text-center">
                                            <div className="text-[7px] landscape:text-[8px] md:text-[10px] uppercase font-bold text-emerald-400">{t('overallRating')}</div>
                                            <div className="text-lg landscape:text-xl md:text-3xl font-black text-emerald-400">
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
                                <div className="w-1/2 flex flex-col" style={{ height: 'calc(100% - 50px)' }}>
                                    <div className="bg-zinc-900/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden flex flex-col h-full">
                                        <div className="bg-zinc-950/50 p-1.5 landscape:p-2 md:p-4 border-b border-white/5 flex-shrink-0">
                                            <h3 className="text-[8px] landscape:text-[9px] md:text-xs uppercase font-bold text-zinc-400 tracking-widest">{t('fullSquad')}</h3>
                                        </div>
                                        <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-zinc-950/30 sticky top-0 text-[8px] landscape:text-[9px] md:text-[10px] uppercase text-zinc-500 tracking-widest font-bold z-10">
                                                    <tr>
                                                        <th className="p-1.5 landscape:p-2 md:p-3 pl-2 landscape:pl-3 md:pl-4">{t('pos')}</th>
                                                        <th className="p-1.5 landscape:p-2 md:p-3">{t('player')}</th>
                                                        <th className="p-1.5 landscape:p-2 md:p-3">{t('age')}</th>
                                                        <th className="p-1.5 landscape:p-2 md:p-3">{t('rating')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {team.players.sort((a,b) => b.rating - a.rating).map(player => {
                                                        const isInXI = startingXI.some(p => p.id === player.id);
                                                        return (
                                                            <tr 
                                                                key={player.id} 
                                                                onClick={() => onApproachPlayer(player)}
                                                                className={`hover:bg-white/5 group cursor-pointer transition-all duration-200 ${isInXI ? 'bg-emerald-500/5' : ''}`}
                                                            >
                                                                <td className="p-1.5 landscape:p-2 md:p-3 pl-2 landscape:pl-3 md:pl-4">
                                                                    <span className="font-bold text-[11px] landscape:text-[12px] md:text-base text-zinc-500">{translatePosition(player.position)}</span>
                                                                </td>
                                                                <td className="p-1.5 landscape:p-2 md:p-3 font-bold text-zinc-200 text-[11px] landscape:text-[12px] md:text-base group-hover:text-white transition-colors">
                                                                    {player.name}
                                                                    {isInXI && <span className="ml-1 landscape:ml-2 text-[8px] landscape:text-[9px] md:text-[10px] text-emerald-400">★</span>}
                                                                </td>
                                                                <td className="p-1.5 landscape:p-2 md:p-3 text-zinc-500 font-mono text-[11px] landscape:text-[12px] md:text-base">{player.age}</td>
                                                                <td className="p-1.5 landscape:p-2 md:p-3 font-mono font-bold text-white text-[11px] landscape:text-[12px] md:text-base">{player.rating}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
