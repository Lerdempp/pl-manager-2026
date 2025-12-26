import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface SeasonPlayerModalProps {
    seasonPlayer: {
        playerName: string;
        teamName: string;
        goals: number;
        assists: number;
        mvpCount: number;
        avgRating: number;
        tackles: number;
        interceptions: number;
        saves: number;
        shots: number;
        passes: number;
        passAccuracy: number;
        matches: number;
    };
    onClose: () => void;
}

export const SeasonPlayerModal: React.FC<SeasonPlayerModalProps> = ({
    seasonPlayer,
    onClose
}) => {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">
                        {t('seasonPlayer') || 'Season Player'}
                    </h2>
                    <h1 className="text-3xl font-black text-white mb-2">
                        {seasonPlayer.playerName}
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {seasonPlayer.teamName}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('mvpCount') || 'MVP Count'}
                        </div>
                        <div className="text-2xl font-black text-purple-400">
                            {seasonPlayer.mvpCount}
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('avgRating') || 'Avg Rating'}
                        </div>
                        <div className="text-2xl font-black text-yellow-400">
                            {seasonPlayer.avgRating.toFixed(1)}
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('matches')}
                        </div>
                        <div className="text-2xl font-black text-white">
                            {seasonPlayer.matches}
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('goals')}
                        </div>
                        <div className="text-2xl font-black text-emerald-400">
                            {seasonPlayer.goals}
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('assists')}
                        </div>
                        <div className="text-2xl font-black text-blue-400">
                            {seasonPlayer.assists}
                        </div>
                    </div>

                    {seasonPlayer.tackles > 0 && (
                        <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                            <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                                {t('tackles')}
                            </div>
                            <div className="text-2xl font-black text-orange-400">
                                {seasonPlayer.tackles}
                            </div>
                        </div>
                    )}

                    {seasonPlayer.interceptions > 0 && (
                        <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                            <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                                {t('interceptions')}
                            </div>
                            <div className="text-2xl font-black text-cyan-400">
                                {seasonPlayer.interceptions}
                            </div>
                        </div>
                    )}

                    {seasonPlayer.saves > 0 && (
                        <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                            <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                                {t('saves')}
                            </div>
                            <div className="text-2xl font-black text-teal-400">
                                {seasonPlayer.saves}
                            </div>
                        </div>
                    )}

                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('shots')}
                        </div>
                        <div className="text-2xl font-black text-white">
                            {seasonPlayer.shots}
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('passes') || 'Passes'}
                        </div>
                        <div className="text-2xl font-black text-white">
                            {seasonPlayer.passes.toLocaleString()}
                        </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">
                            {t('passAccuracy') || 'Pass Accuracy'}
                        </div>
                        <div className="text-2xl font-black text-green-400">
                            {seasonPlayer.passAccuracy}%
                        </div>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-all border border-zinc-700"
                >
                    {t('close')}
                </button>
            </div>
        </div>
    );
};

