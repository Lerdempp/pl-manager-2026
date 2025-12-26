import React from 'react';
import { Team, StadiumSponsorOffer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StadiumSponsorModalProps {
  team: Team;
  offer: StadiumSponsorOffer;
  onAccept: () => void;
  onReject: () => void;
  currentWeek: number;
}

export const StadiumSponsorModal: React.FC<StadiumSponsorModalProps> = ({
  team,
  offer,
  onAccept,
  onReject,
  currentWeek,
}) => {
  const { t } = useLanguage();

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const weeksUntilExpiry = offer.expiryWeek - currentWeek;
  const isExpired = weeksUntilExpiry <= 0;

  // Calculate total contract value
  const totalContractValue = offer.annualPayment * offer.contractDuration;

  // Get tier name
  const tierNames = [
    '', // 0-indexed
    t('tierLocalRegional'),
    t('tierNational'),
    t('tierMajorNational'),
    t('tierInternational'),
    t('tierPremiumInternational'),
    t('tierWorldClass'),
  ];
  const tierName = tierNames[offer.tier] || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-2">
            {t('stadiumSponsorOffer') || 'Stadium Naming Rights Offer'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {t('sponsorOfferDescription') || `${offer.sponsorCompany} is interested in sponsoring your stadium.`}
          </p>
        </div>

        {isExpired && (
          <div className="mb-4 p-4 bg-red-600/20 border border-red-500/30 rounded-xl">
            <p className="text-red-300 font-bold text-sm">
              {t('offerExpired') || 'This offer has expired.'}
            </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Sponsor Info */}
          <div className="bg-zinc-800/50 border border-white/5 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-1">
                  {t('sponsorCompany') || 'Sponsor Company'}
                </div>
                <div className="text-2xl font-black text-white mb-1">
                  {offer.sponsorCompany}
                </div>
                <div className="text-zinc-500 text-sm">
                  {t('proposedStadiumName') || 'Proposed Stadium Name'}: <span className="text-emerald-400 font-bold">{offer.sponsorName} {t('stadium') || 'Stadium'}</span>
                </div>
              </div>
              <div className="bg-blue-600/20 px-3 py-1 rounded-lg border border-blue-500/30">
                <div className="text-blue-300 text-xs font-bold uppercase">
                  {t('tier')} {offer.tier}
                </div>
                <div className="text-blue-400 text-xs">
                  {tierName}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div className="bg-zinc-800/50 border border-white/5 rounded-xl p-6">
            <div className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-4">
              {t('financialTerms') || 'Financial Terms'}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">{t('annualPayment') || 'Annual Payment'}:</span>
                <span className="text-white font-bold text-lg">{formatMoney(offer.annualPayment)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">{t('contractDuration') || 'Contract Duration'}:</span>
                <span className="text-white font-bold">{offer.contractDuration} {t('years') || 'years'}</span>
              </div>
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-bold">{t('totalContractValue') || 'Total Contract Value'}:</span>
                  <span className="text-emerald-400 font-black text-xl">{formatMoney(totalContractValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Stadium Info */}
          {team.stadiumNameSponsor && (() => {
            const currentSponsor = team.stadiumNameSponsor;
            const isContractExpired = currentSponsor.endWeek && currentWeek >= currentSponsor.endWeek;
            const weeksRemaining = currentSponsor.endWeek ? Math.max(0, currentSponsor.endWeek - currentWeek) : 0;
            const yearsRemaining = currentSponsor.endWeek ? Math.ceil(weeksRemaining / 38) : 0;
            
            // Calculate termination fee (remaining contract value)
            const remainingValue = isContractExpired ? 0 : Math.floor(
              (weeksRemaining / 38) * currentSponsor.annualPayment
            );
            
            return (
              <div className={`border rounded-xl p-4 ${
                isContractExpired 
                  ? 'bg-emerald-600/10 border-emerald-500/20' 
                  : 'bg-yellow-600/10 border-yellow-500/20'
              }`}>
                <div className={`text-xs uppercase tracking-widest font-bold mb-2 ${
                  isContractExpired ? 'text-emerald-400' : 'text-yellow-400'
                }`}>
                  {t('currentSponsor') || 'Current Stadium Sponsor'}
                </div>
                <div className="text-zinc-300 text-sm mb-2">
                  {currentSponsor.sponsorName} {t('stadium') || 'Stadium'} - {formatMoney(currentSponsor.annualPayment)}/{t('year') || 'year'}
                </div>
                {isContractExpired ? (
                  <div className="text-emerald-400 text-xs">
                    {t('contractExpired') || 'Contract has expired. You can accept a new sponsor without penalty.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-yellow-300 text-xs">
                      {t('contractActive') || 'Contract is still active.'}
                    </div>
                    <div className="text-zinc-500 text-xs">
                      {t('contractEndsIn') || 'Contract ends in'} {weeksRemaining} {t('weeks') || 'weeks'} ({yearsRemaining.toFixed(1)} {t('years') || 'years'})
                    </div>
                    <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-3 mt-2">
                      <div className="text-red-300 text-xs font-bold mb-1">
                        {t('terminationFee') || 'Termination Fee Required'}
                      </div>
                      <div className="text-red-400 text-sm font-bold">
                        {formatMoney(remainingValue)}
                      </div>
                      <div className="text-red-300 text-xs mt-1">
                        {t('terminationFeeDescription') || 'You must pay the remaining contract value to terminate early.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Expiry Info */}
          {!isExpired && (
            <div className="bg-zinc-800/30 border border-white/5 rounded-xl p-4">
              <div className="text-zinc-500 text-xs">
                {t('offerExpiresIn') || 'This offer expires in'} <span className="text-zinc-400 font-bold">{weeksUntilExpiry} {t('weeks') || 'weeks'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onReject}
            className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
          >
            {t('reject') || 'Reject Offer'}
          </button>
          <button
            onClick={onAccept}
            disabled={isExpired || (() => {
              if (!team.stadiumNameSponsor) return false;
              const currentSponsor = team.stadiumNameSponsor;
              const isContractExpired = currentSponsor.endWeek && currentWeek >= currentSponsor.endWeek;
              if (isContractExpired) return false;
              
              // Check if team has enough budget for termination fee
              const weeksRemaining = currentSponsor.endWeek ? Math.max(0, currentSponsor.endWeek - currentWeek) : 0;
              const remainingValue = Math.floor((weeksRemaining / 38) * currentSponsor.annualPayment);
              return team.budget < remainingValue;
            })()}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all"
          >
            {(() => {
              if (team.stadiumNameSponsor && !isExpired) {
                const currentSponsor = team.stadiumNameSponsor;
                const isContractExpired = currentSponsor.endWeek && currentWeek >= currentSponsor.endWeek;
                if (!isContractExpired) {
                  const weeksRemaining = currentSponsor.endWeek ? Math.max(0, currentSponsor.endWeek - currentWeek) : 0;
                  const remainingValue = Math.floor((weeksRemaining / 38) * currentSponsor.annualPayment);
                  const canAfford = team.budget >= remainingValue;
                  return canAfford 
                    ? (t('acceptAndTerminate') || `Accept & Pay ${formatMoney(remainingValue)}`)
                    : (t('insufficientBudget') || 'Insufficient Budget');
                }
              }
              return t('acceptOffer') || 'Accept Offer';
            })()}
          </button>
        </div>
      </div>
    </div>
  );
};

