import { Position } from '../types';

/**
 * Player Trait System
 * 
 * This system assigns position-appropriate traits to youth academy players.
 * Traits affect gameplay, match simulation, and player behavior.
 */

export type TraitRarity = 'common' | 'rare' | 'epic';

export interface PlayerTrait {
  id: string;
  name: string;
  description: string;
  gameplayDescription: string; // User-friendly description without percentages
  rarity: TraitRarity;
  effects: {
    // Match simulation effects
    goalChanceBonus?: number; // Percentage bonus to goal chance
    assistChanceBonus?: number; // Percentage bonus to assist chance
    dribbleAttemptBonus?: number; // Bonus to dribble attempts
    headerBonus?: number; // Bonus to header accuracy/power
    freeKickBonus?: number; // Bonus to free kick success
    defensiveActionBonus?: number; // Bonus to defensive actions (tackles, blocks)
    goalkeeperSaveBonus?: number; // Bonus to goalkeeper saves
    passAccuracyBonus?: number; // Bonus to pass accuracy
    passCountBonus?: number; // Bonus to pass count
    bigMatchBonus?: number; // Bonus in important matches
    pressureResistance?: number; // Resistance to pressure situations
    comebackBonus?: number; // Bonus when team is losing
    teamMoraleBonus?: number; // Bonus to team morale when on field
    aggressionBonus?: number; // Bonus to tackles/interceptions, but higher card risk
    injuryResistance?: number; // Resistance to injuries
    injuryRisk?: number; // Increased injury risk
    earlyGameBonus?: number; // Bonus in first half
    lateGameBonus?: number; // Bonus in second half/late game
    homeBonus?: number; // Bonus in home matches
    developmentSpeed?: number; // Multiplier to development speed
    transferDesire?: number; // Affects transfer request likelihood (negative = less likely)
    lockerRoomImpact?: number; // Impact on team morale when unhappy (negative = bad)
    rotationTolerance?: number; // Resistance to morale loss when not playing
  };
}

/**
 * Trait Definitions
 */
