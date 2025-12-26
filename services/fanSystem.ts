import { Team } from '../types';

// Big 6 teams in Premier League
export const BIG_SIX_TEAMS = [
  'Manchester City',
  'Arsenal',
  'Liverpool',
  'Chelsea',
  'Tottenham Hotspur',
  'Manchester United'
];

// Stadium capacity mapping based on real stadium capacities
const STADIUM_CAPACITIES: { [key: string]: number } = {
  'Arsenal': 60704,
  'Aston Villa': 42918,
  'Bournemouth': 11307,
  'Brentford': 17250,
  'Brighton & Hove Albion': 31876,
  'Brighton': 31876, // Alternative name
  'Burnley': 21944,
  'Chelsea': 40044,
  'Crystal Palace': 25194,
  'Everton': 52769,
  'Fulham': 27782,
  'Leeds United': 37645,
  'Liverpool': 61276,
  'Manchester City': 52900,
  'Manchester United': 74197,
  'Newcastle United': 52258,
  'Nottingham Forest': 30404,
  'Sunderland': 49000,
  'Tottenham Hotspur': 62850,
  'Tottenham': 62850, // Alternative name
  'West Ham United': 62500,
  'Wolverhampton Wanderers': 31750,
  'Wolves': 31750 // Alternative name
};

/**
 * Initialize fan and stadium system for a team
 */
export const initializeFanSystem = (teamName: string, baseRating: number, league: string): {
  fanCount: number;
  stadiumCapacity: number;
  ticketPrice: number;
  shirtPrice: number;
  clubReputation: number;
  baseTicketPrice: number;
  baseShirtPrice: number;
  fanMorale: number;
  isBigSix: boolean;
} => {
  const isBigSix = BIG_SIX_TEAMS.includes(teamName);
  
  // Base values based on rating and Big 6 status
  const reputationMultiplier = isBigSix ? 1.5 : 1.0;
  const clubReputation = Math.min(100, Math.max(20, baseRating * reputationMultiplier));
  
  // Fan count: Big 6 teams have more fans, based on reputation
  const baseFanCount = isBigSix ? 500000 : 200000;
  const fanCount = Math.floor(baseFanCount * (clubReputation / 70));
  
  // Stadium capacity: Use real stadium capacities if available, otherwise calculate based on rating
  const stadiumCapacity = STADIUM_CAPACITIES[teamName] || (() => {
  const baseCapacity = isBigSix ? 60000 : 30000;
    return Math.floor(baseCapacity * (clubReputation / 70));
  })();
  
  // Base ticket price based on league level (Premier League = higher)
  const leagueMultiplier = league === 'Premier League' ? 1.0 : 0.7;
  const baseTicketPrice = Math.floor(40 + (clubReputation - 50) * 0.5) * leagueMultiplier;
  const ticketPrice = baseTicketPrice;
  
  // Shirt price
  const baseShirtPrice = Math.floor(60 + (clubReputation - 50) * 0.8);
  const shirtPrice = baseShirtPrice;
  
  // Fan morale starts at 50 (neutral)
  const fanMorale = 50;
  
  return {
    fanCount,
    stadiumCapacity,
    ticketPrice,
    shirtPrice,
    clubReputation,
    baseTicketPrice,
    baseShirtPrice,
    fanMorale,
    isBigSix
  };
};

/**
 * Check if match is a derby (Big 6 vs Big 6)
 */
export const isDerbyMatch = (homeTeam: Team, awayTeam: Team): boolean => {
  return (homeTeam.isBigSix && awayTeam.isBigSix) || false;
};

/**
 * Calculate fan morale change after match
 */
