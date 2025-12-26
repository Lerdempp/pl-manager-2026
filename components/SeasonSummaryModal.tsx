import React from 'react';
import { ManagerOffer } from '../types';
// @ts-ignore
import plcupImage from './assets/plcup.png';
// @ts-ignore
import golkraliImage from './assets/golkrali.png';
// @ts-ignore
import asistImage from './assets/asist.png';
// @ts-ignore
import mvpImage from './assets/MVP.png';
// @ts-ignore
import kaleImage from './assets/kale.png';
import { useLanguage } from '../contexts/LanguageContext';

interface SeasonSummary {
  rank: number;
  prizeMoney: number;
  teamName: string;
  seasonYear: string;
  champion: {
    teamName: string;
    prizeMoney: number;
    points: number;
  };
  topScorer: {
    playerName: string;
    teamName: string;
    goals: number;
  };
  topAssister: {
    playerName: string;
    teamName: string;
    assists: number;
  };
  longestUnbeatenStreak: {
    teamName: string;
    matches: number;
  };
  longestWinStreak: {
    teamName: string;
    matches: number;
  };
  seasonPlayer: {
    playerName: string;
    playerId: string;
    teamName: string;
    teamId: string;
    goals: number;
    assists: number;
    total: number;
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
  seasonGoalkeeper: {
    playerName: string;
    teamName: string;
    goalsConceded: number;
  };
}

interface SeasonSummaryModalProps {
  seasonSummary: SeasonSummary;
  managerOffers: ManagerOffer[] | null;
  onProceedToDevelopment: () => void;
  onSeasonPlayerClick: () => void;
}

export const SeasonSummaryModal: React.FC<SeasonSummaryModalProps> = ({
  seasonSummary,
  managerOffers,
  onProceedToDevelopment,
  onSeasonPlayerClick
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-3 md:p-4 overflow-y-auto" style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}>
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-2xl landscape:max-w-2xl md:max-w-3xl w-full relative my-2 sm:my-3 md:my-4 max-h-[95vh] overflow-y-auto" style={{ willChange: 'transform', transform: 'translateZ(0)', contain: 'layout style paint' }}>
        <h2 className="text-zinc-400 text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest font-bold mb-0.5 sm:mb-1 md:mb-2 relative z-10">{t('seasonComplete')}</h2>
        <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white mb-2 sm:mb-3 md:mb-4 relative z-10">{seasonSummary.seasonYear}</h1>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 w-full mb-2 sm:mb-3 md:mb-4 relative z-10">
          <div className="bg-zinc-800/50 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border border-white/5">
            <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">{t('finalRank')}</div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-white">#{seasonSummary.rank}</div>
          </div>
          <div className="bg-zinc-800/50 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border border-white/5 overflow-hidden">
            <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">{t('prizeMoney') || 'Prize Money'}</div>
            <div className="text-base sm:text-lg md:text-xl font-black text-emerald-400 tracking-tighter truncate">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(seasonSummary.prizeMoney)}
            </div>
          </div>
        </div>

        {/* Season Summary Details */}
        <div className="w-full space-y-1.5 sm:space-y-2 md:space-y-3 mb-2 sm:mb-3 md:mb-4 relative z-10">
          {/* Champion */}
          <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-700/30 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl relative">
            <div className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-black/80 rounded-lg flex items-center justify-center">
                <img src={plcupImage} alt="Champion" className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] sm:text-[10px] md:text-xs text-yellow-400 uppercase font-bold mb-0.5 sm:mb-1">🏆 {t('champion')}</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-white">{seasonSummary.champion.teamName} - {seasonSummary.champion.points} {t('points')}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-yellow-300 mt-0.5 sm:mt-1">
                {t('wonPrize').replace('{amount}', new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(seasonSummary.champion.prizeMoney))}
              </div>
            </div>
          </div>

