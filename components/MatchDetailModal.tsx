import React, { useState, useMemo } from 'react';
import { Fixture, Team, Player, Position } from '../types';
import { PlayerCard } from './PlayerCard';
import { useLanguage } from '../contexts/LanguageContext';

// Stadium name mapping
const STADIUM_NAMES: { [key: string]: string } = {
  'Arsenal': 'Emirates Stadium',
  'Aston Villa': 'Villa Park',
  'Bournemouth': 'Vitality Stadium',
  'Brentford': 'Gtech Community Stadium',
  'Brighton & Hove Albion': 'American Express Community Stadium',
  'Brighton': 'American Express Community Stadium',
  'Burnley': 'Turf Moor',
  'Chelsea': 'Stamford Bridge',
  'Crystal Palace': 'Selhurst Park',
  'Everton': 'Goodison Park',
  'Fulham': 'Craven Cottage',
  'Leeds United': 'Elland Road',
  'Liverpool': 'Anfield',
  'Manchester City': 'Etihad Stadium',
  'Manchester United': 'Old Trafford',
  'Newcastle United': 'St. James\' Park',
  'Nottingham Forest': 'City Ground',
  'Sunderland': 'Stadium of Light',
  'Tottenham Hotspur': 'Tottenham Hotspur Stadium',
  'Tottenham': 'Tottenham Hotspur Stadium',
  'West Ham United': 'London Stadium',
  'Wolverhampton Wanderers': 'Molineux Stadium',
  'Wolves': 'Molineux Stadium'
};

