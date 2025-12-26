import React, { useState } from 'react';
import { Team, SponsorshipOffer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SponsorshipOfferModalProps {
  team: Team;
  offers: SponsorshipOffer[];
  currentWeek: number;
  currentSeason: string;
  onAccept: (offer: SponsorshipOffer) => void;
  onClose: () => void;
}

export const SponsorshipOfferModal: React.FC<SponsorshipOfferModalProps> = ({
  team,
  offers,
  currentWeek,
  currentSeason,
  onAccept,
  onClose,
}) => {
  const { t } = useLanguage();
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const selectedOffer = offers[selectedOfferIndex];
  const totalContractValue = selectedOffer ? selectedOffer.annualPayment * selectedOffer.contractDuration : 0;

  // Check if there's an existing sponsorship of this type
  const existingSponsorship = team.sponsorships?.[selectedOffer?.type || ''];
  
  // Calculate termination fee if needed
  let terminationFee = 0;
  if (existingSponsorship && existingSponsorship.endWeek && currentWeek < existingSponsorship.endWeek) {
    const weeksRemaining = existingSponsorship.endWeek - currentWeek;
    terminationFee = Math.floor((weeksRemaining / 38) * existingSponsorship.annualPayment);
  }

  const canAfford = !existingSponsorship || (existingSponsorship.endWeek && currentWeek >= existingSponsorship.endWeek) || team.budget >= terminationFee;

  if (!selectedOffer) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 landscape:p-3 md:p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl landscape:rounded-3xl p-3 landscape:p-4 md:p-6 max-w-2xl landscape:max-w-3xl md:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="mb-3 landscape:mb-4 md:mb-6">
          <h2 className="text-lg landscape:text-xl md:text-3xl font-black text-white mb-1 landscape:mb-1.5 md:mb-2">
            {t('sponsorOffer') || 'Sponsor Offers'}
          </h2>
          <p className="text-zinc-400 text-xs landscape:text-sm md:text-sm">
            {t('selectOneOffer') || 'Select one of the following offers'}
          </p>
        </div>

        {/* Offer Selector */}
        <div className="mb-3 landscape:mb-4 md:mb-6">
          <div className="text-zinc-400 text-[10px] landscape:text-xs md:text-xs uppercase tracking-widest font-bold mb-2 landscape:mb-2.5 md:mb-3">
            {t('selectOffer') || 'Select Offer'} ({offers.length} {t('available') || 'available'})
          </div>
          <div className="grid grid-cols-2 gap-2 landscape:gap-2.5 md:gap-3">
            {offers.map((offer, index) => (
              <button
                key={offer.id}
                onClick={() => setSelectedOfferIndex(index)}
                className={`p-2 landscape:p-3 md:p-4 rounded-lg landscape:rounded-xl border transition-all text-left ${
                  selectedOfferIndex === index
                    ? 'bg-emerald-600/20 border-emerald-500/50'
                    : 'bg-zinc-800/50 border-white/10 hover:bg-zinc-800/70'
                }`}
              >
                <div className="text-white font-bold text-xs landscape:text-sm md:text-base mb-0.5 landscape:mb-1">{offer.sponsorCompany}</div>
                <div className="text-emerald-400 text-[10px] landscape:text-xs md:text-sm font-bold">
                  {formatMoney(offer.annualPayment)} / {t('year') || 'year'}
                </div>
                <div className="text-zinc-500 text-[9px] landscape:text-[10px] md:text-xs mt-0.5 landscape:mt-1">
                  {offer.contractDuration} {t('years') || 'years'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Offer Details */}
        {selectedOffer && (
          <div className="bg-zinc-800/50 border border-white/5 rounded-lg landscape:rounded-xl p-3 landscape:p-4 md:p-6 mb-3 landscape:mb-4 md:mb-6">
            <div className="flex items-start justify-between mb-2 landscape:mb-3 md:mb-4">
              <div>
                <div className="text-zinc-400 text-[10px] landscape:text-xs md:text-xs uppercase tracking-widest font-bold mb-0.5 landscape:mb-1">
                  {t('sponsorCompany') || 'Sponsor Company'}
                </div>
                <div className="text-base landscape:text-lg md:text-2xl font-black text-white mb-0.5 landscape:mb-1">
                  {selectedOffer.sponsorCompany}
                </div>
              </div>
              <div className="bg-blue-600/20 px-2 landscape:px-2.5 md:px-3 py-0.5 landscape:py-1 rounded-lg border border-blue-500/30">
                <div className="text-blue-300 text-[10px] landscape:text-xs md:text-xs font-bold uppercase">
                  {t('level') || 'Level'} {selectedOffer.tier}
                </div>
              </div>
            </div>

            <div className="space-y-2 landscape:space-y-2.5 md:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-xs landscape:text-sm md:text-base">{t('annualPayment') || 'Annual Payment'}:</span>
                <span className="text-white font-bold text-sm landscape:text-base md:text-lg">{formatMoney(selectedOffer.annualPayment)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-xs landscape:text-sm md:text-base">{t('contractDuration') || 'Contract Duration'}:</span>
                <span className="text-white font-bold text-xs landscape:text-sm md:text-base">{selectedOffer.contractDuration} {t('years') || 'years'}</span>
              </div>
              <div className="border-t border-white/10 pt-2 landscape:pt-2.5 md:pt-3 mt-2 landscape:mt-2.5 md:mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-bold text-xs landscape:text-sm md:text-base">{t('totalContractValue') || 'Total Contract Value'}:</span>
                  <span className="text-emerald-400 font-black text-sm landscape:text-lg md:text-xl">{formatMoney(totalContractValue)}</span>
                </div>
              </div>
            </div>

            {/* Existing Sponsorship Warning */}
            {existingSponsorship && (
              <div className={`border rounded-lg landscape:rounded-xl p-2 landscape:p-3 md:p-4 mt-2 landscape:mt-3 md:mt-4 ${
                existingSponsorship.endWeek && currentWeek >= existingSponsorship.endWeek
                  ? 'bg-emerald-600/10 border-emerald-500/20'
                  : 'bg-yellow-600/10 border-yellow-500/20'
              }`}>
                <div className={`text-[10px] landscape:text-xs md:text-xs uppercase tracking-widest font-bold mb-1 landscape:mb-1.5 md:mb-2 ${
                  existingSponsorship.endWeek && currentWeek >= existingSponsorship.endWeek
                    ? 'text-emerald-400'
                    : 'text-yellow-400'
                }`}>
                  {t('currentSponsor') || 'Current Sponsor'}
                </div>
                <div className="text-zinc-300 text-xs landscape:text-sm md:text-sm mb-1 landscape:mb-1.5 md:mb-2">
                  {existingSponsorship.sponsorCompany} - {formatMoney(existingSponsorship.annualPayment)}/{t('year') || 'year'}
                </div>
                {existingSponsorship.endWeek && currentWeek < existingSponsorship.endWeek && (
                  <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2 landscape:p-2.5 md:p-3">
                    <div className="text-red-300 text-[10px] landscape:text-xs md:text-xs font-bold mb-0.5 landscape:mb-1">
                      {t('terminationFee') || 'Termination Fee Required'}
                    </div>
                    <div className="text-red-400 text-xs landscape:text-sm md:text-sm font-bold">
                      {formatMoney(terminationFee)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 landscape:gap-3 md:gap-4">
          <button
            onClick={onClose}
            className="px-3 landscape:px-4 md:px-6 py-1.5 landscape:py-2 md:py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs landscape:text-sm md:text-base rounded-lg landscape:rounded-xl transition-all"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={() => onAccept(selectedOffer)}
            disabled={!canAfford}
            className="flex-1 px-3 landscape:px-4 md:px-6 py-1.5 landscape:py-2 md:py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-black text-xs landscape:text-sm md:text-base rounded-lg landscape:rounded-xl transition-all"
          >
            {existingSponsorship && terminationFee > 0
              ? `${t('acceptAndTerminate') || 'Accept & Pay'} ${formatMoney(terminationFee)}`
              : (t('acceptOffer') || 'Accept Offer')}
          </button>
        </div>
      </div>
    </div>
  );
};

