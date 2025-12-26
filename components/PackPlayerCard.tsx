import React, { useEffect, useState } from 'react';
import { Player, Position, PlayerAttributes } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getTraitName, getTraitDescription, getTraitRarity, TraitRarity } from '../services/playerTraits';
import { isLegendaryPlayer } from '../services/legendaryPlayers';

interface PackPlayerCardProps {
  player: Player;
  className?: string;
  previousRating?: number;
  previousAttributes?: PlayerAttributes;
  delayAnimation?: boolean;
}

// Helper for counting animation
const AnimatedNumber = ({ value, startValue, className, trigger }: { value: number, startValue: number, className?: string, trigger: boolean }) => {
    const [display, setDisplay] = useState(startValue);

    useEffect(() => {
        if (!trigger) return;
        
        let startTimestamp: number | null = null;
        const duration = 1000;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            
            const current = Math.floor(startValue + (value - startValue) * ease);
            setDisplay(current);
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [value, startValue, trigger]);

    return <span className={className}>{display}</span>;
};

export const PackPlayerCard: React.FC<PackPlayerCardProps> = ({ 
    player, 
    className = '', 
    previousRating, 
    previousAttributes,
    delayAnimation = false
}) => {
  const { translatePosition, t } = useLanguage();
  const [startAnim, setStartAnim] = useState(false);

  useEffect(() => {
      if (delayAnimation) {
          const t = setTimeout(() => setStartAnim(true), 100);
          return () => clearTimeout(t);
      } else {
          setStartAnim(true);
      }
  }, [delayAnimation]);

  // Pastel color palettes for legendary players (93+)
  const getLegendaryStyle = (playerId: string, rating: number) => {
    // Use player ID hash to consistently assign colors
    const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % 8;
    
    const pastelPalettes = [
      'bg-gradient-to-br from-pink-200 via-rose-300 to-fuchsia-300 border-pink-400 text-pink-900 shadow-pink-500/50 ring-1 ring-pink-400/50', // Soft Pink
      'bg-gradient-to-br from-amber-200 via-yellow-300 to-orange-300 border-amber-400 text-amber-900 shadow-amber-500/50 ring-1 ring-amber-400/50', // Warm Amber
      'bg-gradient-to-br from-sky-200 via-cyan-300 to-teal-300 border-cyan-400 text-cyan-900 shadow-cyan-500/50 ring-1 ring-cyan-400/50', // Sky Blue
      'bg-gradient-to-br from-orange-200 via-orange-300 to-amber-300 border-orange-400 text-orange-900 shadow-orange-500/50 ring-1 ring-orange-400/50', // Peach
      'bg-gradient-to-br from-emerald-200 via-emerald-300 to-green-300 border-emerald-400 text-emerald-900 shadow-emerald-500/50 ring-1 ring-emerald-400/50', // Mint
      'bg-gradient-to-br from-blue-200 via-blue-300 to-indigo-300 border-blue-400 text-blue-900 shadow-blue-500/50 ring-1 ring-blue-400/50', // Soft Blue
      'bg-gradient-to-br from-rose-200 via-pink-300 to-rose-400 border-rose-400 text-rose-900 shadow-rose-500/50 ring-1 ring-rose-400/50', // Rose
      'bg-gradient-to-br from-fuchsia-200 via-pink-300 to-rose-300 border-fuchsia-400 text-fuchsia-900 shadow-fuchsia-500/50 ring-1 ring-fuchsia-400/50', // Fuchsia
    ];
    
    return pastelPalettes[colorIndex];
  };

  // Determine card style based on rating and legendary status
  const getCardStyle = (rating: number, playerId: string, playerName: string) => {
    // Check if player is in legendary list (from legendaryPlayers.ts)
    if (isLegendaryPlayer(playerName)) {
      return getLegendaryStyle(playerId, rating); // Legendary - Pastel colors
    }
    if (rating >= 93) return getLegendaryStyle(playerId, rating); // Rating-based legendary - Pastel colors
    if (rating >= 90) return "bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 border-blue-400 text-blue-50 shadow-blue-900/50 ring-1 ring-blue-400/50"; // TOTY/High
    if (rating >= 85) return "bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 border-purple-400 text-white shadow-purple-900/50 ring-1 ring-purple-400/50"; // Special
    if (rating >= 75) return "bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 border-yellow-300 text-yellow-50 shadow-yellow-600/50 ring-1 ring-yellow-400/50"; // Gold
    if (rating >= 65) return "bg-gradient-to-br from-zinc-400 via-zinc-300 to-zinc-500 border-zinc-200 text-zinc-900 shadow-zinc-500/50"; // Silver
    return "bg-gradient-to-br from-orange-700 via-orange-600 to-orange-800 border-orange-400 text-orange-100 shadow-orange-700/50"; // Bronze
  };

  const cardStyle = getCardStyle(player.rating, player.id, player.name);
  const isGoldOrSilver = player.rating >= 65 && player.rating < 85;
  const isLegendary = isLegendaryPlayer(player.name) || player.rating >= 93;
  const textColorClass = isLegendary ? 'text-gray-900' : (isGoldOrSilver ? 'text-zinc-900' : 'text-white');
  const labelColorClass = isLegendary ? 'text-gray-800/70' : (isGoldOrSilver ? 'text-zinc-800/70' : 'text-white/70');

  const attrs = player.attributes || { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70 };

  const isGK = player.position === Position.GK;
  const labels = isGK 
    ? { s1: t('div'), s2: t('han'), s3: t('kic'), s4: t('ref'), s5: t('spd'), s6: t('gkPos') }
    : { s1: t('pac'), s2: t('sho'), s3: t('pas'), s4: t('dri'), s5: t('def'), s6: t('phy') };

  const renderStat = (label: string, key: keyof PlayerAttributes) => {
      const currentVal = attrs[key];
      const prevVal = previousAttributes ? previousAttributes[key] : currentVal;
      const diff = currentVal - prevVal;
      
      const isImproved = diff > 0;
      const isDeclined = diff < 0;
      
      let valColor = '';
      if (previousAttributes && startAnim) {
          if (isImproved) valColor = 'text-emerald-400 font-black scale-110 transition-all duration-500';
          if (isDeclined) valColor = 'text-rose-500 font-black scale-110 transition-all duration-500';
      }

      return (
          <div className="flex justify-between items-center relative">
             <span className={`text-[8px] landscape:text-[9px] md:text-xs font-medium ${labelColorClass}`}>{label}</span> 
             <div className="flex items-center gap-0.5 landscape:gap-1">
                 <span className={`text-xs landscape:text-sm md:text-lg transition-colors ${valColor}`}>
                    <AnimatedNumber value={currentVal} startValue={prevVal} trigger={startAnim} />
                 </span>
                 {previousAttributes && diff !== 0 && startAnim && (
                     <span className={`text-[7px] landscape:text-[8px] md:text-[10px] font-black absolute -right-3 landscape:-right-4 top-0 animate-in fade-in zoom-in duration-500 ${isImproved ? 'text-emerald-400' : 'text-rose-500'}`}>
                         {isImproved ? '+' : ''}{diff}
                     </span>
                 )}
             </div>
          </div>
      );
  };

  const ratingDiff = previousRating ? player.rating - previousRating : 0;

  return (
    <div className={`relative w-40 h-[209px] landscape:w-48 landscape:h-[257px] md:w-64 md:h-[353px] rounded-xl border shadow-2xl overflow-visible flex flex-col p-2 landscape:p-3 md:p-4 select-none transition-transform hover:scale-105 ${cardStyle} ${className}`}>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 0%, currentColor 100%)' }}></div>
      
      {/* Abstract Shine */}
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none mix-blend-overlay"></div>

      {/* Header Badge */}
      <div className="flex justify-between items-center relative z-10 mb-1 landscape:mb-2 md:mb-6">
          <div className={`flex items-center gap-1 landscape:gap-1.5 md:gap-2 px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1 rounded landscape:rounded-lg backdrop-blur-sm border border-current/20 ${isGoldOrSilver ? 'bg-black/5' : 'bg-white/10'}`}>
             <div className="flex items-start">
                <span className={`text-base landscape:text-lg md:text-3xl font-black leading-none tracking-tighter ${textColorClass}`}>
                   <AnimatedNumber value={player.rating} startValue={previousRating || player.rating} trigger={startAnim} />
                </span>
                {ratingDiff !== 0 && startAnim && (
                   <span className={`text-[8px] landscape:text-[9px] md:text-xs font-bold ml-0.5 landscape:ml-1 ${ratingDiff > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {ratingDiff > 0 ? '+' : ''}{ratingDiff}
                   </span>
                )}
             </div>
             <div className="h-3 landscape:h-4 md:h-6 w-px bg-current opacity-30"></div>
             <span className={`text-[9px] landscape:text-[10px] md:text-sm font-bold uppercase tracking-wider ${textColorClass} opacity-90`}>{translatePosition(player.position)}</span>
          </div>
          {/* Age Pill */}
          <div className={`text-[8px] landscape:text-[9px] md:text-xs font-mono font-bold opacity-60 ${textColorClass}`}>
             {t('age')} {player.age}
          </div>
      </div>
      
      {/* Injury/Illness Status */}
      {(player.injury || player.illness || (player.suspensionGames && player.suspensionGames > 0)) ? (
          <div className="relative z-10 mb-1 landscape:mb-2 md:mb-4 flex flex-wrap gap-1 landscape:gap-1.5 md:gap-2 justify-center">
              {player.injury ? (
                  <div className="px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1.5 bg-red-500/20 border border-red-500/30 rounded landscape:rounded-lg">
                      <div className="text-[7px] landscape:text-[8px] md:text-[10px] font-bold text-red-400 uppercase tracking-wider">🏥 {t('injured')}</div>
                      <div className="text-[6px] landscape:text-[7px] md:text-[9px] text-red-300 mt-0.5">{player.injury.type}</div>
                      <div className="text-[6px] landscape:text-[7px] md:text-[9px] text-red-400/80 mt-0.5">{player.injury.weeksOut} {player.injury.weeksOut > 1 ? t('weeksOut') : t('weekOut')}</div>
                  </div>
              ) : null}
              {player.illness ? (
                  <div className="px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1.5 bg-orange-500/20 border border-orange-500/30 rounded landscape:rounded-lg">
                      <div className="text-[7px] landscape:text-[8px] md:text-[10px] font-bold text-orange-400 uppercase tracking-wider">🤒 {t('ill')}</div>
                      <div className="text-[6px] landscape:text-[7px] md:text-[9px] text-orange-300 mt-0.5">{player.illness.type}</div>
                      <div className="text-[6px] landscape:text-[7px] md:text-[9px] text-orange-400/80 mt-0.5">{player.illness.weeksOut} {player.illness.weeksOut > 1 ? t('weeksOut') : t('weekOut')}</div>
                  </div>
              ) : null}
              {player.suspensionGames && player.suspensionGames > 0 ? (
                  <div className="px-1.5 landscape:px-2 md:px-3 py-0.5 landscape:py-1 md:py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded landscape:rounded-lg">
                      <div className="text-[7px] landscape:text-[8px] md:text-[10px] font-bold text-yellow-400 uppercase tracking-wider">⚠️ {t('suspended')}</div>
                      <div className="text-[6px] landscape:text-[7px] md:text-[9px] text-yellow-400/80 mt-0.5">{player.suspensionGames} {player.suspensionGames > 1 ? t('games') : t('game')}</div>
                  </div>
              ) : null}
          </div>
      ) : null}

      {/* Name - Centered and Large */}
      <div className={`flex-1 flex items-center justify-center relative z-10 mb-1 landscape:mb-2 md:mb-6`}>
         <h2 className={`text-base landscape:text-lg md:text-3xl font-black uppercase tracking-tight text-center leading-none drop-shadow-md ${textColorClass}`}>
            {player.name || ''}
         </h2>
      </div>

      {/* Stats Grid - Clean & Centered */}
      <div className={`grid grid-cols-2 gap-x-1.5 landscape:gap-x-2 md:gap-x-6 gap-y-1 landscape:gap-y-1.5 md:gap-y-4 px-1 landscape:px-2 md:px-4 relative z-10 text-[9px] landscape:text-[10px] md:text-base font-bold ${textColorClass} mt-auto bg-black/5 rounded landscape:rounded-lg py-2 landscape:py-2.5 md:py-6 backdrop-blur-sm border border-white/5 min-h-[48%]`}>
         {renderStat(labels.s1, 'pace')}
         {renderStat(labels.s4, 'dribbling')}
         {renderStat(labels.s2, 'shooting')}
         {renderStat(labels.s5, 'defending')}
         {renderStat(labels.s3, 'passing')}
         {renderStat(labels.s6, 'physical')}
      </div>

      {/* Traits */}
      {player.traits && player.traits.length > 0 && (
        <div className="relative z-10 mt-1 landscape:mt-2 md:mt-4 flex flex-wrap gap-1 landscape:gap-1.5 md:gap-2 justify-center">
          {player.traits.map((traitId) => {
            const rarity = getTraitRarity(traitId);
            const rarityColors = {
              common: 'bg-zinc-700/50 border-zinc-500/50 text-zinc-200',
              rare: 'bg-blue-700/50 border-blue-500/50 text-blue-200',
              epic: 'bg-purple-700/50 border-purple-500/50 text-purple-200',
            };
            const [showTooltip, setShowTooltip] = useState(false);
            
            return (
              <div key={traitId} className="relative z-[9999]">
                <button
                  onClick={() => setShowTooltip(!showTooltip)}
                  className={`px-1 landscape:px-1.5 md:px-2 py-0.5 landscape:py-1 md:py-1 rounded landscape:rounded-lg text-[7px] landscape:text-[8px] md:text-[10px] font-bold border transition-all hover:scale-105 ${rarityColors[rarity || 'common']}`}
                >
                  {getTraitName(traitId)}
                </button>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 landscape:w-40 md:w-48 bg-zinc-900 border border-zinc-700 rounded-lg p-2 landscape:p-2.5 md:p-3 shadow-xl z-[9999] pointer-events-auto">
                    <div className="text-[9px] landscape:text-[10px] md:text-xs font-bold text-white mb-1">{getTraitName(traitId)}</div>
                    <div className="text-[8px] landscape:text-[9px] md:text-[10px] text-zinc-300">{getTraitDescription(traitId)}</div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-700"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

