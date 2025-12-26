import React, { useMemo } from 'react';
import { ManagerAchievement, ManagerCareerSeason } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
// @ts-ignore
import plcupImage from './assets/plcup.png';
// @ts-ignore
import mvpImage from './assets/MVP.png';
// @ts-ignore
import golkraliImage from './assets/golkrali.png';
// @ts-ignore
import asistImage from './assets/asist.png';
// @ts-ignore
import kaleImage from './assets/kale.png';

interface AchievementsViewProps {
    achievements: ManagerAchievement[];
    careerHistory: ManagerCareerSeason[];
    onBack: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
    achievements,
    careerHistory,
    onBack
}) => {
    const { t } = useLanguage();
    
    // Sort career history by season (oldest first)
    const sortedCareerHistory = useMemo(() => {
        if (!careerHistory || careerHistory.length === 0) return [];
        return [...careerHistory].sort((a, b) => {
            try {
                const [aStartYear] = a.season.split('/').map(Number);
                const [bStartYear] = b.season.split('/').map(Number);
                return aStartYear - bStartYear;
            } catch {
                return 0;
            }
        });
    }, [careerHistory]);
    
    // Get trophy display info
    const getTrophyInfo = (trophyType: string) => {
        switch(trophyType) {
            case 'premier_league':
                return {
                    icon: plcupImage,
                    name: t('premierLeague') || 'Premier League',
                    color: 'text-yellow-400'
                };
            default:
                return {
                    icon: null,
                    name: trophyType,
                    color: 'text-zinc-400'
                };
        }
    };

    // Group achievements by type
    const groupedAchievements = useMemo(() => {
        if (!achievements || achievements.length === 0) return {};
        const groups: Record<string, ManagerAchievement[]> = {};
        achievements.forEach(achievement => {
            if (achievement && achievement.type) {
                if (!groups[achievement.type]) {
                    groups[achievement.type] = [];
                }
                groups[achievement.type].push(achievement);
            }
        });
        return groups;
    }, [achievements]);

    // Get achievement display info
    const getAchievementInfo = (type: string) => {
        switch(type) {
            case 'championship':
                return {
                    icon: plcupImage,
                    name: t('championship') || 'Championship',
                    color: 'text-yellow-400'
                };
            case 'runnerUp':
                return {
                    icon: null,
                    name: t('runnerUp') || 'Runner Up',
                    color: 'text-zinc-400'
                };
            case 'thirdPlace':
                return {
                    icon: null,
                    name: t('thirdPlace') || 'Third Place',
                    color: 'text-amber-600'
                };
            case 'topFour':
                return {
                    icon: null,
                    name: t('topFour') || 'Top Four',
                    color: 'text-blue-400'
                };
            case 'relegationAvoided':
                return {
                    icon: null,
                    name: t('relegationAvoided') || 'Relegation Avoided',
                    color: 'text-green-400'
                };
            case 'mvpPlayer':
                return {
                    icon: mvpImage,
                    name: t('mvpPlayer') || 'MVP Player',
                    color: 'text-purple-400'
                };
            case 'topScorerPlayer':
                return {
                    icon: golkraliImage,
                    name: t('topScorerPlayer') || 'Top Scorer Player',
                    color: 'text-emerald-400'
                };
            case 'topAssisterPlayer':
                return {
                    icon: asistImage,
                    name: t('topAssisterPlayer') || 'Top Assister Player',
                    color: 'text-blue-400'
                };
            case 'seasonGoalkeeperPlayer':
                return {
                    icon: kaleImage,
                    name: t('seasonGoalkeeperPlayer') || 'Season Goalkeeper Player',
                    color: 'text-teal-400'
                };
            case 'unbeatenStreak':
                return {
                    icon: null,
                    name: t('unbeatenStreak') || 'Unbeaten Streak',
                    color: 'text-indigo-400'
                };
            case 'winStreak':
                return {
                    icon: null,
                    name: t('winStreak') || 'Win Streak',
                    color: 'text-pink-400'
                };
            case 'financialSuccess':
                return {
                    icon: null,
                    name: t('financialSuccess') || 'Financial Success',
                    color: 'text-green-400'
                };
            case 'stadiumExpansion':
                return {
                    icon: null,
                    name: t('stadiumExpansion') || 'Stadium Expansion',
                    color: 'text-orange-400'
                };
            default:
                return {
                    icon: null,
                    name: type || 'Unknown',
                    color: 'text-zinc-400'
                };
        }
    };

    // Sort achievement types by importance
    const sortedTypes = useMemo(() => {
        const order = ['championship', 'runnerUp', 'thirdPlace', 'topFour', 'mvpPlayer', 'topScorerPlayer', 'topAssisterPlayer', 'seasonGoalkeeperPlayer', 'unbeatenStreak', 'winStreak', 'relegationAvoided', 'financialSuccess', 'stadiumExpansion'];
        return Object.keys(groupedAchievements).sort((a, b) => {
            const aIndex = order.indexOf(a);
            const bIndex = order.indexOf(b);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
    }, [groupedAchievements]);

    const totalAchievements = achievements?.length || 0;
    const championships = groupedAchievements.championship?.length || 0;
    const seasons = sortedCareerHistory.length;
    const teams = new Set(sortedCareerHistory.map(s => s.teamName)).size;

    return (
        <div className="min-h-screen h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4 sm:p-6 md:p-8 pt-24 pb-24 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                {/* Header with Back Button */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                            {t('achievements') || 'Achievements'}
                        </h1>
                        <p className="text-zinc-500 text-sm">
                            {t('myAchievements') || 'My Career Achievements'}
                        </p>
                    </div>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold rounded-lg transition-all text-sm"
                    >
                        {t('back') || 'Back'}
                    </button>
                </div>

                {/* Statistics Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">
                            {championships}
                        </div>
                        <div className="text-xs text-zinc-500 uppercase font-bold mt-1">
                            {t('championships') || 'Championships'}
                        </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">
                            {totalAchievements}
                        </div>
                        <div className="text-xs text-zinc-500 uppercase font-bold mt-1">
                            {t('totalAchievements') || 'Total Achievements'}
                        </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">
                            {seasons}
                        </div>
                        <div className="text-xs text-zinc-500 uppercase font-bold mt-1">
                            {t('seasons') || 'Seasons'}
                        </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">
                            {teams}
                        </div>
                        <div className="text-xs text-zinc-500 uppercase font-bold mt-1">
                            {t('teams') || 'Teams'}
                        </div>
                    </div>
                </div>

                {/* Career Timeline */}
                {sortedCareerHistory.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6">
                            {t('careerTimeline') || 'Career Timeline'}
                        </h2>
                        <div className="space-y-4">
                            {sortedCareerHistory.map((season, index) => (
                                <div
                                    key={`${season.season}-${season.teamId || index}-${index}`}
                                    className="bg-zinc-800/50 rounded-xl p-4 sm:p-6 border border-white/5"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg sm:text-xl font-black text-white">
                                                    {season.season || 'Unknown Season'}
                                                </h3>
                                                <div className="h-px flex-1 bg-white/10"></div>
                                            </div>
                                            <div className="text-base sm:text-lg font-bold text-emerald-400 mb-1">
                                                {season.teamName || 'Unknown Team'}
                                            </div>
                                            <div className="text-sm text-zinc-400">
                                                {t('leaguePosition') || 'League Position'}: <span className="text-white font-bold">{season.leaguePosition || 'N/A'}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Trophies */}
                                        {season.trophies && season.trophies.length > 0 && (
                                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                                {season.trophies.map((trophy, trophyIndex) => {
                                                    const trophyInfo = getTrophyInfo(trophy);
                                                    return (
                                                        <div
                                                            key={trophyIndex}
                                                            className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-white/10"
                                                        >
                                                            {trophyInfo.icon && (
                                                                <img
                                                                    src={trophyInfo.icon}
                                                                    alt={trophyInfo.name}
                                                                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                                                />
                                                            )}
                                                            {!trophyInfo.icon && (
                                                                <span className="text-xl">🏆</span>
                                                            )}
                                                            <span className={`text-xs sm:text-sm font-bold ${trophyInfo.color}`}>
                                                                {trophyInfo.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Achievements List */}
                {totalAchievements === 0 ? (
                    <div className="bg-zinc-800/50 rounded-xl p-8 border border-white/5 text-center">
                        <div className="text-zinc-500 text-lg mb-2">
                            {t('noAchievementsYet') || 'No achievements yet'}
                        </div>
                        <div className="text-zinc-600 text-sm">
                            {t('startPlayingToEarnAchievements') || 'Start playing to earn achievements!'}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedTypes.map(type => {
                            const typeAchievements = groupedAchievements[type] || [];
                            if (typeAchievements.length === 0) return null;
                            
                            const info = getAchievementInfo(type);
                            const count = typeAchievements.length;

                            return (
                                <div
                                    key={type}
                                    className="bg-zinc-800/50 rounded-xl p-4 sm:p-6 border border-white/5"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        {info.icon && (
                                            <img
                                                src={info.icon}
                                                alt={info.name}
                                                className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                                            />
                                        )}
                                        {!info.icon && (
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-700/50 rounded-lg flex items-center justify-center">
                                                <span className="text-2xl">🏆</span>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h3 className={`text-lg sm:text-xl font-black ${info.color}`}>
                                                {info.name}
                                            </h3>
                                            <p className="text-zinc-500 text-xs sm:text-sm">
                                                {count}x {t('achievementWon') || t('won') || 'won'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pl-4 sm:pl-20">
                                        {typeAchievements.map((achievement, idx) => (
                                            <div
                                                key={`${achievement.season}-${achievement.teamName}-${idx}`}
                                                className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-lg"
                                            >
                                                <div>
                                                    <div className="text-white text-sm font-medium">
                                                        {achievement.season || 'Unknown Season'} - {achievement.teamName || 'Unknown Team'}
                                                    </div>
                                                    {achievement.description && (
                                                        <div className="text-zinc-500 text-xs">
                                                            {achievement.description}
                                                        </div>
                                                    )}
                                                </div>
                                                {achievement.value !== undefined && achievement.value !== null && (
                                                    <div className={`${info.color} font-bold text-sm`}>
                                                        {achievement.value}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
