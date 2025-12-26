
import React, { useState, useEffect } from 'react';
import { Player, Team, Position } from '../types';
import { generateYouthPlayer } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { getTraitName, getTraitDescription, getTraitRarity, TraitRarity } from '../services/playerTraits';

interface YouthAcademyModalProps {
    team: Team;
    prospects?: Player[];
    scoutStarted?: boolean;
    reloadCount?: number;
    onProspectsChange?: (prospects: Player[]) => void;
    onScoutStartedChange?: (started: boolean) => void;
    onReloadCountChange?: (count: number) => void;
    onClose: () => void;
    onSignPlayer: (player: Player, scoutingCost: number) => void;
    onDeductFunds: (amount: number) => void;
    onNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const YouthAcademyModal: React.FC<YouthAcademyModalProps> = ({ 
    team, 
    prospects: externalProspects, 
    scoutStarted: externalScoutStarted,
    reloadCount: externalReloadCount = 0,
    onProspectsChange, 
    onScoutStartedChange,
    onReloadCountChange,
    onClose, 
    onSignPlayer, 
    onDeductFunds,
    onNotification
}) => {
    const { translatePosition, t } = useLanguage();
    const [internalProspects, setInternalProspects] = useState<Player[]>(externalProspects || []);
    const [internalScoutStarted, setInternalScoutStarted] = useState(externalScoutStarted ?? (externalProspects && externalProspects.length > 0));
    
    const prospects = externalProspects !== undefined ? externalProspects : internalProspects;
    const scoutStarted = externalScoutStarted !== undefined ? externalScoutStarted : internalScoutStarted;
    
    const setProspects = (newProspects: Player[]) => {
        if (onProspectsChange) {
            onProspectsChange(newProspects);
        } else {
            setInternalProspects(newProspects);
        }
    };
    
    const setScoutStarted = (started: boolean) => {
        if (onScoutStartedChange) {
            onScoutStartedChange(started);
        } else {
            setInternalScoutStarted(started);
        }
    };
    
    // Update internal state when external props change
    useEffect(() => {
        if (externalProspects !== undefined) {
            setInternalProspects(externalProspects);
            // If prospects exist, automatically set scoutStarted to true
            if (externalProspects.length > 0) {
                if (externalScoutStarted === false && onScoutStartedChange) {
                    onScoutStartedChange(true);
                } else if (externalScoutStarted === undefined) {
                    setInternalScoutStarted(true);
                }
            } else if (externalProspects.length === 0 && externalScoutStarted === true && onScoutStartedChange) {
                // If prospects are cleared, reset scoutStarted
                onScoutStartedChange(false);
            }
        }
        if (externalScoutStarted !== undefined) {
            setInternalScoutStarted(externalScoutStarted);
        }
    }, [externalProspects, externalScoutStarted, onScoutStartedChange]);
    
    // On mount, if prospects exist but scoutStarted is false, fix it immediately
    useEffect(() => {
        if (externalProspects && externalProspects.length > 0 && externalScoutStarted === false && onScoutStartedChange) {
            onScoutStartedChange(true);
        }
    }, []); // Only run on mount
    const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);
    const [filterPos, setFilterPos] = useState<string>('ALL');
    const [traitTooltip, setTraitTooltip] = useState<{ traitId: string; x: number; y: number } | null>(null); 

    // Negotiation State
    const [offer, setOffer] = useState(0);
    const [baseDemand, setBaseDemand] = useState(0);
    const [years, setYears] = useState(3);
    const [round, setRound] = useState(1);
    const [feedback, setFeedback] = useState("");
    const [status, setStatus] = useState<'ONGOING' | 'ACCEPTED' | 'REJECTED'>('ONGOING');
    
    // Mood State
    const [currentMood, setCurrentMood] = useState({ 
        emoji: '😐', 
        label: t('waiting'), 
        color: 'text-zinc-400', 
        border: 'border-zinc-500/50', 
        bg: 'bg-zinc-500/10' 
    });

