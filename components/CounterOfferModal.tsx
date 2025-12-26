import React, { useState, useMemo } from 'react';
import { TransferOffer, Player } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CounterOfferModalProps {
    offer: TransferOffer;
    player: Player;
    onCounter: (fee: number) => void;
    onClose: () => void;
}

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({ offer, player, onCounter, onClose }) => {
    const [counterFee, setCounterFee] = useState(offer.fee);
    const { t, language } = useLanguage();
    const originalFee = offer.originalFee || offer.fee;
    const minFee = Math.floor(originalFee * 0.8); // Can counter up to 20% lower
    const maxFee = Math.floor(originalFee * 1.5); // Can counter up to 50% higher
    
    const formatter = useMemo(() => new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), [language]);
    const formatMoney = (amount: number) => formatter.format(amount);
    
    // Calculate step size (1% of the range)
    const stepSize = Math.max(1, Math.floor((maxFee - minFee) / 100));
    
    const handleDecrease = () => {
        const newFee = Math.max(minFee, counterFee - stepSize);
        setCounterFee(newFee);
    };
    
    const handleIncrease = () => {
        const newFee = Math.min(maxFee, counterFee + stepSize);
        setCounterFee(newFee);
    };
    
    const handleSubmit = () => {
        if (counterFee < minFee || counterFee > maxFee) {
            return;
        }
        onCounter(counterFee);
    };
    
    return (
        <div className="space-y-4">
            <div className="text-zinc-400 text-xs uppercase font-bold mb-2">{t('makeCounterOffer')}</div>
            <div className="flex items-center gap-2 mb-3">
                <button
                    onClick={handleDecrease}
                    disabled={counterFee <= minFee}
                    className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all border border-white/10 hover:border-white/20"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <input
                    type="range"
                    min={minFee}
                    max={maxFee}
                    value={counterFee}
                    onChange={(e) => setCounterFee(Number(e.target.value))}
                    className="flex-1"
                />
                <button
                    onClick={handleIncrease}
                    disabled={counterFee >= maxFee}
                    className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all border border-white/10 hover:border-white/20"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <div className="text-emerald-400 font-mono font-bold min-w-[120px] text-right">
                    {formatMoney(counterFee)}
                </div>
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mb-3">
                <span>{t('minLabel')}: {formatMoney(minFee)}</span>
                <span>{t('originalLabel')}: {formatMoney(originalFee)}</span>
                <span>{t('maxLabel')}: {formatMoney(maxFee)}</span>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all"
                >
                    {t('cancel')}
                </button>
                <button
                    onClick={handleSubmit}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                >
                    {t('sendCounterOffer')}
                </button>
            </div>
            <div className="text-zinc-500 text-xs mt-2 text-center">
                {t('responseNextWeek')}
            </div>
        </div>
    );
};

