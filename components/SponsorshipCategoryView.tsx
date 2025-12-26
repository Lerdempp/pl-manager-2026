import React from 'react';
import { Team, SponsorshipCategory, SponsorshipType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SponsorshipCategoryViewProps {
  team: Team;
  category: SponsorshipCategory;
  onBack: () => void;
  onSponsorshipSelect: (type: SponsorshipType) => void;
}

const getSponsorshipTypes = (t: (key: string) => string): Record<SponsorshipCategory, Array<{ type: SponsorshipType; name: string; icon: string; description: string }>> => ({
  stadium: [
    { type: 'naming_rights', name: t('namingRights'), icon: '🏟️', description: t('namingRights') },
    { type: 'vip_skybox', name: t('vipSkybox'), icon: '🎩', description: t('vipSkybox') },
    { type: 'led_boards', name: t('ledBoards'), icon: '📺', description: t('ledBoards') },
    { type: 'stadium_tech', name: t('stadiumTech'), icon: '⚡', description: t('stadiumTech') },
  ],
  jersey: [
    { type: 'jersey_front', name: t('jerseyFront'), icon: '👕', description: t('jerseyFront') },
    { type: 'jersey_back', name: t('jerseyBack'), icon: '🔙', description: t('jerseyBack') },
    { type: 'jersey_sleeve', name: t('jerseySleeve'), icon: '👔', description: t('jerseySleeve') },
    { type: 'training_kit', name: t('trainingKit'), icon: '🏃', description: t('trainingKit') },
  ],
  matchday: [
    { type: 'matchday_presentation', name: t('matchdayPresentation'), icon: '🎤', description: t('matchdayPresentation') },
    { type: 'official_drink', name: t('officialDrink'), icon: '🥤', description: t('officialDrink') },
    { type: 'official_merchandise', name: t('officialMerchandise'), icon: '🛍️', description: t('officialMerchandise') },
    { type: 'matchday_broadcast', name: t('matchdayBroadcast'), icon: '📡', description: t('matchdayBroadcast') },
  ],
  digital: [
    { type: 'social_media', name: t('socialMedia'), icon: '📱', description: t('socialMedia') },
    { type: 'app_partnership', name: t('appPartnership'), icon: '📲', description: t('appPartnership') },
    { type: 'esports', name: t('esports'), icon: '🎮', description: t('esports') },
    { type: 'streaming_platform', name: t('streamingPlatform'), icon: '📺', description: t('streamingPlatform') },
  ],
});

export const SponsorshipCategoryView: React.FC<SponsorshipCategoryViewProps> = ({
  team,
  category,
  onBack,
  onSponsorshipSelect,
}) => {
  const { t } = useLanguage();

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const sponsorships = getSponsorshipTypes(t)[category];
  const categoryNames: Record<SponsorshipCategory, string> = {
    stadium: t('stadium') || 'Stadium',
    jersey: t('jersey') || 'Jersey',
    matchday: t('matchday') || 'Matchday',
    digital: t('digital') || 'Digital',
  };

  const getActiveSponsorship = (type: SponsorshipType) => {
    return team.sponsorships?.[type];
  };

  const getEstimatedValue = (type: SponsorshipType) => {
    // Simple estimation based on stadium capacity
    const capacity = team.stadiumCapacity || 30000;
    const baseValue = capacity * 100; // Base value per capacity
    return baseValue * (1 + Math.random() * 0.5); // Add some randomness
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-2 landscape:p-3 md:p-6 gap-2 landscape:gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
        {/* Header */}
        <div className="mb-2 landscape:mb-3 md:mb-4">
          <h1 className="text-xl landscape:text-2xl md:text-3xl font-black text-white mb-1 landscape:mb-1.5 md:mb-2">
            {categoryNames[category]} {t('sponsorships') || 'Sponsorships'}
          </h1>
          <p className="text-zinc-400 text-xs landscape:text-sm md:text-base">
            {t('selectSponsorshipType') || 'Select a sponsorship type to view offers'}
          </p>
        </div>

        {/* Sponsorships Grid */}
        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-2 landscape:gap-3 md:gap-4">
          {sponsorships.map((sponsorship) => {
            const active = getActiveSponsorship(sponsorship.type);
            const estimatedValue = getEstimatedValue(sponsorship.type);

            return (
              <div
                key={sponsorship.type}
                className="bg-zinc-800/50 border border-white/10 rounded-lg landscape:rounded-xl md:rounded-xl p-3 landscape:p-4 md:p-6 hover:bg-zinc-800/70 transition-all"
              >
                <div className="flex items-start justify-between mb-2 landscape:mb-3 md:mb-4">
                  <div className="flex items-center gap-2 landscape:gap-3 md:gap-4">
                    <div className="text-2xl landscape:text-3xl md:text-4xl">{sponsorship.icon}</div>
                    <div>
                      <h3 className="text-base landscape:text-lg md:text-xl font-black text-white mb-0.5 landscape:mb-1">
                        {sponsorship.name}
                      </h3>
                      <p className="text-zinc-400 text-[10px] landscape:text-xs">
                        {sponsorship.description}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <div className="bg-emerald-600/20 px-2 landscape:px-2.5 md:px-3 py-0.5 landscape:py-1 rounded landscape:rounded-md md:rounded-lg border border-emerald-500/30 flex-shrink-0">
                      <div className="text-emerald-400 text-[9px] landscape:text-[10px] md:text-xs font-bold whitespace-nowrap">
                        {t('active') || 'Active'}
                      </div>
                    </div>
                  )}
                </div>

                {active ? (
                  <div className="mb-2 landscape:mb-3 md:mb-4">
                    <div className="text-zinc-400 text-[9px] landscape:text-[10px] md:text-xs uppercase tracking-wider font-bold mb-1 landscape:mb-1.5 md:mb-2">
                      {t('currentSponsor') || 'Current Sponsor'}
                    </div>
                    <div className="text-white font-bold text-xs landscape:text-sm md:text-base mb-0.5 landscape:mb-1">
                      {active.sponsorCompany}
                    </div>
                    <div className="text-emerald-400 text-[11px] landscape:text-xs md:text-sm">
                      {formatMoney(active.annualPayment)} / {t('year') || 'year'}
                    </div>
                    <div className="text-zinc-500 text-[9px] landscape:text-[10px] md:text-xs mt-1 landscape:mt-1.5 md:mt-2">
                      {t('contractEnds') || 'Contract ends'}: {active.endSeason}
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 landscape:mb-3 md:mb-4">
                    <div className="text-zinc-400 text-[9px] landscape:text-[10px] md:text-xs uppercase tracking-wider font-bold mb-1 landscape:mb-1.5 md:mb-2">
                      {t('estimatedValue') || 'Estimated Value'}
                    </div>
                    <div className="text-zinc-300 text-[11px] landscape:text-xs md:text-sm">
                      ~{formatMoney(estimatedValue)} / {t('year') || 'year'}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onSponsorshipSelect(sponsorship.type)}
                  className="w-full px-2 landscape:px-3 md:px-4 py-1.5 landscape:py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] landscape:text-xs md:text-sm font-bold rounded landscape:rounded-md md:rounded-lg transition-all"
                >
                  {active ? t('viewContract') || 'View Contract' : t('selectSponsor') || 'Select Sponsor'}
                </button>
              </div>
            );
          })}
        </div>
    </div>
  );
};

