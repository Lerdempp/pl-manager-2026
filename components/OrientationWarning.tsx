import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const OrientationWarning: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-8 animate-pulse">
          <svg 
            className="w-24 h-24 mx-auto text-emerald-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
          {t('rotateDevice') || 'Rotate Your Device'}
        </h1>
        <p className="text-zinc-400 text-lg mb-2">
          {t('rotateDeviceMessage') || 'Please rotate your device to landscape mode to play the game.'}
        </p>
        <p className="text-zinc-500 text-sm">
          {t('rotateDeviceSubmessage') || 'The game requires a horizontal screen orientation.'}
        </p>
      </div>
    </div>
  );
};

