import React from 'react';
import { Team, SponsorshipCategory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SponsorshipsViewProps {
  team: Team;
  onBack: () => void;
  onCategorySelect: (category: SponsorshipCategory) => void;
}

export const SponsorshipsView: React.FC<SponsorshipsViewProps> = ({ team, onBack, onCategorySelect }) => {
  const { t } = useLanguage();

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  // Calculate total sponsor income from active contracts
  const calculateTotalSponsorIncome = () => {
    let total = 0;
    
    // Add income from all active sponsorship contracts
    if (team.sponsorships) {
      Object.values(team.sponsorships).forEach(sponsorship => {
        total += sponsorship.annualPayment;
      });
    }
    
    // Add income from stadium naming rights sponsor
    if (team.stadiumNameSponsor) {
      total += team.stadiumNameSponsor.annualPayment;
    }
    
    return total;
  };

  const totalSponsorIncome = calculateTotalSponsorIncome();

  const categories: Array<{ id: SponsorshipCategory; name: string; icon: string; description: string }> = [
    { id: 'stadium', name: t('stadium') || 'Stadium', icon: '🏟️', description: t('stadiumSponsorships') || 'Stadium sponsorships' },
    { id: 'jersey', name: t('jersey') || 'Jersey', icon: '👕', description: t('jerseySponsorships') || 'Jersey sponsorships' },
    { id: 'matchday', name: t('matchday') || 'Matchday', icon: '🎫', description: t('matchdaySponsorships') || 'Matchday sponsorships' },
    { id: 'digital', name: t('digital') || 'Digital', icon: '💻', description: t('digitalSponsorships') || 'Digital sponsorships' },
  ];

  const getActiveSponsorshipsCount = (category: SponsorshipCategory) => {
    if (!team.sponsorships) return 0;
    return Object.values(team.sponsorships).filter(s => s.category === category).length;
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-2 landscape:p-3 md:p-6 gap-2 landscape:gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
        {/* Header */}
        <div className="mb-2 landscape:mb-3 md:mb-4">
          <h1 className="text-xl landscape:text-2xl md:text-3xl font-black text-white mb-1 landscape:mb-1.5 md:mb-2">
            {t('sponsorships') || 'Sponsorships'}
          </h1>
          <p className="text-zinc-400 text-xs landscape:text-sm md:text-base">
            {t('sponsorshipsDescription') || 'Manage your team sponsorships and partnerships'}
          </p>
        </div>

        {/* Total Income */}
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg landscape:rounded-xl md:rounded-xl p-3 landscape:p-4 md:p-6 mb-2 landscape:mb-3 md:mb-4">
          <div className="text-zinc-400 text-[9px] landscape:text-[10px] md:text-sm uppercase tracking-wider font-bold mb-1 landscape:mb-1.5 md:mb-2">
            {t('totalSponsorIncome') || 'Total Sponsor Income'}
          </div>
          <div className="text-lg landscape:text-xl md:text-2xl font-black text-emerald-400">
            {formatMoney(totalSponsorIncome)} / {t('year') || 'year'}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-2 landscape:gap-3 md:gap-4">
          {categories.map((category) => {
            const activeCount = getActiveSponsorshipsCount(category.id);
            return (
              <div
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className="bg-zinc-800/50 border border-white/10 rounded-lg landscape:rounded-xl md:rounded-xl p-3 landscape:p-4 md:p-6 cursor-pointer hover:bg-zinc-800/70 transition-all group"
              >
                <div className="flex items-start justify-between mb-2 landscape:mb-3 md:mb-4">
                  <div className="flex items-center gap-2 landscape:gap-3 md:gap-4">
                    <div className="text-2xl landscape:text-3xl md:text-4xl">{category.icon}</div>
                    <div>
                      <h3 className="text-base landscape:text-lg md:text-xl font-black text-white mb-0.5 landscape:mb-1">
                        {category.name}
                      </h3>
                      <p className="text-zinc-400 text-[10px] landscape:text-xs md:text-sm">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  {activeCount > 0 && (
                    <div className="bg-emerald-600/20 px-2 landscape:px-2.5 md:px-3 py-0.5 landscape:py-1 rounded landscape:rounded-md md:rounded-lg border border-emerald-500/30 flex-shrink-0">
                      <div className="text-emerald-400 text-[9px] landscape:text-[10px] md:text-xs font-bold whitespace-nowrap">
                        {activeCount} {t('active') || 'Active'}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 landscape:gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <span className="text-[10px] landscape:text-xs md:text-sm font-bold">{t('viewSponsorships') || 'View Sponsorships'}</span>
                  <svg className="w-3 h-3 landscape:w-3.5 landscape:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
};
