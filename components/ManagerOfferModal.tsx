import React from 'react';
import { ManagerOffer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ManagerOfferModalProps {
    offers: ManagerOffer[];
    currentTeamName: string;
    currentTeamRating: number;
    currentTeamBudget: number;
    onAccept: (offer: ManagerOffer) => void;
    onReject: (offer: ManagerOffer) => void;
    onRejectAll: () => void;
}

export const ManagerOfferModal: React.FC<ManagerOfferModalProps> = ({
    offers,
    currentTeamName,
    currentTeamRating,
    currentTeamBudget,
    onAccept,
    onReject,
    onRejectAll
}) => {
    const { t } = useLanguage();

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    const getPrestigeColor = (prestige: ManagerOffer['prestige']) => {
        switch (prestige) {
            case 'ELITE':
                return 'border-purple-500/50 bg-purple-500/10';
            case 'HIGH':
                return 'border-blue-500/50 bg-blue-500/10';
            case 'MEDIUM':
                return 'border-emerald-500/50 bg-emerald-500/10';
            case 'LOW':
                return 'border-zinc-500/50 bg-zinc-500/10';
        }
    };

    const getPrestigeLabel = (prestige: ManagerOffer['prestige']) => {
        switch (prestige) {
            case 'ELITE':
                return t('elitePrestige') || 'ELITE';
            case 'HIGH':
                return t('highPrestige') || 'HIGH';
            case 'MEDIUM':
                return t('mediumPrestige') || 'MEDIUM';
            case 'LOW':
                return t('lowPrestige') || 'LOW';
        }
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 80) return 'text-purple-400';
        if (rating >= 70) return 'text-blue-400';
        if (rating >= 60) return 'text-emerald-400';
        return 'text-zinc-400';
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">
                        {t('managerOffers') || 'Manager Job Offers'}
                    </h2>
                    <h1 className="text-3xl font-black text-white mb-2">
                        {t('newOpportunities') || 'New Opportunities'}
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {(t('offersReceived') || `You've received ${offers.length} job offer${offers.length > 1 ? 's' : ''} from other clubs`).replace('{count}', offers.length.toString())}
                    </p>
                </div>

                {/* Current Team Info */}
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5 mb-6">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-2">
                        {t('currentTeam') || 'Current Team'}
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xl font-bold text-white">{currentTeamName}</div>
                            <div className="text-sm text-zinc-400">Rating: {currentTeamRating} | Budget: {formatMoney(currentTeamBudget)}</div>
                        </div>
                    </div>
                </div>

                {/* Offers List */}
                <div className="space-y-4 mb-6">
                    {offers.map((offer, index) => (
                        <div
                            key={offer.id}
                            className={`border rounded-xl p-6 transition-all hover:scale-[1.02] ${getPrestigeColor(offer.prestige)}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-2xl font-black text-white">{offer.teamName}</h3>
                                        <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getPrestigeColor(offer.prestige)}`}>
                                            {getPrestigeLabel(offer.prestige)}
                                        </span>
                                    </div>
                                    <p className="text-zinc-400 text-sm mb-3">
                                        {(() => {
                                            const [key, ...params] = offer.offerReason.split('|');
                                            if (key.startsWith('offerReason')) {
                                                if (key === 'offerReasonChampionshipWinner' && params[0]) {
                                                    return t('offerReasonChampionshipWinner', { teamName: params[0] });
                                                } else if (key === 'offerReasonTop3Finish' && params[0]) {
                                                    const rankNum = parseInt(params[0]);
                                                    const rankText = rankNum === 2 ? '2.' : '3.';
                                                    return t('offerReasonTop3Finish', { rank: rankText });
                                                } else if (key === 'offerReasonSolidSeason' && params[0]) {
                                                    return t('offerReasonSolidSeason', { rank: params[0] });
                                                } else {
                                                    return t(key as any) || offer.offerReason;
                                                }
                                            }
                                            return offer.offerReason;
                                        })()}
                                    </p>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div>
                                            <span className="text-zinc-500">{t('teamRating') || 'Team Rating'}: </span>
                                            <span className={`font-bold ${getRatingColor(offer.teamRating)}`}>
                                                {offer.teamRating}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">{t('budget') || 'Budget'}: </span>
                                            <span className="font-bold text-emerald-400">
                                                {formatMoney(offer.teamBudget)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => onAccept(offer)}
                                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] whitespace-nowrap"
                                    >
                                        {t('accept') || 'Accept'}
                                    </button>
                                    <button
                                        onClick={() => onReject(offer)}
                                        className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-all whitespace-nowrap"
                                    >
                                        {t('reject') || 'Reject'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reject All Button */}
                {offers.length > 1 && (
                    <button
                        onClick={onRejectAll}
                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg transition-all border border-zinc-700"
                    >
                        {t('rejectAllOffers') || 'Reject All Offers'}
                    </button>
                )}
            </div>
        </div>
    );
};

