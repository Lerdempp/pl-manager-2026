
import React, { useState } from 'react';
import { Player, Team } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface NegotiationModalProps {
    player: Player;
    sellerTeam: Team;
    buyerBudget: number;
    onClose: () => void;
    onSuccess: (finalPrice: number) => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({ player, sellerTeam, buyerBudget, onClose, onSuccess }) => {
    const { t } = useLanguage();
    const [offer, setOffer] = useState<number>(player.marketValue);
    const [round, setRound] = useState(1);
    const [feedback, setFeedback] = useState<string>(t('weAreListening'));
    const [status, setStatus] = useState<'ONGOING' | 'ACCEPTED' | 'REJECTED'>('ONGOING');
    const [counterOffer, setCounterOffer] = useState<number | null>(null);

    // Calculate CPU Asking Price Logic
    // Young/High Potential = Expensive. Old = Cheap.
    const potentialPremium = (player.potential - player.rating) * 0.05; // 5% per potential point diff
    const ageFactor = player.age < 24 ? 1.2 : player.age > 30 ? 0.8 : 1.0;
    
    // Calculate player's value rank in the team
    // Teams are more reluctant to sell their most valuable players
    const teamPlayersByValue = [...sellerTeam.players]
        .sort((a, b) => b.marketValue - a.marketValue); // Sort by value descending
    
    const playerRank = teamPlayersByValue.findIndex(p => p.id === player.id) + 1; // 1-based rank
    const totalPlayers = teamPlayersByValue.length;
    const rankPercentile = playerRank / totalPlayers; // 0.0 (most valuable) to 1.0 (least valuable)
    
    // Value-based selling reluctance multiplier
    // Top 10% (most valuable) = 2.0x (very reluctant, want 2x market value)
    // Top 25% = 1.5x
    // Top 50% = 1.2x
    // Bottom 50% = 1.0x (normal)
    // Bottom 25% = 0.9x (more willing to sell)
    // Bottom 10% = 0.8x (very willing to sell)
    let valueReluctanceMultiplier = 1.0;
    if (rankPercentile <= 0.1) {
        valueReluctanceMultiplier = 2.0; // Top 10% - very reluctant
    } else if (rankPercentile <= 0.25) {
        valueReluctanceMultiplier = 1.5; // Top 25% - reluctant
    } else if (rankPercentile <= 0.5) {
        valueReluctanceMultiplier = 1.2; // Top 50% - somewhat reluctant
    } else if (rankPercentile <= 0.75) {
        valueReluctanceMultiplier = 1.0; // Bottom 50% - normal
    } else if (rankPercentile <= 0.9) {
        valueReluctanceMultiplier = 0.9; // Bottom 25% - more willing
    } else {
        valueReluctanceMultiplier = 0.8; // Bottom 10% - very willing
    }
    
    // The "Ideal" price the CPU wants
    const askingPrice = Math.floor(player.marketValue * ageFactor * (1 + potentialPremium) * valueReluctanceMultiplier);
    
    // The absolute floor they will accept (also affected by value reluctance)
    const minimumAcceptable = Math.floor(askingPrice * 0.9); 

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    const handleOffer = () => {
        if (offer > buyerBudget) {
            setFeedback(t('cannotAffordOffer'));
            return;
        }

        if (offer >= minimumAcceptable) {
            setStatus('ACCEPTED');
            setFeedback(t('fairPriceAccepted'));
            setCounterOffer(null);
        } else {
            if (round >= 3) {
                setStatus('REJECTED');
                setFeedback(t('tooFarApart'));
                setCounterOffer(null);
            } else {
                // Counter Offer Logic
                // CPU comes down slightly from Asking Price towards Minimum based on rounds
                // Round 1: Asks for 100% of Asking Price
                // Round 2: Asks for 95% of Asking Price
                // Round 3: Asks for Minimum Acceptable + small buffer
                let cpuCounter = 0;
                if (round === 1) cpuCounter = askingPrice;
                else if (round === 2) cpuCounter = Math.floor(askingPrice * 0.96);
                else cpuCounter = Math.floor(minimumAcceptable * 1.02);

                // Ensure counter doesn't go below minimum or weirdly below user offer (unlikely)
                cpuCounter = Math.max(minimumAcceptable, cpuCounter);

                setCounterOffer(cpuCounter);

                // Feedback logic
                const diff = minimumAcceptable - offer;
                const percentOff = diff / minimumAcceptable;

                if (percentOff > 0.4) setFeedback(`${t('thatIsInsulting')} ${formatMoney(cpuCounter)}.`);
                else if (percentOff > 0.2) setFeedback(`${t('valueHigher')} ${formatMoney(cpuCounter)} ${t('andHeIsYours')}`);
                else setFeedback(`${t('weAreClose')} ${formatMoney(cpuCounter)}.`);
                
                setRound(prev => prev + 1);
            }
        }
    };

    const handleAcceptCounter = () => {
        if (counterOffer) {
            if (counterOffer > buyerBudget) {
                setFeedback(t('cannotAffordCounter'));
                return;
            }
            setStatus('ACCEPTED');
            setFeedback(t('dealAgreed'));
            setOffer(counterOffer); // Sync offer state for the success handler
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
                
                {/* Header */}
                <div className="text-center mb-8 relative z-10">
                    <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">{t('transferNegotiation')}</h2>
                    <div className="text-3xl font-black text-white mb-1">{player.name}</div>
                    <div className="text-zinc-500 text-sm">{t('currentClub')}: <span className="text-white font-bold">{sellerTeam.name}</span></div>
                </div>

                {/* Player Info */}
                <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/5 mb-6 flex justify-between items-center">
                    <div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">{t('marketValue')}</div>
                        <div className="text-emerald-400 font-mono font-bold">{formatMoney(player.marketValue)}</div>
                    </div>
                    <div className="text-right">
                         <div className="text-xs text-zinc-500 uppercase font-bold">{t('yourBudget')}</div>
                         <div className={`font-mono font-bold ${buyerBudget < offer ? 'text-rose-500' : 'text-white'}`}>{formatMoney(buyerBudget)}</div>
                    </div>
                </div>

                {/* Interaction Area */}
                <div className="bg-zinc-800/30 rounded-xl p-6 border border-white/5 text-center mb-6">
                    {status === 'ONGOING' && (
                        <>
                            <div className="mb-4">
                                <div className="flex justify-between items-center text-zinc-400 text-sm mb-2">
                                    <span>{t('roundSlash')} {round} / 3</span>
                                    {counterOffer && (
                                        <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">
                                            {t('counter')}: {formatMoney(counterOffer)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-lg font-bold text-white italic bg-black/20 p-3 rounded-lg">
                                    "{feedback}"
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                <input 
                                    type="range" 
                                    min={Math.floor(player.marketValue * 0.5)} 
                                    max={Math.floor(player.marketValue * 2.5)} 
                                    step={100000}
                                    value={offer}
                                    onChange={(e) => setOffer(parseInt(e.target.value))}
                                    className="w-full accent-emerald-500 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => setOffer(o => Math.max(0, o - 1000000))} className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 text-white">-</button>
                                    <div className="text-2xl font-mono font-black text-white min-w-[180px]">{formatMoney(offer)}</div>
                                    <button onClick={() => setOffer(o => o + 1000000)} className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 text-white">+</button>
                                </div>
                            </div>
                        </>
                    )}

                    {status === 'ACCEPTED' && (
                        <div className="animate-in zoom-in duration-300">
                             <div className="text-emerald-400 text-5xl mb-4">🤝</div>
                             <h3 className="text-2xl font-black text-white mb-2">{t('offerAccepted')}</h3>
                             <p className="text-zinc-400 text-sm">{t('playerJoiningSquad')} {formatMoney(offer)}.</p>
                        </div>
                    )}

                    {status === 'REJECTED' && (
                         <div className="animate-in zoom-in duration-300">
                             <div className="text-rose-500 text-5xl mb-4">🚫</div>
                             <h3 className="text-2xl font-black text-white mb-2">{t('negotiationsFailed')}</h3>
                             <p className="text-zinc-400 text-sm">{t('clubPulledOutOfTalks')}</p>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col gap-3">
                    {status === 'ONGOING' && (
                        <div className="flex gap-3">
                            <button onClick={onClose} className="w-24 py-3 rounded-xl font-bold text-zinc-400 hover:bg-white/5 text-xs uppercase">{t('walkAway')}</button>
                            
                            <div className="flex-1 flex gap-3">
                                {counterOffer && (
                                    <button 
                                        onClick={handleAcceptCounter}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 text-xs md:text-sm"
                                    >
                                        {t('accept')} {formatMoney(counterOffer)}
                                    </button>
                                )}
                                <button 
                                    onClick={handleOffer} 
                                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl shadow-lg transition-transform hover:scale-105 text-xs md:text-sm"
                                >
                                    {t('submitOffer')}
                                </button>
                            </div>
                        </div>
                    )}
                    {status === 'ACCEPTED' && (
                        <button onClick={() => onSuccess(offer)} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl shadow-lg">
                            {t('completeTransfer')}
                        </button>
                    )}
                    {status === 'REJECTED' && (
                        <button onClick={onClose} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl">
                            {t('close')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
