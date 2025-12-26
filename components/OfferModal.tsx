import React from 'react';
import { Player, TransferOffer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface OfferModalProps {
  offer: TransferOffer;
  player: Player;
  formatCurrency: (value: number) => string;
  formatOfferRoundLabel: (round: number) => string;
  formatHistoryNote: (note?: string) => string;
  onAccept: (offer: TransferOffer, player: Player) => void;
  onReject: (offer: TransferOffer, player: Player) => void;
  onNegotiate: () => void;
  onClose: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  offer,
  player,
  formatCurrency,
  formatOfferRoundLabel,
  formatHistoryNote,
  onAccept,
  onReject,
  onNegotiate,
  onClose
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-black text-white mb-2">
          {offer.type === 'TRANSFER' ? t('transferOfferTitle') : t('loanOfferTitle')}
        </h2>
        <div className="mb-6 space-y-3">
          <div>
            <div className="text-zinc-400 text-sm">{t('from')}</div>
            <div className="text-white font-bold text-lg">{offer.teamName}</div>
          </div>
          <div>
            <div className="text-zinc-400 text-sm">{t('player')}</div>
            <div className="text-white font-bold">{player.name}</div>
          </div>
          <div>
            <div className="text-zinc-400 text-sm">{offer.type === 'TRANSFER' ? t('transferFee') : t('loanFee')}</div>
            <div className="text-emerald-400 font-mono font-bold">
              {formatCurrency(offer.fee)}
            </div>
          </div>
          {offer.expiryWeek && (
            <div>
              <div className="text-zinc-400 text-sm">{t('expires')}</div>
              <div className="text-yellow-400 text-sm">{t('week')} {offer.expiryWeek}</div>
            </div>
          )}
          {offer.negotiationRound !== undefined && offer.negotiationRound > 0 && (
            <div>
              <div className="text-zinc-400 text-sm">{t('negotiationRound')}</div>
              <div className="text-blue-400 text-sm">{offer.negotiationRound} / 3</div>
            </div>
          )}
          {offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
            <div className="mt-2 bg-white/5 rounded-lg p-3 border border-white/10 max-h-48 overflow-y-auto">
              <div className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-2">{t('offerHistory')}</div>
              <div className="space-y-2">
                {offer.negotiationHistory.map((entry, idx) => {
                  const noteText = formatHistoryNote(entry.note);
                  return (
                    <div key={`${entry.timestamp}-${idx}`} className="flex items-start justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">
                          {formatOfferRoundLabel(entry.round)}
                        </span>
                        <span className="text-zinc-500 text-xs">
                          {entry.from === 'USER' ? t('you') : offer.teamName}
                          {noteText ? ` • ${noteText}` : ''}
                        </span>
                      </div>
                      <div className={`font-mono font-bold ${entry.from === 'USER' ? 'text-emerald-300' : 'text-blue-300'}`}>
                        {formatCurrency(entry.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {offer.waitingForResponse && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-3">
              <div className="text-blue-400 text-sm font-bold">{t('waitingForResponse')}</div>
              <div className="text-blue-300/70 text-xs mt-1">{t('counterReviewNextWeek')}</div>
            </div>
          )}
        </div>
        {!offer.waitingForResponse ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <button
                onClick={() => onReject(offer, player)}
                className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold rounded-xl border border-rose-500/30 transition-all"
              >
                {t('reject')}
              </button>
              {offer.negotiationRound !== undefined && offer.negotiationRound < 3 && (
                <button
                  onClick={onNegotiate}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all"
                >
                  {t('negotiate')}
                </button>
              )}
              <button
                onClick={() => onAccept(offer, player)}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl shadow-lg transition-all"
              >
                {t('accept')}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold rounded-xl transition-all"
            >
              {t('later')}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold rounded-xl transition-all"
          >
            {t('close')}
          </button>
        )}
      </div>
    </div>
  );
};