export const TRAITS: Record<string, PlayerTrait> = {
  gol_makinesi: {
    id: 'gol_makinesi',
    name: 'Gol Makinesi',
    description: 'Gol atma ihtimali bufflanır, xG üstü bitirme şansı artar.',
    gameplayDescription: 'Gol kokusunu iyi alır. Pozisyonlarda bulunmayı bilir ve şansları değerlendirir.',
    rarity: 'epic',
    effects: {
      goalChanceBonus: 25,
      bigMatchBonus: 10,
    },
  },
  superstar: {
    id: 'superstar',
    name: 'Süperstar',
    description: 'Maç eventlerinde daha fazla görünür, kritik anlarda sahneye çıkar.',
    gameplayDescription: 'Kritik anlarda sahneye çıkar. Büyük maçlarda performansı yükselir.',
    rarity: 'epic',
    effects: {
      goalChanceBonus: 15,
      assistChanceBonus: 10,
      bigMatchBonus: 20,
      pressureResistance: 15,
    },
  },
  playmaker: {
    id: 'playmaker',
    name: 'Playmaker',
    description: 'Ana pas / kilit pas olasılığı artar, asist ihtimali yükselir.',
    gameplayDescription: 'Takımı organize eder. Kilit pasları bulur ve asist yapma konusunda üstündür.',
    rarity: 'rare',
    effects: {
      assistChanceBonus: 30,
      passAccuracyBonus: 10,
      passCountBonus: 20,
    },
  },
  dribbler: {
    id: 'dribbler',
    name: 'Dribbler',
    description: 'Daha çok dripling dener, ikili mücadeleleri zorlar.',
    gameplayDescription: 'Topu ayağında tutmayı sever. Rakibi geçmek için sürekli dripling dener.',
    rarity: 'rare',
    effects: {
      dribbleAttemptBonus: 40,
      assistChanceBonus: 10,
    },
  },
  kafa_uzmani: {
    id: 'kafa_uzmani',
    name: 'Kafa Uzmanı',
    description: 'Kafa vuruşlarında güç ve isabet bonusu alır.',
    gameplayDescription: 'Havadan gelen toplarda güçlüdür. Kafa vuruşlarında isabetlidir.',
    rarity: 'rare',
    effects: {
      headerBonus: 35,
      goalChanceBonus: 10, // Only for headers
    },
  },
  serbest_vurus_ustasi: {
    id: 'serbest_vurus_ustasi',
    name: 'Serbest Vuruş Ustası',
    description: 'Serbest vuruşlarda gol veya tehlikeli şut ihtimali artar.',
    gameplayDescription: 'Serbest vuruşlarda tehlikelidir. Topu filelere gönderme konusunda uzmandır.',
    rarity: 'rare',
    effects: {
      freeKickBonus: 40,
      goalChanceBonus: 15, // Only for free kicks
    },
  },
  duvar: {
    id: 'duvar',
    name: 'Duvar',
    description: 'Savunma aksiyonlarında (blok, top çalma) başarı oranı artar.',
    gameplayDescription: 'Savunmada güvenilirdir. Top çalma ve blok konusunda başarılıdır.',
    rarity: 'rare',
    effects: {
      defensiveActionBonus: 30,
      pressureResistance: 10,
    },
  },
  panter: {
    id: 'panter',
    name: 'Panter',
    description: 'Kalecinin refleks/gol çıkarma ihtimali artar.',
    gameplayDescription: 'Refleksleri keskindir. Zor pozisyonlarda bile kurtarış yapabilir.',
    rarity: 'epic',
    effects: {
      goalkeeperSaveBonus: 25,
      pressureResistance: 15,
    },
  },
  pas_canavari: {
    id: 'pas_canavari',
    name: 'Pas Canavarı',
    description: 'Pas isabet oranı ve pas sayısı artar.',
    gameplayDescription: 'Pas konusunda üstündür. Top dağıtımında takıma yardımcı olur.',
    rarity: 'common',
    effects: {
      passAccuracyBonus: 15,
      passCountBonus: 25,
    },
  },
  big_match_player: {
    id: 'big_match_player',
    name: 'Büyük Maç Oyuncusu',
    description: 'Derbi, final gibi büyük maçlarda ekstra performans buff\'u alır.',
    gameplayDescription: 'Büyük maçlarda parlar. Derbi ve finallerde performansı yükselir.',
    rarity: 'epic',
    effects: {
      bigMatchBonus: 30,
      pressureResistance: 20,
    },
  },
  sogukkanli: {
    id: 'sogukkanli',
    name: 'Soğukkanlı',
    description: 'Baskı altında (son dakikalar, penaltı, geriden gelme) performans düşmez.',
    gameplayDescription: 'Baskı altında soğukkanlı kalır. Son dakikalarda ve penaltılarda güvenilirdir.',
    rarity: 'rare',
    effects: {
      pressureResistance: 25,
      lateGameBonus: 10,
    },
  },
  hirs_kupu: {
    id: 'hirs_kupu',
    name: 'Hırs Kutusu',
    description: 'Takım gerideyken performansı düşmek yerine artar.',
    gameplayDescription: 'Takım gerideyken daha da hırslanır. Zor durumlarda mücadele eder.',
    rarity: 'rare',
    effects: {
      comebackBonus: 20,
      pressureResistance: 10,
    },
  },
  lider: {
    id: 'lider',
    name: 'Lider',
    description: 'Sahada olduğu sürece takımın genel morali hafif bufflanır.',
    gameplayDescription: 'Sahada takıma liderlik eder. Takımın moralini yükseltir.',
    rarity: 'epic',
    effects: {
      teamMoraleBonus: 5,
      pressureResistance: 15,
    },
  },
  agresif: {
    id: 'agresif',
    name: 'Agresif',
    description: 'Top kapma ve müdahale sayısı artar ama kart görme ihtimali yükselir.',
    gameplayDescription: 'Top kapmak için agresif davranır. Ancak kart görme riski yüksektir.',
    rarity: 'common',
    effects: {
      defensiveActionBonus: 20,
      aggressionBonus: 30, // Increases card risk
    },
  },
  mental_direnc: {
    id: 'mental_direnc',
    name: 'Mental Direnç',
    description: 'Farklı yenilgilerden sonra moral kaybı daha az olur.',
    gameplayDescription: 'Yenilgilerden kolay etkilenmez. Mental olarak güçlüdür.',
    rarity: 'common',
    effects: {
      pressureResistance: 15,
      rotationTolerance: 10,
    },
  },
  taraftarin_goz_bebegi: {
    id: 'taraftarin_goz_bebegi',
    name: 'Taraftarın Göz Bebeği',
    description: 'İç saha maçlarında ekstra motivasyon ve ufak performans buff\'u alır.',
    gameplayDescription: 'İç saha maçlarında taraftar desteğiyle daha iyi oynar.',
    rarity: 'rare',
    effects: {
      homeBonus: 15,
      goalChanceBonus: 5,
      assistChanceBonus: 5,
    },
  },
  dayanikli: {
    id: 'dayanikli',
    name: 'Dayanıklı',
    description: 'Sakatlık ihtimali düşer, kondisyonu daha geç düşer.',
    gameplayDescription: 'Fiziksel olarak dayanıklıdır. Sakatlık riski düşüktür.',
    rarity: 'common',
    effects: {
      injuryResistance: 30,
      lateGameBonus: 5,
    },
  },
  cam_adam: {
    id: 'cam_adam',
    name: 'Cam Adam',
    description: 'Sakatlık ihtimali yüksektir.',
    gameplayDescription: 'Sakatlığa yatkındır. Fiziksel olarak hassastır.',
    rarity: 'common',
    effects: {
      injuryRisk: 50, // 50% increased injury risk
    },
  },
  patlayici_guc: {
    id: 'patlayici_guc',
    name: 'Patlayıcı Güç',
    description: 'Maçın ilk bölümünde çok etkili, ilerleyen dakikalarda fiziksel düşüş yaşar.',
    gameplayDescription: 'Maçın başında çok etkilidir ancak ilerleyen dakikalarda yorulur.',
    rarity: 'common',
    effects: {
      earlyGameBonus: 20,
      lateGameBonus: -10, // Negative = penalty in late game
    },
  },
  maratoncu: {
    id: 'maratoncu',
    name: 'Maratoncu',
    description: 'Maç uzadıkça düşmek yerine belli seviyede ritmini korur.',
    gameplayDescription: 'Maç boyunca ritmini korur. Uzun süreli performans gösterir.',
    rarity: 'common',
    effects: {
      lateGameBonus: 15,
      injuryResistance: 10,
    },
  },
  kulup_sadigi: {
    id: 'kulup_sadigi',
    name: 'Kulüp Sadığı',
    description: 'Takımdan ayrılmak istemez, transfer isteği daha azdır.',
    gameplayDescription: 'Kulübüne sadıktır. Transfer isteği göstermez.',
    rarity: 'common',
    effects: {
      transferDesire: -50, // Negative = less likely to request transfer
      rotationTolerance: 15,
    },
  },
  problem_cikarici: {
    id: 'problem_cikarici',
    name: 'Problem Çıkarıcı',
    description: 'Oynamadığında veya takım kötü gittiğinde soyunma odası moralini düşürebilir.',
    gameplayDescription: 'Oynamadığında veya takım kötü gittiğinde soyunma odasında sorun çıkarabilir.',
    rarity: 'common',
    effects: {
      lockerRoomImpact: -10, // Negative = bad for morale
      rotationTolerance: -20, // Negative = loses morale when not playing
    },
  },
  takim_oyuncusu: {
    id: 'takim_oyuncusu',
    name: 'Takım Oyuncusu',
    description: 'Rotasyonda kalsa bile moralini kolay kolay kaybetmez.',
    gameplayDescription: 'Takım için oynar. Rotasyonda kalsa bile moralini korur.',
    rarity: 'common',
    effects: {
      rotationTolerance: 25,
      teamMoraleBonus: 2,
    },
  },
  genc_yildiz: {
    id: 'genc_yildiz',
    name: 'Genç Yıldız',
    description: 'Gelişim hızı daha yüksek, rating/potansiyel artışı hızlı olur.',
    gameplayDescription: 'Hızlı gelişir. Potansiyelini çabuk ortaya çıkarır.',
    rarity: 'epic',
    effects: {
      developmentSpeed: 1.5, // 50% faster development
      goalChanceBonus: 5,
      assistChanceBonus: 5,
    },
  },
  divali: {
    id: 'divali',
    name: 'Divalı',
    description: 'Sürekli ilgi ister; rolü düşerse moral kaybı yaşar.',
    gameplayDescription: 'Sürekli ilgi ister. Oynamadığında moral kaybı yaşar.',
    rarity: 'common',
    effects: {
      rotationTolerance: -30, // Negative = loses morale when not playing
      bigMatchBonus: 5,
    },
  },
};

