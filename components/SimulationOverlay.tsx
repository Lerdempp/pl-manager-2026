
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Fixture, Team, MatchEvent, Position, Player } from '../types';
import { TacticsBoard } from './TacticsBoard';
import { useLanguage } from '../contexts/LanguageContext';
import { TEAM_SHORT_NAMES } from '../services/premierLeagueData';

interface SimulationOverlayProps {
  fixtures: Fixture[];
  teams: Team[];
  userTeamId?: string;
  onComplete: () => void;
  onCancel?: () => void;
}

interface LiveScore {
  home: number;
  away: number;
}

// --- Extracted Component to prevent re-creation on every render ---
const TeamShield = React.memo(({ team, size = "large" }: { team?: Team, size?: "large" | "medium" | "small" }) => {
    if (!team) return null;
    const dim = size === "large" ? 150 : size === "medium" ? 150 : 48;
    const shieldPath = "M50 5 L90 20 V45 C90 70 50 95 50 95 C50 95 10 70 10 45 V20 Z";
    
    // Extract colors from gradient string (e.g. "linear-gradient(..., #HEX ..., #HEX ...)")
    const colors = team.color?.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || ['#333333', '#000000'];
    const color1 = colors[0];
    const color2 = colors[1] || color1;
    
    // Generate unique ID for this team's gradient definition
    const gradId = `grad-${team.id}`;
    const glossId = `gloss-${team.id}`;

    return (
      <div className={`relative flex items-center justify-center drop-shadow-2xl filter ${size === 'large' ? 'w-24 h-24 md:w-32 md:h-32' : size === 'medium' ? 'w-20 h-20 md:w-28 md:h-28' : 'w-12 h-12'}`}>
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

            {/* Background Fill (Inside SVG to avoid overflow) */}
            <path 
                d={shieldPath} 
                fill={`url(#${gradId})`} 
                stroke="none"
            />
            
            {/* Inner Gloss/Shine */}
            <path 
                d={shieldPath} 
                fill={`url(#${glossId})`} 
                stroke="none"
            />

            {/* Metal Border */}
            <path 
                d={shieldPath} 
                fill="none" 
                stroke="#cbd5e1"
                strokeWidth={size === 'large' ? 3 : 4}
            />
         </svg>
         
         {/* Team Letter */}
        <span
         className={`absolute z-10 font-black text-white drop-shadow-md ${
            size === 'large'
              ? 'text-5xl md:text-6xl'
              : size === 'medium'
              ? 'text-4xl md:text-5xl'
              : 'text-xl'
          }`}
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
             {team.name.charAt(0)}
         </span>
      </div>
    );
});

