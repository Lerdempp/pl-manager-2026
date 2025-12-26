
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Team, Fixture } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Team Shield Component (simplified version)
const TeamShield = ({ team, size = "small" }: { team?: Team, size?: "small" | "large" }) => {
    if (!team) return null;
    const dim = size === "large" ? 48 : 32;
    const shieldPath = "M50 5 L90 20 V45 C90 70 50 95 50 95 C50 95 10 70 10 45 V20 Z";
    
    const colors = team.color?.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || ['#333333', '#000000'];
    const color1 = colors[0];
    const color2 = colors[1] || color1;
    
    const gradId = `grad-${team.id}`;
    const glossId = `gloss-${team.id}`;

    return (
      <div className={`relative flex items-center justify-center ${size === 'large' ? 'w-10 h-10' : 'w-8 h-8'}`}>
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
         <span className={`absolute z-10 font-black text-white drop-shadow-md ${size === 'large' ? 'text-lg' : 'text-sm'}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
             {team.name.charAt(0)}
         </span>
      </div>
    );
};

interface LeagueViewProps {
  teams: Team[];
  fixtures: Fixture[];
  currentWeek: number;
  userTeamId: string;
  seasonYear?: string;
  onSimulateWeek: () => void;
  onSimulateSeason: () => void;
  onNewSeason?: () => void;
  onInspectTeam?: (team: Team) => void;
  onInspectPlayer?: (playerName: string, teamId: string) => void;
  onViewMatchDetail?: (fixture: Fixture) => void;
  onBack?: () => void;
}

const LeagueViewComponent: React.FC<LeagueViewProps> = ({ 
  teams, 
  fixtures, 
  currentWeek, 
  userTeamId,
  seasonYear = "2025/2026",
  onSimulateWeek,
  onSimulateSeason,
  onNewSeason,
  onInspectTeam,
  onInspectPlayer,
  onViewMatchDetail,
  onBack
}) => {
  const { t, formatDate: formatDateTranslated } = useLanguage();
  const userLeague = teams.find(t => t.id === userTeamId)?.league || "";
  const [selectedLeague, setSelectedLeague] = useState<string>(userLeague);
  const [selectedTab, setSelectedTab] = useState<'TABLE' | 'RESULTS' | 'STATS' | 'FIXTURES'>('TABLE');
  const currentWeekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (userLeague && !selectedLeague) {
          setSelectedLeague(userLeague);
      }
  }, [userLeague, selectedLeague]);
  
  // Scroll to current week when fixtures tab is opened or current week changes
  useEffect(() => {
      if (selectedTab === 'FIXTURES') {
          // Use a longer timeout to ensure DOM is fully rendered
          const scrollTimeout = setTimeout(() => {
              const container = document.getElementById('fixtures-container');
              if (container && currentWeekRef.current) {
                  // Try scrollIntoView first (simpler and more reliable)
                  currentWeekRef.current.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                      inline: 'nearest'
                  });
                  
                  // Fallback: manual scroll calculation if scrollIntoView doesn't work well
                  setTimeout(() => {
                      const containerRect = container.getBoundingClientRect();
                      const elementRect = currentWeekRef.current?.getBoundingClientRect();
                      if (elementRect && currentWeekRef.current) {
                          const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
                          const scrollTop = relativeTop - 120; // 120px offset to keep header visible
                          container.scrollTo({
                              top: Math.max(0, scrollTop),
                              behavior: 'smooth'
                          });
                      }
                  }, 50);
              }
          }, 200);
          
          return () => clearTimeout(scrollTimeout);
      }
  }, [selectedTab, currentWeek]);

  const leagues = Array.from(new Set(teams.map(t => t.league)));
  
  // Memoize derived data to prevent recalculation on every render
  const leagueTeams = useMemo(() => teams.filter(t => t.league === selectedLeague), [teams, selectedLeague]);
  
  const sortedTeams = useMemo(() => [...leagueTeams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
    return b.gf - a.gf;
  }), [leagueTeams]);

  const leagueFixtures = useMemo(() => fixtures.filter(f => {
      const homeTeam = teams.find(t => t.id === f.homeTeamId);
      return homeTeam?.league === selectedLeague;
  }), [fixtures, teams, selectedLeague]);

  const lastWeekFixtures = useMemo(() => leagueFixtures.filter(f => f.week === currentWeek - 1), [leagueFixtures, currentWeek]);
  const maxWeeks = useMemo(() => Math.max(...leagueFixtures.map(f => f.week), 0), [leagueFixtures]);
  const allMatchesPlayed = useMemo(() => leagueFixtures.length > 0 && leagueFixtures.every(f => f.played), [leagueFixtures]);
  const isSeasonOver = maxWeeks > 0 && currentWeek > maxWeeks && allMatchesPlayed;
  
  // Find next match opponent for user team
  const nextMatchOpponent = useMemo(() => {
    if (isSeasonOver) return null;
    const nextMatch = leagueFixtures.find(f => 
      f.week === currentWeek && 
      !f.played && 
      (f.homeTeamId === userTeamId || f.awayTeamId === userTeamId)
    );
    if (!nextMatch) return null;
    return nextMatch.homeTeamId === userTeamId ? nextMatch.awayTeamId : nextMatch.homeTeamId;
  }, [leagueFixtures, currentWeek, userTeamId, isSeasonOver]);
  
  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Unknown';

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      if (selectedTab !== 'STATS') return null;

      const scorers: Record<string, { name: string, teamId: string, goals: number }> = {};
      const assisters: Record<string, { name: string, teamId: string, assists: number }> = {};
      const cards: Record<string, { name: string, teamId: string, count: number }> = {};
      
      // Process all played fixtures
      leagueFixtures.filter(f => f.played).forEach(fixture => {
          // Goals & Assists
          fixture.scorers.forEach(s => {
              // Goals
              if (!scorers[s.name]) scorers[s.name] = { name: s.name, teamId: s.teamId, goals: 0 };
              scorers[s.name].goals += 1;

              // Assists
              if (s.assist) {
                  if (!assisters[s.assist]) assisters[s.assist] = { name: s.assist, teamId: s.teamId, assists: 0 };
                  assisters[s.assist].assists += 1;
              }
          });

          // Cards (Use fixture.cards array if available, otherwise parse from events)
          if (fixture.cards && fixture.cards.length > 0) {
              // Use the cards array directly - more reliable
              fixture.cards.forEach(card => {
                  const team = teams.find(t => t.id === card.teamId);
                  if (team) {
                      const player = team.players.find(p => p.id === card.playerId);
                      if (player) {
                          const name = player.name;
                          if (!cards[name]) cards[name] = { name, teamId: card.teamId, count: 0 };
                          // Count both yellow and red cards
                          cards[name].count += 1;
                      }
                  }
              });
          } else if (fixture.events) {
              // Fallback: Parse from events if cards array is not available
              fixture.events.forEach(e => {
                  if (e.type === 'CARD') {
                      // Try to match both yellow and red cards
                      let match = e.description.match(/Yellow card for (.*?) (after|for|\.|!)/);
                      if (!match) {
                          // Try red card format: "RED CARD! [Name] is sent off..."
                          match = e.description.match(/RED CARD! (.*?) (is sent off|for|\.)/);
                      }
                      if (match && match[1]) {
                          const name = match[1].trim();
                          const team = teams.find(t => t.name === e.teamName);
                          if (team) {
                              if (!cards[name]) cards[name] = { name, teamId: team.id, count: 0 };
                              cards[name].count += 1;
                          }
                      }
                  }
              });
          }
      });

      // Streaks (Last 5 games)
      const teamStreaks = leagueTeams.map(team => {
          // Get team's played matches sorted by week
          const teamMatches = leagueFixtures
            .filter(f => f.played && (f.homeTeamId === team.id || f.awayTeamId === team.id))
            .sort((a, b) => a.week - b.week);
          
          let winStreak = 0;
          let unbeatenStreak = 0;
          
          // Iterate backwards
          for (let i = teamMatches.length - 1; i >= 0; i--) {
              const m = teamMatches[i];
              const isHome = m.homeTeamId === team.id;
              const goalsFor = isHome ? m.homeScore : m.awayScore;
              const goalsAgainst = isHome ? m.awayScore : m.homeScore;
              
              if (goalsFor > goalsAgainst) {
                  winStreak++;
                  unbeatenStreak++;
              } else if (goalsFor === goalsAgainst) {
                  winStreak = 0; // streak broken
                  unbeatenStreak++;
              } else {
                  winStreak = 0;
                  unbeatenStreak = 0;
                  break; // loss breaks both
              }
          }
          return { team, winStreak, unbeatenStreak };
      }).sort((a, b) => b.winStreak - a.winStreak);

      // Squad Value Rankings
      const squadValues = leagueTeams.map(team => {
          const totalValue = team.players.reduce((sum, p) => sum + (p.trueValue || p.marketValue || 0), 0);
          return { team, value: totalValue };
      }).sort((a, b) => b.value - a.value);

      // Unbeaten Streaks (sorted by unbeaten streak)
      const unbeatenStreaks = leagueTeams.map(team => {
          const teamMatches = leagueFixtures
            .filter(f => f.played && (f.homeTeamId === team.id || f.awayTeamId === team.id))
            .sort((a, b) => a.week - b.week);
          
          let unbeatenStreak = 0;
          
          // Iterate backwards
          for (let i = teamMatches.length - 1; i >= 0; i--) {
              const m = teamMatches[i];
              const isHome = m.homeTeamId === team.id;
              const goalsFor = isHome ? m.homeScore : m.awayScore;
              const goalsAgainst = isHome ? m.awayScore : m.homeScore;
              
              if (goalsFor >= goalsAgainst) {
                  unbeatenStreak++;
              } else {
                  break; // loss breaks unbeaten streak
              }
          }
          return { team, unbeatenStreak };
      }).sort((a, b) => b.unbeatenStreak - a.unbeatenStreak);

      return {
          topScorers: Object.values(scorers).sort((a, b) => b.goals - a.goals).slice(0, 10),
          topAssists: Object.values(assisters).sort((a, b) => b.assists - a.assists).slice(0, 10),
          topCards: Object.values(cards).sort((a, b) => b.count - a.count).slice(0, 10),
          teamStreaks: teamStreaks.slice(0, 10),
          squadValues: squadValues.slice(0, 10),
          unbeatenStreaks: unbeatenStreaks.slice(0, 10)
      };
  }, [leagueFixtures, leagueTeams, selectedTab, teams]);

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-2 landscape:p-3 md:p-8 gap-2 landscape:gap-4 md:gap-6 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto relative">
      
      {/* Back button - positioned at top level to be above header */}
      {onBack && (
        <div className="sticky top-[calc(1.5rem-50px)] left-[calc(1rem-10px)] z-[100] px-6 w-fit self-start">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white font-bold text-sm transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('back') || 'Back'}
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 landscape:gap-3 md:gap-6">
        <div>
           <div className="flex items-center gap-2 landscape:gap-3 mb-0.5 landscape:mb-1">
             <span className="text-emerald-400 font-mono text-xs landscape:text-sm md:text-sm tracking-widest uppercase font-bold">{t('season')} {seasonYear}</span>
             <div className="h-1 w-1 bg-zinc-600 rounded-full"></div>
             <span className="text-zinc-400 text-xs landscape:text-sm md:text-sm">{t('week')} {isSeasonOver ? t('final') : `${currentWeek} / ${maxWeeks}`}</span>
           </div>
           <h1 className="text-xl landscape:text-2xl md:text-5xl font-black text-white tracking-tight">{t('leagueHub')}</h1>
        </div>
        
        <div className="flex gap-2 landscape:gap-3 md:gap-4 items-center">
            {!isSeasonOver ? (
                <div className="flex gap-1 landscape:gap-2">
                    <button 
                        onClick={onSimulateSeason}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(147,51,234,0.2)] hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] flex items-center gap-2 transition-all hover:-translate-y-0.5"
                    >
                        <span>{t('simSeason')}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </button>
                    <button 
                        onClick={onSimulateWeek}
                        className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-2 transition-all hover:-translate-y-0.5"
                    >
                        <span>{t('simWeek')}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
            ) : (
                <button 
                    onClick={onNewSeason}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] flex items-center gap-2 animate-pulse"
                >
                    <span>{t('seasonSummary')}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
            )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-0 gap-2 landscape:gap-3 md:gap-4">
        <div className="flex gap-2 landscape:gap-4 md:gap-8 overflow-x-auto w-full md:w-auto">
            <button 
                onClick={() => setSelectedTab('TABLE')}
                className={`pb-2 landscape:pb-3 md:pb-4 text-[10px] landscape:text-xs md:text-sm font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${selectedTab === 'TABLE' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                {t('standings')}
                {selectedTab === 'TABLE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
            </button>
            <button 
                onClick={() => setSelectedTab('RESULTS')}
                className={`pb-2 landscape:pb-3 md:pb-4 text-[10px] landscape:text-xs md:text-sm font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${selectedTab === 'RESULTS' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                {t('latestResults')}
                {selectedTab === 'RESULTS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
            </button>
            <button 
                onClick={() => setSelectedTab('STATS')}
                className={`pb-2 landscape:pb-3 md:pb-4 text-[10px] landscape:text-xs md:text-sm font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${selectedTab === 'STATS' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                {t('leagueStats')}
                {selectedTab === 'STATS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
            </button>
            <button 
                onClick={() => setSelectedTab('FIXTURES')}
                className={`pb-2 landscape:pb-3 md:pb-4 text-[10px] landscape:text-xs md:text-sm font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${selectedTab === 'FIXTURES' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                {t('fixtures')}
                {selectedTab === 'FIXTURES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
            </button>
        </div>
        
        <div className="flex gap-1 landscape:gap-1.5 md:gap-2 pb-2 overflow-x-auto w-full md:w-auto">
            {leagues.map(lg => (
                <button
                    key={lg}
                    onClick={() => setSelectedLeague(lg)}
                    className={`px-2 landscape:px-3 md:px-4 py-1 landscape:py-1.5 md:py-1.5 rounded-full text-[8px] landscape:text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                        selectedLeague === lg 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                    }`}
                >
                    {lg === 'Premier League' ? t('premierLeague') : lg}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-zinc-900/30 backdrop-blur-md rounded-lg landscape:rounded-xl md:rounded-3xl border border-white/5 shadow-2xl overflow-hidden relative min-h-[300px] landscape:min-h-[400px] md:min-h-[600px] flex flex-col">
        
        {/* Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-black text-white pointer-events-none select-none opacity-[0.02] whitespace-nowrap tracking-tighter">
            {selectedLeague === 'Premier League' ? t('premierLeague') : selectedLeague}
        </div>

        {selectedTab === 'TABLE' && (
            <div className="flex-1 overflow-x-auto overflow-y-auto relative z-10 p-1 landscape:p-2">
                <div className="min-w-full inline-block">
                <table className="w-full text-left text-xs landscape:text-sm md:text-sm min-w-[700px]">
                    <thead className="text-[7px] landscape:text-[8px] md:text-[10px] uppercase text-zinc-500 tracking-wider font-bold border-b border-white/5">
                        <tr>
                            <th className="p-1.5 landscape:p-2 md:p-5 w-8 landscape:w-12 md:w-16 text-center whitespace-nowrap">{t('pos')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 whitespace-nowrap">{t('club')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center whitespace-nowrap hidden sm:table-cell">{t('played')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center whitespace-nowrap">{t('won')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center whitespace-nowrap hidden landscape:table-cell">{t('drawn')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center whitespace-nowrap hidden landscape:table-cell">{t('lost')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center whitespace-nowrap">{t('goalsFor')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center whitespace-nowrap hidden sm:table-cell">{t('goalsAgainst')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center whitespace-nowrap hidden md:table-cell">{t('goalDifference')}</th>
                            <th className="p-1.5 landscape:p-2 md:p-5 text-center font-black text-white text-[10px] landscape:text-xs md:text-base whitespace-nowrap">{t('points')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedTeams.map((team, index) => (
                            <tr 
                                key={team.id} 
                                onClick={() => onInspectTeam && onInspectTeam(team)}
                                className={`transition-colors duration-300 cursor-pointer group ${team.id === userTeamId ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'hover:bg-white/5'}`}
                            >
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center">
                                    <div className={`w-6 h-6 landscape:w-7 landscape:h-7 md:w-8 md:h-8 mx-auto flex items-center justify-center rounded landscape:rounded-md md:rounded-lg text-[9px] landscape:text-xs md:text-sm font-bold ${
                                        index === 0 ? 'bg-yellow-500 text-black' : 
                                        index < 4 ? 'bg-emerald-500/20 text-emerald-400' : 
                                        index >= sortedTeams.length - 3 ? 'bg-rose-500/20 text-rose-400' : 
                                        'text-zinc-500'
                                    }`}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="p-1.5 landscape:p-2 md:p-4 font-bold text-[10px] landscape:text-xs md:text-base flex items-center gap-1.5 landscape:gap-2 md:gap-3 text-white truncate max-w-[120px] landscape:max-w-none">
                                    <span className="truncate">{team.name}</span>
                                    {team.id === userTeamId && <span className="text-[7px] landscape:text-[8px] md:text-[9px] bg-blue-500 text-white px-1 landscape:px-1.5 md:px-1.5 py-0.5 rounded uppercase font-bold tracking-wider whitespace-nowrap flex-shrink-0">{t('you')}</span>}
                                    {team.id === nextMatchOpponent && team.id !== userTeamId && (
                                        <span className="text-[7px] landscape:text-[8px] md:text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-1 landscape:px-1.5 md:px-1.5 py-0.5 rounded uppercase font-bold tracking-wider whitespace-nowrap flex-shrink-0">{t('next')}</span>
                                    )}
                                    {team.id !== userTeamId && team.id !== nextMatchOpponent && <span className="text-[7px] landscape:text-[8px] md:text-[9px] border border-zinc-700 text-zinc-500 px-1 landscape:px-1.5 md:px-1.5 py-0.5 rounded uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex-shrink-0 hidden sm:block">{t('inspect')}</span>}
                                </td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center text-zinc-400 text-[9px] landscape:text-xs md:text-base hidden sm:table-cell">{team.played}</td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center text-zinc-400 text-[9px] landscape:text-xs md:text-base">{team.won}</td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center text-zinc-400 text-[9px] landscape:text-xs md:text-base hidden landscape:table-cell">{team.drawn}</td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center text-zinc-400 text-[9px] landscape:text-xs md:text-base hidden landscape:table-cell">{team.lost}</td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center text-zinc-400 text-[9px] landscape:text-xs md:text-base">{team.gf}</td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center text-zinc-400 text-[9px] landscape:text-xs md:text-base hidden sm:table-cell">{team.ga}</td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center font-mono text-zinc-300 text-[9px] landscape:text-xs md:text-base hidden md:table-cell">{team.gf - team.ga}</td>
                                <td className="p-1.5 landscape:p-2 md:p-4 text-center font-black text-emerald-400 text-[10px] landscape:text-xs md:text-xl">{team.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        )}

        {selectedTab === 'RESULTS' && (
            <div className="flex-1 p-2 landscape:p-3 md:p-8 overflow-y-auto custom-scrollbar relative z-10">
                {lastWeekFixtures.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5 landscape:gap-2 md:gap-4">
                        {lastWeekFixtures.map((match) => (
                            <div key={match.id} className={`bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl p-2 landscape:p-3 md:p-6 border ${match.homeTeamId === userTeamId || match.awayTeamId === userTeamId ? 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-white/5'}`}>
                                <div className="flex justify-between items-center mb-3 landscape:mb-4 md:mb-6 gap-1 landscape:gap-2">
                                    <div className={`font-bold text-xs landscape:text-sm md:text-lg w-1/3 text-right pr-1 landscape:pr-2 md:pr-4 truncate ${match.homeTeamId === userTeamId ? 'text-blue-400' : 'text-zinc-200'}`}>
                                        {getTeamName(match.homeTeamId)}
                                    </div>
                                    <div className="bg-black px-2 landscape:px-3 md:px-5 py-1 landscape:py-1.5 md:py-2 rounded-lg landscape:rounded-xl md:rounded-xl text-base landscape:text-lg md:text-2xl font-mono font-black text-white border border-zinc-800 shadow-inner whitespace-nowrap">
                                        {match.homeScore} - {match.awayScore}
                                    </div>
                                    <div className={`font-bold text-xs landscape:text-sm md:text-lg w-1/3 text-left pl-1 landscape:pl-2 md:pl-4 truncate ${match.awayTeamId === userTeamId ? 'text-blue-400' : 'text-zinc-200'}`}>
                                        {getTeamName(match.awayTeamId)}
                                    </div>
                                </div>
                                {match.referee && (
                                    <div className="text-[9px] landscape:text-[10px] md:text-xs text-zinc-500 border-t border-white/5 border-b border-white/5 pt-2 landscape:pt-3 md:pt-4 pb-2 landscape:pb-3 md:pb-4 mt-2 landscape:mt-3 md:mt-4 flex items-center justify-center min-h-[32px] landscape:min-h-[36px] md:min-h-[48px]">
                                        <span className="font-bold">{t('referee')}:</span> {match.referee.name}
                                    </div>
                                )}
                                {match.scorers.length > 0 && (
                                    <div className="text-[9px] landscape:text-[10px] md:text-xs text-zinc-500 border-t border-white/5 pt-2 landscape:pt-3 md:pt-4 space-y-1 landscape:space-y-1.5 md:space-y-2">
                                        {[...match.scorers].sort((a, b) => a.minute - b.minute).map((s, i) => (
                                            <div key={i} className="flex justify-between px-1 landscape:px-2 md:px-4 items-center">
                                                <span className={`w-1/2 text-right pr-1 landscape:pr-2 truncate ${s.teamId === match.homeTeamId ? 'text-zinc-300' : 'invisible'}`}>
                                                    {s.name} <span className="text-zinc-600 font-mono ml-0.5 landscape:ml-1">{s.minute}'</span>
                                                </span>
                                                <div className="w-3 h-3 landscape:w-4 landscape:h-4 flex justify-center text-[8px] landscape:text-[9px] md:text-[10px] flex-shrink-0">⚽</div>
                                                <span className={`w-1/2 pl-1 landscape:pl-2 truncate ${s.teamId === match.awayTeamId ? 'text-zinc-300' : 'invisible'}`}>
                                                    <span className="text-zinc-600 font-mono mr-0.5 landscape:mr-1">{s.minute}'</span> {s.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-10 landscape:py-15 md:py-20">
                        <div className="w-12 h-12 landscape:w-14 landscape:h-14 md:w-16 md:h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-2 landscape:mb-3 md:mb-4 text-xl landscape:text-2xl md:text-2xl">📅</div>
                        <p className="text-xs landscape:text-sm md:text-lg font-light text-center px-4">No matches played in {selectedLeague} yet.</p>
                    </div>
                )}
            </div>
        )}

        {selectedTab === 'FIXTURES' && (
            <div className="flex-1 p-2 landscape:p-3 md:p-8 overflow-y-auto custom-scrollbar relative z-10" id="fixtures-container">
                <div className="space-y-2 landscape:space-y-4 md:space-y-8">
                    {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((week) => {
                        const weekFixtures = leagueFixtures.filter(f => f.week === week);
                        if (weekFixtures.length === 0) return null;
                        
                        // Calculate date for this week
                        const getDateForWeek = (weekNum: number): Date => {
                            const [startYear] = (seasonYear || "2025/2026").split('/').map(Number);
                            const seasonStart = new Date(startYear, 7, 1); // August 1st
                            const daysOffset = (weekNum - 1) * 7;
                            const date = new Date(seasonStart);
                            date.setDate(date.getDate() + daysOffset);
                            return date;
                        };
                        
                        const formatDate = formatDateTranslated;
                        
                        const weekDate = getDateForWeek(week);
                        
                        // Check if this week is in transfer window
                        // First 4 weeks (Week 1-4) are transfer window
                        const windows = {
                            summerWindow: { start: 1, end: 4 },
                            winterWindow: { start: Math.floor(maxWeeks / 2) - 1, end: Math.floor(maxWeeks / 2) }
                        };
                        const isTransferWindow = (week >= windows.summerWindow.start && week <= windows.summerWindow.end) ||
                                                 (week >= windows.winterWindow.start && week <= windows.winterWindow.end);
                        const isCurrentWeek = week === currentWeek;
                        
                        // Check if there are any matches this week (not in transfer window)
                        const hasMatches = weekFixtures.length > 0;
                        
                        return (
                            <div 
                                key={week} 
                                ref={isCurrentWeek ? currentWeekRef : null}
                                className={`rounded-lg landscape:rounded-xl md:rounded-2xl border overflow-hidden ${
                                    isCurrentWeek 
                                        ? 'bg-zinc-950/50 border-emerald-500/50' 
                                        : isTransferWindow 
                                        ? 'bg-zinc-950/50 border-yellow-500/30' 
                                        : 'bg-zinc-950/50 border-white/5'
                                }`}>
                                <div className={`p-2 landscape:p-3 md:p-4 border-b ${
                                    isCurrentWeek 
                                        ? 'bg-emerald-900/20 border-emerald-500/20' 
                                        : isTransferWindow 
                                        ? 'bg-yellow-900/10 border-yellow-500/20' 
                                        : 'bg-zinc-900/50 border-white/5'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 flex-wrap">
                                            <h3 className={`font-bold text-xs landscape:text-sm md:text-lg ${
                                                isCurrentWeek 
                                                    ? 'text-emerald-400' 
                                                    : isTransferWindow 
                                                    ? 'text-yellow-400' 
                                                    : 'text-emerald-400'
                                            } whitespace-nowrap`}>
                                                {t('week')} {week}
                                            </h3>
                                            <span className="text-zinc-500 text-[9px] landscape:text-[10px] md:text-sm whitespace-nowrap">{formatDate(weekDate)}</span>
                                            {isCurrentWeek && (
                                                <span className="px-1.5 landscape:px-2 md:px-2 py-0.5 landscape:py-1 md:py-1 bg-emerald-900/30 border border-emerald-700/30 rounded text-emerald-400 text-[8px] landscape:text-[9px] md:text-xs font-bold uppercase whitespace-nowrap">
                                                    {t('currentWeek')}
                                                </span>
                                            )}
                                            {isTransferWindow && (
                                                <span className="px-1.5 landscape:px-2 md:px-2 py-0.5 landscape:py-1 md:py-1 bg-yellow-900/30 border border-yellow-700/30 rounded text-yellow-400 text-[8px] landscape:text-[9px] md:text-xs font-bold uppercase whitespace-nowrap">
                                                    {t('transferWindow')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {hasMatches ? (
                                    <div className="p-2 landscape:p-3 md:p-4 space-y-1 landscape:space-y-1.5 md:space-y-2">
                                        {weekFixtures.map((match) => {
                                        const homeTeam = teams.find(t => t.id === match.homeTeamId);
                                        const awayTeam = teams.find(t => t.id === match.awayTeamId);
                                        const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;
                                        
                                        return (
                                            <div 
                                                key={match.id} 
                                                onClick={() => match.played && onViewMatchDetail && onViewMatchDetail(match)}
                                                className={`flex flex-col py-1.5 landscape:py-2 md:py-3 px-2 landscape:px-3 md:px-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors ${
                                                    match.played ? 'cursor-pointer' : 'cursor-default'
                                                } ${isUserMatch ? 'bg-blue-500/5' : ''}`}
                                            >
                                                <div className="flex items-center justify-between gap-1 landscape:gap-2">
                                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 flex-1 min-w-0">
                                                        <TeamShield team={homeTeam} size="small" />
                                                        <span className={`font-bold text-[10px] landscape:text-xs md:text-sm truncate ${
                                                            match.homeTeamId === userTeamId ? 'text-blue-400' : 'text-zinc-200'
                                                        }`}>
                                                            {getTeamName(match.homeTeamId)}
                                                        </span>
                                                    </div>
                                                    <div className={`px-2 landscape:px-3 md:px-4 py-1 landscape:py-1.5 md:py-1.5 rounded landscape:rounded-md md:rounded-lg text-xs landscape:text-sm md:text-lg font-mono font-black min-w-[60px] landscape:min-w-[70px] md:min-w-[80px] text-center mx-1 landscape:mx-2 md:mx-4 whitespace-nowrap flex-shrink-0 ${
                                                        match.played 
                                                            ? 'bg-black/50 text-white border border-zinc-800' 
                                                            : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700'
                                                    }`}>
                                                        {match.played ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 flex-1 min-w-0 justify-end">
                                                        <span className={`font-bold text-[10px] landscape:text-xs md:text-sm truncate text-right ${
                                                            match.awayTeamId === userTeamId ? 'text-blue-400' : 'text-zinc-200'
                                                        }`}>
                                                            {getTeamName(match.awayTeamId)}
                                                        </span>
                                                        <TeamShield team={awayTeam} size="small" />
                                                    </div>
                                                </div>
                                                {match.referee && (
                                                    <div className="text-[9px] landscape:text-[10px] md:text-xs text-zinc-500 mt-1 landscape:mt-1.5 md:mt-2 ml-4 landscape:ml-8 md:ml-12">
                                                        <span className="font-bold">{t('referee')}:</span> {match.referee.name}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    </div>
                                ) : (
                                    <div className="p-3 landscape:p-4 md:p-6 text-center">
                                        <div className="text-zinc-500 text-xs landscape:text-sm md:text-sm">
                                            {t('transferWindowNoMatches')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {selectedTab === 'STATS' && stats && (
            <div className="flex-1 p-2 landscape:p-3 md:p-6 overflow-y-auto custom-scrollbar relative z-10">
                <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2 landscape:gap-3 md:gap-6">
                    
                    {/* Top Scorers */}
                    <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden">
                        <div className="bg-zinc-900/50 p-2 landscape:p-3 md:p-4 border-b border-white/5 flex items-center gap-1.5 landscape:gap-2">
                            <span className="text-base landscape:text-lg md:text-xl">⚽</span>
                            <h3 className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] landscape:text-xs md:text-sm">{t('topScorers')}</h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[300px] landscape:max-h-[350px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                            {stats.topScorers.length > 0 ? stats.topScorers.map((s, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onInspectPlayer && onInspectPlayer(s.name, s.teamId)}
                                    className="p-2 landscape:p-3 md:p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 min-w-0 flex-1">
                                        <span className={`font-mono font-bold text-[9px] landscape:text-xs md:text-sm w-4 landscape:w-5 md:w-6 flex-shrink-0 ${i===0 ? 'text-yellow-500' : 'text-zinc-600'}`}>{i+1}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-[10px] landscape:text-xs md:text-sm text-white truncate">{s.name}</div>
                                            <div className="text-[8px] landscape:text-[9px] md:text-[10px] text-zinc-500 uppercase truncate">{getTeamName(s.teamId)}</div>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-900/30 text-emerald-400 font-bold px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1 rounded landscape:rounded-md md:rounded-lg text-[9px] landscape:text-xs md:text-sm font-mono border border-emerald-500/20 whitespace-nowrap flex-shrink-0">{s.goals}</div>
                                </div>
                            )) : <div className="p-3 landscape:p-4 text-center text-zinc-600 text-xs landscape:text-sm italic">{t('noGoalsYet')}</div>}
                        </div>
                    </div>

                    {/* Top Assists */}
                    <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden">
                        <div className="bg-zinc-900/50 p-2 landscape:p-3 md:p-4 border-b border-white/5 flex items-center gap-1.5 landscape:gap-2">
                            <span className="text-base landscape:text-lg md:text-xl">👟</span>
                            <h3 className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] landscape:text-xs md:text-sm">{t('topAssists')}</h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[300px] landscape:max-h-[350px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                            {stats.topAssists.length > 0 ? stats.topAssists.map((s, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onInspectPlayer && onInspectPlayer(s.name, s.teamId)}
                                    className="p-2 landscape:p-3 md:p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 min-w-0 flex-1">
                                        <span className={`font-mono font-bold text-[9px] landscape:text-xs md:text-sm w-4 landscape:w-5 md:w-6 flex-shrink-0 ${i===0 ? 'text-blue-500' : 'text-zinc-600'}`}>{i+1}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-[10px] landscape:text-xs md:text-sm text-white truncate">{s.name}</div>
                                            <div className="text-[8px] landscape:text-[9px] md:text-[10px] text-zinc-500 uppercase truncate">{getTeamName(s.teamId)}</div>
                                        </div>
                                    </div>
                                    <div className="bg-blue-900/30 text-blue-400 font-bold px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1 rounded landscape:rounded-md md:rounded-lg text-[9px] landscape:text-xs md:text-sm font-mono border border-blue-500/20 whitespace-nowrap flex-shrink-0">{s.assists}</div>
                                </div>
                            )) : <div className="p-3 landscape:p-4 text-center text-zinc-600 text-xs landscape:text-sm italic">{t('noAssistsYet')}</div>}
                        </div>
                    </div>

                     {/* Yellow Cards */}
                     <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden">
                        <div className="bg-zinc-900/50 p-2 landscape:p-3 md:p-4 border-b border-white/5 flex items-center gap-1.5 landscape:gap-2">
                            <span className="text-base landscape:text-lg md:text-xl">🟨</span>
                            <h3 className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] landscape:text-xs md:text-sm">{t('discipline')}</h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[300px] landscape:max-h-[350px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                            {stats.topCards.length > 0 ? stats.topCards.map((s, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onInspectPlayer && onInspectPlayer(s.name, s.teamId)}
                                    className="p-2 landscape:p-3 md:p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 min-w-0 flex-1">
                                        <span className={`font-mono font-bold text-[9px] landscape:text-xs md:text-sm w-4 landscape:w-5 md:w-6 flex-shrink-0 text-zinc-600`}>{i+1}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-[10px] landscape:text-xs md:text-sm text-white truncate">{s.name}</div>
                                            <div className="text-[8px] landscape:text-[9px] md:text-[10px] text-zinc-500 uppercase truncate">{getTeamName(s.teamId)}</div>
                                        </div>
                                    </div>
                                    <div className="bg-yellow-900/30 text-yellow-400 font-bold px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1 rounded landscape:rounded-md md:rounded-lg text-[9px] landscape:text-xs md:text-sm font-mono border border-yellow-500/20 whitespace-nowrap flex-shrink-0">{s.count}</div>
                                </div>
                            )) : <div className="p-3 landscape:p-4 text-center text-zinc-600 text-xs landscape:text-sm italic">{t('noCardsYet')}</div>}
                        </div>
                    </div>

                    {/* Win Streaks */}
                    <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden">
                        <div className="bg-zinc-900/50 p-2 landscape:p-3 md:p-4 border-b border-white/5 flex items-center gap-1.5 landscape:gap-2">
                            <span className="text-base landscape:text-lg md:text-xl">🔥</span>
                            <h3 className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] landscape:text-xs md:text-sm">{t('winStreaks')}</h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[300px] landscape:max-h-[350px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                             {stats.teamStreaks.map((s, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onInspectTeam && onInspectTeam(s.team)}
                                    className="p-2 landscape:p-3 md:p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 min-w-0 flex-1">
                                        <span className={`font-mono font-bold text-[9px] landscape:text-xs md:text-sm w-4 landscape:w-5 md:w-6 flex-shrink-0 ${i < 3 ? 'text-purple-500' : 'text-zinc-600'}`}>{i+1}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-[10px] landscape:text-xs md:text-sm text-white truncate">{s.team.name}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 landscape:gap-1.5 md:gap-2 flex-shrink-0">
                                        {s.winStreak > 0 && <span className="bg-purple-900/30 text-purple-300 text-[9px] landscape:text-[10px] md:text-xs font-bold px-1.5 landscape:px-2 md:px-2 py-0.5 landscape:py-1 md:py-1 rounded border border-purple-500/30 whitespace-nowrap">{s.winStreak} {t('wins')}</span>}
                                        {s.winStreak === 0 && <span className="text-zinc-600 text-[9px] landscape:text-[10px] md:text-xs">-</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Unbeaten Streaks */}
                    <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden">
                        <div className="bg-zinc-900/50 p-2 landscape:p-3 md:p-4 border-b border-white/5 flex items-center gap-1.5 landscape:gap-2">
                            <span className="text-base landscape:text-lg md:text-xl">🛡️</span>
                            <h3 className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] landscape:text-xs md:text-sm">{t('unbeatenStreaks')}</h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[300px] landscape:max-h-[350px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                             {stats.unbeatenStreaks.map((s, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onInspectTeam && onInspectTeam(s.team)}
                                    className="p-2 landscape:p-3 md:p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 min-w-0 flex-1">
                                        <span className={`font-mono font-bold text-[9px] landscape:text-xs md:text-sm w-4 landscape:w-5 md:w-6 flex-shrink-0 ${i < 3 ? 'text-emerald-500' : 'text-zinc-600'}`}>{i+1}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-[10px] landscape:text-xs md:text-sm text-white truncate">{s.team.name}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 landscape:gap-1.5 md:gap-2 flex-shrink-0">
                                        {s.unbeatenStreak > 0 && <span className="bg-emerald-900/30 text-emerald-300 text-[9px] landscape:text-[10px] md:text-xs font-bold px-1.5 landscape:px-2 md:px-2 py-0.5 landscape:py-1 md:py-1 rounded border border-emerald-500/30 whitespace-nowrap">{s.unbeatenStreak} {t('unbeaten')}</span>}
                                        {s.unbeatenStreak === 0 && <span className="text-zinc-600 text-[9px] landscape:text-[10px] md:text-xs">-</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Squad Value */}
                    <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden">
                        <div className="bg-zinc-900/50 p-2 landscape:p-3 md:p-4 border-b border-white/5 flex items-center gap-1.5 landscape:gap-2">
                            <span className="text-base landscape:text-lg md:text-xl">💰</span>
                            <h3 className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] landscape:text-xs md:text-sm">{t('squadValue')}</h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[300px] landscape:max-h-[350px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                             {stats.squadValues.map((s, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onInspectTeam && onInspectTeam(s.team)}
                                    className="p-2 landscape:p-3 md:p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3 min-w-0 flex-1">
                                        <span className={`font-mono font-bold text-[9px] landscape:text-xs md:text-sm w-4 landscape:w-5 md:w-6 flex-shrink-0 ${i < 3 ? 'text-amber-500' : 'text-zinc-600'}`}>{i+1}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-[10px] landscape:text-xs md:text-sm text-white truncate">{s.team.name}</div>
                                        </div>
                                    </div>
                                    <div className="bg-amber-900/30 text-amber-400 font-bold px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1 rounded landscape:rounded-md md:rounded-lg text-[8px] landscape:text-[9px] md:text-xs font-mono border border-amber-500/20 whitespace-nowrap flex-shrink-0">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(s.value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export const LeagueView = React.memo(LeagueViewComponent);
