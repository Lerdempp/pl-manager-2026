
import React from 'react';
import { ViewState, Team } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MainMenuProps {
  team: Team;
  onNavigate: (view: ViewState) => void;
  favoriteCount: number;
  mailCount: number;
  onOpenYouth?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ team, onNavigate, favoriteCount, mailCount, onOpenYouth }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-2 landscape:p-3 md:p-6 gap-2 landscape:gap-3 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      
      {/* Header */}
      <div className="text-center mb-2 landscape:mb-3 md:mb-6 flex-shrink-0">
        <h1 className="text-xl landscape:text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-yellow-400 to-emerald-400 mb-1 landscape:mb-2 md:mb-3">
          {t('mainMenu')}
        </h1>
        <p className="text-zinc-400 text-xs landscape:text-sm md:text-base font-light">{t('welcome')}, {team.name}</p>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-2 landscape:gap-3 md:gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        
        {/* TEAM MANAGEMENT */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-md rounded-xl landscape:rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl p-2 landscape:p-3 md:p-6 flex flex-col min-h-0">
          <div className="mb-2 landscape:mb-3 md:mb-5 flex-shrink-0">
            <h2 className="text-lg landscape:text-xl md:text-3xl font-black text-emerald-400 mb-1 landscape:mb-2">{t('teamManagement')}</h2>
            <div className="h-1 w-16 landscape:w-20 md:w-24 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          </div>

          <div className="flex-1 flex flex-col gap-2 landscape:gap-3 md:gap-4 min-h-0 overflow-y-auto custom-scrollbar">
            {/* Squad Section */}
            <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 p-2 landscape:p-3 md:p-5 flex-shrink-0">
              <h3 className="text-sm landscape:text-base md:text-xl font-bold text-white mb-2 landscape:mb-3 md:mb-4 flex items-center gap-2">
                <svg className="w-5 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {t('squad')}
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onNavigate(ViewState.DASHBOARD)}
                  className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-emerald-400 transition-colors">{t('rosterView')}</div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('viewAndManage')}</div>
                </button>
                <button
                  onClick={() => onNavigate(ViewState.FORMATION_VIEW)}
                  className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-emerald-400 transition-colors">{t('formationView')}</div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('startingXI')}</div>
                </button>
              </div>
            </div>

            {/* Club Management */}
            <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 p-2 landscape:p-3 md:p-5 flex-shrink-0">
              <h3 className="text-sm landscape:text-base md:text-xl font-bold text-white mb-2 landscape:mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-2xl">🏢</span>
{t('clubManagement') || 'Club Management'}
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onNavigate(ViewState.FINANCIAL_TABLE)}
                  className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-emerald-400 transition-colors">{t('financialTable')}</div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('incomeExpenses')}</div>
                </button>
                <button
                  onClick={() => onNavigate(ViewState.SPONSORSHIPS)}
                  className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-emerald-400 transition-colors">{t('sponsorships') || 'Sponsorships'}</div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('sponsorshipsMenuDescription') || 'Manage sponsorship deals'}</div>
                </button>
                <button
                  onClick={() => onNavigate(ViewState.SHOP)}
                  className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-yellow-500/30 transition-all group"
                >
                  <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-yellow-400 transition-colors">
                    {t('shop') || 'Shop'}
                  </div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('shopMenuDescription') || 'Purchase boosts and upgrades'}</div>
                </button>
                <button
                  onClick={() => onNavigate(ViewState.MAILBOX)}
                  className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-blue-400 transition-colors">
                      {t('mailboxTitle') || 'Inbox'}
                    </div>
                    <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">
                      {t('mailboxMenuDescription') || 'All notifications & news'}
                    </div>
                  </div>
                  {mailCount > 0 && (
                    <div className="bg-blue-500 text-black text-[10px] landscape:text-xs md:text-sm font-black rounded-full min-w-[32px] px-2 py-0.5 text-center">
                      {mailCount}
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Achievements */}
            <button
              onClick={() => onNavigate(ViewState.ACHIEVEMENTS)}
              className="text-left px-2 landscape:px-3 md:px-6 py-2 landscape:py-2.5 md:py-4 bg-zinc-950/50 hover:bg-zinc-800/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group relative flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white group-hover:text-purple-400 transition-colors text-xs landscape:text-sm md:text-lg flex items-center gap-2">
                    <span className="text-base landscape:text-lg">🏆</span>
                    {t('achievements') || 'Achievements'}
                  </div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('myAchievements') || 'My Career Achievements'}</div>
                </div>
              </div>
            </button>

            {/* Favorites */}
            <button
              onClick={() => onNavigate(ViewState.FAVORITES)}
              className="text-left px-2 landscape:px-3 md:px-6 py-2 landscape:py-2.5 md:py-4 bg-zinc-950/50 hover:bg-zinc-800/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all group relative flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white group-hover:text-yellow-400 transition-colors text-xs landscape:text-sm md:text-lg flex items-center gap-2">
                    <svg className="w-3 h-4 landscape:w-4 landscape:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {t('favorites')}
                  </div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('trackPlayers')}</div>
                </div>
                {favoriteCount > 0 && (
                  <div className="bg-yellow-500 text-black text-[10px] landscape:text-xs md:text-sm font-black rounded-full w-5 h-5 landscape:w-6 landscape:h-6 md:w-8 md:h-8 flex items-center justify-center">
                    {favoriteCount}
                  </div>
                )}
              </div>
            </button>

            {/* Transfers */}
            <div className="bg-zinc-950/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 p-2 landscape:p-3 md:p-5 flex-shrink-0">
              <h3 className="text-sm landscape:text-base md:text-xl font-bold text-white mb-2 landscape:mb-3 md:mb-4 flex items-center gap-2">
                <svg className="w-4 h-5 landscape:w-5 landscape:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {t('transfers')}
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onNavigate(ViewState.MARKET)}
                  className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group"
                >
                  <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-blue-400 transition-colors">{t('transferMarket')}</div>
                  <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('browsePlayers')}</div>
                </button>
                {onOpenYouth && (
                  <button
                    onClick={onOpenYouth}
                    className="text-left px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 md:py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg md:rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group"
                  >
                    <div className="font-bold text-xs landscape:text-sm md:text-base text-white group-hover:text-blue-400 transition-colors">{t('youthAcademy')}</div>
                    <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('scoutYouthPlayers')}</div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LEAGUE HUB */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-md rounded-xl landscape:rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl p-2 landscape:p-3 md:p-6 flex flex-col min-h-0">
          <div className="mb-2 landscape:mb-3 md:mb-5 flex-shrink-0">
            <h2 className="text-lg landscape:text-xl md:text-3xl font-black text-purple-400 mb-1 landscape:mb-2">{t('leagueHub')}</h2>
            <div className="h-1 w-16 landscape:w-20 md:w-24 bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
          </div>

          <div className="flex-1 flex flex-col gap-2 landscape:gap-3 md:gap-4 min-h-0">
            <button
              onClick={() => onNavigate(ViewState.LEAGUE)}
              className="text-left px-2 landscape:px-3 md:px-6 py-2 landscape:py-2.5 md:py-4 bg-zinc-950/50 hover:bg-zinc-800/50 rounded-lg landscape:rounded-xl md:rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group flex-shrink-0"
            >
              <div className="font-bold text-white group-hover:text-purple-400 transition-colors text-xs landscape:text-sm md:text-lg flex items-center gap-2">
                <svg className="w-3 h-4 landscape:w-4 landscape:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t('leagueHubCard')}
              </div>
              <div className="text-[10px] landscape:text-xs text-zinc-500 mt-0.5 landscape:mt-1">{t('standingsResults')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