export const SimulationOverlay: React.FC<SimulationOverlayProps> = ({ fixtures, teams, userTeamId, onComplete, onCancel }) => {
  const { t } = useLanguage();
  const [minute, setMinute] = useState(0);
  const [second, setSecond] = useState(0); // Second counter (0-90)
  const [millisecond, setMillisecond] = useState(0); // Millisecond counter (0-99) for display
  const [logs, setLogs] = useState<(MatchEvent & { matchId: string })[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [liveScores, setLiveScores] = useState<Record<string, LiveScore>>({});
  const [simSpeed, setSimSpeed] = useState(1000); // Default 1 second per minute
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [halfTimeCountdown, setHalfTimeCountdown] = useState(3);
  const [halfTimeClosing, setHalfTimeClosing] = useState(false);
  const [showPerformances, setShowPerformances] = useState(false);
  
  // Animation states
  const [shake, setShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [goalInfo, setGoalInfo] = useState<{ playerName: string; assistName?: string; minute: number; teamName: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSingleMatch = fixtures.length === 1;

  // Helper to get Starting XI - using same logic as SquadView
  const getStartingXI = (team: Team) => {
    const formation = team.tactics?.formation || "4-3-3";
    const parts = formation.split('-').map(Number);
    const defCount = parts[0] || 4;
    const midCount = parts.length === 3 ? parts[1] : (parts[1] + parts[2]) || 3;
    const fwdCount = parts.length === 3 ? parts[2] : parts[3] || 3;
    
    // Filter out unavailable players (suspended, injured, or ill)
    const availablePlayers = team.players.filter(p => 
        (!p.suspensionGames || p.suspensionGames === 0) &&
        !p.injury &&
        !p.illness
    );
    
    const sorted = [...availablePlayers].sort((a, b) => b.rating - a.rating);
    
    // Helper functions
    const isGK = (p: any) => p.position === Position.GK;
    const isDef = (p: any) => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(p.position);
    const isMid = (p: any) => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position);
    const isFwd = (p: any) => [Position.ST, Position.CF, Position.RW, Position.LW].includes(p.position);
    
    // Get best players for each position
    const gk = sorted.filter(isGK).slice(0, 1);
    const def = sorted.filter(isDef).slice(0, defCount);
    const mid = sorted.filter(isMid).slice(0, midCount);
    
    // Forward selection: prioritize specific positions (LW, ST, RW) - SAME AS SquadView
    const lwPlayers = sorted.filter(p => p.position === Position.LW);
    const stPlayers = sorted.filter(p => [Position.ST, Position.CF].includes(p.position)).sort((a, b) => b.rating - a.rating);
    const rwPlayers = sorted.filter(p => p.position === Position.RW);
    
    const fwdUsedIds = new Set<string>();
    const fwd: any[] = [];
    
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
    const xi: any[] = [];
    
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

  const getTeamRating = (team: Team) => {
    const xi = getStartingXI(team);
    
    // Calculate Attack Rating (forwards)
    const attackers = xi.filter(p => [Position.ST, Position.LW, Position.RW, Position.CF].includes(p.position));
    const attackRating = attackers.length > 0 
      ? Math.round(attackers.reduce((acc, p) => acc + p.rating, 0) / attackers.length)
      : 0;
    
    // Calculate Defense Rating (defenders + goalkeeper)
    const defenders = xi.filter(p => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.GK].includes(p.position));
    const defenseRating = defenders.length > 0
      ? Math.round(defenders.reduce((acc, p) => acc + p.rating, 0) / defenders.length)
      : 0;
    
    // Calculate Midfield Rating
    const midfielders = xi.filter(p => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position));
    const midfieldRating = midfielders.length > 0
      ? Math.round(midfielders.reduce((acc, p) => acc + p.rating, 0) / midfielders.length)
      : 0;
    
    // Return average of 3 ratings
    const ratings = [attackRating, defenseRating, midfieldRating].filter(r => r > 0);
    return ratings.length > 0 ? Math.round(ratings.reduce((acc, r) => acc + r, 0) / ratings.length) : 0;
  };

  // Initialize scores
  useEffect(() => {
    const initialScores: Record<string, LiveScore> = {};
    fixtures.forEach(f => {
      initialScores[f.id] = { home: 0, away: 0 };
    });
    setLiveScores(initialScores);
  }, [fixtures]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Second counter (0-90, updates based on simSpeed)
  useEffect(() => {
    if (!hasStarted || isPaused || isFinished) {
      return;
    }

    const secondInterval = setInterval(() => {
      setSecond(prev => {
        if (prev >= 90) {
          setIsFinished(true);
          return 90;
        }
        return prev + 1;
      });
    }, simSpeed);

    return () => clearInterval(secondInterval);
  }, [hasStarted, isPaused, isFinished, simSpeed]);

  // Reset millisecond when second reaches 90
  useEffect(() => {
    if (second >= 90) {
      setMillisecond(0);
    }
  }, [second]);

  // Millisecond counter (0-99, updates every 10ms for display, scales with simSpeed)
  useEffect(() => {
    if (!hasStarted || isPaused || isFinished || second >= 90) {
      return;
    }

    // Scale millisecond update speed based on simSpeed
    // If simSpeed is 1000ms (1x), update every 10ms
    // If simSpeed is 500ms (2x), update every 5ms
    const msUpdateInterval = Math.max(1, Math.floor(simSpeed / 100));

    const msInterval = setInterval(() => {
      setMillisecond(prev => {
        if (second >= 90) {
          return 0;
        }
        if (prev >= 99) {
          return 0;
        }
        return prev + 1;
      });
    }, msUpdateInterval);

    return () => clearInterval(msInterval);
  }, [hasStarted, isPaused, isFinished, simSpeed, second]);

  // Half-time countdown
  useEffect(() => {
    if (!isHalfTime) return;

    const countdownInterval = setInterval(() => {
      setHalfTimeCountdown(prev => {
        if (prev <= 1) {
          // Start closing animation
          setHalfTimeClosing(true);
          // Wait for animation to complete before closing
          setTimeout(() => {
            setIsHalfTime(false);
            setIsPaused(false);
            setHalfTimeCountdown(3);
            setHalfTimeClosing(false);
          }, 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isHalfTime]);

  // Simulation Loop (updates minute based on simSpeed)
  useEffect(() => {
    if (!hasStarted || isPaused || isFinished || isHalfTime) return;

    const interval = setInterval(() => {
      setMinute(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          setIsFinished(true);
          return 90;
        }
        // Check for half-time at 45 minutes
        if (prev === 44) {
          setIsHalfTime(true);
          setIsPaused(true);
          return 45;
        }
        return prev + 1;
      });
    }, simSpeed);

    return () => clearInterval(interval);
  }, [hasStarted, simSpeed, isPaused, isFinished, isHalfTime]);

  const updateLiveScore = useCallback((fixtureId: string, isHomeGoal: boolean) => {
      setLiveScores(prev => {
          const current = prev[fixtureId] || { home: 0, away: 0 };
          return {
              ...prev,
              [fixtureId]: {
                  home: isHomeGoal ? current.home + 1 : current.home,
                  away: !isHomeGoal ? current.away + 1 : current.away
              }
          };
      });
  }, []);

  // Process Events Logic
  const processEventsForMinute = useCallback((currentMinute: number) => {
    const newEvents: (MatchEvent & { matchId: string })[] = [];
    let hasGoal = false;
    let hasPost = false;
    let goalIsUserTeam = false;
    let goalPlayerName = '';
    let goalAssistName = '';
    let goalTeamName = '';

    fixtures.forEach(fixture => {
      // Check for detailed events (Now guaranteed by matchEngine)
      if (fixture.events) {
          const eventsNow = fixture.events.filter(e => e.minute === currentMinute);
          eventsNow.forEach(e => {
              newEvents.push({ ...e, matchId: fixture.id });
              
              if (e.type === 'GOAL') {
                  const homeTeam = teams.find(t => t.id === fixture.homeTeamId);
                  const isHomeGoal = e.teamName === homeTeam?.name;
                  updateLiveScore(fixture.id, isHomeGoal);
                  hasGoal = true;
                  // Check if goal is scored by user team
                  const scoringTeam = teams.find(t => t.name === e.teamName);
                  goalIsUserTeam = userTeamId ? scoringTeam?.id === userTeamId : false;
                  goalTeamName = e.teamName || '';
                  
                  // Get player name and assist from scorers (most reliable)
                  const scorer = fixture.scorers?.find(s => s.minute === currentMinute);
                  if (scorer) {
                    goalPlayerName = scorer.name;
                    goalAssistName = scorer.assist || '';
                  } else {
                    // Fallback: Extract from description
                    const descMatch = e.description?.match(/(?:GOAL!?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:finds|slots|gives|scores)/i);
                    if (descMatch) {
                      goalPlayerName = descMatch[1].trim();
                    } else {
                      // Last resort: try to extract any capitalized name
                      const nameMatch = e.description?.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
                      if (nameMatch) {
                        goalPlayerName = nameMatch[1];
                      }
                    }
                    // Try to extract assist from description
                    const assistMatch = e.description?.match(/Great ball from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
                    if (assistMatch) {
                      goalAssistName = assistMatch[1].trim();
                    }
                  }
              } else if (e.type === 'POST') {
                  hasPost = true;
              }
          });
      } else {
          // Fallback (Should not be reached with updated matchEngine, but kept for safety)
          const goalsNow = fixture.scorers.filter(s => s.minute === currentMinute);
          goalsNow.forEach(s => {
             const homeTeam = teams.find(t => t.id === fixture.homeTeamId);
             const isHomeGoal = s.teamId === fixture.homeTeamId;
             const teamName = isHomeGoal ? homeTeam?.name : teams.find(t => t.id === fixture.awayTeamId)?.name;

             newEvents.push({
                 minute: currentMinute,
                 type: 'GOAL',
                 description: `GOAL! ${s.name} scores for ${teamName}!`,
                 isImportant: true,
                 teamName: teamName,
                 matchId: fixture.id
             });
             updateLiveScore(fixture.id, isHomeGoal);
             hasGoal = true;
             // Check if goal is scored by user team
             goalIsUserTeam = userTeamId ? s.teamId === userTeamId : false;
             goalPlayerName = s.name;
             goalAssistName = s.assist || '';
             goalTeamName = teamName || '';
          });
      }
    });

    // Trigger animations based on events
    if (hasPost) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    
    if (hasGoal) {
      // Pause the game and show goal screen
      setIsPaused(true);
      setGoalInfo({
        playerName: goalPlayerName,
        assistName: goalAssistName || undefined,
        minute: currentMinute,
        teamName: goalTeamName
      });
      
      // Only show confetti for user team goals
      if (goalIsUserTeam) {
        setConfetti(true);
        setFlashColor('green');
      } else {
        // Only red flash for opponent goals, no confetti
        setFlashColor('red');
      }
      
      // Resume after 3 seconds
      setTimeout(() => {
        setGoalInfo(null);
        setConfetti(false);
        setFlashColor(null);
        setIsPaused(false);
      }, 3000);
    }

    if (newEvents.length > 0) {
        setLogs(prev => [...prev, ...newEvents]);
    }
  }, [fixtures, teams, updateLiveScore, userTeamId]);

  // Process Events Hook
  useEffect(() => {
    if (isFinished) return;
    processEventsForMinute(minute);
  }, [minute, isFinished, processEventsForMinute]);

  // Skip Logic
  const handleSkip = () => {
    setIsPaused(true);
    
    // Process remaining minutes in a simplified loop to generate logs and final score
    let tempMinute = minute + 1;
    const remainingLogs: (MatchEvent & { matchId: string })[] = [];
    const tempScores = { ...liveScores };

    while (tempMinute <= 90) {
        fixtures.forEach(fixture => {
            if (fixture.events) {
                const eventsNow = fixture.events.filter(e => e.minute === tempMinute);
                eventsNow.forEach(e => {
                    remainingLogs.push({ ...e, matchId: fixture.id });
                    if (e.type === 'GOAL') {
                        const homeTeam = teams.find(t => t.id === fixture.homeTeamId);
                        const isHomeGoal = e.teamName === homeTeam?.name;
                        const current = tempScores[fixture.id] || { home: 0, away: 0 };
                        tempScores[fixture.id] = {
                             home: isHomeGoal ? current.home + 1 : current.home,
                             away: !isHomeGoal ? current.away + 1 : current.away
                        };
                    }
                });
            }
        });
        tempMinute++;
    }

    setLogs(prev => [...prev, ...remainingLogs]);
    setLiveScores(tempScores);
    setMinute(90);
    setSecond(90);
    setMillisecond(0);
    setIsFinished(true);
    setIsPaused(false);
  };

  const getTeam = (id: string) => teams.find(t => t.id === id);

  // Pre-Match Screen (before match starts)
  if (!hasStarted && isSingleMatch && fixtures[0]) {
    const f = fixtures[0];
    const homeTeam = getTeam(f.homeTeamId);
    const awayTeam = getTeam(f.awayTeamId);
    
    if (homeTeam && awayTeam) {
      const homeXI = getStartingXI(homeTeam);
      const awayXI = getStartingXI(awayTeam);
      const homeRating = getTeamRating(homeTeam);
      const awayRating = getTeamRating(awayTeam);
      const competitionName = (f as any)?.competition || (f as any)?.competitionName || t('premierLeague');
      
      return (
        <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-xl flex flex-col font-sans text-white animate-in fade-in duration-500">
          {/* Back Button */}
          {onCancel && (
            <div className="absolute top-6 left-4 z-10 px-6">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-white rounded-lg transition-colors flex items-center gap-2 border border-white/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>{t('back')}</span>
              </button>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center p-2 landscape:p-3 md:p-4 lg:p-8 overflow-y-auto">
            <div className="w-full max-w-5xl landscape:max-w-6xl md:max-w-7xl lg:max-w-7xl flex flex-row gap-2 landscape:gap-3 md:gap-4 lg:gap-6 items-center justify-center">
              {/* Home Team Formation (Left) */}
              <div className="flex flex-col items-center w-[240px] landscape:w-[280px] md:w-[340px] lg:w-[400px] flex-shrink-0">
                <div className="mb-0 mt-[15px]">
                  <TeamShield team={homeTeam} size="small" />
                </div>
                <div className="flex flex-col items-center w-full">
                  <div className="mb-0 mt-[10px] text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-zinc-500 text-center">
                    {homeTeam.tactics?.formation || "4-3-3"}
                  </div>
                  <div className="flex items-center justify-center w-full overflow-hidden relative -mt-[15px]">
                    <div className="scale-[0.85] landscape:scale-[0.9] md:scale-[1.0] lg:scale-[1.1] w-full flex justify-center origin-center">
                      <TacticsBoard players={homeXI} formation={homeTeam.tactics?.formation || "4-3-3"} compact={true} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Match Info & Start Button */}
              <div className="flex flex-col items-center justify-center flex-1 min-w-0 py-2 md:py-3">
                <div className="flex flex-col items-center w-full gap-1">
                  <div className="text-center">
                    <p className="text-xs landscape:text-sm md:text-base uppercase tracking-[0.4em] text-zinc-500">{t('matchIntroTitle')}</p>
                    <h2 className="text-lg landscape:text-xl md:text-2xl font-black text-white mt-1">{t('matchIntroSubtitle', { homeTeam: homeTeam.name, awayTeam: awayTeam.name })}</h2>
                    <p className="text-zinc-400 text-xs landscape:text-sm md:text-base mt-1">
                      {t('matchIntroDetails', { competition: competitionName, weekNumber: f.week.toString() })}
                    </p>
                  </div>
                  <button
                    onClick={() => setHasStarted(true)}
                    className="px-3 landscape:px-4 md:px-6 lg:px-8 py-2 landscape:py-2.5 md:py-3 lg:py-4 bg-white text-black hover:bg-emerald-400 hover:text-black font-black text-xs landscape:text-sm md:text-base lg:text-lg rounded-lg landscape:rounded-xl md:rounded-2xl transition-all shadow-2xl hover:scale-105 hover:shadow-emerald-500/50 flex items-center gap-1.5 landscape:gap-2 md:gap-3"
                  >
                    <span>{t('startMatch')}</span>
                    <svg className="w-3 h-3 landscape:w-4 landscape:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <div className="text-center w-full">
                    <div className="text-zinc-500 text-[10px] landscape:text-xs md:text-sm">{t('versus')}</div>
                    <div className="text-sm landscape:text-base md:text-lg lg:text-xl font-black text-white truncate">{homeTeam.name}</div>
                    <div className="text-xs landscape:text-sm md:text-base lg:text-lg font-mono text-emerald-400">{homeRating}</div>
                    <div className="text-zinc-400 text-xs landscape:text-sm md:text-base">-</div>
                    <div className="text-sm landscape:text-base md:text-lg lg:text-xl font-black text-white truncate">{awayTeam.name}</div>
                    <div className="text-xs landscape:text-sm md:text-base lg:text-lg font-mono text-emerald-400">{awayRating}</div>
                    {f.referee && (
                      <div className="pt-2 border-t border-white/10">
                        <div className="text-zinc-400 text-[9px] landscape:text-[10px] md:text-xs uppercase font-bold">{t('referee')}</div>
                        <div className="text-white font-bold text-[10px] landscape:text-xs md:text-sm">
                          {f.referee.name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Away Team Formation (Right) */}
              <div className="flex flex-col items-center w-[240px] landscape:w-[280px] md:w-[340px] lg:w-[400px] flex-shrink-0">
                <div className="mb-0 mt-[15px]">
                  <TeamShield team={awayTeam} size="small" />
                </div>
                <div className="flex flex-col items-center w-full">
                  <div className="mb-0 mt-[10px] text-[10px] landscape:text-xs md:text-sm uppercase font-bold text-zinc-500 text-center">
                    {awayTeam.tactics?.formation || "4-3-3"}
                  </div>
                  <div className="flex items-center justify-center w-full overflow-hidden relative -mt-[15px]">
                    <div className="scale-[0.85] landscape:scale-[0.9] md:scale-[1.0] lg:scale-[1.1] w-full flex justify-center origin-center">
                      <TacticsBoard players={awayXI} formation={awayTeam.tactics?.formation || "4-3-3"} compact={true} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes flash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          20% { opacity: 0.5; }
          30% { opacity: 1; }
          40% { opacity: 0.3; }
          50% { opacity: 0.8; }
          60% { opacity: 0.2; }
          70% { opacity: 0.6; }
          80% { opacity: 0.1; }
          100% { opacity: 0; }
        }
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes vignette-close-left {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0);
          }
        }
        @keyframes vignette-close-right {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(0);
          }
        }
        @keyframes vignette-open-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @keyframes vignette-open-right {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .shake-animation {
          animation: shake 0.5s ease-in-out;
        }
        .flash-animation {
          animation: flash 2s ease-out;
        }
        .vignette-close-left-animation {
          animation: vignette-close-left 0.8s ease-in-out forwards;
        }
        .vignette-close-right-animation {
          animation: vignette-close-right 0.8s ease-in-out forwards;
        }
        .vignette-open-left-animation {
          animation: vignette-open-left 0.8s ease-in-out forwards;
        }
        .vignette-open-right-animation {
          animation: vignette-open-right 0.8s ease-in-out forwards;
        }
      `}</style>
      <div className={`fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-xl flex flex-col font-sans text-white animate-in fade-in duration-500 ${shake ? 'shake-animation' : ''}`}>
        
        {/* Flash Effect for Goals */}
        {flashColor && (
          <div className={`absolute inset-0 pointer-events-none z-[110] flash-animation ${
            flashColor === 'green' ? 'bg-emerald-500/30' : 'bg-red-500/30'
          }`}></div>
        )}

        {/* Confetti Effect */}
        {confetti && (
          <div className="absolute inset-0 pointer-events-none z-[105] overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full ${
                  ['bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-yellow-400', 'bg-yellow-500'][i % 5]
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  animation: `confetti-fall ${2 + Math.random() * 2}s linear forwards`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              ></div>
            ))}
          </div>
        )}

        {/* Goal Screen */}
        {goalInfo && (
          <div className="absolute inset-0 z-[125] flex items-center justify-center">
            {/* Background overlay */}
            <div className="absolute inset-0 bg-black/70"></div>
            {/* Content */}
            <div className="flex flex-col items-center gap-3 text-white relative z-10">
              <span className="text-5xl font-bold">{goalInfo.playerName}</span>
              {goalInfo.assistName && (
                <div className="text-xl text-zinc-300">
              {t('assistLabel')}: <span className="font-semibold">{goalInfo.assistName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Half-Time Screen */}
        {isHalfTime && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center overflow-hidden">
            {/* Vignette overlays - left and right panels */}
            <div className={`absolute left-0 top-0 bottom-0 w-1/2 bg-black ${halfTimeClosing ? 'vignette-open-left-animation' : 'vignette-close-left-animation'}`}></div>
            <div className={`absolute right-0 top-0 bottom-0 w-1/2 bg-black ${halfTimeClosing ? 'vignette-open-right-animation' : 'vignette-close-right-animation'}`}></div>
            {/* Content */}
            {halfTimeCountdown > 0 && !halfTimeClosing && (
              <div className="text-center relative z-10">
                <h2 className="text-5xl font-black text-white mb-8 drop-shadow-2xl">{t('halfTimeTitle')}</h2>
                <p className="text-2xl text-zinc-300 mb-4 drop-shadow-lg">{t('halfTimeResumeIn')}</p>
                <div className="text-8xl font-mono font-black text-emerald-400 drop-shadow-2xl">
                  {halfTimeCountdown}
                </div>
                <p className="text-xl text-zinc-400 mt-4 drop-shadow-lg">{t('seconds')}</p>
              </div>
            )}
          </div>
        )}
      
      {/* Background Ambiance */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-emerald-500/10 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-500/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Header Bar */}
      <div className="relative z-10 flex justify-between items-center px-4 py-2 md:px-5 md:py-3 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3 text-xs md:text-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${isFinished ? 'bg-zinc-500' : 'bg-red-500 animate-pulse'}`}></div>
            <span className="font-black tracking-widest uppercase text-zinc-400">
                {isFinished ? t('matchFinished') : t('liveMatchday')}
            </span>
        </div>

        {/* Top Right Controls (Only visible if finished) */}
        <div>
            {isFinished && (
                <button 
                    onClick={onComplete}
                    className="px-5 py-1.5 bg-white text-black hover:bg-emerald-400 font-bold rounded-md text-xs md:text-sm transition-all shadow-lg animate-bounce"
                >
                    {t('continueMatch')}
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 relative z-10 flex flex-col md:flex-row overflow-y-auto overflow-x-hidden">
        
        {/* Performances Screen */}
        {showPerformances && isSingleMatch && fixtures[0] && (() => {
          const f = fixtures[0];
          const home = getTeam(f.homeTeamId);
          const away = getTeam(f.awayTeamId);
          
          if (!f.matchPerformances || f.matchPerformances.length === 0) {
            return (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">{t('playerPerformances')}</h3>
                  <p className="text-zinc-400">{t('performanceDataNotAvailable')}</p>
                  <button
                    onClick={() => setShowPerformances(false)}
                    className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold transition-colors"
                  >
                    {t('back')}
                  </button>
                </div>
              </div>
            );
          }
          
          const homePerformances = f.matchPerformances.filter(p => p.isHome);
          const awayPerformances = f.matchPerformances.filter(p => !p.isHome);
          
          const homePlayersList = home?.players || [];
          const awayPlayersList = away?.players || [];
          
          const homeHasGK = homePerformances.some(p => {
            const player = homePlayersList.find(pl => pl.id === p.playerId);
            return player?.position === Position.GK;
          });
          const homeHasDefMid = homePerformances.some(p => {
            const player = homePlayersList.find(pl => pl.id === p.playerId);
            return player && [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(player.position);
          });
          
          const awayHasGK = awayPerformances.some(p => {
            const player = awayPlayersList.find(pl => pl.id === p.playerId);
            return player?.position === Position.GK;
          });
          const awayHasDefMid = awayPerformances.some(p => {
            const player = awayPlayersList.find(pl => pl.id === p.playerId);
            return player && [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(player.position);
          });
          
          return (
            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl font-black text-white">{t('playerPerformances')}</h2>
                <button
                  onClick={() => setShowPerformances(false)}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold transition-colors"
                >
                  {t('back')}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home Team Performances */}
                <div>
                  <h4 className="text-lg uppercase font-bold text-zinc-400 mb-4">{home ? (TEAM_SHORT_NAMES[home.name] || home.name) : ''}</h4>
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
                              const player = homePlayersList.find(p => p.id === perf.playerId);
                              if (!player) return null;
                              return (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 pl-3 text-xs text-white font-medium">{player.name}</td>
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
                  <h4 className="text-lg uppercase font-bold text-zinc-400 mb-4">{away ? (TEAM_SHORT_NAMES[away.name] || away.name) : ''}</h4>
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
                              const player = awayPlayersList.find(p => p.id === perf.playerId);
                              if (!player) return null;
                              return (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 pl-3 text-xs text-white font-medium">{player.name}</td>
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
        })()}
        
        {/* Main Stage - Only show when not viewing performances */}
        {!showPerformances && (
        <>
        <div className="flex-1 flex flex-col items-center justify-start p-8 relative min-h-0">
            {isSingleMatch && fixtures[0] && (() => {
                const f = fixtures[0];
                const home = getTeam(f.homeTeamId);
                const away = getTeam(f.awayTeamId);
                const score = liveScores[f.id] || { home: 0, away: 0 };

                // Calculate match statistics
                const getTeamEvents = (teamId: string, eventType: string) => 
                  logs.filter(l => l.matchId === f.id && l.type === eventType && teams.find(t => t.name === l.teamName)?.id === teamId).length;

                const homeShots = logs.filter(l => l.matchId === f.id && (l.type === 'GOAL' || l.type === 'SAVE' || l.type === 'POST') && teams.find(t => t.name === l.teamName)?.id === f.homeTeamId).length;
                const awayShots = logs.filter(l => l.matchId === f.id && (l.type === 'GOAL' || l.type === 'SAVE' || l.type === 'POST') && teams.find(t => t.name === l.teamName)?.id === f.awayTeamId).length;
                const homeOnTarget = logs.filter(l => l.matchId === f.id && (l.type === 'GOAL' || l.type === 'SAVE') && teams.find(t => t.name === l.teamName)?.id === f.homeTeamId).length;
                const awayOnTarget = logs.filter(l => l.matchId === f.id && (l.type === 'GOAL' || l.type === 'SAVE') && teams.find(t => t.name === l.teamName)?.id === f.awayTeamId).length;
                const homeGoals = score.home;
                const awayGoals = score.away;
                const homeSaves = getTeamEvents(f.homeTeamId, 'SAVE');
                const awaySaves = getTeamEvents(f.awayTeamId, 'SAVE');
                const homeCorners = getTeamEvents(f.homeTeamId, 'CORNER');
                const awayCorners = getTeamEvents(f.awayTeamId, 'CORNER');
                const homeFouls = getTeamEvents(f.homeTeamId, 'FOUL');
                const awayFouls = getTeamEvents(f.awayTeamId, 'FOUL');
                const homeYellowCards = logs.filter(l => l.matchId === f.id && l.type === 'CARD' && teams.find(t => t.name === l.teamName)?.id === f.homeTeamId).length;
                const awayYellowCards = logs.filter(l => l.matchId === f.id && l.type === 'CARD' && teams.find(t => t.name === l.teamName)?.id === f.awayTeamId).length;
                
                // Calculate possession based on events
                const totalEvents = homeShots + awayShots + homeCorners + awayCorners;
                const homePossession = totalEvents > 0 ? Math.round(((homeShots + homeCorners) / totalEvents) * 100) : 50;
                const awayPossession = 100 - homePossession;
                
                // Calculate xG (simplified: goals + on target shots * 0.3)
                const homeXG = (homeGoals + homeOnTarget * 0.3).toFixed(2);
                const awayXG = (awayGoals + awayOnTarget * 0.3).toFixed(2);
                
                // Big chances (shots on target)
                const homeBigChances = homeOnTarget;
                const awayBigChances = awayOnTarget;
                
                // Passes (estimated based on possession and events)
                const homePasses = Math.round(350 + (homePossession - 50) * 5 + homeShots * 10);
                const awayPasses = Math.round(350 + (awayPossession - 50) * 5 + awayShots * 10);
                
                // Tackles (estimated)
                const homeTackles = Math.round(10 + awayPossession * 0.1);
                const awayTackles = Math.round(10 + homePossession * 0.1);
                
                // Free kicks (estimated from fouls)
                const homeFreeKicks = homeFouls + Math.floor(Math.random() * 3);
                const awayFreeKicks = awayFouls + Math.floor(Math.random() * 3);

                return (
                    <div className="w-full max-w-3xl flex flex-col gap-5 md:gap-7 items-center scale-90 md:scale-95 pb-8">
                        {/* Match Time Display and Controls - Top */}
                        <div className="w-full flex flex-col items-center gap-2 -mt-8">
                            <div className="w-full max-w-lg flex items-center justify-center">
                                <div className="bg-black/40 border border-white/10 px-6 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md shadow-xl">
                                    <span className={`text-xl md:text-2xl font-mono font-black tabular-nums ${isFinished ? 'text-zinc-400' : 'text-emerald-400'}`}>
                                        {String(second).padStart(2, '0')}:{String(millisecond).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            {/* Performances Button - Only show when match is finished */}
                            {isFinished && f.matchPerformances && f.matchPerformances.length > 0 && (
                                <button
                                    onClick={() => setShowPerformances(true)}
                                    className="px-4 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded transition-all"
                                >
                                    {t('viewPerformances')}
                                </button>
                            )}

                            {/* Simulation Controls */}
                            {!isFinished && (
                                <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                                    <button 
                                        onClick={() => setSimSpeed(1000)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${simSpeed === 1000 ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {t('speed1x')}
                                    </button>
                                    <button 
                                        onClick={() => setSimSpeed(333)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${simSpeed === 333 ? 'bg-emerald-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {t('speed3x')}
                                    </button>
                                    <button 
                                        onClick={handleSkip}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-zinc-400 hover:text-white hover:bg-white/10 flex items-center gap-1"
                                    >
                                        {t('skipToEnd')} <span className="text-[8px]">⏭</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between w-full -mt-[30px]">
                            {/* Home Team */}
                            <div className="flex-1 flex flex-col items-center gap-3 translate-y-[10px]">
                                <TeamShield team={home} size="medium" />
                                <h2 className="text-xl md:text-3xl font-black text-center tracking-tight leading-none drop-shadow-2xl">{home ? (TEAM_SHORT_NAMES[home.name] || home.name) : ''}</h2>
                            </div>

                            {/* Score Display */}
                            <div className="flex items-center gap-5 mx-4 md:mx-6 -translate-y-[15px]">
                                <span className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    {score.home}
                                </span>
                                <div className="h-14 w-px bg-white/10"></div>
                                <span className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    {score.away}
                                </span>
                            </div>

                            {/* Away Team */}
                            <div className="flex-1 flex flex-col items-center gap-3 translate-y-[10px]">
                                <TeamShield team={away} size="medium" />
                                <h2 className="text-xl md:text-3xl font-black text-center tracking-tight leading-none drop-shadow-2xl">{away ? (TEAM_SHORT_NAMES[away.name] || away.name) : ''}</h2>
                            </div>
                        </div>

                        {/* Match Statistics */}
                        <div className="w-full max-w-3xl bg-black/30 rounded-xl p-3 border border-white/10 backdrop-blur-sm max-h-[280px] overflow-y-auto custom-scrollbar">
                            {[
                                { label: 'Topla Oynama', home: homePossession, away: awayPossession, isPercentage: true, max: 100 },
                                { label: 'Gol Beklentisi (xG)', home: parseFloat(homeXG), away: parseFloat(awayXG), isPercentage: false, max: Math.max(parseFloat(homeXG), parseFloat(awayXG), 1) },
                                { label: 'Büyük Şans', home: homeBigChances, away: awayBigChances, isPercentage: false, max: Math.max(homeBigChances, awayBigChances, 1) },
                                { label: 'Toplam Şut', home: homeShots, away: awayShots, isPercentage: false, max: Math.max(homeShots, awayShots, 1) },
                                { label: 'Kaleci Kurtarışı', home: homeSaves, away: awaySaves, isPercentage: false, max: Math.max(homeSaves, awaySaves, 1) },
                                { label: 'Korner', home: homeCorners, away: awayCorners, isPercentage: false, max: Math.max(homeCorners, awayCorners, 1) },
                                { label: 'Faul', home: homeFouls, away: awayFouls, isPercentage: false, max: Math.max(homeFouls, awayFouls, 1) },
                                { label: 'Pas', home: homePasses, away: awayPasses, isPercentage: false, max: Math.max(homePasses, awayPasses, 1) },
                                { label: 'Top Çalma', home: homeTackles, away: awayTackles, isPercentage: false, max: Math.max(homeTackles, awayTackles, 1) },
                                { label: 'Serbest Vuruş', home: homeFreeKicks, away: awayFreeKicks, isPercentage: false, max: Math.max(homeFreeKicks, awayFreeKicks, 1) },
                                { label: 'Sarı Kart', home: homeYellowCards, away: awayYellowCards, isPercentage: false, max: Math.max(homeYellowCards, awayYellowCards, 1) },
                            ].map((stat, idx) => {
                                const homePercent = (stat.home / stat.max) * 100;
                                const awayPercent = (stat.away / stat.max) * 100;
                                const total = stat.home + stat.away;
                                const homeBarPercent = total > 0 ? (stat.home / total) * 100 : 50;
                                const awayBarPercent = 100 - homeBarPercent;
                                
                                return (
                                    <div key={idx} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                        {/* Home Value */}
                                        <div className="w-12 text-right">
                                            <span className="text-sm font-bold text-emerald-400">{stat.isPercentage ? `${stat.home}%` : stat.home}</span>
                                        </div>
                                        
                                        {/* Bar Graph */}
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${homeBarPercent}%` }}></div>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-medium min-w-[70px] text-center">{stat.label}</div>
                                            <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${awayBarPercent}%` }}></div>
                                            </div>
                                        </div>
                                        
                                        {/* Away Value */}
                                        <div className="w-12 text-left">
                                            <span className="text-sm font-bold text-purple-400">{stat.isPercentage ? `${stat.away}%` : stat.away}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Multi-Match Grid */}
            {!isSingleMatch && (
                <div className="w-full h-full flex flex-col">
                    <div className="flex justify-center gap-4 mb-4">
                         {!isFinished && (
                             <>
                                <button onClick={() => setSimSpeed(1000)} className={`px-4 py-1 rounded border ${simSpeed === 1000 ? 'bg-white text-black' : 'border-zinc-600'}`}>{t('speed1x')}</button>
                                <button onClick={() => setSimSpeed(333)} className={`px-4 py-1 rounded border ${simSpeed === 333 ? 'bg-emerald-500 text-black' : 'border-zinc-600'}`}>{t('speed3x')}</button>
                                <button onClick={handleSkip} className="px-4 py-1 rounded border border-zinc-600 hover:bg-white/10">{t('skip')}</button>
                             </>
                         )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl overflow-y-auto p-4 custom-scrollbar">
                        {fixtures.map(f => {
                            const home = getTeam(f.homeTeamId);
                            const away = getTeam(f.awayTeamId);
                            const score = liveScores[f.id] || { home: 0, away: 0 };
                            return (
                                <div key={f.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3 w-1/3 overflow-hidden">
                                        <TeamShield team={home} size="small" />
                                        <span className="font-bold text-zinc-300 truncate text-sm">{home ? (TEAM_SHORT_NAMES[home.name] || home.name) : ''}</span>
                                    </div>
                                    <div className="bg-black/50 px-4 py-2 rounded text-emerald-400 font-mono font-bold text-xl min-w-[80px] text-center shadow-inner border border-white/5">
                                        {score.home} - {score.away}
                                    </div>
                                    <div className="flex items-center justify-end gap-3 w-1/3 overflow-hidden">
                                        <span className="font-bold text-zinc-300 truncate text-sm text-right">{away ? (TEAM_SHORT_NAMES[away.name] || away.name) : ''}</span>
                                        <TeamShield team={away} size="small" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
        </>
        )}

        {/* Live Feed Sidebar - Only show when not viewing performances */}
        {!showPerformances && (
        <div className="w-full md:w-96 bg-zinc-900/80 border-l border-white/5 flex flex-col backdrop-blur-md">
            <div className="p-4 border-b border-white/5 bg-zinc-950/30 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">{t('matchFeed')}</h3>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[10px] text-red-500 font-bold">{t('live')}</span>
                </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {logs.length === 0 && (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic flex-col gap-2">
                        <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                        <span>{t('waitingForKickoff')}</span>
                    </div>
                )}
                
                {logs.map((log, idx) => {
                    // Determine Icon & Color
                    let icon = '•';
                    let colorClass = 'border-zinc-700 text-zinc-400';
                    let bgClass = 'bg-zinc-800/50';
                    
                    // Check if this is a narrative step by looking ahead to find the final event type
                    let eventType = log.type;
                    if (log.type === 'WHISTLE') {
                        // Look ahead to find the final event type in this sequence (within 1 minute)
                        for (let i = idx + 1; i < logs.length && i < idx + 5; i++) {
                            if (logs[i].type !== 'WHISTLE' && logs[i].minute <= log.minute + 1) {
                                eventType = logs[i].type;
                                break;
                            }
                        }
                        // If still WHISTLE, try to infer from description
                        if (eventType === 'WHISTLE') {
                            const desc = log.description.toLowerCase();
                            if (desc.includes('goal') || desc.includes('scores') || desc.includes('back of the net')) {
                                eventType = 'GOAL';
                            } else if (desc.includes('save') || desc.includes('denies') || desc.includes('catches')) {
                                eventType = 'SAVE';
                            } else if (desc.includes('miss') || desc.includes('wide') || desc.includes('over')) {
                                eventType = 'MISS';
                            } else if (desc.includes('corner')) {
                                eventType = 'CORNER';
                            } else if (desc.includes('foul') || desc.includes('penalty')) {
                                eventType = 'FOUL';
                            } else if (desc.includes('var') || desc.includes('review')) {
                                eventType = 'VAR';
                            } else if (desc.includes('card')) {
                                eventType = 'CARD';
                            } else if (desc.includes('post') || desc.includes('woodwork')) {
                                eventType = 'POST';
                            } else if (desc.includes('substitution') || desc.includes('coming on')) {
                                eventType = 'SUBSTITUTION';
                            }
                        }
                    }
                    
                    if (eventType === 'GOAL') {
                        icon = '⚽';
                        colorClass = 'border-emerald-500 text-emerald-200';
                        bgClass = 'bg-emerald-900/20';
                    } else if (eventType === 'SAVE') {
                        icon = '🧤';
                        colorClass = 'border-blue-500 text-blue-200';
                        bgClass = 'bg-blue-900/20';
                    } else if (eventType === 'POST') {
                        icon = '🪵';
                        colorClass = 'border-amber-500 text-amber-200';
                        bgClass = 'bg-amber-900/20';
                    } else if (eventType === 'CARD') {
                        // Check if it's a red card by looking at the description (check both English and Turkish)
                        const descUpper = log.description.toUpperCase();
                        const isRedCard = descUpper.includes('RED CARD') || descUpper.includes('KIRMIZI KART');
                        if (isRedCard) {
                            icon = '🟥';
                            colorClass = 'border-red-500 text-red-200';
                            bgClass = 'bg-red-900/20';
                        } else {
                            icon = '🟨';
                            colorClass = 'border-yellow-500 text-yellow-200';
                            bgClass = 'bg-yellow-900/20';
                        }
                    } else if (eventType === 'FOUL' || eventType === 'PENALTY') {
                        icon = '❗';
                        colorClass = 'border-rose-500 text-rose-200';
                        bgClass = 'bg-rose-900/20';
                    } else if (eventType === 'VAR') {
                         icon = '📺';
                         colorClass = 'border-purple-500 text-purple-200';
                         bgClass = 'bg-purple-900/20';
                    } else if (eventType === 'CORNER') {
                         icon = '🚩';
                         colorClass = 'border-cyan-500 text-cyan-200';
                         bgClass = 'bg-cyan-900/20';
                    } else if (eventType === 'INJURY') {
                         icon = '🚑';
                         colorClass = 'border-red-500 text-red-200';
                         bgClass = 'bg-red-900/20';
                    } else if (eventType === 'MISS') {
                        icon = '❌';
                        colorClass = 'border-zinc-600 text-zinc-400';
                        bgClass = 'bg-zinc-800/30';
                    } else if (eventType === 'SUBSTITUTION') {
                        icon = '🔄';
                        colorClass = 'border-zinc-500 text-zinc-300';
                        bgClass = 'bg-zinc-800/40';
                    } else if (log.type === 'WHISTLE') {
                        // Default for narrative steps that couldn't be matched
                        icon = '⚡';
                        colorClass = 'border-zinc-500 text-zinc-300';
                        bgClass = 'bg-zinc-800/30';
                    }

                    return (
                        <div key={idx} className={`relative pl-4 border-l-2 ${colorClass.split(' ')[0]} animate-in slide-in-from-right-4 duration-500`}>
                            <div className={`p-3 rounded-lg ${bgClass} text-sm leading-relaxed shadow-sm border border-white/5`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono font-bold text-xs opacity-70">{log.minute}'</span>
                                    <span className="text-base">{icon}</span>
                                </div>
                                <span className={`font-medium ${colorClass.split(' ')[1]}`}>
                                    {log.description}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        )}

      </div>
      </div>
    </>
  );
};

