import React, { useState, useEffect, useRef } from 'react';
import { Team, MatchEvent, MatchStats, Player, Position } from '../types';
import { getAssistantAnalysis, generateGoalCommentary } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface MatchViewProps {
  userTeam: Team;
  opponentTeam: Team;
  onFinish: (stats: MatchStats) => void;
}

export const MatchView: React.FC<MatchViewProps> = ({ userTeam, opponentTeam, onFinish }) => {
  const { t, language } = useLanguage();
  const [minute, setMinute] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stats, setStats] = useState<MatchStats>({
    homeScore: 0,
    awayScore: 0,
    possession: 50,
    shotsHome: 0,
    shotsAway: 0,
    onTargetHome: 0,
    onTargetAway: 0
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per tick (tick = 1 match minute)
  const [assistantTip, setAssistantTip] = useState<string>("");
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Initial Commentary
  useEffect(() => {
    setEvents([{
      minute: 0,
      type: 'WHISTLE',
      description: t('welcomeMatch').replace('{homeTeam}', userTeam.name).replace('{awayTeam}', opponentTeam.name),
      isImportant: true
    }]);
    setIsPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game Loop
  useEffect(() => {
    let interval: any;

    if (isPlaying && minute < 90) {
      interval = setInterval(async () => {
        setMinute((prev) => {
          const nextMinute = prev + 1;
          simulateMinute(nextMinute);
          return nextMinute;
        });
      }, speed);
    } else if (minute >= 90 && isPlaying) {
        setIsPlaying(false);
        addEvent({
            minute: 90,
            type: 'WHISTLE',
            description: t('fullTime'),
            isImportant: true
        });
        // Allow user to exit manually via button
    }

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, minute, speed]);

  const addEvent = (event: MatchEvent) => {
    setEvents(prev => [...prev, event]);
  };

  // Simulation Logic
  const simulateMinute = async (min: number) => {
    const isMidOrFwd = (pos: Position) => [
      Position.ST, Position.CF, Position.RW, Position.LW,
      Position.CAM, Position.CM, Position.CDM, Position.RM, Position.LM
    ].includes(pos);

    // Calculate Team Strengths (simplified)
    const userAttack = userTeam.players.slice(0, 11).reduce((acc, p) => acc + (isMidOrFwd(p.position) ? p.rating : 0), 0) / 6;
    const oppAttack = opponentTeam.players.slice(0, 11).reduce((acc, p) => acc + (isMidOrFwd(p.position) ? p.rating : 0), 0) / 6;
    
    // Mentality Modifiers
    const userMentalityMod = userTeam.tactics.mentality === 'Attacking' ? 1.2 : userTeam.tactics.mentality === 'Defensive' ? 0.8 : 1.0;
    
    const effectiveUserAttack = userAttack * userMentalityMod;
    
    // RNG Factor
    const dice = Math.random();

    // Adjust stats passively
    setStats(prev => ({
        ...prev,
        possession: Math.min(90, Math.max(10, prev.possession + (userTeam.tactics.mentality === 'Attacking' ? 1 : -1) * (Math.random() > 0.5 ? 1 : 0)))
    }));

    // Goal Chance
    if (dice > 0.92) {
        // Who gets the chance? Based on possession and attack
        const isUserChance = Math.random() * 100 < (stats.possession + (effectiveUserAttack - oppAttack));
        const attackingTeam = isUserChance ? userTeam : opponentTeam;
        const defendingTeam = isUserChance ? opponentTeam : userTeam;
        
        // Shot logic
        const shotQuality = Math.random();
        
        // Update stats
        setStats(prev => ({
            ...prev,
            shotsHome: isUserChance ? prev.shotsHome + 1 : prev.shotsHome,
            shotsAway: !isUserChance ? prev.shotsAway + 1 : prev.shotsAway,
            onTargetHome: (isUserChance && shotQuality > 0.4) ? prev.onTargetHome + 1 : prev.onTargetHome,
            onTargetAway: (!isUserChance && shotQuality > 0.4) ? prev.onTargetAway + 1 : prev.onTargetAway,
        }));

        if (shotQuality > 0.75) {
            // GOAL!
            const scorer = attackingTeam.players[Math.floor(Math.random() * 5) + 5]; // Random mid/fwd
            
            // Pause briefly for API call to generate flavor text
            setIsPlaying(false); 
            const commentary = await generateGoalCommentary(scorer.name, attackingTeam.name, min, language);
            
            addEvent({
                minute: min,
                type: 'GOAL',
                description: commentary,
                teamName: attackingTeam.name,
                isImportant: true
            });
            
            setStats(prev => ({
                ...prev,
                homeScore: isUserChance ? prev.homeScore + 1 : prev.homeScore,
                awayScore: !isUserChance ? prev.awayScore + 1 : prev.awayScore
            }));
            setIsPlaying(true);
        } else if (shotQuality > 0.4) {
            addEvent({
                minute: min,
                type: 'SAVE',
                description: `Great save by the ${defendingTeam.name} goalkeeper! ${attackingTeam.name} looking dangerous.`,
                isImportant: false
            });
        } else {
            addEvent({
                minute: min,
                type: 'MISS',
                description: `${attackingTeam.name} fire wide of the post. Wasted opportunity.`,
                isImportant: false
            });
        }
    } else if (dice < 0.02) {
        // Yellow Card
         addEvent({
            minute: min,
            type: 'CARD',
            description: `Yellow card shown to a ${Math.random() > 0.5 ? userTeam.name : opponentTeam.name} player for a rough tackle.`,
            isImportant: false
        });
    }
  };

  const handleAskAssistant = async () => {
    setIsLoadingTip(true);
    setIsPlaying(false);
    try {
        const advice = await getAssistantAnalysis(userTeam, opponentTeam, stats, minute, language);
        setAssistantTip(advice);
    } catch (e) {
        setAssistantTip("I can't get a clear read on the game right now, boss.");
    } finally {
        setIsLoadingTip(false);
        setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto bg-slate-950 text-slate-100 shadow-2xl rounded-xl overflow-hidden border border-slate-800">
      
      {/* Scoreboard Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-700 shadow-md relative overflow-hidden">
         <div className="flex justify-between items-center relative z-10">
            <div className="text-center w-1/3">
                <h2 className="text-xl md:text-3xl font-bold text-emerald-400">{userTeam.name}</h2>
                <p className="text-xs text-slate-400 tracking-widest uppercase mt-1">{t('home')}</p>
            </div>
            <div className="text-center w-1/3 flex flex-col items-center">
                <div className="text-5xl md:text-6xl font-black text-white tabular-nums tracking-tight bg-slate-950/50 px-6 py-2 rounded-lg border border-slate-700/50 shadow-inner">
                    {stats.homeScore} - {stats.awayScore}
                </div>
                <div className="mt-2 text-emerald-400 font-mono text-lg animate-pulse">{minute}'</div>
            </div>
            <div className="text-center w-1/3">
                <h2 className="text-xl md:text-3xl font-bold text-white">{opponentTeam.name}</h2>
                <p className="text-xs text-slate-400 tracking-widest uppercase mt-1">{t('away')}</p>
            </div>
         </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Stats & Controls */}
        <div className="w-full md:w-1/3 bg-slate-900 p-6 border-r border-slate-800 flex flex-col gap-6 overflow-y-auto">
            
            {/* Live Stats */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 text-center tracking-wider">{t('matchStats')}</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="w-8 text-left">{stats.shotsHome}</span>
                        <span className="text-slate-500 font-medium">{t('shots')}</span>
                        <span className="w-8 text-right">{stats.shotsAway}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                         <div style={{ width: `${stats.shotsHome / (Math.max(1, stats.shotsHome + stats.shotsAway)) * 100}%` }} className="bg-emerald-500 h-full"></div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="w-8 text-left">{stats.possession}%</span>
                        <span className="text-slate-500 font-medium">{t('possession')}</span>
                        <span className="w-8 text-right">{100 - stats.possession}%</span>
                    </div>
                     <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                         <div style={{ width: `${stats.possession}%` }} className="bg-emerald-500 h-full"></div>
                    </div>
                </div>
            </div>

            {/* Assistant Manager */}
            <div className="bg-blue-900/20 border border-blue-900/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-blue-400 font-bold text-sm">{t('assistantManager')}</h3>
                    <button 
                        onClick={handleAskAssistant}
                        disabled={isLoadingTip || !isPlaying}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                    >
                        {isLoadingTip ? t('thinking') : t('askAdvice')}
                    </button>
                </div>
                <div className="text-sm text-slate-300 min-h-[3rem] italic">
                    {assistantTip || t('assistantWatching')}
                </div>
            </div>

            {/* Speed Controls */}
            <div className="mt-auto">
                <div className="flex justify-center gap-4 mb-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className={`px-6 py-2 rounded font-bold w-full ${isPlaying ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                        {isPlaying ? t('pause') : minute >= 90 ? t('finishMatch') : t('resume')}
                    </button>
                </div>
                {minute >= 90 && (
                    <button onClick={() => onFinish(stats)} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold border border-slate-600 transition-all">
                        {t('returnToMenu')}
                    </button>
                )}
            </div>
        </div>

        {/* Right: Commentary Feed */}
        <div className="w-full md:w-2/3 bg-black p-0 relative flex flex-col">
             <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none"></div>
             
             <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
             >
                {events.length === 0 && <p className="text-center text-slate-600 mt-10">{t('waitingForKickoff')}</p>}
                
                {events.map((event, index) => (
                    <div key={index} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 ${event.isImportant ? 'opacity-100' : 'opacity-70'}`}>
                        <div className="w-12 flex-shrink-0 flex flex-col items-center">
                            <span className="text-slate-500 font-mono text-sm">{event.minute}'</span>
                            {event.type === 'GOAL' && <div className="w-0.5 h-full bg-emerald-500/50 mt-1"></div>}
                        </div>
                        <div className={`pb-4 border-b border-slate-800/50 w-full ${event.type === 'GOAL' ? 'text-emerald-400 font-bold text-lg' : 'text-slate-300'}`}>
                             {event.type === 'GOAL' && <span className="block text-xs text-emerald-600 uppercase tracking-wider mb-1">{t('goalFor')} {event.teamName}</span>}
                             {event.type === 'CARD' && (
                                 <span className={`inline-block w-3 h-4 mr-2 rounded-sm align-middle ${
                                     event.description.toUpperCase().includes('RED CARD') || 
                                     event.description.toUpperCase().includes('KIRMIZI KART')
                                         ? 'bg-red-500' 
                                         : 'bg-yellow-500'
                                 }`}></span>
                             )}
                             {event.description}
                        </div>
                    </div>
                ))}
             </div>
             
             <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </div>

      </div>
    </div>
  );
};