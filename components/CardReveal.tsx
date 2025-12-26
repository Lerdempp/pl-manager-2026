import React, { useRef, useEffect, useState, ReactNode } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CardRevealProps {
  cardImage?: string;
  cardContent?: ReactNode;
  rarity: 'common' | 'gold' | 'legendary';
  onRevealComplete: () => void;
  onStart?: () => void;
}

export const CardReveal: React.FC<CardRevealProps> = ({
  cardImage,
  cardContent,
  rarity,
  onRevealComplete,
  onStart
}) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'idle' | 'charging' | 'exploding' | 'revealed' | 'interactive'>('idle');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Configuration based on rarity
  const config = {
    legendary: {
      packGradient: 'from-amber-500 via-orange-600 to-red-700',
      beamColor: 'text-amber-500',
      ringColor: 'border-amber-400',
      particleColors: ['#FFD700', '#FFA500', '#FF4500', '#FFFFFF'],
      shadowColor: 'shadow-orange-500/50',
    },
    gold: {
      packGradient: 'from-purple-500 via-indigo-600 to-blue-700',
      beamColor: 'text-purple-500',
      ringColor: 'border-purple-400',
      particleColors: ['#A855F7', '#EC4899', '#6366F1', '#FFFFFF'],
      shadowColor: 'shadow-purple-500/50',
    },
    common: {
      packGradient: 'from-emerald-500 via-teal-600 to-cyan-700',
      beamColor: 'text-emerald-500',
      ringColor: 'border-emerald-400',
      particleColors: ['#34D399', '#2DD4BF', '#FFFFFF'],
      shadowColor: 'shadow-emerald-500/50',
    }
  }[rarity];

  const startReveal = () => {
    if (phase !== 'idle') return;
    if (onStart) onStart();
    
    // 1. Charging Phase (Build up tension)
    setPhase('charging');
    // 2. Explosion Phase (The release)
    setTimeout(() => {
      setPhase('exploding');
    }, 2000);
    // 3. Reveal Phase (The slam)
    setTimeout(() => {
      setPhase('revealed');
    }, 2200);
    // 4. Interactive Phase (Cleanup and allow tilt)
    setTimeout(() => {
      setPhase('interactive');
      onRevealComplete();
    }, 3000);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== 'interactive' || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max 15 degrees)
    const rotateX = ((y - centerY) / centerY) * -15; 
    const rotateY = ((x - centerX) / centerX) * 15;
    setMousePosition({ x: rotateY, y: rotateX });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full perspective-1000 select-none flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      
      {/* --- PHASE 1: THE PACK --- */}
      {phase !== 'revealed' && phase !== 'interactive' && (
        <div 
          className={`relative z-30 cursor-pointer transition-all duration-300
            ${phase === 'exploding' ? 'scale-[2] opacity-0 duration-200 pointer-events-none' : 'scale-100 opacity-100'}
          `}
          onClick={startReveal}
        >
          {/* Shaking Wrapper */}
          <div className={`
            relative w-36 h-52 landscape:w-44 landscape:h-64 md:w-60 md:h-88 rounded-xl transition-transform duration-500
            ${phase === 'idle' ? 'animate-float' : ''}
            ${phase === 'charging' ? 'animate-violent-shake scale-90' : ''}
          `}>
            
            {/* The Pack Visual */}
            <div className={`
              absolute inset-0 rounded-xl bg-gradient-to-br ${config.packGradient} 
              shadow-2xl ${config.shadowColor} border-2 border-white/30
              flex flex-col items-center justify-center overflow-hidden
              ${phase === 'charging' ? 'brightness-125 saturate-150' : 'brightness-100'}
            `}>
              {/* Texture */}
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.5),transparent)]" />
              
              {/* Center Seal */}
              <div className={`
                relative z-10 w-12 h-12 landscape:w-14 landscape:h-14 md:w-20 md:h-20 rounded-full bg-black/20 backdrop-blur-sm border border-white/40
                flex items-center justify-center
                ${phase === 'charging' ? 'animate-pulse-fast bg-white/40' : ''}
              `}>
                 <Zap className={`w-6 h-6 landscape:w-7 landscape:h-7 md:w-10 md:h-10 text-white ${phase === 'charging' ? 'fill-white' : ''}`} />
              </div>
              
              <div className="mt-2 landscape:mt-3 md:mt-6 text-white font-black tracking-widest text-xs landscape:text-sm md:text-xl drop-shadow-md">
                {phase === 'charging' ? t('charging') : t('tapToOpen')}
              </div>
              {/* Charging Energy Particles (Suction effect) */}
              {phase === 'charging' && (
                 <>
                   {Array.from({ length: 10 }).map((_, i) => (
                     <div 
                       key={i}
                       className="absolute bg-white rounded-full animate-implode"
                       style={{
                         width: Math.random() * 4 + 2 + 'px',
                         height: Math.random() * 4 + 2 + 'px',
                         left: '50%',
                         top: '50%',
                         '--angle': `${i * 36}deg`,
                         '--delay': `${Math.random() * 0.5}s`,
                         '--distance': '150px'
                       } as React.CSSProperties}
                     />
                   ))}
                 </>
              )}
            </div>
            
            {/* Glow Aura during Charge */}
            {phase === 'charging' && (
              <div className={`absolute inset-0 rounded-xl blur-xl bg-white/50 animate-pulse`} />
            )}
          </div>
        </div>
      )}

      {/* --- PHASE 2: EXPLOSION FX --- */}
      {phase === 'exploding' && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          
          {/* Blind White Flash */}
          <div className="fixed inset-0 bg-white animate-flash-out z-[60] pointer-events-none" />
          
          {/* Expanding Shockwaves */}
          <div className={`absolute w-[100px] h-[100px] rounded-full border-4 ${config.ringColor} animate-shockwave opacity-0`} style={{ animationDelay: '0ms' }} />
          <div className={`absolute w-[100px] h-[100px] rounded-full border-4 ${config.ringColor} animate-shockwave opacity-0`} style={{ animationDelay: '100ms' }} />
          <div className={`absolute w-[100px] h-[100px] rounded-full border-2 border-white animate-shockwave opacity-0`} style={{ animationDelay: '200ms' }} />
          {/* Debris / Particles */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={i}
              className="absolute w-3 h-1 bg-white rounded-full animate-explode-debris"
              style={{
                backgroundColor: config.particleColors[i % config.particleColors.length],
                left: '50%',
                top: '50%',
                '--angle': `${i * 15}deg`,
                '--speed': `${0.5 + Math.random() * 0.5}s`,
                '--distance': `${200 + Math.random() * 200}px`
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* --- PHASE 3: THE CARD --- */}
      <div 
        className={`absolute inset-0 z-40 flex items-center justify-center transition-opacity duration-300
          ${(phase === 'revealed' || phase === 'interactive') ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {/* Background Rays - Primary (Double Beam) */}
        <div className={`absolute inset-[-150%] animate-spin-slow opacity-0 transition-opacity duration-1000 pointer-events-none ${(phase === 'revealed' || phase === 'interactive') ? 'opacity-40' : 'opacity-0'}`}>
           <div className={`w-full h-full bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,currentColor_20deg,transparent_40deg,transparent_180deg,currentColor_200deg,transparent_220deg,transparent_360deg)] ${config.beamColor}`} />
        </div>
        {/* Background Rays - Secondary (Reverse Spin) */}
        <div className={`absolute inset-[-150%] animate-spin-reverse opacity-0 transition-opacity duration-1000 pointer-events-none ${(phase === 'revealed' || phase === 'interactive') ? 'opacity-20' : 'opacity-0'}`}>
           <div className={`w-full h-full bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0deg,currentColor_40deg,transparent_80deg,transparent_360deg)] ${config.beamColor}`} />
        </div>
        {/* The Card Itself */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`
            relative w-40 h-[209px] landscape:w-48 landscape:h-[257px] md:w-64 md:h-[353px] max-w-full max-h-full preserve-3d
            ${phase === 'revealed' ? 'animate-slam-in' : ''}
            transition-transform duration-100 ease-out
          `}
          style={{
            transform: phase === 'interactive'
              ? `perspective(1000px) rotateX(${mousePosition.y}deg) rotateY(${mousePosition.x}deg)`
              : undefined
          }}
        >
          <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl relative bg-transparent">
             {cardContent ? cardContent : <img src={cardImage} className="w-full h-full object-cover" alt="Card" />}
             {/* Dynamic Sheen */}
             <div 
               className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/40 to-transparent mix-blend-overlay"
               style={{
                 transform: phase === 'interactive' 
                   ? `translateX(${mousePosition.x * -3}px) translateY(${mousePosition.y * -3}px)`
                   : 'translateX(-100%)',
                 transition: phase === 'interactive' ? 'none' : 'transform 1s',
                 backgroundSize: '200% 200%'
               }}
             />
             
             {/* Rarity Holo Overlay */}
             {rarity !== 'common' && (
               <div 
                 className={`absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-0 transition-opacity duration-300 ${phase === 'interactive' ? 'opacity-40 hover:opacity-70' : ''}`}
                 style={{
                   backgroundImage: rarity === 'legendary' 
                    ? 'linear-gradient(115deg, transparent 25%, #ff0080 45%, #00ff00 50%, #0000ff 55%, transparent 75%)'
                    : 'linear-gradient(115deg, transparent 30%, #ffd700 45%, #ffaa00 55%, transparent 70%)',
                   backgroundSize: '250% 250%',
                   backgroundPosition: phase === 'interactive' 
                     ? `${50 + (mousePosition.x * 3)}% ${50 + (mousePosition.y * 3)}%` 
                     : '50% 50%'
                 }}
               />
             )}
          </div>
        </div>
      </div>
      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes violent-shake {
          0% { transform: translate(0, 0) rotate(0); }
          25% { transform: translate(-5px, 5px) rotate(-5deg); }
          50% { transform: translate(5px, -5px) rotate(5deg); }
          75% { transform: translate(-5px, -5px) rotate(-5deg); }
          100% { transform: translate(5px, 5px) rotate(5deg); }
        }
        .animate-violent-shake { animation: violent-shake 0.1s infinite; }
        @keyframes implode {
          0% { transform: translate(calc(cos(var(--angle)) * var(--distance)), calc(sin(var(--angle)) * var(--distance))) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(0, 0) scale(1.5); opacity: 0; }
        }
        .animate-implode { animation: implode 0.6s ease-in infinite; animation-delay: var(--delay); }
        @keyframes flash-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash-out { animation: flash-out 0.8s ease-out forwards; }
        @keyframes shockwave {
          0% { transform: scale(0.1); opacity: 1; border-width: 20px; }
          100% { transform: scale(4); opacity: 0; border-width: 0px; }
        }
        .animate-shockwave { animation: shockwave 0.8s ease-out forwards; }
        @keyframes explode-debris {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * var(--distance)), calc(sin(var(--angle)) * var(--distance))) scale(0); opacity: 0; }
        }
        .animate-explode-debris { animation: explode-debris var(--speed) ease-out forwards; }
        @keyframes slam-in {
          0% { transform: scale(3) rotateY(-180deg); opacity: 0; }
          40% { transform: scale(0.9) rotateY(0deg); opacity: 1; }
          60% { transform: scale(1.05) rotateY(0deg); }
          80% { transform: scale(0.98) rotateY(0deg); }
          100% { transform: scale(1) rotateY(0deg); }
        }
        .animate-slam-in { animation: slam-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
};