export const calculateMoraleChange = (
  result: 'WIN' | 'DRAW' | 'LOSS',
  goalsFor: number,
  goalsAgainst: number,
  isHome: boolean,
  isDerby: boolean,
  opponentRating: number,
  teamRating: number,
  lastMinuteGoal: boolean = false
): number => {
  let moraleChange = 0;
  
  // Base result changes
  if (result === 'WIN') {
    moraleChange += 5;
  } else if (result === 'DRAW') {
    moraleChange += 0;
  } else if (result === 'LOSS') {
    moraleChange -= 4;
  }
  
  // Bonus: Big win (win by 3+ goals)
  if (result === 'WIN' && (goalsFor - goalsAgainst) >= 3) {
    moraleChange += 3;
  }
  
  // Bonus: Clean sheet (win without conceding)
  if (result === 'WIN' && goalsAgainst === 0) {
    moraleChange += 2;
  }
  
  // Bonus: Derby win
  if (result === 'WIN' && isDerby) {
    moraleChange += 4;
  }
  
  // Bonus: Last minute goal
  if (lastMinuteGoal && result === 'WIN') {
    moraleChange += 2;
  }
  
  // Penalty: Loss to weaker team (opponent rating significantly lower)
  if (result === 'LOSS' && opponentRating < teamRating - 10) {
    moraleChange -= 3;
  }
  
  // Penalty: Big home loss (lose by 3+ at home)
  if (result === 'LOSS' && isHome && (goalsAgainst - goalsFor) >= 3) {
    moraleChange -= 4;
  }
  
  return moraleChange;
};

/**
 * Calculate attendance based on fan count, morale, and ticket price
 * Morale directly affects stadium fill rate: 100 morale = full stadium, 0 morale = empty
 */
export const calculateAttendance = (
  fanCount: number,
  fanMorale: number,
  ticketPrice: number,
  baseTicketPrice: number,
  stadiumCapacity: number
): number => {
  // Morale directly determines stadium fill rate (0-100% based on morale 0-100)
  // Higher morale = more filled stadium
  const moraleFillRate = fanMorale / 100; // 0.0 to 1.0
  
  // Price factor: higher price = lower attendance (0.7 to 1.0)
  // If price is same as base, factor is 1.0. If 2x base price, factor is 0.7
  const priceRatio = ticketPrice / baseTicketPrice;
  const priceFactor = Math.max(0.7, Math.min(1.0, 1.0 - (priceRatio - 1.0) * 0.15));
  
  // Calculate attendance: stadium capacity * morale fill rate * price factor
  // But also consider fan count as a limit
  const maxPossibleAttendance = Math.min(fanCount, stadiumCapacity);
  const attendance = Math.floor(maxPossibleAttendance * moraleFillRate * priceFactor);
  
  return Math.max(0, Math.min(attendance, stadiumCapacity));
};

/**
 * Update fan count based on morale
 */
export const updateFanCount = (currentFanCount: number, fanMorale: number): number => {
  // Growth factor based on morale (50 = neutral, 100 = max growth, 0 = max decline)
  const growthFactor = (fanMorale - 50) / 50;
  const newFanCount = Math.floor(currentFanCount * (1 + growthFactor * 0.03));
  
  // Clamp to reasonable values
  return Math.max(10000, Math.min(5000000, newFanCount));
};

/**
 * Expand stadium capacity
 */
export const expandStadium = (currentCapacity: number, expansionPercent: number = 15): number => {
  return Math.floor(currentCapacity * (1 + expansionPercent / 100));
};

/**
 * Get upgrade tier information based on stadium capacity
 */
export interface UpgradeTier {
  minCost: number;
  maxCost: number;
  minWeeks: number;
  maxWeeks: number;
}

export const getUpgradeTier = (capacity: number): UpgradeTier | null => {
  if (capacity < 20000) {
    // Tier 1: Below 20k -> 13M-16M (60% increase), 4-6 weeks
    return { minCost: 13000000, maxCost: 16000000, minWeeks: 4, maxWeeks: 6 };
  } else if (capacity >= 20000 && capacity < 30000) {
    // Tier 2: 20k-30k -> 19M-24M (60% increase), 7-10 weeks
    return { minCost: 19000000, maxCost: 24000000, minWeeks: 7, maxWeeks: 10 };
  } else if (capacity >= 30000 && capacity < 50000) {
    // Tier 3: 30k-50k -> 29M-35M (60% increase), 12-16 weeks
    return { minCost: 29000000, maxCost: 35000000, minWeeks: 12, maxWeeks: 16 };
  } else if (capacity >= 50000 && capacity < 70000) {
    // Tier 4: 50k-70k -> 45M-56M (60% increase), 18-22 weeks
    return { minCost: 45000000, maxCost: 56000000, minWeeks: 18, maxWeeks: 22 };
  } else if (capacity >= 70000 && capacity < 90000) {
    // Tier 5: 70k-90k -> 56M-72M (60% increase), 22-28 weeks
    return { minCost: 56000000, maxCost: 72000000, minWeeks: 22, maxWeeks: 28 };
  } else if (capacity >= 90000 && capacity < 100000) {
    // Tier 6 (Prestige): 90k-100k -> 80M-112M (60% increase), 30-40 weeks
    return { minCost: 80000000, maxCost: 112000000, minWeeks: 30, maxWeeks: 40 };
  } else {
    // 100k+ reached - no more upgrades allowed
    return null;
  }
};

