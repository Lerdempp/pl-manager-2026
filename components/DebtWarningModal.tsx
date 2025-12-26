import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface DebtWarningModalProps {
  onClose: () => void;
}

export const DebtWarningModal: React.FC<DebtWarningModalProps> = ({ onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-yellow-500/30 rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-black text-yellow-400 mb-2">{t('debtWarning')}</h2>
          <p className="text-zinc-400 text-lg">
            {t('debtWarningMessage')}
          </p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-300 text-sm">
            {t('debtClearedMessage')}
          </p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl transition-all"
          >
            {t('understood')}
          </button>
        </div>
      </div>
    </div>
  );
};

