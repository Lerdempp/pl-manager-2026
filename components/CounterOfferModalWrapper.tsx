import React from 'react';
import { Player, TransferOffer } from '../types';
import { CounterOfferModal } from './CounterOfferModal';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/formatting';

interface CounterOfferModalWrapperProps {
  offer: TransferOffer;
  player: Player;
  language: 'en' | 'tr';
  onCounter: (fee: number) => void;
  onClose: () => void;
}

export const CounterOfferModalWrapper: React.FC<CounterOfferModalWrapperProps> = ({
  offer,
  player,
  language,
  onCounter,
  onClose
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-black text-white mb-2">{t('counterOfferTitle')}</h2>
        <div className="mb-6 space-y-3">
          <div>
            <div className="text-zinc-400 text-sm">{t('team')}</div>
            <div className="text-white font-bold text-lg">{offer.teamName}</div>
          </div>
          <div>
            <div className="text-zinc-400 text-sm">{t('currentOffer')}</div>
            <div className="text-emerald-400 font-mono font-bold">
              {formatCurrency(offer.fee, language)}
            </div>
          </div>
          {offer.negotiationRound !== undefined && offer.negotiationRound > 0 && (
            <div>
              <div className="text-zinc-400 text-sm">{t('negotiationRound')}</div>
              <div className="text-blue-400 text-sm">{offer.negotiationRound} / 3</div>
            </div>
          )}
        </div>
        <CounterOfferModal
          offer={offer}
          player={player}
          onCounter={onCounter}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