          {/* Season Player (MVP) */}
          <div 
            onClick={onSeasonPlayerClick}
            className="bg-zinc-800/50 border border-white/5 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl relative cursor-pointer hover:bg-zinc-800/70 transition-all hover:scale-[1.02] hover:border-white/10"
          >
            <div className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-black/80 rounded-lg flex items-center justify-center">
                <img src={mvpImage} alt="Season Player" className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 object-contain" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">⭐ {t('seasonPlayer')}</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-white">{seasonSummary.seasonPlayer.playerName}</div>
            </div>
          </div>

          {/* Top Scorer */}
          <div className="bg-zinc-800/50 border border-white/5 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl relative">
            <div className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-black/80 rounded-lg flex items-center justify-center">
                <img src={golkraliImage} alt="Top Scorer" className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 object-contain" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">⚽ {t('topScorer')}</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-white">{seasonSummary.topScorer.playerName}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 mt-0.5 sm:mt-1">
                {seasonSummary.topScorer.goals} {t('goals')} {t('with')} {seasonSummary.topScorer.teamName}
              </div>
            </div>
          </div>

          {/* Top Assister */}
          <div className="bg-zinc-800/50 border border-white/5 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl relative">
            <div className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-black/80 rounded-lg flex items-center justify-center">
                <img src={asistImage} alt="Top Assister" className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 object-contain" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">🎯 {t('topAssister')}</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-white">{seasonSummary.topAssister.playerName}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 mt-0.5 sm:mt-1">
                {seasonSummary.topAssister.assists} {t('assists')} {t('with')} {seasonSummary.topAssister.teamName}
              </div>
            </div>
          </div>

          {/* Season Goalkeeper */}
          <div className="bg-zinc-800/50 border border-white/5 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl relative">
            <div className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-black/80 rounded-lg flex items-center justify-center">
                <img src={kaleImage} alt="Season Goalkeeper" className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 object-contain" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">🥅 {t('seasonGoalkeeper')}</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-white">{seasonSummary.seasonGoalkeeper.playerName}</div>
              <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 mt-0.5 sm:mt-1">
                {seasonSummary.seasonGoalkeeper.goalsConceded} {t('goalsConceded')} {t('with')} {seasonSummary.seasonGoalkeeper.teamName}
              </div>
            </div>
          </div>

          {/* Longest Unbeaten Streak */}
          <div className="bg-zinc-800/50 border border-white/5 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl">
            <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">📊 {t('longestUnbeatenStreak')}</div>
            <div className="text-sm sm:text-base md:text-lg font-bold text-white">{seasonSummary.longestUnbeatenStreak.teamName}</div>
            <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 mt-0.5 sm:mt-1">
              {t('matchesRecord').replace('{matches}', seasonSummary.longestUnbeatenStreak.matches.toString()).replace('{team}', seasonSummary.longestUnbeatenStreak.teamName)}
            </div>
          </div>

          {/* Longest Win Streak */}
          <div className="bg-zinc-800/50 border border-white/5 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl">
            <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 uppercase font-bold mb-0.5 sm:mb-1">🔥 {t('longestWinStreak')}</div>
            <div className="text-sm sm:text-base md:text-lg font-bold text-white">{seasonSummary.longestWinStreak.teamName}</div>
            <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 mt-0.5 sm:mt-1">
              {t('matchesRecord').replace('{matches}', seasonSummary.longestWinStreak.matches.toString()).replace('{team}', seasonSummary.longestWinStreak.teamName)}
            </div>
          </div>
        </div>

        {(!managerOffers || managerOffers.length === 0) && (
          <button 
            onClick={onProceedToDevelopment}
            className="w-full py-2 sm:py-2.5 md:py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm md:text-base rounded-lg sm:rounded-xl shadow-lg relative z-10"
          >
            {t('viewDevelopmentReport')}
          </button>
        )}
        {managerOffers && managerOffers.length > 0 && (
          <p className="text-zinc-500 text-sm mt-4">
            {t('waitingForManagerOffers') || 'Waiting for manager offers...'}
          </p>
        )}
      </div>
    </div>
  );
};