/**
 * Calculate upgrade cost based on capacity tier (uses average of min and max)
 */
export const calculateUpgradeCost = (capacity: number): number | null => {
  const tier = getUpgradeTier(capacity);
  if (!tier) return null;
  // Use average of min and max for consistent pricing
  return Math.floor((tier.minCost + tier.maxCost) / 2);
};

/**
 * Calculate upgrade duration in weeks based on capacity tier (uses average of min and max)
 */
export const calculateUpgradeWeeks = (capacity: number): number | null => {
  const tier = getUpgradeTier(capacity);
  if (!tier) return null;
  // Use average of min and max for consistent duration
  return Math.floor((tier.minWeeks + tier.maxWeeks) / 2);
};

/**
 * Calculate fan morale change based on ticket and shirt prices
 * Higher prices = lower morale, lower prices = higher morale
 */
export const calculatePriceMoraleChange = (
  ticketPrice: number,
  baseTicketPrice: number,
  shirtPrice: number,
  baseShirtPrice?: number
): number => {
  let moraleChange = 0;
  
  // Ticket price effect: compare to base price
  // If ticket price is 50% higher than base, morale drops by 5
  // If ticket price is 50% lower than base, morale increases by 5
  const ticketRatio = ticketPrice / baseTicketPrice;
  if (ticketRatio > 1.0) {
    // Price is higher than base - negative effect (fans don't like high prices)
    const excessRatio = ticketRatio - 1.0; // 0.0 to ~2.0 (if price is 3x base)
    moraleChange -= Math.min(10, excessRatio * 10); // Max -10 morale for very high prices
  } else if (ticketRatio < 1.0) {
    // Price is lower than base - positive effect (fans like low prices)
    const discountRatio = 1.0 - ticketRatio; // 0.0 to 1.0 (if price is 0)
    moraleChange += Math.min(5, discountRatio * 10); // Max +5 morale for very low prices
  }
  
  // Shirt price effect: compare to base price
  // If baseShirtPrice is not provided, use current shirtPrice as base (no change)
  if (baseShirtPrice !== undefined && baseShirtPrice > 0) {
    const shirtRatio = shirtPrice / baseShirtPrice;
    if (shirtRatio > 1.0) {
      // Price is higher than base - negative effect
      const excessRatio = shirtRatio - 1.0;
      moraleChange -= Math.min(6, excessRatio * 6); // Max -6 morale for very high prices
    } else if (shirtRatio < 1.0) {
      // Price is lower than base - positive effect
      const discountRatio = 1.0 - shirtRatio;
      moraleChange += Math.min(3, discountRatio * 6); // Max +3 morale for very low prices
    }
  }
  
  return Math.round(moraleChange * 10) / 10; // Round to 1 decimal place
};

/**
 * Update fan morale based on current prices
 */
export const updateMoraleFromPrices = (
  currentMorale: number,
  ticketPrice: number,
  baseTicketPrice: number,
  shirtPrice: number,
  baseShirtPrice?: number
): number => {
  // If baseShirtPrice is not provided, use current shirtPrice as base (assumes it's the initial price)
  const effectiveBaseShirtPrice = baseShirtPrice || shirtPrice;
  const moraleChange = calculatePriceMoraleChange(ticketPrice, baseTicketPrice, shirtPrice, effectiveBaseShirtPrice);
  const newMorale = currentMorale + moraleChange;
  
  // Clamp morale between 0 and 100
  return Math.max(0, Math.min(100, newMorale));
};

