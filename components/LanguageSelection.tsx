import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSelectionProps {
  onLanguageSelected: () => void;
}

export const LanguageSelection: React.FC<LanguageSelectionProps> = ({ onLanguageSelected }) => {
  const { setLanguage, t } = useLanguage();

  const handleLanguageSelect = (lang: 'en' | 'tr') => {
    setLanguage(lang);
    onLanguageSelected();
  };

  return (
    <div className="h-screen w-full bg-zinc-950 relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>
      
      <div className="z-10 flex flex-col items-center gap-8 p-8 max-w-2xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-4">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-yellow-400 to-emerald-400 mb-4">
            {t('selectLanguage')}
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl">Please select your preferred language</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md">
          <button
            onClick={() => handleLanguageSelect('en')}
            className="group relative p-8 rounded-2xl border-2 border-zinc-700 bg-zinc-900/50 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all hover:scale-105"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🇬🇧</div>
              <div className="text-2xl font-black text-white mb-2 group-hover:text-emerald-400 transition-colors">
                {t('english')}
              </div>
              <div className="text-zinc-500 text-sm">English</div>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors"></div>
          </button>
          
          <button
            onClick={() => handleLanguageSelect('tr')}
            className="group relative p-8 rounded-2xl border-2 border-zinc-700 bg-zinc-900/50 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all hover:scale-105"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🇹🇷</div>
              <div className="text-2xl font-black text-white mb-2 group-hover:text-emerald-400 transition-colors">
                {t('turkish')}
              </div>
              <div className="text-zinc-500 text-sm">Türkçe</div>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

