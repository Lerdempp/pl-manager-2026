import React from 'react';
import { GameState } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface GameOverModalProps {
  onBackToCareerSelect: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ onBackToCareerSelect }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="bg-zinc-900 border border-rose-500/30 rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">💀</div>
          <h2 className="text-4xl font-black text-rose-500 mb-2">{t('gameOver')}</h2>
          <p className="text-zinc-400 text-lg">
            {t('gameOverMessage')}
          </p>
        </div>
        <div className="bg-rose-900/20 border border-rose-500/30 rounded-xl p-4 mb-6">
          <p className="text-rose-300 text-sm">
            {t('gameOverDescription')}
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onBackToCareerSelect}
            className="px-8 py-3 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-xl transition-all"
          >
            {t('backToCareerSelect')}
          </button>
        </div>
      </div>
    </div>
  );
};

