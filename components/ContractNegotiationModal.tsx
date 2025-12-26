
import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ContractNegotiationModalProps {
    player: Player;
    mode: 'TRANSFER' | 'RENEWAL';
    onClose: () => void;
    onSign: (wage: number, years: number, releaseClause?: number) => void;
}

export const ContractNegotiationModal: React.FC<ContractNegotiationModalProps> = ({ player, mode, onClose, onSign }) => {
    const { t, translatePosition } = useLanguage();
    const [offer, setOffer] = useState(0);
    const [baseDemand, setBaseDemand] = useState(0); // The demand for a standard 3-year deal
    const [years, setYears] = useState(3);
    
    // Release clause negotiation - default to true for TRANSFER mode
    const [includeReleaseClause, setIncludeReleaseClause] = useState(mode === 'TRANSFER');
    const [releaseClauseOffer, setReleaseClauseOffer] = useState(0);
    const [releaseClauseDemand, setReleaseClauseDemand] = useState(0);
    const [releaseClauseRound, setReleaseClauseRound] = useState(1);
    const [releaseClauseStatus, setReleaseClauseStatus] = useState<'NOT_STARTED' | 'ONGOING' | 'ACCEPTED' | 'REJECTED'>('NOT_STARTED');
    
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

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    // Calculate dynamic demand based on years
    // 1 Year = 1.2x Wage (High Risk)
    // 5 Years = 0.9x Wage (Security)
    const getDemandForYears = (y: number, base: number) => {
        const multipliers: Record<number, number> = {
            1: 1.25,
            2: 1.10,
            3: 1.00, // Baseline
            4: 0.95,
            5: 0.90
        };
        return Math.floor(base * (multipliers[y] || 1));
    };

    // Calculate release clause impact on wage demand
    // Lower release clause = higher wage demand (player wants more money if they can leave easily)
    const getReleaseClauseWageModifier = (clause: number | undefined, marketValue: number): number => {
        if (!clause) return 1.0; // No release clause = no modifier
        
        // If release clause is lower than market value, player wants MORE wage (easier to leave)
        // If release clause is higher than market value, player wants LESS wage (harder to leave)
        const ratio = clause / marketValue;
        
        if (ratio < 0.6) return 1.3; // Very low clause (<60% of market) = 30% more wage
        if (ratio < 0.8) return 1.2; // Low clause (60-80% of market) = 20% more wage
        if (ratio < 1.0) return 1.1; // Below market (80-100% of market) = 10% more wage
        if (ratio < 1.2) return 1.0; // Near market (100-120% of market) = no change
        if (ratio < 1.5) return 0.95; // Above market (120-150% of market) = 5% less wage
        return 0.9; // Very high clause (150%+ of market) = 10% less wage
    };

    const currentDemand = getDemandForYears(years, baseDemand);
    
    // Adjust demand based on release clause if included
    const releaseClauseModifier = includeReleaseClause && releaseClauseOffer > 0
        ? getReleaseClauseWageModifier(releaseClauseOffer, player.marketValue)
        : 1.0;
    const adjustedDemand = Math.floor(currentDemand * releaseClauseModifier);

    useEffect(() => {
        // Calculate Base Demand (Standard 3 Year)
        let calcBase = Math.floor(player.trueValue * 0.0045); // Approx 0.45% of value
        
        if (mode === 'RENEWAL') {
            const currentWage = player.contract?.wage || 0;
            calcBase = Math.max(calcBase, Math.floor(currentWage * 1.2));
        } else {
            calcBase = Math.floor(calcBase * 1.1);
        }

        // Apply personality modifiers
        // Greed: Higher greed = higher wage demand (multiplier 0.9 to 1.3)
        // Ambition: Higher ambition = lower wage demand for good teams (multiplier 0.7 to 1.1)
        const personality = player.personality || { greed: 50, ambition: 50 };
        const greedMultiplier = 0.9 + (personality.greed / 100) * 0.4; // 0.9 to 1.3
        const ambitionMultiplier = 1.1 - (personality.ambition / 100) * 0.4; // 1.1 to 0.7
        
        // Combine: Greed increases demand, ambition decreases it
        // If player is very ambitious, they care less about money
        const personalityMultiplier = (greedMultiplier + ambitionMultiplier) / 2; // Average of both
        calcBase = Math.floor(calcBase * personalityMultiplier);

        // Add some randomness
        const finalBase = Math.floor(calcBase * (0.95 + Math.random() * 0.15));
        
        setBaseDemand(finalBase);
        setOffer(Math.floor(finalBase * 0.8)); // Initial offer
        setFeedback(t('lookingForSalary'));
        
        // Initial mood calculation using 3 years as baseline for preview
        const startOffer = Math.floor(finalBase * 0.8);
        setCurrentMood(calculateMood(startOffer, finalBase));
        
        // Calculate release clause demand (players want LOW release clause)
        // Players want release clause to be lower than their market value (easier to leave)
        // Typically 60-80% of market value
        const clauseBase = Math.floor(player.marketValue * (0.6 + Math.random() * 0.2));
        setReleaseClauseDemand(clauseBase);
        setReleaseClauseOffer(Math.floor(clauseBase * 1.2)); // Start higher (player wants lower)

    }, [player, mode]);

    const calculateMood = (currentOffer: number, demand: number) => {
        const ratio = currentOffer / demand;
        if (ratio >= 1.0) return { emoji: '🤩', label: t('thrilled'), color: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-500/10' };
        if (ratio >= 0.9) return { emoji: '😁', label: t('happy'), color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/10' };
        if (ratio >= 0.8) return { emoji: '🙂', label: t('interested'), color: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-500/10' };
        if (ratio >= 0.65) return { emoji: '😐', label: t('skeptical'), color: 'text-zinc-400', border: 'border-zinc-500/50', bg: 'bg-zinc-500/10' };
        if (ratio >= 0.4) return { emoji: '😒', label: t('annoyed'), color: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500/10' };
        return { emoji: '😡', label: t('insulted'), color: 'text-rose-500', border: 'border-rose-500/50', bg: 'bg-rose-500/10' };
    };

    const handleSubmitOffer = () => {
        if (status !== 'ONGOING') return;

        // Use adjusted demand (includes release clause modifier)
        const finalDemand = adjustedDemand;

        // Update Mood based on submitted offer vs ADJUSTED demand
        setCurrentMood(calculateMood(offer, finalDemand));

        // Acceptance Logic - Personality affects threshold
        const personality = player.personality || { greed: 50, ambition: 50 };
        
        // Greedy players are harder to negotiate with (higher threshold)
        // Ambitious players are more flexible (lower threshold)
        const baseThreshold = round === 1 ? 0.95 : round === 2 ? 0.90 : 0.85;
        const greedModifier = (personality.greed / 100) * 0.05; // +0 to +0.05
        const ambitionModifier = (personality.ambition / 100) * 0.05; // +0 to +0.05
        const threshold = Math.min(0.98, baseThreshold + greedModifier - ambitionModifier);
        
        const minAcceptable = Math.floor(finalDemand * threshold);

        if (offer >= minAcceptable) {
            setStatus('ACCEPTED');
            // Personality-based acceptance messages
            if (personality.ambition > 70) {
                setFeedback(t('ambitiousAcceptance') || "I'm excited to join a team with ambition like yours. Let's win trophies together!");
            } else if (personality.greed > 70) {
                setFeedback(t('greedyAcceptance') || "The money is right. I'm ready to sign.");
            } else {
                setFeedback(t('happyWithTerms'));
            }
        } else {
            if (round >= 3) {
                setStatus('REJECTED');
                // Personality-based rejection messages
                if (personality.greed > 70) {
                    setFeedback(t('greedyRejection') || "I'm not getting what I'm worth. This isn't going to work.");
                } else if (personality.ambition > 70) {
                    setFeedback(t('ambitiousRejection') || "I need to be at a club that matches my ambitions. Good luck.");
                } else {
                    setFeedback(t('cannotReachAgreement'));
                }
            } else {
                setRound(prev => prev + 1);
                const percentOff = (minAcceptable - offer) / minAcceptable;
                
                if (percentOff > 0.3) {
                    const clauseNote = includeReleaseClause && releaseClauseOffer > player.marketValue 
                        ? ` ${t('higherClauseRequiresWage')}` 
                        : '';
                    
                    // Personality-based feedback
                    let feedbackMsg = '';
                    if (personality.greed > 70) {
                        feedbackMsg = (t('greedyLowOffer') || "That's way too low! I know my worth. I need at least {amount} for a {years}-year deal.").replace('{amount}', formatMoney(Math.floor(finalDemand * 0.95))).replace('{years}', years.toString());
                    } else if (personality.ambition > 70) {
                        feedbackMsg = (t('ambitiousLowOffer') || "I want to be part of something special, but I still need fair compensation. At least {amount} for {years} years.").replace('{amount}', formatMoney(Math.floor(finalDemand * 0.95))).replace('{years}', years.toString());
                    } else {
                        feedbackMsg = `${t('notEvenClose')} ${years}${t('yearDeal')} ${formatMoney(Math.floor(finalDemand * 0.95))}.`;
                    }
                    setFeedback(feedbackMsg + clauseNote);
                } else {
                    // Personality-based feedback for close offers
                    if (personality.greed > 70) {
                        setFeedback(t('greedyCloseOffer') || "You're getting closer, but I need more money.");
                    } else if (personality.ambition > 70) {
                        setFeedback(t('ambitiousCloseOffer') || "I like the direction, but the numbers need to work for both of us.");
                    } else {
                        setFeedback(t('needToDoBetter'));
                    }
                }
            }
        }
    };
    

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 landscape:p-3 md:p-4 animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-zinc-900 border border-white/10 rounded-xl landscape:rounded-2xl md:rounded-3xl p-3 landscape:p-4 md:p-6 w-full max-w-lg landscape:max-w-xl md:max-w-xl shadow-2xl relative overflow-y-auto flex flex-col my-auto max-h-[95vh] landscape:max-h-[98vh] md:max-h-full">
                
                {/* Header */}
                <div className="text-center mb-3 landscape:mb-4 md:mb-6">
                    <h2 className="text-zinc-400 text-[8px] landscape:text-[9px] md:text-xs uppercase tracking-widest font-bold mb-1 landscape:mb-1.5 md:mb-2">
                        {mode === 'TRANSFER' ? t('contractNegotiation') : t('contractRenewal')}
                    </h2>
                    <h1 className="text-lg landscape:text-xl md:text-3xl font-black text-white">{player.name}</h1>
                    <div className="text-emerald-400 font-bold text-sm landscape:text-base md:text-base">{translatePosition(player.position)} • {player.rating} {t('ovr')}</div>
                </div>

                {/* Negotiation Box */}
                <div className="bg-zinc-950/50 border border-white/5 rounded-lg landscape:rounded-xl md:rounded-2xl p-3 landscape:p-4 md:p-6 text-left space-y-2 landscape:space-y-3 md:space-y-4 shadow-inner relative">
                     
                     {status === 'ONGOING' ? (
                         <>
                            <div className="flex justify-between text-xs landscape:text-sm md:text-sm font-bold text-zinc-400 mb-1 landscape:mb-1.5 md:mb-2">
                                <span>{t('round')} {round}/3</span>
                            </div>

                            {/* Mood Indicator */}
                            <div className={`flex items-center justify-between p-2 landscape:p-2.5 md:p-3 rounded-lg landscape:rounded-xl md:rounded-xl border ${currentMood.border} ${currentMood.bg} mb-1.5 landscape:mb-2 md:mb-2 transition-colors duration-300`}>
                                <div className="flex items-center gap-2 landscape:gap-2.5 md:gap-3">
                                    <span className="text-xl landscape:text-2xl md:text-3xl animate-bounce" style={{ animationDuration: '2s' }}>{currentMood.emoji}</span>
                                    <div>
                                        <div className="text-[8px] landscape:text-[9px] md:text-[10px] font-bold uppercase opacity-60 text-white">{t('playerReaction')}</div>
                                        <div className={`text-xs landscape:text-sm md:text-sm font-black ${currentMood.color} tracking-widest`}>{currentMood.label}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/30 p-2 landscape:p-3 md:p-4 rounded-lg landscape:rounded-xl md:rounded-xl border border-white/5 text-white italic text-center text-xs landscape:text-sm md:text-sm">
                                "{feedback}"
                            </div>

                            {/* Contract Length & Wage - Side by Side */}
                            <div className="flex flex-col landscape:flex-row gap-3 landscape:gap-4 md:gap-4 pt-1.5 landscape:pt-2 md:pt-2">
                                {/* Contract Length Selector */}
                                <div className="flex-1 space-y-1.5 landscape:space-y-2 md:space-y-2">
                                    <label className="text-[9px] landscape:text-[10px] md:text-xs uppercase font-bold text-zinc-500 flex justify-between items-center h-4 landscape:h-5 md:h-6">
                                        <span>{t('contractDuration')}</span>
                                        <span className="text-zinc-400 font-normal text-[8px] landscape:text-[9px] md:text-[10px]">{years < 3 ? t('shortTerm') : years > 3 ? t('longTerm') : t('standard')}</span>
                                    </label>
                                    <div className="flex gap-1.5 landscape:gap-2 md:gap-2">
                                        {[1, 2, 3, 4, 5].map(y => (
                                            <button
                                                key={y}
                                                onClick={() => setYears(y)}
                                                className={`flex-1 py-1.5 landscape:py-2 md:py-2 rounded-lg font-bold text-xs landscape:text-sm md:text-sm transition-all ${
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

                                {/* Wage Slider */}
                                <div className="flex-1 space-y-1.5 landscape:space-y-2 md:space-y-2">
                                    <label className="text-[9px] landscape:text-[10px] md:text-xs uppercase font-bold text-zinc-500 flex justify-between items-center h-4 landscape:h-5 md:h-6">
                                        <span>{t('weeklyWageOffer')}</span>
                                        <span className="invisible text-[8px] landscape:text-[9px] md:text-[10px]">placeholder</span>
                                    </label>
                                    <div className="flex items-center gap-2 landscape:gap-2.5 md:gap-3">
                                        <button onClick={() => setOffer(o => Math.max(500, o - 1000))} className="w-8 h-8 landscape:w-9 landscape:h-9 md:w-10 md:h-10 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm landscape:text-base md:text-base">-</button>
                                        <div className="flex-1 text-center font-mono text-base landscape:text-lg md:text-2xl font-black text-white bg-black/40 rounded py-0.5 landscape:py-1 md:py-1 border border-white/5">
                                            {formatMoney(offer)}
                                        </div>
                                        <button onClick={() => setOffer(o => o + 1000)} className="w-8 h-8 landscape:w-9 landscape:h-9 md:w-10 md:h-10 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm landscape:text-base md:text-base">+</button>
                                    </div>
                                    <input 
                                        type="range" 
                                        min={500} 
                                        max={currentDemand * 2.5} 
                                        step={500} 
                                        value={offer} 
                                        onChange={(e) => setOffer(parseInt(e.target.value))}
                                        className="w-full accent-emerald-500 bg-zinc-800 h-2 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                            
                            {/* Release Clause Toggle */}
                            <div className="space-y-1.5 landscape:space-y-2 md:space-y-2 pt-1.5 landscape:pt-2 md:pt-2 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] landscape:text-[10px] md:text-xs uppercase font-bold text-zinc-500">{t('includeReleaseClause')}</label>
                                    <button
                                        onClick={() => {
                                            setIncludeReleaseClause(!includeReleaseClause);
                                            if (!includeReleaseClause) {
                                                setReleaseClauseStatus('NOT_STARTED');
                                            }
                                        }}
                                        className={`w-10 h-5 landscape:w-11 landscape:h-6 md:w-12 md:h-6 rounded-full transition-colors ${
                                            includeReleaseClause ? 'bg-emerald-500' : 'bg-zinc-700'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 landscape:w-4.5 landscape:h-4.5 md:w-5 md:h-5 bg-white rounded-full transition-transform ${
                                            includeReleaseClause ? 'translate-x-5 landscape:translate-x-5.5 md:translate-x-6' : 'translate-x-0.5'
                                        }`}></div>
                                    </button>
                                </div>
                                
                                {includeReleaseClause && (
                                    <div className="space-y-1.5 landscape:space-y-2 md:space-y-2 pt-1.5 landscape:pt-2 md:pt-2">
                                        <div className="flex items-center gap-2 landscape:gap-2.5 md:gap-3">
                                            <button onClick={() => setReleaseClauseOffer(o => Math.max(releaseClauseDemand * 0.5, o - 1000000))} className="w-8 h-8 landscape:w-9 landscape:h-9 md:w-10 md:h-10 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm landscape:text-base md:text-base">-</button>
                                            <div className="flex-1 text-center font-mono text-sm landscape:text-base md:text-lg font-black text-white bg-black/40 rounded py-0.5 landscape:py-1 md:py-1 border border-white/5">
                                                {formatMoney(releaseClauseOffer)}
                                            </div>
                                            <button onClick={() => setReleaseClauseOffer(o => o + 1000000)} className="w-8 h-8 landscape:w-9 landscape:h-9 md:w-10 md:h-10 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm landscape:text-base md:text-base">+</button>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={releaseClauseDemand * 0.5} 
                                            max={releaseClauseDemand * 2} 
                                            step={500000} 
                                            value={releaseClauseOffer} 
                                            onChange={(e) => setReleaseClauseOffer(parseInt(e.target.value))}
                                            className="w-full accent-blue-500 bg-zinc-800 h-2 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="text-[8px] landscape:text-[9px] md:text-[10px] text-zinc-500 text-center">
                                            {t('marketValue')}: {formatMoney(player.marketValue)} | {t('playerWants')}: ~{formatMoney(releaseClauseDemand)}
                                        </div>
                                    </div>
                                )}
                                
                            </div>
                         </>
                     ) : (
                         <div className="text-center py-4 landscape:py-6 md:py-8">
                             <div className="text-4xl landscape:text-5xl md:text-6xl mb-2 landscape:mb-3 md:mb-4 animate-in zoom-in duration-300">{status === 'ACCEPTED' ? '🤝' : '👋'}</div>
                             <h3 className={`text-lg landscape:text-xl md:text-2xl font-black ${status === 'ACCEPTED' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                 {status === 'ACCEPTED' ? t('termsAgreed') : t('walkedAway')}
                             </h3>
                             <p className="text-zinc-400 mt-1.5 landscape:mt-2 md:mt-2 text-xs landscape:text-sm md:text-base">
                                 {status === 'ACCEPTED' ? `${t('agreedTo')} ${formatMoney(offer)}/week ${t('for')} ${years} ${t('years')}.` : t('negotiationsBrokenDown')}
                             </p>
                         </div>
                     )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 landscape:gap-3 md:gap-4 mt-3 landscape:mt-4 md:mt-6">
                    {status === 'ONGOING' && (
                        <>
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2 landscape:py-2.5 md:py-4 rounded-lg landscape:rounded-xl md:rounded-xl font-bold text-xs landscape:text-sm md:text-base text-zinc-400 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            onClick={handleSubmitOffer}
                            className="flex-1 py-2 landscape:py-2.5 md:py-4 bg-white text-black font-black rounded-lg landscape:rounded-xl md:rounded-xl shadow-lg hover:scale-105 transition-all text-xs landscape:text-sm md:text-base"
                        >
                            {t('submitOffer')}
                        </button>
                        </>
                    )}

                    {status === 'ACCEPTED' && (
                        <button 
                            onClick={() => {
                                const clause = includeReleaseClause ? releaseClauseOffer : undefined;
                                onSign(offer, years, clause);
                            }} 
                            className="w-full py-2 landscape:py-2.5 md:py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg landscape:rounded-xl md:rounded-xl shadow-lg hover:scale-105 transition-all text-xs landscape:text-sm md:text-base"
                        >
                            {t('confirmSignature')}
                        </button>
                    )}

                    {status === 'REJECTED' && (
                        <button 
                            onClick={onClose}
                            className="w-full py-2 landscape:py-2.5 md:py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg landscape:rounded-xl md:rounded-xl transition-all text-xs landscape:text-sm md:text-base"
                        >
                            {t('cancel')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