    const BASE_SCOUT_COST = 2000000;
    const RELOAD_COST_MULTIPLIER = 1.1; // 10% increase per reload
    
    // Calculate current reload cost based on reload count
    const getReloadCost = () => {
        return Math.floor(BASE_SCOUT_COST * Math.pow(RELOAD_COST_MULTIPLIER, externalReloadCount));
    };
    
    const SCOUT_COST = BASE_SCOUT_COST; // Initial scout cost
    const currentReloadCost = getReloadCost();

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    const getDemandForYears = (y: number, base: number) => {
        const multipliers: Record<number, number> = {
            1: 1.25,
            2: 1.10,
            3: 1.00, 
            4: 0.95,
            5: 0.90
        };
        return Math.floor(base * (multipliers[y] || 1));
    };
    
    const currentDemand = getDemandForYears(years, baseDemand);

    const getPlayerMood = (currentOffer: number, demand: number) => {
        const ratio = currentOffer / demand;
        if (ratio >= 1.0) return { emoji: '🤩', label: t('thrilled'), color: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-500/10' };
        if (ratio >= 0.9) return { emoji: '😁', label: t('happy'), color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/10' };
        if (ratio >= 0.8) return { emoji: '🙂', label: t('interested'), color: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-500/10' };
        if (ratio >= 0.65) return { emoji: '😐', label: t('skeptical'), color: 'text-zinc-400', border: 'border-zinc-500/50', bg: 'bg-zinc-500/10' };
        if (ratio >= 0.4) return { emoji: '😒', label: t('annoyed'), color: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500/10' };
        return { emoji: '😡', label: t('insulted'), color: 'text-rose-500', border: 'border-rose-500/50', bg: 'bg-rose-500/10' };
    };

    const handleStartScouting = () => {
        if (team.budget < SCOUT_COST) {
            // Notification will be handled by parent component
            return;
        }
        
        onDeductFunds(SCOUT_COST);
        setScoutStarted(true);
        setFilterPos('ALL');

        const count = 3 + Math.floor(Math.random() * 3);
        const newProspects: Player[] = [];
        for(let i=0; i<count; i++) {
            newProspects.push(generateYouthPlayer(Date.now() + i)); // Use timestamp for unique IDs
        }
        
        setProspects(newProspects);
    };

    const handleReloadScouting = () => {
        const reloadCost = getReloadCost();
        if (team.budget < reloadCost) {
            // Notification will be handled by parent component
            return;
        }
        
        onDeductFunds(reloadCost);
        setFilterPos('ALL');
        
        // Increment reload count
        if (onReloadCountChange) {
            onReloadCountChange(externalReloadCount + 1);
        }

        const count = 3 + Math.floor(Math.random() * 3);
        const newProspects: Player[] = [];
        for(let i=0; i<count; i++) {
            newProspects.push(generateYouthPlayer(Date.now() + i)); // Use timestamp for unique IDs
        }
        
        // Replace existing prospects with new ones (don't reset scoutStarted)
        setProspects(newProspects);
    };

    const handlePromoteClick = (player: Player) => {
        const baseW = Math.max(500, Math.floor(player.trueValue * 0.005)); 
        const demand = Math.floor(baseW * (1.1 + Math.random() * 0.2));
        
        setBaseDemand(demand);
        setOffer(Math.floor(demand * 0.8));
        setYears(3); 
        setRound(1);
        setFeedback(t('youthInitialMessage'));
        setStatus('ONGOING');

        setCurrentMood(getPlayerMood(Math.floor(demand*0.8), demand));

        const updatedPlayer = {
            ...player,
            contract: {
                ...player.contract,
                wage: demand, 
                yearsLeft: 3,
            }
        };
        setNegotiatingPlayer(updatedPlayer);
    };

    const handleWageOffer = () => {
        if (status !== 'ONGOING') return;

        setCurrentMood(getPlayerMood(offer, currentDemand));

        const minAcceptable = Math.floor(currentDemand * 0.85);

        if (offer >= minAcceptable) {
            setStatus('ACCEPTED');
            setFeedback(t('youthFairOffer'));
            setNegotiatingPlayer(prev => prev ? ({
                ...prev,
                contract: { ...prev.contract, wage: offer, yearsLeft: years }
            }) : null);
        } else {
            if (round >= 3) {
                setStatus('REJECTED');
                setFeedback(t('youthRejection'));
                // Remove rejected player from prospects list
                if (negotiatingPlayer) {
                    setProspects(prev => prev.filter(p => p.id !== negotiatingPlayer.id));
                    // Show notification
                    if (onNotification) {
                        onNotification(t('youthNegotiationFailed').replace('{name}', negotiatingPlayer.name), 'info');
                    }
                    setNegotiatingPlayer(null);
                }
            } else {
                setRound(prev => prev + 1);
                const percentOff = (minAcceptable - offer) / minAcceptable;
                
                if (percentOff > 0.3) {
                    const minAmount = formatMoney(Math.floor(currentDemand * 0.95));
                    setFeedback(t('youthInsultingOffer').replace('{years}', years.toString()).replace('{amount}', minAmount));
                } else {
                    setFeedback(t('needToDoBetter'));
                }
            }
        }
    };

    const handleConfirmSign = () => {
        if (negotiatingPlayer && status === 'ACCEPTED') {
            onSignPlayer(negotiatingPlayer, 0);
            setProspects(prev => prev.filter(p => p.id !== negotiatingPlayer.id));
            setNegotiatingPlayer(null);
        }
    };

    const isDefender = (p: Position) => [Position.LB, Position.RB, Position.CB, Position.LWB, Position.RWB].includes(p);
    const isMidfielder = (p: Position) => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p);
    const isAttacker = (p: Position) => [Position.LW, Position.RW, Position.ST, Position.CF].includes(p);

    const filteredProspects = prospects.filter(p => {
        if (filterPos === 'ALL') return true;
        if (filterPos === 'GK') return p.position === Position.GK;
        if (filterPos === 'DEF') return isDefender(p.position);
        if (filterPos === 'MID') return isMidfielder(p.position);
        if (filterPos === 'FWD') return isAttacker(p.position);
        return false;
    });

    const getPotentialTheme = (potential: number) => {
        if (potential >= 90) {
            return {
                container: "border-cyan-500/50 bg-gradient-to-br from-cyan-950/80 to-zinc-950 shadow-cyan-500/20",
                header: "from-cyan-900/50 to-cyan-950/50",
                text: "text-cyan-400",
                glow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
                badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
                label: t('worldClass'),
                potentialRange: "90+"
            };
        } else if (potential >= 85) {
             return {
                container: "border-yellow-500/50 bg-gradient-to-br from-yellow-950/80 to-zinc-950 shadow-yellow-500/20",
                header: "from-yellow-900/50 to-yellow-950/50",
                text: "text-yellow-400",
                glow: "shadow-[0_0_30px_rgba(234,179,8,0.3)]",
                badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                label: t('elite'),
                potentialRange: "85-89"
            };
        } else if (potential >= 80) {
             return {
                container: "border-zinc-400/50 bg-gradient-to-br from-zinc-800/80 to-zinc-950 shadow-zinc-500/20",
                header: "from-zinc-800/50 to-zinc-900/50",
                text: "text-zinc-300",
                glow: "shadow-[0_0_20px_rgba(255,255,255,0.1)]",
                badge: "bg-zinc-500/20 text-zinc-200 border-zinc-500/30",
                label: t('topTier'),
                potentialRange: "80-84"
            };
        } else {
             return {
                container: "border-orange-700/50 bg-gradient-to-br from-orange-950/80 to-zinc-950 shadow-orange-900/20",
                header: "from-orange-900/50 to-zinc-950",
                text: "text-orange-400",
                glow: "",
                badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                label: t('prospect'),
                potentialRange: "<80"
            };
        }
    };

    const getPosColor = (pos: Position) => {
        if (pos === Position.GK) return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
        if (isDefender(pos)) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
        if (isMidfielder(pos)) return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-1 landscape:p-2 md:p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-white/10 rounded-lg landscape:rounded-xl md:rounded-3xl p-0 w-full max-w-5xl h-full landscape:h-[95vh] md:h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
                
                <div className="p-2 landscape:p-3 md:p-6 border-b border-white/5 bg-zinc-950 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-emerald-400 text-[9px] landscape:text-[10px] md:text-xs uppercase tracking-widest font-bold mb-0.5 landscape:mb-1">{t('youthAcademy')}</h2>
                        <h1 className="text-base landscape:text-lg md:text-3xl font-black text-white">{t('futureStars')}</h1>
                    </div>
                    <button onClick={onClose} className="bg-black/40 hover:bg-black/60 text-white p-1.5 landscape:p-2 rounded-full transition-colors">
                        <svg className="w-4 h-4 landscape:w-5 landscape:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Negotiation Overlay */}
                {negotiatingPlayer && (
                    <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-2 landscape:p-4 md:p-8 animate-in fade-in zoom-in duration-200 overflow-y-auto">
                         <div className="max-w-md w-full text-center space-y-2 landscape:space-y-3 md:space-y-6">
                             <div>
                                 <div className="text-zinc-500 uppercase text-[9px] landscape:text-[10px] md:text-xs font-bold tracking-widest mb-1 landscape:mb-2">{t('contractNegotiation')}</div>
                                 <h2 className="text-lg landscape:text-xl md:text-3xl font-black text-white">{negotiatingPlayer.name}</h2>
                                 <div className="text-emerald-400 font-bold text-sm landscape:text-base md:text-base">{translatePosition(negotiatingPlayer.position)} • {t('age')} {negotiatingPlayer.age}</div>
                             </div>

                             <div className="bg-zinc-900 border border-white/10 rounded-lg landscape:rounded-xl md:rounded-2xl p-2 landscape:p-3 md:p-6 text-left space-y-2 landscape:space-y-3 md:space-y-4 shadow-2xl relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                 
                                 {status === 'ONGOING' ? (
                                     <>
                                <div className="flex justify-between text-[10px] landscape:text-xs md:text-sm font-bold text-zinc-400 mb-1 landscape:mb-2">
                                    <span>{t('round')} {round}/3</span>
                                    <span>{t('demand')}: ~{formatMoney(currentDemand)}</span>
                                </div>
                                
                                <div className={`flex items-center justify-between p-1.5 landscape:p-2 md:p-3 rounded-lg landscape:rounded-xl md:rounded-xl border ${currentMood.border} ${currentMood.bg} mb-1 landscape:mb-2 transition-colors duration-300`}>
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3">
                                        <span className="text-lg landscape:text-xl md:text-3xl animate-bounce" style={{ animationDuration: '2s' }}>{currentMood.emoji}</span>
                                        <div>
                                            <div className="text-[8px] landscape:text-[9px] md:text-[10px] font-bold uppercase opacity-60 text-white">{t('reaction')}</div>
                                            <div className={`text-xs landscape:text-sm md:text-sm font-black ${currentMood.color} tracking-widest`}>{currentMood.label}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-1.5 landscape:p-2 md:p-3 rounded landscape:rounded-lg md:rounded-lg border border-white/5 text-white italic text-center text-[10px] landscape:text-xs md:text-sm">
                                    "{feedback}"
                                </div>

                                {/* Years Selector */}
                                <div className="space-y-1 landscape:space-y-1.5 md:space-y-2 pt-1 landscape:pt-1.5 md:pt-2">
                                    <label className="text-[9px] landscape:text-[10px] md:text-xs uppercase font-bold text-zinc-500 flex justify-between">
                                        <span>{t('contractDuration')}</span>
                                        <span className="text-zinc-400 font-normal text-[8px] landscape:text-[9px] md:text-[10px]">{years < 3 ? t('shortTermHigherWage') : years > 3 ? t('longTermLowerWage') : t('standard')}</span>
                                    </label>
                                    <div className="flex gap-1 landscape:gap-1.5 md:gap-2">
                                        {[1, 2, 3, 4, 5].map(y => (
                                            <button
                                                key={y}
                                                onClick={() => setYears(y)}
                                                className={`flex-1 py-1 landscape:py-1.5 md:py-2 rounded landscape:rounded-lg md:rounded-lg font-bold text-[10px] landscape:text-xs md:text-sm transition-all ${
                                                    years === y 
                                                        ? 'bg-white text-black shadow-lg' 
                                                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                                                }`}
                                            >
                                                {y}y
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1 landscape:space-y-1.5 md:space-y-2 pt-1 landscape:pt-1.5 md:pt-2">
                                    <label className="text-[9px] landscape:text-[10px] md:text-xs uppercase font-bold text-zinc-500">{t('weeklyWageOffer')}</label>
                                    <div className="flex items-center gap-1.5 landscape:gap-2 md:gap-3">
                                        <button onClick={() => setOffer(o => Math.max(500, o - 500))} className="w-6 h-6 landscape:w-8 landscape:h-8 md:w-10 md:h-10 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs landscape:text-sm">-</button>
                                        <div className="flex-1 text-center font-mono text-sm landscape:text-base md:text-2xl font-black text-white bg-black/40 rounded py-0.5 landscape:py-1 md:py-1">{formatMoney(offer)}</div>
                                        <button onClick={() => setOffer(o => o + 500)} className="w-6 h-6 landscape:w-8 landscape:h-8 md:w-10 md:h-10 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs landscape:text-sm">+</button>
                                    </div>
                                    <input 
                                        type="range" 
                                        min={500} 
                                        max={currentDemand * 2.5} 
                                        step={100} 
                                        value={offer} 
                                        onChange={(e) => setOffer(parseInt(e.target.value))}
                                        className="w-full accent-emerald-500 bg-zinc-800 h-1 landscape:h-1.5 md:h-2 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                     </>
                                 ) : (
                                     <div className="text-center py-3 landscape:py-4 md:py-6">
                                         <div className="text-2xl landscape:text-3xl md:text-5xl mb-2 landscape:mb-3 md:mb-4">{status === 'ACCEPTED' ? '🤝' : '👋'}</div>
                                         <h3 className={`text-base landscape:text-lg md:text-2xl font-black ${status === 'ACCEPTED' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                             {status === 'ACCEPTED' ? t('dealAgreed') : t('negotiationFailed')}
                                         </h3>
                                         <p className="text-zinc-400 mt-1 landscape:mt-1.5 md:mt-2 text-xs landscape:text-sm">
                                             {status === 'ACCEPTED' ? `${t('signedFor')} ${formatMoney(offer)}/week` : t('playerRejectedTerms')}
                                         </p>
                                     </div>
                                 )}

                                 <div className="pt-1 landscape:pt-1.5 md:pt-2 border-t border-white/5">
                                     <div className="flex justify-between text-[10px] landscape:text-xs md:text-xs">
                                        <span className="text-zinc-500 font-bold">{t('contractLength')}</span>
                                        <span className="text-white font-mono">{years} {t('years')}</span>
                                     </div>
                                     <div className="flex justify-between text-[10px] landscape:text-xs md:text-xs mt-0.5 landscape:mt-1">
                                        <span className="text-zinc-500 font-bold">{t('role')}</span>
                                        <span className="text-purple-300">{t('futureProspect')}</span>
                                     </div>
                                 </div>
                             </div>

                             <div className="flex gap-1.5 landscape:gap-2 md:gap-4">
                                 {status === 'ONGOING' && (
                                     <>
                                        <button 
                                            onClick={() => setNegotiatingPlayer(null)}
                                            className="flex-1 py-1.5 landscape:py-2 md:py-4 rounded-lg landscape:rounded-xl md:rounded-xl font-bold text-[10px] landscape:text-xs md:text-base text-zinc-400 hover:bg-white/10 transition-colors"
                                        >
                                            {t('cancel')}
                                        </button>
                                        <button 
                                            onClick={handleWageOffer}
                                            className="flex-1 py-1.5 landscape:py-2 md:py-4 bg-white text-black font-black rounded-lg landscape:rounded-xl md:rounded-xl shadow-lg hover:scale-105 transition-all text-[10px] landscape:text-xs md:text-base"
                                        >
                                            {t('submitOffer')}
                                        </button>
                                     </>
                                 )}
                                 
                                 {status === 'ACCEPTED' && (
                                      <button 
                                        onClick={handleConfirmSign}
                                        className="w-full py-1.5 landscape:py-2 md:py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg landscape:rounded-xl md:rounded-xl shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all text-[10px] landscape:text-xs md:text-base"
                                    >
                                        {t('welcomeToTheClub')}
                                    </button>
                                 )}
                                 
                                 {status === 'REJECTED' && (
                                     <button 
                                        onClick={() => setNegotiatingPlayer(null)}
                                        className="w-full py-1.5 landscape:py-2 md:py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg landscape:rounded-xl md:rounded-xl transition-colors text-[10px] landscape:text-xs md:text-base"
                                    >
                                        {t('close')}
                                    </button>
                                 )}
                             </div>
                         </div>
                    </div>
                )}

                {/* Trait Tooltip */}
                {traitTooltip && (
                    <div 
                        className="fixed z-[100] pointer-events-auto"
                        style={{ 
                            left: `${Math.min(traitTooltip.x, window.innerWidth - 250)}px`, 
                            top: `${Math.max(traitTooltip.y - 10, 100)}px`,
                            transform: 'translate(-50%, -100%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-2 landscape:p-2.5 md:p-3 mb-2 w-48 landscape:w-56 md:w-60 text-white text-[9px] landscape:text-[10px] md:text-xs">
                            <div className="font-bold mb-0.5 landscape:mb-1">{getTraitName(traitTooltip.traitId)}</div>
                            <p className="text-zinc-300 text-[8px] landscape:text-[9px] md:text-[10px] leading-tight">{getTraitDescription(traitTooltip.traitId)}</p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-zinc-800"></div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div 
                    className="flex-1 bg-zinc-900/50 overflow-y-auto custom-scrollbar p-2 landscape:p-3 md:p-8"
                    onClick={() => setTraitTooltip(null)}
                >
                    
                    {!scoutStarted ? (
                        <div className="h-full flex flex-col items-center justify-center gap-1 landscape:gap-1.5 md:gap-6 text-center">
                            <div className="w-12 h-12 landscape:w-14 landscape:h-14 md:w-24 md:h-24 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                                <svg className="w-6 h-6 landscape:w-7 landscape:h-7 md:w-12 md:h-12 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="mb-2 landscape:mb-3 md:mb-0">
                                <h3 className="text-base landscape:text-lg md:text-xl font-bold text-white mb-0.5 landscape:mb-1">{t('noScoutingMissionActive')}</h3>
                                <p className="text-zinc-400 max-w-md mx-auto text-sm landscape:text-base">
                                    {t('scoutMissionDescription')} {t('thisWillCost')} <span className="text-white font-bold">{formatMoney(SCOUT_COST)}</span>.
                                </p>
                            </div>
                            <button 
                                onClick={handleStartScouting}
                                className="px-4 landscape:px-6 md:px-8 py-2 landscape:py-3 md:py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg landscape:rounded-xl md:rounded-xl shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all text-sm landscape:text-base md:text-base"
                            >
                                {t('startScoutingMission')}
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="flex flex-col landscape:flex-row justify-between items-start landscape:items-center gap-2 landscape:gap-3 md:gap-0 mb-2 landscape:mb-3 md:mb-6">
                                <div className="flex flex-wrap gap-1 landscape:gap-1.5 md:gap-2">
                                    {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map(pos => (
                                        <button
                                            key={pos}
                                            onClick={() => setFilterPos(pos)}
                                            className={`px-2 landscape:px-3 md:px-4 py-1 landscape:py-1.5 rounded landscape:rounded-lg md:rounded-full text-[9px] landscape:text-[10px] md:text-xs font-bold tracking-wider border transition-all ${
                                                filterPos === pos 
                                                    ? 'bg-white text-black border-white shadow-lg' 
                                                    : 'bg-black/40 text-zinc-500 border-white/10 hover:border-white/30 hover:text-zinc-300'
                                            }`}
                                        >
                                            {pos === 'ALL' ? t('allPlayers') : pos}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={handleReloadScouting}
                                    disabled={team.budget < currentReloadCost}
                                    className="px-2 landscape:px-3 md:px-4 py-1 landscape:py-1.5 md:py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-bold rounded landscape:rounded-lg transition-all flex items-center gap-1 landscape:gap-1.5 md:gap-2 text-[9px] landscape:text-[10px] md:text-sm"
                                >
                                    <svg className="w-3 h-3 landscape:w-3.5 landscape:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {formatMoney(currentReloadCost)}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 landscape:gap-3 md:gap-4 pb-4 landscape:pb-6 md:pb-10">
                                {filteredProspects.length > 0 ? (
                                    filteredProspects.map(player => {
                                        const theme = getPotentialTheme(player.potential);
                                        const attrs = player.attributes || { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0 };
                                        const isGK = player.position === Position.GK;
                                        
                                        const statRows = [
                                            { label: isGK ? 'DIV' : 'PAC', value: attrs.pace },
                                            { label: isGK ? 'HAN' : 'SHO', value: attrs.shooting },
                                            { label: isGK ? 'KIC' : 'PAS', value: attrs.passing },
                                            { label: isGK ? 'REF' : 'DRI', value: attrs.dribbling },
                                            { label: isGK ? 'SPD' : 'DEF', value: attrs.defending },
                                            { label: isGK ? 'POS' : 'PHY', value: attrs.physical },
                                        ];

                                        return (
                                            <div key={player.id} className={`border rounded-lg landscape:rounded-xl md:rounded-xl overflow-hidden hover:scale-[1.01] transition-transform duration-300 ${theme.container} ${theme.glow} flex flex-col`}>
                                                <div className={`px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 border-b border-white/5 bg-gradient-to-br ${theme.header}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 min-w-0">
                                                             <div className="flex items-center gap-1 landscape:gap-1.5 md:gap-2 mb-0.5 landscape:mb-1 flex-wrap">
                                                                <span className={`px-1 landscape:px-1.5 py-0.5 rounded text-[7px] landscape:text-[8px] md:text-[9px] font-black uppercase tracking-wider ${getPosColor(player.position)}`}>
                                                                    {translatePosition(player.position)}
                                                                </span>
                                                                {player.traits && player.traits.length > 0 && player.traits.slice(0, 1).map((traitId) => {
                                                                    const rarity = getTraitRarity(traitId);
                                                                    const rarityColors = {
                                                                        common: 'bg-zinc-700/50 border-zinc-500/50 text-zinc-200',
                                                                        rare: 'bg-blue-700/50 border-blue-500/50 text-blue-200',
                                                                        epic: 'bg-purple-700/50 border-purple-500/50 text-purple-200',
                                                                    };
                                                                    const colors = rarity ? rarityColors[rarity] : rarityColors.common;
                                                                    const tooltipKey = `${player.id}-${traitId}`;
                                                                    const isTooltipOpen = traitTooltip?.traitId === traitId;
                                                                    return (
                                                                        <span
                                                                            key={traitId}
                                                                            className={`relative px-1 landscape:px-1.5 py-0.5 rounded text-[7px] landscape:text-[8px] md:text-[9px] font-bold uppercase border cursor-pointer hover:scale-105 transition-transform ${colors}`}
                                                                            onMouseEnter={(e) => {
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setTraitTooltip({
                                                                                    traitId,
                                                                                    x: rect.left + rect.width / 2,
                                                                                    y: rect.top
                                                                                });
                                                                            }}
                                                                            onMouseLeave={() => {
                                                                                // Only close on mouse leave if not clicked (tooltip stays open when clicked)
                                                                                if (!isTooltipOpen) {
                                                                                    setTraitTooltip(null);
                                                                                }
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                if (isTooltipOpen) {
                                                                                    setTraitTooltip(null);
                                                                                } else {
                                                                                    setTraitTooltip({
                                                                                        traitId,
                                                                                        x: rect.left + rect.width / 2,
                                                                                        y: rect.top
                                                                                    });
                                                                                }
                                                                            }}
                                                                        >
                                                                            {getTraitName(traitId)}
                                                                        </span>
                                                                    );
                                                                })}
                                                                <span className={`text-[7px] landscape:text-[8px] md:text-[9px] font-bold px-1 landscape:px-1.5 py-0.5 rounded border ${theme.badge}`}>
                                                                    {theme.label}
                                                                </span>
                                                             </div>
                                                            <div className="text-xs landscape:text-sm md:text-lg font-black text-white leading-tight truncate">{player.name}</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-1">
                                                            <div className="text-[7px] landscape:text-[8px] md:text-[9px] text-zinc-400 uppercase font-bold">Pot</div>
                                                            <div className={`font-black text-xs landscape:text-sm md:text-lg leading-none ${theme.text}`}>{theme.potentialRange}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="p-1.5 landscape:p-2 md:p-3 bg-black/20 flex-1 flex flex-col gap-1.5 landscape:gap-2 md:gap-3">
                                                    <div className="flex justify-between items-center bg-black/30 p-1 landscape:p-1.5 md:p-2 rounded landscape:rounded-lg">
                                                        <div className="flex items-center gap-1 landscape:gap-1.5 md:gap-2">
                                                            <span className="text-base landscape:text-lg md:text-2xl font-bold text-white leading-none">{player.rating}</span>
                                                            <span className="text-[7px] landscape:text-[8px] md:text-[10px] text-zinc-500 font-mono mt-0.5 landscape:mt-1">OVR</span>
                                                        </div>
                                                        <div className="text-[7px] landscape:text-[8px] md:text-[10px] text-zinc-400 font-mono">{t('age')}: {player.age}</div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-1 landscape:gap-1.5 md:gap-2">
                                                        {statRows.map((stat) => (
                                                            <div key={stat.label} className="flex justify-between items-end bg-white/5 p-0.5 landscape:p-1 md:p-1.5 rounded">
                                                                <span className="text-[7px] landscape:text-[8px] md:text-[9px] font-bold text-zinc-500">{stat.label}</span>
                                                                <span className="text-[8px] landscape:text-[9px] md:text-xs font-mono font-bold text-zinc-300">{stat.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => handlePromoteClick(player)}
                                                        className="w-full py-1 landscape:py-1.5 md:py-2 mt-auto bg-white text-black font-bold text-[8px] landscape:text-[9px] md:text-xs rounded landscape:rounded-lg hover:bg-zinc-200 transition-colors"
                                                    >
                                                        {t('promote')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full text-center text-zinc-500 py-4 landscape:py-6 md:py-10 italic text-xs landscape:text-sm">
                                        No {filterPos !== 'ALL' ? filterPos : ''} prospects found.
                                    </div>
                                )}
                            </div>
                            
                            {prospects.length === 0 && (
                                <div className="text-center py-4 landscape:py-6 md:py-10 mt-auto">
                                    <p className="text-zinc-500 italic text-xs landscape:text-sm">{t('noMoreProspects')}</p>
                                    <button 
                                        onClick={handleReloadScouting}
                                        disabled={team.budget < currentReloadCost}
                                        className="mt-2 landscape:mt-3 md:mt-4 px-4 landscape:px-5 md:px-6 py-1.5 landscape:py-2 md:py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-black font-black rounded-lg landscape:rounded-xl md:rounded-xl shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all text-xs landscape:text-sm"
                                    >
                                        {formatMoney(currentReloadCost)}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