interface MatchDetailModalProps {
  fixture: Fixture;
  teams: Team[];
  userTeamId: string;
  seasonYear?: string;
  onClose: () => void;
  onInspectPlayer?: (player: Player) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  fixture,
  teams,
  userTeamId,
  seasonYear = "2025/2026",
  onClose,
  onInspectPlayer
}) => {
  const { t, formatDate: formatDateTranslated } = useLanguage();
  const homeTeam = teams.find(t => t.id === fixture.homeTeamId);
  const awayTeam = teams.find(t => t.id === fixture.awayTeamId);
  const isUserMatch = fixture.homeTeamId === userTeamId || fixture.awayTeamId === userTeamId;

  // Calculate date for this week
  const getDateForWeek = (weekNum: number): Date => {
    const [startYear] = seasonYear.split('/').map(Number);
    const seasonStart = new Date(startYear, 7, 1); // August 1st
    const daysOffset = (weekNum - 1) * 7;
    const date = new Date(seasonStart);
    date.setDate(date.getDate() + daysOffset);
    return date;
  };

  const formatDate = formatDateTranslated;

  const matchDate = getDateForWeek(fixture.week);

  // Get all players who played in this match
  const homePlayers = useMemo(() => {
    if (!homeTeam) return [];
    if (fixture.homeStartingXI) {
      return fixture.homeStartingXI.map(id => homeTeam.players.find(p => p.id === id)).filter(Boolean) as Player[];
    }
    // Fallback: get starting XI
    const sorted = [...homeTeam.players].sort((a, b) => b.rating - a.rating);
    return sorted.slice(0, 11);
  }, [homeTeam, fixture.homeStartingXI]);

  const awayPlayers = useMemo(() => {
    if (!awayTeam) return [];
    if (fixture.awayStartingXI) {
      return fixture.awayStartingXI.map(id => awayTeam.players.find(p => p.id === id)).filter(Boolean) as Player[];
    }
    // Fallback: get starting XI
    const sorted = [...awayTeam.players].sort((a, b) => b.rating - a.rating);
    return sorted.slice(0, 11);
  }, [awayTeam, fixture.awayStartingXI]);

  const allPlayers = [...homePlayers, ...awayPlayers];

  // Get current man of the match
  const currentMOTM = fixture.manOfTheMatch 
    ? allPlayers.find(p => p.id === fixture.manOfTheMatch!.playerId)
    : null;

  // Get MOTM match performance
  const motmPerformance = currentMOTM && fixture.matchPerformances
    ? fixture.matchPerformances.find(p => p.playerId === currentMOTM.id)
    : null;

  // Calculate half-time score (estimate from events or use 0-0)
  const halfTimeScore = useMemo(() => {
    if (!fixture.events) return { home: 0, away: 0 };
    let home = 0;
    let away = 0;
    fixture.events.forEach(e => {
      if (e.type === 'GOAL' && e.minute <= 45) {
        if (e.teamName === homeTeam?.name) home++;
        else if (e.teamName === awayTeam?.name) away++;
      }
    });
    return { home, away };
  }, [fixture.events, homeTeam, awayTeam]);

  // Get goal scorers for each team
  const homeScorers = fixture.scorers.filter(s => s.teamId === fixture.homeTeamId);
  const awayScorers = fixture.scorers.filter(s => s.teamId === fixture.awayTeamId);


  // Team Shield Component
  const TeamShield = ({ team, size = "large" }: { team?: Team, size?: "large" | "small" }) => {
    if (!team) return null;
    const shieldPath = "M50 5 L90 20 V45 C90 70 50 95 50 95 C50 95 10 70 10 45 V20 Z";
    const colors = team.color?.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || ['#333333', '#000000'];
    const color1 = colors[0];
    const color2 = colors[1] || color1;
    const gradId = `grad-${team.id}`;
    const glossId = `gloss-${team.id}`;

    return (
      <div className={`relative flex items-center justify-center ${size === 'large' ? 'w-20 h-20' : 'w-12 h-12'}`}>
         <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color1} />
                    <stop offset="100%" stopColor={color2} />
                </linearGradient>
                <linearGradient id={glossId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.4"/>
                    <stop offset="50%" stopColor="white" stopOpacity="0"/>
                </linearGradient>
            </defs>
            <path d={shieldPath} fill={`url(#${gradId})`} stroke="none" />
            <path d={shieldPath} fill={`url(#${glossId})`} stroke="none" />
            <path d={shieldPath} fill="none" stroke="#cbd5e1" strokeWidth={3} />
         </svg>
         <span className={`absolute z-10 font-black text-white drop-shadow-md ${size === 'large' ? 'text-3xl' : 'text-xl'}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
             {team.name.charAt(0)}
         </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-zinc-950 rounded-3xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header with teams and score */}
        <div className="relative">
          {/* Team color backgrounds */}
          <div className="absolute inset-0 flex">
            <div 
              className="flex-1" 
              style={{ background: homeTeam?.color || 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}
            ></div>
            <div 
              className="flex-1" 
              style={{ background: awayTeam?.color || 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
            ></div>
          </div>
          
          {/* Content overlay */}
          <div className="relative z-10 p-8 min-h-[200px]">
            <div className="flex items-center justify-between mb-6 relative">
              <div className="flex flex-col items-center flex-1">
                <TeamShield team={homeTeam} size="large" />
                <h2 className="text-2xl font-black text-white mt-3">{homeTeam?.name}</h2>
              </div>
              
              <div className="flex flex-col items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="text-6xl font-black text-white mb-2 drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                  {fixture.homeScore} - {fixture.awayScore}
                </div>
                <div className="text-lg text-white/80 font-mono drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  HT {halfTimeScore.home} - {halfTimeScore.away}
                </div>
              </div>
              
              <div className="flex flex-col items-center flex-1">
                <TeamShield team={awayTeam} size="large" />
                <h2 className="text-2xl font-black text-white mt-3">{awayTeam?.name}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Goal Scorers */}
        {(homeScorers.length > 0 || awayScorers.length > 0) && (
          <div className="px-8 py-6 border-b border-white/10">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm uppercase font-bold text-zinc-400 mb-3">{homeTeam?.name}</h3>
                <div className="space-y-2">
                  {homeScorers.sort((a, b) => a.minute - b.minute).map((scorer, i) => (
                    <div key={i} className="flex items-center gap-2 text-white">
                      <span className="text-lg">⚽</span>
                      <span className="font-bold">{scorer.name}</span>
                      <span className="text-zinc-400 font-mono text-sm">{scorer.minute}'</span>
                      {scorer.assist && (
                        <span className="text-zinc-500 text-xs">(Assist: {scorer.assist})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm uppercase font-bold text-zinc-400 mb-3">{awayTeam?.name}</h3>
                <div className="space-y-2">
                  {awayScorers.sort((a, b) => a.minute - b.minute).map((scorer, i) => (
                    <div key={i} className="flex items-center gap-2 text-white">
                      <span className="text-lg">⚽</span>
                      <span className="font-bold">{scorer.name}</span>
                      <span className="text-zinc-400 font-mono text-sm">{scorer.minute}'</span>
                      {scorer.assist && (
                        <span className="text-zinc-500 text-xs">(Assist: {scorer.assist})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match Info */}
        <div className="px-8 py-4 border-b border-white/10">
          <div className="text-sm text-zinc-400 space-y-1">
            <div className="font-bold text-white mb-2">{t('matchweek')} {fixture.week}</div>
            <div className="flex items-center gap-4 text-xs">
              <span>{formatDate(matchDate)}</span>
              <span>•</span>
              <span>{homeTeam ? (STADIUM_NAMES[homeTeam.name] || `${homeTeam.name} ${t('stadium')}`) : t('stadium')}</span>
              <span>•</span>
              <span>{t('referee')}: {fixture.referee ? fixture.referee.name : 'TBD'}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              {homeTeam?.name} vs {awayTeam?.name} | {t('season')} {seasonYear} | {t('premierLeague')}
            </div>
          </div>
        </div>

        {/* Man of the Match Section */}
        <div className="px-8 py-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-yellow-400 text-2xl">⭐</span>
            {t('manOfTheMatch')}
          </h3>
          
          {currentMOTM ? (
            <div className="mb-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
              <div 
                onClick={() => onInspectPlayer && onInspectPlayer(currentMOTM)}
                className="cursor-pointer scale-[0.7] landscape:scale-[0.75] md:scale-100 origin-center"
              >
                <PlayerCard player={currentMOTM} />
              </div>
              
              {/* Match Statistics */}
              {motmPerformance && (
                <div className="flex flex-wrap gap-2 landscape:gap-3 md:gap-4 justify-center md:justify-start max-w-md">
                  {motmPerformance.goals > 0 && (
                    <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-2 text-center min-w-[70px]">
                      <div className="text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-emerald-400">{t('goals')}</div>
                      <div className="text-xl landscape:text-2xl md:text-3xl font-black text-white">{motmPerformance.goals}</div>
                    </div>
                  )}
                  {motmPerformance.assists > 0 && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-2 text-center min-w-[70px]">
                      <div className="text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-blue-400">{t('assists')}</div>
                      <div className="text-xl landscape:text-2xl md:text-3xl font-black text-white">{motmPerformance.assists}</div>
                    </div>
                  )}
                  {motmPerformance.shots > 0 && (
                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2 text-center min-w-[70px]">
                      <div className="text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-purple-400">{t('shots')}</div>
                      <div className="text-xl landscape:text-2xl md:text-3xl font-black text-white">{motmPerformance.shots}</div>
                    </div>
                  )}
                  {motmPerformance.passes > 0 && (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-2 text-center min-w-[70px]">
                      <div className="text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-yellow-400">{t('passes')}</div>
                      <div className="text-xl landscape:text-2xl md:text-3xl font-black text-white">{motmPerformance.passes}</div>
                    </div>
                  )}
                  {motmPerformance.tackles !== undefined && motmPerformance.tackles > 0 && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 text-center min-w-[70px]">
                      <div className="text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-red-400">{t('tackles')}</div>
                      <div className="text-xl landscape:text-2xl md:text-3xl font-black text-white">{motmPerformance.tackles}</div>
                    </div>
                  )}
                  {motmPerformance.saves !== undefined && motmPerformance.saves > 0 && (
                    <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg px-3 py-2 text-center min-w-[70px]">
                      <div className="text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-cyan-400">{t('saves')}</div>
                      <div className="text-xl landscape:text-2xl md:text-3xl font-black text-white">{motmPerformance.saves}</div>
                    </div>
                  )}
                  {motmPerformance.rating > 0 && (
                    <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg px-3 py-2 text-center min-w-[70px]">
                      <div className="text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-orange-400">{t('rating')}</div>
                      <div className="text-xl landscape:text-2xl md:text-3xl font-black text-white">{motmPerformance.rating.toFixed(1)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-zinc-400 text-sm">{t('manOfTheMatchAuto')}</p>
            </div>
          )}
        </div>

        {/* Player Performances */}
        {(() => {
          // Always show player performances section, even if data is missing
          if (!fixture.matchPerformances || fixture.matchPerformances.length === 0) {
            return (
              <div className="px-8 py-6 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  {t('playerPerformances')}
                </h3>
                <p className="text-zinc-400 text-sm">{t('performanceDataNotAvailable')}</p>
              </div>
            );
          }
          
          return (() => {
          const homePerformances = fixture.matchPerformances.filter(p => p.isHome);
          const awayPerformances = fixture.matchPerformances.filter(p => !p.isHome);
          
          // Check if teams have GK or defensive players
          const homeHasGK = homePerformances.some(p => {
            const player = homePlayers.find(pl => pl.id === p.playerId);
            return player?.position === Position.GK;
          });
          const homeHasDefMid = homePerformances.some(p => {
            const player = homePlayers.find(pl => pl.id === p.playerId);
            return player && [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(player.position);
          });
          
          const awayHasGK = awayPerformances.some(p => {
            const player = awayPlayers.find(pl => pl.id === p.playerId);
            return player?.position === Position.GK;
          });
          const awayHasDefMid = awayPerformances.some(p => {
            const player = awayPlayers.find(pl => pl.id === p.playerId);
            return player && [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(player.position);
          });
          
          return (
            <div className="px-8 py-6 border-t border-white/10">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                {t('playerPerformances')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home Team Performances */}
                <div>
                  <h4 className="text-sm uppercase font-bold text-zinc-400 mb-4">{homeTeam?.name}</h4>
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('player')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('ratingHeader')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('goals')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('assists')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('shots')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('passAccuracy')}</th>
                            {homeHasGK && (
                              <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('saves')}</th>
                            )}
                            {homeHasDefMid && (
                              <>
                                <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('tackles')}</th>
                                <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('interceptions')}</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {homePerformances
                            .sort((a, b) => b.rating - a.rating)
                            .map((perf, idx) => {
                              const player = homePlayers.find(p => p.id === perf.playerId);
                              if (!player) return null;
                              return (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 pl-3">
                                    <div 
                                      onClick={() => onInspectPlayer && onInspectPlayer(player)}
                                      className="text-xs text-white font-medium cursor-pointer hover:text-emerald-400 transition-colors"
                                    >
                                      {player.name}
                                    </div>
                                  </td>
                                  <td className="py-2 pl-3">
                                    <span className={`text-xs font-bold ${
                                      perf.rating >= 8.0 ? 'text-emerald-400' :
                                      perf.rating >= 7.0 ? 'text-green-400' :
                                      perf.rating >= 6.5 ? 'text-yellow-400' :
                                      'text-zinc-400'
                                    }`}>
                                      {perf.rating.toFixed(1)}
                                      {perf.manOfTheMatch && <span className="ml-1 text-yellow-400">⭐</span>}
                                    </span>
                                  </td>
                                  <td className="py-2 pl-3 text-xs text-white font-bold">{perf.goals > 0 ? perf.goals : '-'}</td>
                                  <td className="py-2 pl-3 text-xs text-white font-bold">{perf.assists > 0 ? perf.assists : '-'}</td>
                                  <td className="py-2 pl-3 text-xs text-zinc-400">{perf.shots > 0 ? perf.shots : '-'}</td>
                                  <td className="py-2 pl-3 text-xs text-zinc-400">{perf.passAccuracy > 0 ? `${perf.passAccuracy}%` : '-'}</td>
                                  {homeHasGK && (
                                    <td className="py-2 pl-3 text-xs text-zinc-400">{perf.saves > 0 ? perf.saves : '-'}</td>
                                  )}
                                  {homeHasDefMid && (
                                    <>
                                      <td className="py-2 pl-3 text-xs text-zinc-400">{perf.tackles > 0 ? perf.tackles : '-'}</td>
                                      <td className="py-2 pl-3 text-xs text-zinc-400">{perf.interceptions > 0 ? perf.interceptions : '-'}</td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Away Team Performances */}
                <div>
                  <h4 className="text-sm uppercase font-bold text-zinc-400 mb-4">{awayTeam?.name}</h4>
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('player')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('ratingHeader')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('goals')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('assists')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('shots')}</th>
                            <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('passAccuracy')}</th>
                            {awayHasGK && (
                              <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('saves')}</th>
                            )}
                            {awayHasDefMid && (
                              <>
                                <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('tackles')}</th>
                                <th className="pb-2 pl-3 text-[10px] uppercase text-zinc-500 font-bold">{t('interceptions')}</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {awayPerformances
                            .sort((a, b) => b.rating - a.rating)
                            .map((perf, idx) => {
                              const player = awayPlayers.find(p => p.id === perf.playerId);
                              if (!player) return null;
                              return (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 pl-3">
                                    <div 
                                      onClick={() => onInspectPlayer && onInspectPlayer(player)}
                                      className="text-xs text-white font-medium cursor-pointer hover:text-emerald-400 transition-colors"
                                    >
                                      {player.name}
                                    </div>
                                  </td>
                                  <td className="py-2 pl-3">
                                    <span className={`text-xs font-bold ${
                                      perf.rating >= 8.0 ? 'text-emerald-400' :
                                      perf.rating >= 7.0 ? 'text-green-400' :
                                      perf.rating >= 6.5 ? 'text-yellow-400' :
                                      'text-zinc-400'
                                    }`}>
                                      {perf.rating.toFixed(1)}
                                      {perf.manOfTheMatch && <span className="ml-1 text-yellow-400">⭐</span>}
                                    </span>
                                  </td>
                                  <td className="py-2 pl-3 text-xs text-white font-bold">{perf.goals > 0 ? perf.goals : '-'}</td>
                                  <td className="py-2 pl-3 text-xs text-white font-bold">{perf.assists > 0 ? perf.assists : '-'}</td>
                                  <td className="py-2 pl-3 text-xs text-zinc-400">{perf.shots || 0}</td>
                                  <td className="py-2 pl-3 text-xs text-zinc-400">{perf.passAccuracy || 0}%</td>
                                  {awayHasGK && (
                                    <td className="py-2 pl-3 text-xs text-zinc-400">{perf.saves || 0}</td>
                                  )}
                                  {awayHasDefMid && (
                                    <>
                                      <td className="py-2 pl-3 text-xs text-zinc-400">{perf.tackles || 0}</td>
                                      <td className="py-2 pl-3 text-xs text-zinc-400">{perf.interceptions || 0}</td>
                                    </>
                                  )}
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
          );
          })();
        })()}

        {/* Close Button */}
        <div className="px-8 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