/**
 * Position to Trait Pool Mapping
 * Each position can only get traits from its allowed pool
 */
export const POSITION_TRAIT_POOLS: Record<Position, string[]> = {
  [Position.ST]: [
    'gol_makinesi',
    'superstar',
    'dribbler',
    'kafa_uzmani',
    'patlayici_guc',
    'big_match_player',
    'divali',
    'taraftarin_goz_bebegi',
    'genc_yildiz',
  ],
  [Position.CF]: [
    'gol_makinesi',
    'superstar',
    'dribbler',
    'kafa_uzmani',
    'patlayici_guc',
    'big_match_player',
    'divali',
    'taraftarin_goz_bebegi',
    'genc_yildiz',
  ],
  [Position.LW]: [
    'dribbler',
    'superstar',
    'patlayici_guc',
    'divali',
    'taraftarin_goz_bebegi',
    'genc_yildiz',
  ],
  [Position.RW]: [
    'dribbler',
    'superstar',
    'patlayici_guc',
    'divali',
    'taraftarin_goz_bebegi',
    'genc_yildiz',
  ],
  [Position.CAM]: [
    'playmaker',
    'superstar',
    'pas_canavari',
    'big_match_player',
    'sogukkanli',
    'genc_yildiz',
  ],
  [Position.CM]: [
    'playmaker',
    'pas_canavari',
    'hirs_kupu',
    'takim_oyuncusu',
    'lider',
    'maratoncu',
  ],
  [Position.CDM]: [
    'duvar',
    'sogukkanli',
    'mental_direnc',
    'hirs_kupu',
    'dayanikli',
  ],
  [Position.LM]: [
    'playmaker',
    'pas_canavari',
    'hirs_kupu',
    'takim_oyuncusu',
    'lider',
    'maratoncu',
  ],
  [Position.RM]: [
    'playmaker',
    'pas_canavari',
    'hirs_kupu',
    'takim_oyuncusu',
    'lider',
    'maratoncu',
  ],
  [Position.CB]: [
    'duvar',
    'kafa_uzmani',
    'sogukkanli',
    'agresif',
    'mental_direnc',
    'dayanikli',
    'kulup_sadigi',
  ],
  [Position.LB]: [
    'dribbler',
    'hirs_kupu',
    'maratoncu',
    'dayanikli',
    'takim_oyuncusu',
  ],
  [Position.RB]: [
    'dribbler',
    'hirs_kupu',
    'maratoncu',
    'dayanikli',
    'takim_oyuncusu',
  ],
  [Position.LWB]: [
    'dribbler',
    'hirs_kupu',
    'maratoncu',
    'dayanikli',
    'takim_oyuncusu',
  ],
  [Position.RWB]: [
    'dribbler',
    'hirs_kupu',
    'maratoncu',
    'dayanikli',
    'takim_oyuncusu',
  ],
  [Position.GK]: [
    'panter',
    'sogukkanli',
    'mental_direnc',
    'lider',
    'dayanikli',
    'cam_adam',
  ],
};

