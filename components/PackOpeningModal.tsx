import React, { useState, useMemo } from 'react';
import { Player, PlayerAttributes } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getRarityTier } from '../services/legendaryPlayers';
import { PackPlayerCard } from './PackPlayerCard';
import { CardReveal } from './CardReveal';

interface PackOpeningModalProps {
  player: Player;
  packName: string;
  packType: 'premium' | 'elite' | 'standard';
  onClose: () => void;
  onAddToTeam: () => void;
}

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({ 
  player, 
  packName,
  packType,
  onClose, 
  onAddToTeam 
}) => {
  const { t } = useLanguage();
  const [showCardReveal, setShowCardReveal] = useState(true);
  const [revealKey, setRevealKey] = useState(0);

  const getRarityColor = (rating: number) => {
    const tier = getRarityTier(rating);
    switch (tier) {
      case 'legendary': return 'from-yellow-600 via-orange-500 to-red-600';
      case 'epic': return 'from-purple-600 via-pink-500 to-purple-600';
      case 'rare': return 'from-blue-600 via-cyan-500 to-blue-600';
      case 'common': return 'from-green-600 via-emerald-500 to-green-600';
      default: return 'from-zinc-600 via-zinc-500 to-zinc-600';
    }
  };

  const getRarityLabel = (rating: number) => {
    const tier = getRarityTier(rating);
    switch (tier) {
      case 'legendary': return t('legendary') || 'LEGENDARY';
      case 'epic': return t('epic') || 'EPIC';
      case 'rare': return t('rare') || 'RARE';
      case 'common': return t('common') || 'COMMON';
      default: return t('common') || 'COMMON';
    }
  };

  // Map pack type to CardReveal rarity (video selection)
  const getCardRevealRarity = (): 'common' | 'gold' | 'legendary' => {
    switch (packType) {
      case 'premium': return 'legendary';
      case 'elite': return 'gold';
      case 'standard': return 'common';
      default: return 'common';
    }
  };

  // Calculate previous attributes for upgrade animation effect
  const previousRating = useMemo(() => {
    return Math.max(player.rating - 2, 1);
  }, [player.rating]);

  const previousAttributes: PlayerAttributes | undefined = useMemo(() => {
    if (!player.attributes) return undefined;
    
    return {
      pace: Math.max(player.attributes.pace - 3, 1),
      shooting: Math.max(player.attributes.shooting - 1, 1),
      passing: Math.max(player.attributes.passing - 2, 1),
      dribbling: Math.max(player.attributes.dribbling - 2, 1),
      defending: Math.max(player.attributes.defending || 0, 1),
      physical: Math.max(player.attributes.physical - 1, 1)
    };
  }, [player.attributes]);

  const handleRevealComplete = () => {
    setShowCardReveal(false);
  };

  const handleReset = () => {
    setShowCardReveal(true);
    setRevealKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
      {showCardReveal && (
        <div className="absolute inset-0 z-[101]">
          <CardReveal
            key={revealKey}
            cardContent={
              <PackPlayerCard 
                player={player}
                previousRating={previousRating}
                previousAttributes={previousAttributes}
                delayAnimation={true}
              />
            }
            rarity={getCardRevealRarity()}
            onRevealComplete={handleRevealComplete}
          />
        </div>
      )}

      {!showCardReveal && (
        <div className="flex flex-col items-center justify-center gap-2 landscape:gap-3 md:gap-6 animate-in fade-in duration-500">
          {/* Player Card */}
          <div className="flex justify-center">
            <PackPlayerCard player={player} />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-2 landscape:gap-3 md:gap-4">
            <button
              onClick={onAddToTeam}
              className="px-2.5 landscape:px-4 md:px-8 py-1.5 landscape:py-2.5 md:py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg landscape:rounded-xl md:rounded-xl text-xs landscape:text-sm md:text-lg transition-all shadow-lg"
            >
              {t('addToTeam') || 'Add to Team'}
            </button>
            <button
              onClick={onClose}
              className="px-2.5 landscape:px-4 md:px-8 py-1.5 landscape:py-2.5 md:py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg landscape:rounded-xl md:rounded-xl text-xs landscape:text-sm md:text-lg transition-all"
            >
              {t('close') || 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

