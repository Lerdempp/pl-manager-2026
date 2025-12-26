import React, { useState } from 'react';
import { Team, Player, Position } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { drawLegendaryPlayer, players90plus, PACK_TYPES, PackType } from '../services/legendaryPlayers';
import { PackOpeningModal } from './PackOpeningModal';
import { Zap } from 'lucide-react';

interface ShopViewProps {
  team: Team;
  onBack: () => void;
  onPurchase?: (itemId: string, cost: number) => void;
  onAddPlayer?: (player: Player) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ team, onBack, onPurchase, onAddPlayer }) => {
  const { t } = useLanguage();
  const [selectedPack, setSelectedPack] = useState<PackType>('premium');
  const [drawnPlayer, setDrawnPlayer] = useState<Player | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const currentPack = PACK_TYPES[selectedPack];

  const convertLegendaryToPlayer = (legendary: typeof players90plus[0]): Player => {
    // Legendary players can have varying personalities
    // High-rated players tend to be more ambitious (want trophies) but also more greedy
    const greed = Math.floor(40 + Math.random() * 40); // 40-80, legendary players know their worth
    const ambition = Math.floor(60 + Math.random() * 40); // 60-100, legendary players want success
    
    return {
      id: `legendary-${legendary.name}-${Date.now()}`,
      name: legendary.name,
      position: legendary.pos,
      age: legendary.age,
      rating: legendary.rating,
      potential: legendary.potential,
      marketValue: legendary.value,
      trueValue: legendary.value,
      scouted: true,
      attributes: legendary.stats,
      contract: {
        wage: Math.floor(legendary.value * 0.0025),
        yearsLeft: 3,
        performanceBonus: Math.floor(legendary.value * 0.0025 * 0.1),
        releaseClause: Math.floor(legendary.value * 1.2)
      },
      personality: {
        greed,
        ambition
      }
    };
  };

  const handleGachaDraw = () => {
    // Premium pack requires tickets, others require money
    if (selectedPack === 'premium') {
      if ((team.premiumTickets || 0) < 1) {
        return;
      }
    } else {
      if (team.budget < currentPack.cost) {
        return;
      }
    }
    
    setIsDrawing(true);
    
    // Draw player immediately, excluding already opened players
    const excludePlayerNames = team.openedPackPlayers || [];
    const legendary = drawLegendaryPlayer(selectedPack, excludePlayerNames);
    const player = convertLegendaryToPlayer(legendary);
    setDrawnPlayer(player);
    
    // Deduct cost or ticket
    if (onPurchase) {
      if (selectedPack === 'premium') {
        onPurchase('premium_ticket', 0);
      } else {
        onPurchase('gacha_draw', currentPack.cost);
      }
    }
    
    // Show modal after short delay
    setTimeout(() => {
      setIsDrawing(false);
      setShowPackModal(true);
    }, 500);
  };

  const handleAddToTeam = () => {
    if (drawnPlayer && onAddPlayer) {
      // Create a copy of the player to ensure it's passed correctly
      const playerToAdd = { ...drawnPlayer };
      onAddPlayer(playerToAdd);
      setShowPackModal(false);
      // Clear drawn player after modal closes
      setTimeout(() => {
        setDrawnPlayer(null);
      }, 100);
    } else {
      console.error('Cannot add player: drawnPlayer or onAddPlayer is missing', { drawnPlayer, onAddPlayer });
    }
  };

  const handleCloseModal = () => {
    setShowPackModal(false);
    setDrawnPlayer(null);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-2 landscape:p-3 md:p-8 gap-2 landscape:gap-4 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col landscape:flex-row justify-between items-start landscape:items-center flex-shrink-0 gap-1 landscape:gap-2">
        <div>
          <h1 className="text-base landscape:text-lg md:text-5xl font-black text-white mb-0.5 landscape:mb-1">{t('legendaryPlayers') || 'Legendary Players'}</h1>
          <p className="text-zinc-400 text-[10px] landscape:text-xs md:text-base">{t('legendaryPackDesc') || 'Draw a legendary player (90+ rating)'}</p>
        </div>
        <div className="flex items-center gap-1.5 landscape:gap-2">
          {/* Premium Tickets Counter */}
          <div 
            className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded landscape:rounded-md md:rounded-lg px-1.5 landscape:px-2 md:px-3 py-1 landscape:py-1.5 md:py-2 border border-zinc-700/50 flex items-center gap-1 landscape:gap-1.5 md:gap-2 shadow-lg cursor-pointer hover:bg-zinc-700/90 transition-colors relative"
            onClick={() => {
              if ((team.premiumTickets || 0) < 1) {
                alert(t('winTrophiesToEarnTickets') || 'Kupa kazanarak bilet kazan');
              }
            }}
          >
            <div className="relative">
              <div className="text-xs landscape:text-sm md:text-xl">🎫</div>
            </div>
            <div className="text-[10px] landscape:text-xs md:text-lg font-black text-white drop-shadow-md font-mono">
              {team.premiumTickets || 0}
            </div>
          </div>
          
          {/* Budget Counter */}
          <div className="bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 rounded landscape:rounded-md md:rounded-lg px-1.5 landscape:px-2 md:px-3 py-1 landscape:py-1.5 md:py-2 border border-zinc-700/50 flex items-center gap-1 landscape:gap-1.5 md:gap-2 shadow-lg">
            <div className="relative">
              <div className="text-xs landscape:text-sm md:text-xl">💰</div>
            </div>
            <div className="text-[10px] landscape:text-xs md:text-lg font-black text-white drop-shadow-md font-mono">
              {formatMoney(team.budget)}
            </div>
          </div>
        </div>
      </div>

      {/* Pack Selection - 3 Packs Side by Side */}
      <div className="flex flex-col items-center gap-2 landscape:gap-4 md:gap-8">
        <div className="flex flex-wrap justify-center gap-2 landscape:gap-4 md:gap-6">
          {(Object.keys(PACK_TYPES) as PackType[]).map((packType) => {
            const pack = PACK_TYPES[packType];
            const isSelected = selectedPack === packType;
            
            const packConfig = {
              premium: {
                packGradient: 'from-amber-500 via-orange-600 to-red-700',
                shadowColor: 'shadow-orange-500/50',
              },
              elite: {
                packGradient: 'from-purple-500 via-indigo-600 to-blue-700',
                shadowColor: 'shadow-purple-500/50',
              },
              standard: {
                packGradient: 'from-emerald-500 via-teal-600 to-cyan-700',
                shadowColor: 'shadow-emerald-500/50',
              }
            }[packType];
            
            const getPackName = (type: PackType) => {
              switch (type) {
                case 'premium': return t('premiumPack') || 'Premium Pack';
                case 'elite': return t('elitePack') || 'Elite Pack';
                case 'standard': return t('standardPack') || 'Standard Pack';
              }
            };
            
            return (
              <div key={packType} className="flex flex-col items-center gap-2 landscape:gap-3 md:gap-4">
                <button
                  onClick={() => setSelectedPack(packType)}
                  className={`relative transition-all duration-300 ${
                    isSelected ? 'scale-105' : 'hover:scale-105'
                  }`}
                >
                  {/* Pack Visual - Same as CardReveal */}
                  <div className={`
                    relative w-32 h-48 landscape:w-40 landscape:h-56 md:w-56 md:h-80 rounded-lg landscape:rounded-xl md:rounded-xl transition-transform duration-500
                    ${isSelected ? 'animate-float' : ''}
                  `}>
                    <div className={`
                      absolute inset-0 rounded-lg landscape:rounded-xl md:rounded-xl bg-gradient-to-br ${packConfig.packGradient} 
                      shadow-2xl ${packConfig.shadowColor} border-2 border-white/30
                      flex flex-col items-center justify-between overflow-hidden p-2 landscape:p-3 md:p-4
                    `}>
                      {/* Texture */}
                      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.5),transparent)]" />
                      
                      {/* Top: Pack Name and Rating */}
                      <div className="relative z-10 w-full text-center">
                        <div className="text-xs landscape:text-sm md:text-base font-black text-white mb-0.5 landscape:mb-1 drop-shadow-lg">
                          {getPackName(packType)}
                        </div>
                        <div className="text-[10px] landscape:text-xs md:text-xs text-white/90 drop-shadow-md">
                          Rating: {pack.minRating}+
                        </div>
                      </div>
                      
                      {/* Center Seal */}
                      <div className="relative z-10 w-12 h-12 landscape:w-16 landscape:h-16 md:w-20 md:h-20 rounded-full bg-black/20 backdrop-blur-sm border border-white/40 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-6 h-6 landscape:w-8 landscape:h-8 md:w-10 md:h-10 text-white" />
                      </div>
                      
                      {/* Bottom: Price and Click Text */}
                      <div className="relative z-10 w-full text-center space-y-1 landscape:space-y-1.5 md:space-y-2">
                        <div className={`text-xs landscape:text-sm md:text-lg font-black ${packType === 'premium' ? 'text-yellow-300' : 'text-emerald-300'} drop-shadow-lg`}>
                          {packType === 'premium' 
                            ? `🎫 1 ${t('ticket') || 'Ticket'}`
                            : formatMoney(pack.cost)
                          }
                        </div>
                        <div className="text-[9px] landscape:text-[10px] md:text-xs text-white/80 font-black tracking-widest drop-shadow-md">
                          {t('clickToPurchase')}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Draw Button Section */}
      <div className="flex flex-col items-center gap-2 landscape:gap-4 md:gap-6 -mt-1 landscape:-mt-1 md:mt-4">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-float { animation: float 3s ease-in-out infinite; }
        `}</style>

        {/* Draw Button */}
        <button
          onClick={handleGachaDraw}
          disabled={
            (selectedPack === 'premium' ? (team.premiumTickets || 0) < 1 : team.budget < currentPack.cost) || isDrawing
          }
          className={`px-6 landscape:px-8 md:px-12 py-2 landscape:py-3 md:py-4 rounded-lg landscape:rounded-xl md:rounded-xl font-black text-xs landscape:text-sm md:text-lg transition-all ${
            (selectedPack === 'premium' ? (team.premiumTickets || 0) >= 1 : team.budget >= currentPack.cost) && !isDrawing
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg shadow-yellow-500/50'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isDrawing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚽</span>
              {t('drawing') || 'Drawing...'}
            </span>
          ) : (
            <>
              {t('drawPlayer') || 'Draw Player'} - {
                selectedPack === 'premium' 
                  ? `🎫 1 ${t('ticket') || 'Ticket'}`
                  : formatMoney(currentPack.cost)
              }
            </>
          )}
        </button>
        
        {selectedPack !== 'premium' && team.budget < currentPack.cost && (
          <p className="text-rose-400 text-sm">{t('insufficientFunds') || 'Insufficient funds!'}</p>
        )}
      </div>

      {/* Pack Opening Modal */}
      {showPackModal && drawnPlayer && (
        <PackOpeningModal
          player={drawnPlayer}
          packName={
            selectedPack === 'premium' ? (t('premiumPack') || 'Premium Pack') :
            selectedPack === 'elite' ? (t('elitePack') || 'Elite Pack') :
            (t('standardPack') || 'Standard Pack')
          }
          packType={selectedPack}
          onClose={handleCloseModal}
          onAddToTeam={handleAddToTeam}
        />
      )}
    </div>
  );
};

