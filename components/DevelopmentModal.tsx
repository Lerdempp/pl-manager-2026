
import React, { useState } from 'react';
import { PlayerAttributes, Player, Position } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export interface DevelopmentChange {
    playerId: string;
    name: string;
    position: string;
    oldRating: number;
    newRating: number;
    diff: number;
    // Snapshot of the player object with NEW stats
    playerSnapshot: Player;
    // The specific numeric changes per attribute
    attributeChanges: Partial<PlayerAttributes>;
}

interface DevelopmentModalProps {
    changes: DevelopmentChange[];
    onProceed: () => void;
}

export const DevelopmentModal: React.FC<DevelopmentModalProps> = ({ changes, onProceed }) => {
    const { t } = useLanguage();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const improved = changes.filter(c => c.diff > 0).sort((a,b) => b.diff - a.diff);
    const declined = changes.filter(c => c.diff < 0).sort((a,b) => a.diff - b.diff);
    const unchangedCount = changes.length - improved.length - declined.length;

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const renderPlayerRow = (change: DevelopmentChange) => {
        const isExpanded = expandedId === change.playerId;
        const isPositive = change.diff > 0;
        const colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
        const bgClass = isPositive ? 'border-emerald-500/20 hover:bg-emerald-500/5' : 'border-rose-500/20 hover:bg-rose-500/5';

        return (
            <div key={change.playerId} className={`bg-zinc-950/50 border transition-all duration-300 overflow-hidden ${bgClass} ${isExpanded ? 'rounded-2xl border-white/20 bg-zinc-900' : 'rounded-xl'}`}>
                
                {/* Clickable Header */}
                <div 
                    onClick={() => toggleExpand(change.playerId)}
                    className="p-2 sm:p-3 md:p-4 flex justify-between items-center cursor-pointer"
                >
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-[10px] sm:text-xs font-bold bg-zinc-800 text-zinc-400 px-1 sm:px-1.5 py-0.5 rounded min-w-[28px] sm:min-w-[30px] text-center">
                            {change.position}
                        </span>
                        <div>
                            <div className="font-bold text-white text-xs sm:text-sm md:text-base">{change.name}</div>
                            {isExpanded && <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest">{t('tapToClose')}</div>}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        {!isExpanded && (
                            <>
                                <div className="text-zinc-500 text-xs sm:text-sm font-mono line-through decoration-zinc-600/50 opacity-50">
                                    {change.oldRating}
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <span className={`text-xl sm:text-2xl font-black ${colorClass}`}>
                                        {change.newRating}
                                    </span>
                                    <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {isPositive ? '+' : ''}{change.diff}
                                    </span>
                                </div>
                            </>
                        )}
                        <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-zinc-500`}>
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                {/* Expanded Details - Stat Changes */}
                {isExpanded && (
                    <div className="p-3 sm:p-4 md:p-5 border-t border-white/5 bg-black/20 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Stat Changes Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {Object.entries(change.attributeChanges).map(([key, diff]) => {
                                if (typeof diff !== 'number' || diff === 0) return null;
                                
                                const attrKey = key as keyof PlayerAttributes;
                                const currentVal = change.playerSnapshot.attributes?.[attrKey] || 0;
                                const oldVal = currentVal - diff;
                                const isAttrPositive = diff > 0;
                                const attrColor = isAttrPositive ? 'text-emerald-400' : 'text-rose-400';
                                
                                // Get stat label based on position
                                const isGK = change.playerSnapshot.position === Position.GK;
                                const statLabels: Record<keyof PlayerAttributes, string> = isGK 
                                    ? {
                                        pace: t('div'),
                                        shooting: t('han'),
                                        passing: t('kic'),
                                        dribbling: t('ref'),
                                        defending: t('spd'),
                                        physical: t('gkPos')
                                    }
                                    : {
                                        pace: t('pac'),
                                        shooting: t('sho'),
                                        passing: t('pas'),
                                        dribbling: t('dri'),
                                        defending: t('def'),
                                        physical: t('phy')
                                    };
                                
                                return (
                                    <div 
                                        key={attrKey}
                                        className={`bg-zinc-900/50 border rounded-lg sm:rounded-xl p-2 sm:p-3 ${isAttrPositive ? 'border-emerald-500/30' : 'border-rose-500/30'}`}
                                    >
                                        <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-400 uppercase font-bold mb-1">
                                            {statLabels[attrKey]}
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <span className="text-zinc-500 text-xs sm:text-sm font-mono line-through decoration-zinc-600/50 opacity-50">
                                                {oldVal}
                                            </span>
                                            <span className="text-zinc-300 text-xs sm:text-sm">→</span>
                                            <span className={`text-base sm:text-lg font-black ${attrColor}`}>
                                                {currentVal}
                                            </span>
                                            <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${isAttrPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {isAttrPositive ? '+' : ''}{diff}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Summary message if no stat changes */}
                        {Object.keys(change.attributeChanges).length === 0 && (
                            <div className="text-center py-4">
                                <p className="text-zinc-400 text-xs sm:text-sm">
                                    {t('noStatChanges') || 'No specific attribute changes recorded.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-500">
            <div className="bg-zinc-900 border border-white/10 p-0 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="p-1.5 sm:p-2 md:p-3 pb-1 sm:pb-1.5 md:pb-2 text-center z-10 bg-zinc-900 border-b border-white/5">
                    <h2 className="text-zinc-400 text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-widest font-bold mb-0.5">{t('endOfSeason')}</h2>
                    <h1 className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight">{t('developmentReport')}</h1>
                    <p className="text-zinc-500 text-[8px] sm:text-[9px] md:text-[10px] mt-0.5 hidden sm:block">{t('tapPlayerToSeeEvolution')}</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-5 md:space-y-8 z-10 bg-zinc-950/50">
                    
                    {/* Improvements */}
                    {improved.length > 0 && (
                        <div>
                            <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1.5 sm:mb-2 md:mb-3 flex items-center gap-1.5 sm:gap-2">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400"></span>
                                {t('improvers')} ({improved.length})
                            </h3>
                            <div className="flex flex-col gap-1.5 sm:gap-2">
                                {improved.map(renderPlayerRow)}
                            </div>
                        </div>
                    )}

                    {/* Declines */}
                    {declined.length > 0 && (
                        <div>
                            <h3 className="text-rose-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1.5 sm:mb-2 md:mb-3 flex items-center gap-1.5 sm:gap-2">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400"></span>
                                {t('declining')} ({declined.length})
                            </h3>
                            <div className="flex flex-col gap-1.5 sm:gap-2">
                                {declined.map(renderPlayerRow)}
                            </div>
                        </div>
                    )}

                    {/* Summary Stats */}
                    <div className="bg-zinc-800/30 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl text-center text-zinc-500 text-[10px] sm:text-xs md:text-sm">
                        {unchangedCount > 0 && <span>{unchangedCount} {t('playersMaintainedRating')}. </span>}
                        {t('squadNetChange')}: <span className={`font-bold ${(improved.length - declined.length) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(improved.length - declined.length) > 0 ? '+' : ''}{improved.length - declined.length}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-2 sm:p-2.5 md:p-3 border-t border-white/5 z-10 bg-zinc-900">
                    <button 
                        onClick={onProceed}
                        className="w-full py-1.5 sm:py-2 md:py-2.5 bg-white text-black font-black text-[10px] sm:text-xs md:text-sm rounded-lg hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                        <span>{t('startNextSeason')}</span>
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