/**
 * Conflicting traits - these cannot be assigned together
 */
export const CONFLICTING_TRAITS: Record<string, string[]> = {
  dayanikli: ['cam_adam'],
  cam_adam: ['dayanikli'],
  sogukkanli: ['agresif'], // Can coexist but less likely
  takim_oyuncusu: ['divali', 'problem_cikarici'],
  divali: ['takim_oyuncusu', 'kulup_sadigi'],
  problem_cikarici: ['takim_oyuncusu', 'kulup_sadigi'],
  kulup_sadigi: ['divali', 'problem_cikarici'],
  patlayici_guc: ['maratoncu'],
  maratoncu: ['patlayici_guc'],
};

/**
 * Rarity weights for trait selection
 */
const RARITY_WEIGHTS: Record<TraitRarity, number> = {
  common: 70, // 70% chance
  rare: 25, // 25% chance
  epic: 5, // 5% chance
};

/**
 * Select traits for a player based on their position
 * 
 * @param position Player's primary position
 * @returns Array of trait IDs assigned to the player
 */
export const selectTraitsForPlayer = (position: Position): string[] => {
  const traits: string[] = [];
  
  // Determine number of traits (40% chance for 1, 10% chance for 2, 50% chance for 0)
  const traitRoll = Math.random();
  let numTraits = 0;
  if (traitRoll < 0.4) {
    numTraits = 1;
  } else if (traitRoll < 0.5) {
    numTraits = 2;
  }
  
  if (numTraits === 0) {
    return traits;
  }
  
  // Get allowed trait pool for this position
  const allowedTraits = POSITION_TRAIT_POOLS[position] || [];
  
  if (allowedTraits.length === 0) {
    return traits;
  }
  
  // Select traits with rarity weighting
  const availableTraits = [...allowedTraits];
  
  for (let i = 0; i < numTraits && availableTraits.length > 0; i++) {
    // Build weighted pool based on rarity
    const weightedPool: { traitId: string; weight: number }[] = [];
    let totalWeight = 0;
    
    availableTraits.forEach(traitId => {
      const trait = TRAITS[traitId];
      if (!trait) return;
      
      // Check if this trait conflicts with already selected traits
      const conflicts = CONFLICTING_TRAITS[traitId] || [];
      const hasConflict = conflicts.some(conflictId => traits.includes(conflictId));
      
      if (!hasConflict) {
        const weight = RARITY_WEIGHTS[trait.rarity];
        weightedPool.push({ traitId, weight });
        totalWeight += weight;
      }
    });
    
    if (weightedPool.length === 0) {
      break; // No valid traits left
    }
    
    // Select trait based on weights
    let random = Math.random() * totalWeight;
    for (const item of weightedPool) {
      random -= item.weight;
      if (random <= 0) {
        traits.push(item.traitId);
        // Remove from available pool to avoid duplicates
        const index = availableTraits.indexOf(item.traitId);
        if (index > -1) {
          availableTraits.splice(index, 1);
        }
        break;
      }
    }
  }
  
  return traits;
};

/**
 * Get trait display name
 */
export const getTraitName = (traitId: string): string => {
  return TRAITS[traitId]?.name || traitId;
};

/**
 * Get trait description
 */
export const getTraitDescription = (traitId: string): string => {
  return TRAITS[traitId]?.description || '';
};

/**
 * Get trait rarity
 */
export const getTraitRarity = (traitId: string): TraitRarity | null => {
  return TRAITS[traitId]?.rarity || null;
};

