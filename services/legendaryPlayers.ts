import { Position } from '../types';

export interface LegendaryPlayer {
  name: string;
  pos: Position;
  age: number;
  rating: number;
  potential: number;
  value: number;
  stats: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

// Helper function to calculate value based on rating and age (Premier League standards)
export const calculateMarketValue = (rating: number, age: number, potential: number): number => {
  // Base value calculation based on exact rating (more granular)
  let baseValue: number;
  
  // Rating-specific base values (exponential growth per rating point)
  if (rating >= 95) {
    baseValue = Math.pow(rating - 90, 2.8) * 80000 + 80000000; // 95=80M, 96=95M, 97=112M, 98=132M, 99=155M
  } else if (rating >= 90) {
    baseValue = Math.pow(rating - 85, 2.6) * 60000 + 35000000; // 90=35M, 91=42M, 92=50M, 93=60M, 94=72M
  } else if (rating >= 85) {
    baseValue = Math.pow(rating - 80, 2.4) * 40000 + 15000000; // 85=15M, 86=18M, 87=22M, 88=27M, 89=33M
  } else if (rating >= 80) {
    baseValue = Math.pow(rating - 75, 2.2) * 25000 + 5000000; // 80=5M, 81=6.2M, 82=7.5M, 83=9M, 84=10.8M
  } else if (rating >= 75) {
    baseValue = Math.pow(rating - 70, 2.0) * 15000 + 1500000; // 75=1.5M, 76=1.9M, 77=2.4M, 78=3M, 79=3.7M
  } else if (rating >= 70) {
    baseValue = Math.pow(rating - 65, 1.8) * 8000 + 500000; // 70=500K, 71=620K, 72=760K, 73=920K, 74=1.1M
  } else if (rating >= 65) {
    baseValue = (rating - 60) * 60000 + 200000; // 65=500K, 66=560K, 67=620K, 68=680K, 69=740K
  } else {
    baseValue = (rating - 55) * 30000 + 100000; // 60=250K, 61=280K, 62=310K, etc.
  }
  
  // Age multiplier - specific multiplier for each age (more granular)
  const ageMultipliers: Record<number, number> = {
    15: 2.5, 16: 2.4, 17: 2.3, 18: 2.2, 19: 2.1,
    20: 2.0, 21: 1.9, 22: 1.75, 23: 1.6, 24: 1.5,
    25: 1.4, 26: 1.3, 27: 1.2, 28: 1.1, 29: 1.0,
    30: 0.9, 31: 0.8, 32: 0.65, 33: 0.5, 34: 0.4,
    35: 0.3, 36: 0.25, 37: 0.2, 38: 0.15, 39: 0.1,
    40: 0.05
  };
  
  // Get age multiplier (clamp age to valid range)
  const clampedAge = Math.max(15, Math.min(40, age));
  const ageMultiplier = ageMultipliers[clampedAge] || (clampedAge < 15 ? 2.5 : 0.05);
  
  baseValue *= ageMultiplier;
  
  // Potential bonus (more conservative)
  const potentialDiff = potential - rating;
  if (potentialDiff > 0) {
    // Add value based on potential, but cap it
    // Younger players get more benefit from potential
    const ageBonusMultiplier = age <= 21 ? 0.08 : age <= 23 ? 0.06 : age <= 25 ? 0.04 : 0.02;
    const potentialBonus = Math.min(potentialDiff * ageBonusMultiplier, age <= 23 ? 0.4 : 0.25);
    baseValue *= (1 + potentialBonus);
  }
  
  // Rating-specific fine-tuning based on age
  // Higher rated players have more age sensitivity
  if (rating >= 85) {
    // Elite players: age matters a lot more
    if (age <= 22) baseValue *= 1.15; // Extra premium for very young elite
    else if (age >= 31) baseValue *= 0.85; // Extra penalty for older elite
  } else if (rating >= 80) {
    // Good players: moderate age sensitivity
    if (age <= 22) baseValue *= 1.1;
    else if (age >= 31) baseValue *= 0.9;
  }
  
  // Ensure minimum value
  if (baseValue < 50000) {
    baseValue = 50000; // Minimum 50K
  }
  
  // Rating-specific caps (more granular)
  const ratingCaps: Record<number, number> = {
    99: 180000000, 98: 160000000, 97: 145000000, 96: 130000000, 95: 115000000,
    94: 100000000, 93: 85000000, 92: 70000000, 91: 60000000, 90: 50000000,
    89: 40000000, 88: 32000000, 87: 26000000, 86: 20000000, 85: 16000000,
    84: 13000000, 83: 11000000, 82: 9000000, 81: 7500000, 80: 6500000,
    79: 5500000, 78: 4500000, 77: 3800000, 76: 3200000, 75: 2800000,
    74: 2400000, 73: 2000000, 72: 1700000, 71: 1400000, 70: 1200000,
    69: 1000000, 68: 850000, 67: 700000, 66: 600000, 65: 500000,
    64: 400000, 63: 350000, 62: 300000, 61: 250000, 60: 200000
  };
  
  const cap = ratingCaps[rating] || (rating > 99 ? 200000000 : 100000);
  return Math.min(baseValue, cap);
};

// Keep calculateValue as an alias for backward compatibility within this file
const calculateValue = calculateMarketValue;

// Helper function to calculate potential based on age and rating
const calculatePotential = (rating: number, age: number): number => {
  if (age <= 22) {
    return Math.min(98, rating + Math.floor(Math.random() * 5) + 4); // +4 to +8
  } else if (age <= 25) {
    return Math.min(96, rating + Math.floor(Math.random() * 4) + 2); // +2 to +5
  } else if (age <= 27) {
    return Math.min(94, rating + Math.floor(Math.random() * 3) + 1); // +1 to +3
  } else if (age <= 29) {
    return Math.min(93, rating + Math.floor(Math.random() * 2)); // +0 to +2
  } else if (age <= 31) {
    return Math.min(92, rating + Math.floor(Math.random() * 2)); // +0 to +1
  } else {
    return Math.max(rating - 1, rating); // rating or rating - 1
  }
};

export const players90plus: LegendaryPlayer[] = [
  // === 95 / 94 / 93 ===
  { name: "Maradona", pos: Position.CAM, age: 28, rating: 95, potential: calculatePotential(95, 28), value: calculateValue(95, 28, calculatePotential(95, 28)), stats: { pace: 91, shooting: 90, passing: 94, dribbling: 96, defending: 40, physical: 77 } },
  { name: "Pelé", pos: Position.ST, age: 27, rating: 95, potential: calculatePotential(95, 27), value: calculateValue(95, 27, calculatePotential(95, 27)), stats: { pace: 94, shooting: 91, passing: 94, dribbling: 95, defending: 58, physical: 74 } },
  { name: "Ronaldo", pos: Position.ST, age: 26, rating: 94, potential: calculatePotential(94, 26), value: calculateValue(94, 26, calculatePotential(94, 26)), stats: { pace: 94, shooting: 94, passing: 79, dribbling: 94, defending: 43, physical: 75 } },
  { name: "Zidane", pos: Position.CAM, age: 28, rating: 94, potential: calculatePotential(94, 28), value: calculateValue(94, 28, calculatePotential(94, 28)), stats: { pace: 83, shooting: 90, passing: 94, dribbling: 94, defending: 73, physical: 84 } },
  { name: "Ronaldinho", pos: Position.LW, age: 27, rating: 93, potential: calculatePotential(93, 27), value: calculateValue(93, 27, calculatePotential(93, 27)), stats: { pace: 91, shooting: 89, passing: 90, dribbling: 95, defending: 38, physical: 80 } },
  { name: "Cruyff", pos: Position.CAM, age: 27, rating: 93, potential: calculatePotential(93, 27), value: calculateValue(93, 27, calculatePotential(93, 27)), stats: { pace: 90, shooting: 91, passing: 90, dribbling: 93, defending: 42, physical: 73 } },

  // === 92 ===
  { name: "Maldini", pos: Position.CB, age: 29, rating: 92, potential: calculatePotential(92, 29), value: calculateValue(92, 29, calculatePotential(92, 29)), stats: { pace: 85, shooting: 55, passing: 74, dribbling: 69, defending: 95, physical: 82 } },
  { name: "Puskás", pos: Position.ST, age: 28, rating: 92, potential: calculatePotential(92, 28), value: calculateValue(92, 28, calculatePotential(92, 28)), stats: { pace: 90, shooting: 94, passing: 89, dribbling: 91, defending: 45, physical: 74 } },
  { name: "Garrincha", pos: Position.RW, age: 27, rating: 92, potential: calculatePotential(92, 27), value: calculateValue(92, 27, calculatePotential(92, 27)), stats: { pace: 89, shooting: 83, passing: 92, dribbling: 94, defending: 40, physical: 66 } },
  { name: "Iniesta", pos: Position.CM, age: 29, rating: 92, potential: calculatePotential(92, 29), value: calculateValue(92, 29, calculatePotential(92, 29)), stats: { pace: 83, shooting: 80, passing: 91, dribbling: 92, defending: 66, physical: 74 } },
  { name: "Beckenbauer", pos: Position.CB, age: 29, rating: 92, potential: calculatePotential(92, 29), value: calculateValue(92, 29, calculatePotential(92, 29)), stats: { pace: 73, shooting: 88, passing: 88, dribbling: 84, defending: 93, physical: 81 } },
  { name: "Charlton", pos: Position.CAM, age: 29, rating: 92, potential: calculatePotential(92, 29), value: calculateValue(92, 29, calculatePotential(92, 29)), stats: { pace: 90, shooting: 91, passing: 87, dribbling: 91, defending: 50, physical: 74 } },
  { name: "Yashin", pos: Position.GK, age: 30, rating: 92, potential: calculatePotential(92, 30), value: calculateValue(92, 30, calculatePotential(92, 30)), stats: { pace: 53, shooting: 75, passing: 76, dribbling: 75, defending: 96, physical: 95 } },
  { name: "Müller", pos: Position.ST, age: 27, rating: 92, potential: calculatePotential(92, 27), value: calculateValue(92, 27, calculatePotential(92, 27)), stats: { pace: 87, shooting: 92, passing: 75, dribbling: 86, defending: 44, physical: 74 } },

  // === 91 ===
  { name: "Zico", pos: Position.CAM, age: 27, rating: 91, potential: calculatePotential(91, 27), value: calculateValue(91, 27, calculatePotential(91, 27)), stats: { pace: 89, shooting: 92, passing: 91, dribbling: 91, defending: 62, physical: 71 } },
  { name: "Xavi", pos: Position.CM, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 80, shooting: 78, passing: 92, dribbling: 91, defending: 69, physical: 70 } },
  { name: "Baggio", pos: Position.CAM, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 84, shooting: 90, passing: 91, dribbling: 93, defending: 38, physical: 60 } },
  { name: "Henry", pos: Position.ST, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 93, shooting: 90, passing: 82, dribbling: 89, defending: 35, physical: 78 } },
  { name: "Eusébio", pos: Position.ST, age: 27, rating: 91, potential: calculatePotential(91, 27), value: calculateValue(91, 27, calculatePotential(91, 27)), stats: { pace: 92, shooting: 94, passing: 84, dribbling: 91, defending: 44, physical: 77 } },
  { name: "Carlos Alberto", pos: Position.RB, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 89, shooting: 84, passing: 75, dribbling: 80, defending: 85, physical: 88 } },
  { name: "Baresi", pos: Position.CB, age: 29, rating: 91, potential: calculatePotential(91, 29), value: calculateValue(91, 29, calculatePotential(91, 29)), stats: { pace: 73, shooting: 48, passing: 75, dribbling: 74, defending: 95, physical: 83 } },
  { name: "Cafu", pos: Position.RB, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 90, shooting: 56, passing: 83, dribbling: 85, defending: 88, physical: 83 } },
  { name: "Buffon", pos: Position.GK, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 53, shooting: 78, passing: 63, dribbling: 91, defending: 95, physical: 89 } },
  { name: "Van Basten", pos: Position.ST, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 84, shooting: 92, passing: 80, dribbling: 88, defending: 47, physical: 84 } },
  { name: "Kahn", pos: Position.GK, age: 29, rating: 91, potential: calculatePotential(91, 29), value: calculateValue(91, 29, calculatePotential(91, 29)), stats: { pace: 53, shooting: 86, passing: 70, dribbling: 91, defending: 96, physical: 89 } },
  { name: "Ibrahimović", pos: Position.ST, age: 28, rating: 91, potential: calculatePotential(91, 28), value: calculateValue(91, 28, calculatePotential(91, 28)), stats: { pace: 84, shooting: 92, passing: 90, dribbling: 90, defending: 46, physical: 89 } },

  // === 90 ===
  { name: "Roberto Carlos", pos: Position.LB, age: 28, rating: 90, potential: calculatePotential(90, 28), value: calculateValue(90, 28, calculatePotential(90, 28)), stats: { pace: 91, shooting: 83, passing: 83, dribbling: 80, defending: 85, physical: 86 } },
  { name: "Bergkamp", pos: Position.ST, age: 28, rating: 90, potential: calculatePotential(90, 28), value: calculateValue(90, 28, calculatePotential(90, 28)), stats: { pace: 83, shooting: 89, passing: 84, dribbling: 88, defending: 38, physical: 76 } },
  { name: "Rivaldo", pos: Position.LW, age: 27, rating: 90, potential: calculatePotential(90, 27), value: calculateValue(90, 27, calculatePotential(90, 27)), stats: { pace: 87, shooting: 88, passing: 87, dribbling: 91, defending: 42, physical: 75 } },
  { name: "Best", pos: Position.RW, age: 27, rating: 90, potential: calculatePotential(90, 27), value: calculateValue(90, 27, calculatePotential(90, 27)), stats: { pace: 91, shooting: 89, passing: 82, dribbling: 92, defending: 56, physical: 68 } },
  { name: "Gullit", pos: Position.CAM, age: 28, rating: 90, potential: calculatePotential(90, 28), value: calculateValue(90, 28, calculatePotential(90, 28)), stats: { pace: 85, shooting: 88, passing: 88, dribbling: 86, defending: 80, physical: 87 } },
  { name: "Raúl", pos: Position.ST, age: 27, rating: 90, potential: calculatePotential(90, 27), value: calculateValue(90, 27, calculatePotential(90, 27)), stats: { pace: 86, shooting: 90, passing: 84, dribbling: 85, defending: 45, physical: 72 } },
  { name: "Pirlo", pos: Position.CM, age: 28, rating: 90, potential: calculatePotential(90, 28), value: calculateValue(90, 28, calculatePotential(90, 28)), stats: { pace: 73, shooting: 79, passing: 93, dribbling: 89, defending: 66, physical: 66 } },
  { name: "Casillas", pos: Position.GK, age: 27, rating: 90, potential: calculatePotential(90, 27), value: calculateValue(90, 27, calculatePotential(90, 27)), stats: { pace: 53, shooting: 70, passing: 63, dribbling: 90, defending: 95, physical: 88 } },
  { name: "Matthäus", pos: Position.CM, age: 28, rating: 90, potential: calculatePotential(90, 28), value: calculateValue(90, 28, calculatePotential(90, 28)), stats: { pace: 88, shooting: 87, passing: 88, dribbling: 81, defending: 89, physical: 82 } },
  { name: "Moore", pos: Position.CB, age: 29, rating: 90, potential: calculatePotential(90, 29), value: calculateValue(90, 29, calculatePotential(90, 29)), stats: { pace: 70, shooting: 62, passing: 81, dribbling: 76, defending: 92, physical: 83 } },
  { name: "Del Piero", pos: Position.CAM, age: 26, rating: 90, potential: calculatePotential(90, 26), value: calculateValue(90, 26, calculatePotential(90, 26)), stats: { pace: 83, shooting: 90, passing: 87, dribbling: 91, defending: 41, physical: 66 } },
  { name: "Kroos", pos: Position.CM, age: 28, rating: 90, potential: calculatePotential(90, 28), value: calculateValue(90, 28, calculatePotential(90, 28)), stats: { pace: 71, shooting: 82, passing: 91, dribbling: 86, defending: 76, physical: 74 } },

  // === 88 ===
  { name: "Scholes", pos: Position.CM, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 74, shooting: 86, passing: 89, dribbling: 78, defending: 62, physical: 80 } },
  { name: "Klose", pos: Position.ST, age: 27, rating: 88, potential: calculatePotential(88, 27), value: calculateValue(88, 27, calculatePotential(88, 27)), stats: { pace: 83, shooting: 90, passing: 73, dribbling: 80, defending: 40, physical: 79 } },
  { name: "Hagi", pos: Position.CAM, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 82, shooting: 86, passing: 88, dribbling: 87, defending: 41, physical: 64 } },
  { name: "Thuram", pos: Position.RB, age: 29, rating: 88, potential: calculatePotential(88, 29), value: calculateValue(88, 29, calculatePotential(88, 29)), stats: { pace: 88, shooting: 58, passing: 76, dribbling: 75, defending: 90, physical: 90 } },
  { name: "Vieira", pos: Position.CDM, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 88, shooting: 70, passing: 82, dribbling: 80, defending: 88, physical: 90 } },
  { name: "Van Der Sar", pos: Position.GK, age: 29, rating: 88, potential: calculatePotential(88, 29), value: calculateValue(88, 29, calculatePotential(88, 29)), stats: { pace: 33, shooting: 78, passing: 79, dribbling: 69, defending: 95, physical: 92 } },
  { name: "Blanc", pos: Position.CB, age: 29, rating: 88, potential: calculatePotential(88, 29), value: calculateValue(88, 29, calculatePotential(88, 29)), stats: { pace: 78, shooting: 67, passing: 76, dribbling: 90, defending: 85, physical: 84 } },
  { name: "Desailly", pos: Position.CB, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 76, shooting: 58, passing: 65, dribbling: 66, defending: 88, physical: 90 } },
  { name: "Fernando Hierro", pos: Position.CB, age: 29, rating: 88, potential: calculatePotential(88, 29), value: calculateValue(88, 29, calculatePotential(88, 29)), stats: { pace: 74, shooting: 67, passing: 74, dribbling: 69, defending: 92, physical: 84 } },
  { name: "Laudrup", pos: Position.LW, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 84, shooting: 80, passing: 80, dribbling: 89, defending: 40, physical: 63 } },
  { name: "Owen", pos: Position.ST, age: 26, rating: 88, potential: calculatePotential(88, 26), value: calculateValue(88, 26, calculatePotential(88, 26)), stats: { pace: 89, shooting: 89, passing: 72, dribbling: 85, defending: 35, physical: 66 } },
  { name: "Gerrard", pos: Position.CM, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 78, shooting: 88, passing: 88, dribbling: 83, defending: 75, physical: 82 } },
  { name: "Chiellini", pos: Position.CB, age: 29, rating: 88, potential: calculatePotential(88, 29), value: calculateValue(88, 29, calculatePotential(88, 29)), stats: { pace: 55, shooting: 62, passing: 63, dribbling: 62, defending: 93, physical: 89 } },
  { name: "Cech", pos: Position.GK, age: 29, rating: 88, potential: calculatePotential(88, 29), value: calculateValue(88, 29, calculatePotential(88, 29)), stats: { pace: 33, shooting: 76, passing: 58, dribbling: 84, defending: 95, physical: 90 } },
  { name: "Shevchenko", pos: Position.ST, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 90, shooting: 91, passing: 75, dribbling: 85, defending: 33, physical: 73 } },
  { name: "Rooney", pos: Position.ST, age: 26, rating: 88, potential: calculatePotential(88, 26), value: calculateValue(88, 26, calculatePotential(88, 26)), stats: { pace: 82, shooting: 88, passing: 83, dribbling: 85, defending: 45, physical: 87 } },
  { name: "Koeman", pos: Position.CB, age: 29, rating: 88, potential: calculatePotential(88, 29), value: calculateValue(88, 29, calculatePotential(88, 29)), stats: { pace: 76, shooting: 94, passing: 85, dribbling: 81, defending: 86, physical: 87 } },
  { name: "Beckham", pos: Position.CM, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 83, shooting: 85, passing: 92, dribbling: 86, defending: 60, physical: 80 } },
  { name: "Schweinsteiger", pos: Position.CM, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 76, shooting: 83, passing: 86, dribbling: 83, defending: 83, physical: 83 } },
  { name: "Nedvěd", pos: Position.LM, age: 28, rating: 88, potential: calculatePotential(88, 28), value: calculateValue(88, 28, calculatePotential(88, 28)), stats: { pace: 84, shooting: 84, passing: 86, dribbling: 87, defending: 58, physical: 77 } },
  { name: "Ferdinand", pos: Position.CB, age: 27, rating: 88, potential: calculatePotential(88, 27), value: calculateValue(88, 27, calculatePotential(88, 27)), stats: { pace: 82, shooting: 45, passing: 64, dribbling: 80, defending: 90, physical: 85 } },
  { name: "Ribéry", pos: Position.LW, age: 27, rating: 88, potential: calculatePotential(88, 27), value: calculateValue(88, 27, calculatePotential(88, 27)), stats: { pace: 89, shooting: 85, passing: 85, dribbling: 90, defending: 37, physical: 65 } },
  { name: "Riquelme", pos: Position.CAM, age: 27, rating: 88, potential: calculatePotential(88, 27), value: calculateValue(88, 27, calculatePotential(88, 27)), stats: { pace: 71, shooting: 84, passing: 90, dribbling: 90, defending: 33, physical: 66 } },
  { name: "Van Persie", pos: Position.ST, age: 26, rating: 88, potential: calculatePotential(88, 26), value: calculateValue(88, 26, calculatePotential(88, 26)), stats: { pace: 84, shooting: 91, passing: 84, dribbling: 85, defending: 43, physical: 73 } },
  { name: "Bale", pos: Position.RW, age: 26, rating: 88, potential: calculatePotential(88, 26), value: calculateValue(88, 26, calculatePotential(88, 26)), stats: { pace: 95, shooting: 88, passing: 84, dribbling: 86, defending: 40, physical: 79 } },

  // === 87 ===
  { name: "Rush", pos: Position.ST, age: 27, rating: 87, potential: calculatePotential(87, 27), value: calculateValue(87, 27, calculatePotential(87, 27)), stats: { pace: 84, shooting: 89, passing: 69, dribbling: 83, defending: 43, physical: 78 } },
  { name: "Vidić", pos: Position.CB, age: 27, rating: 87, potential: calculatePotential(87, 27), value: calculateValue(87, 27, calculatePotential(87, 27)), stats: { pace: 62, shooting: 52, passing: 62, dribbling: 56, defending: 90, physical: 89 } },
  { name: "Makélélé", pos: Position.CDM, age: 28, rating: 87, potential: calculatePotential(87, 28), value: calculateValue(87, 28, calculatePotential(87, 28)), stats: { pace: 81, shooting: 48, passing: 76, dribbling: 78, defending: 86, physical: 86 } },
  { name: "Rijkaard", pos: Position.CDM, age: 28, rating: 87, potential: calculatePotential(87, 28), value: calculateValue(87, 28, calculatePotential(87, 28)), stats: { pace: 77, shooting: 73, passing: 80, dribbling: 77, defending: 87, physical: 86 } },
  { name: "Šuker", pos: Position.ST, age: 27, rating: 87, potential: calculatePotential(87, 27), value: calculateValue(87, 27, calculatePotential(87, 27)), stats: { pace: 83, shooting: 89, passing: 78, dribbling: 83, defending: 43, physical: 75 } },
  { name: "Barnes", pos: Position.LW, age: 26, rating: 87, potential: calculatePotential(87, 26), value: calculateValue(87, 26, calculatePotential(87, 26)), stats: { pace: 89, shooting: 85, passing: 83, dribbling: 89, defending: 44, physical: 83 } },
  { name: "Zola", pos: Position.CAM, age: 27, rating: 87, potential: calculatePotential(87, 27), value: calculateValue(87, 27, calculatePotential(87, 27)), stats: { pace: 85, shooting: 88, passing: 85, dribbling: 89, defending: 41, physical: 63 } },
  { name: "Kluivert", pos: Position.ST, age: 26, rating: 87, potential: calculatePotential(87, 26), value: calculateValue(87, 26, calculatePotential(87, 26)), stats: { pace: 86, shooting: 88, passing: 81, dribbling: 84, defending: 43, physical: 79 } },
  { name: "Wright", pos: Position.ST, age: 27, rating: 87, potential: calculatePotential(87, 27), value: calculateValue(87, 27, calculatePotential(87, 27)), stats: { pace: 88, shooting: 89, passing: 69, dribbling: 81, defending: 40, physical: 76 } },
  { name: "Xabi Alonso", pos: Position.CDM, age: 28, rating: 87, potential: calculatePotential(87, 28), value: calculateValue(87, 28, calculatePotential(87, 28)), stats: { pace: 71, shooting: 77, passing: 88, dribbling: 78, defending: 71, physical: 79 } },
  { name: "Petit", pos: Position.CDM, age: 28, rating: 87, potential: calculatePotential(87, 28), value: calculateValue(87, 28, calculatePotential(87, 28)), stats: { pace: 77, shooting: 79, passing: 77, dribbling: 76, defending: 89, physical: 80 } },
  { name: "Lampard", pos: Position.CM, age: 28, rating: 87, potential: calculatePotential(87, 28), value: calculateValue(87, 28, calculatePotential(87, 28)), stats: { pace: 76, shooting: 88, passing: 86, dribbling: 84, defending: 36, physical: 82 } },
  { name: "Fernando Torres", pos: Position.ST, age: 26, rating: 87, potential: calculatePotential(87, 26), value: calculateValue(87, 26, calculatePotential(87, 26)), stats: { pace: 89, shooting: 87, passing: 75, dribbling: 85, defending: 43, physical: 78 } },
  { name: "Pirès", pos: Position.LM, age: 28, rating: 87, potential: calculatePotential(87, 28), value: calculateValue(87, 28, calculatePotential(87, 28)), stats: { pace: 76, shooting: 79, passing: 84, dribbling: 86, defending: 36, physical: 64 } },

  // === 86 ===
  { name: "Verón", pos: Position.CM, age: 28, rating: 86, potential: calculatePotential(86, 28), value: calculateValue(86, 28, calculatePotential(86, 28)), stats: { pace: 75, shooting: 81, passing: 86, dribbling: 81, defending: 73, physical: 81 } },
  { name: "Hernández", pos: Position.ST, age: 27, rating: 86, potential: calculatePotential(86, 27), value: calculateValue(86, 27, calculatePotential(86, 27)), stats: { pace: 89, shooting: 85, passing: 71, dribbling: 86, defending: 45, physical: 67 } },
  { name: "Gattuso", pos: Position.CDM, age: 28, rating: 86, potential: calculatePotential(86, 28), value: calculateValue(86, 28, calculatePotential(86, 28)), stats: { pace: 73, shooting: 62, passing: 79, dribbling: 70, defending: 87, physical: 87 } },
  { name: "Larsson", pos: Position.ST, age: 26, rating: 86, potential: calculatePotential(86, 26), value: calculateValue(86, 26, calculatePotential(86, 26)), stats: { pace: 87, shooting: 86, passing: 73, dribbling: 82, defending: 45, physical: 71 } },
  { name: "Cole", pos: Position.ST, age: 27, rating: 86, potential: calculatePotential(86, 27), value: calculateValue(86, 27, calculatePotential(86, 27)), stats: { pace: 87, shooting: 65, passing: 79, dribbling: 80, defending: 84, physical: 77 } },
  { name: "Crespo", pos: Position.ST, age: 27, rating: 86, potential: calculatePotential(86, 27), value: calculateValue(86, 27, calculatePotential(86, 27)), stats: { pace: 86, shooting: 90, passing: 75, dribbling: 85, defending: 36, physical: 70 } },
  { name: "Campbell", pos: Position.CB, age: 28, rating: 86, potential: calculatePotential(86, 28), value: calculateValue(86, 28, calculatePotential(86, 28)), stats: { pace: 80, shooting: 58, passing: 58, dribbling: 57, defending: 87, physical: 86 } },
  { name: "Zambrotta", pos: Position.RB, age: 29, rating: 86, potential: calculatePotential(86, 29), value: calculateValue(86, 29, calculatePotential(86, 29)), stats: { pace: 83, shooting: 69, passing: 80, dribbling: 81, defending: 84, physical: 84 } },
  { name: "Keane", pos: Position.CM, age: 28, rating: 86, potential: calculatePotential(86, 28), value: calculateValue(86, 28, calculatePotential(86, 28)), stats: { pace: 72, shooting: 69, passing: 82, dribbling: 75, defending: 84, physical: 86 } },
  { name: "Essien", pos: Position.CDM, age: 27, rating: 86, potential: calculatePotential(86, 27), value: calculateValue(86, 27, calculatePotential(86, 27)), stats: { pace: 82, shooting: 73, passing: 77, dribbling: 78, defending: 85, physical: 86 } },
  { name: "Cha Bum Kun", pos: Position.ST, age: 26, rating: 86, potential: calculatePotential(86, 26), value: calculateValue(86, 26, calculatePotential(86, 26)), stats: { pace: 85, shooting: 78, passing: 78, dribbling: 84, defending: 36, physical: 83 } },
];

/**
 * Check if a player is in the legendary players list
 */
export const isLegendaryPlayer = (playerName: string): boolean => {
  return players90plus.some(p => p.name === playerName);
};

/**
 * Get rarity tier based on rating
 */
export const getRarityTier = (rating: number): 'legendary' | 'epic' | 'rare' | 'common' => {
  if (rating >= 93) return 'legendary';
  if (rating >= 91) return 'epic';
  if (rating >= 90) return 'rare';
  return 'common';
};

/**
 * Pack types with different rating ranges
 */
export type PackType = 'premium' | 'elite' | 'standard';

export interface PackInfo {
  name: string;
  minRating: number;
  maxRating: number;
  cost: number;
  dropRates: {
    legendary?: number;
    epic?: number;
    rare?: number;
    common?: number;
  };
}

export const PACK_TYPES: Record<PackType, PackInfo> = {
  premium: {
    name: 'Premium Pack',
    minRating: 90,
    maxRating: 99,
    cost: 0, // Free - requires premium ticket
    dropRates: {
      legendary: 0.05, // 5% chance for 93+ rating
      epic: 0.15,      // 15% chance for 91-92 rating
      rare: 0.80       // 80% chance for 90 rating
    }
  },
  elite: {
    name: 'Elite Pack',
    minRating: 88,
    maxRating: 89,
    cost: 100000000, // 100M
    dropRates: {
      epic: 0.20,   // 20% chance for 88 rating
      common: 0.80  // 80% chance for 87 rating
    }
  },
  standard: {
    name: 'Standard Pack',
    minRating: 86,
    maxRating: 87,
    cost: 40000000, // 40M
    dropRates: {
      rare: 0.30,   // 30% chance for 87 rating
      common: 0.70  // 70% chance for 86 rating
    }
  }
};

/**
 * Get drop rates for a specific pack type
 */
export const getDropRates = (packType: PackType = 'premium') => {
  return PACK_TYPES[packType].dropRates;
};

/**
 * Draw a random legendary player based on pack type and drop rates
 * @param packType - Type of pack to draw from
 * @param excludePlayerNames - Array of player names to exclude (already opened)
 */
export const drawLegendaryPlayer = (packType: PackType = 'premium', excludePlayerNames: string[] = []): LegendaryPlayer => {
  const pack = PACK_TYPES[packType];
  const rates = pack.dropRates;
  const roll = Math.random();
  
  let selectedPool: LegendaryPlayer[];
  
  if (packType === 'premium') {
    // Premium pack: 90+ players
    if (roll < (rates.legendary || 0)) {
      // Legendary (93+)
      selectedPool = players90plus.filter(p => p.rating >= 93 && !excludePlayerNames.includes(p.name));
    } else if (roll < (rates.legendary || 0) + (rates.epic || 0)) {
      // Epic (91-92)
      selectedPool = players90plus.filter(p => p.rating >= 91 && p.rating < 93 && !excludePlayerNames.includes(p.name));
    } else if (roll < (rates.legendary || 0) + (rates.epic || 0) + (rates.rare || 0)) {
      // Rare (90)
      selectedPool = players90plus.filter(p => p.rating === 90 && !excludePlayerNames.includes(p.name));
    } else {
      // Common (88) - but this shouldn't happen in premium pack, fallback to 90
      selectedPool = players90plus.filter(p => p.rating === 90 && !excludePlayerNames.includes(p.name));
    }
  } else if (packType === 'elite') {
    // Elite pack: 88-89 players
    if (roll < (rates.epic || 0)) {
      // Epic (88)
      selectedPool = players90plus.filter(p => p.rating === 88 && !excludePlayerNames.includes(p.name));
    } else {
      // Common (87)
      selectedPool = players90plus.filter(p => p.rating === 87 && !excludePlayerNames.includes(p.name));
    }
  } else {
    // Standard pack: 86-87 players
    if (roll < (rates.rare || 0)) {
      // Rare (87)
      selectedPool = players90plus.filter(p => p.rating === 87 && !excludePlayerNames.includes(p.name));
    } else {
      // Common (86)
      selectedPool = players90plus.filter(p => p.rating === 86 && !excludePlayerNames.includes(p.name));
    }
  }
  
  // If pool is empty after filtering, try without exclusion for that rating range
  if (selectedPool.length === 0) {
    // Try with original rating range but without exclusion
    if (packType === 'premium') {
      if (roll < (rates.legendary || 0)) {
        selectedPool = players90plus.filter(p => p.rating >= 93);
      } else if (roll < (rates.legendary || 0) + (rates.epic || 0)) {
        selectedPool = players90plus.filter(p => p.rating >= 91 && p.rating < 93);
      } else {
        selectedPool = players90plus.filter(p => p.rating === 90);
      }
    } else if (packType === 'elite') {
      if (roll < (rates.epic || 0)) {
        selectedPool = players90plus.filter(p => p.rating === 88);
      } else {
        selectedPool = players90plus.filter(p => p.rating === 87);
      }
    } else {
      if (roll < (rates.rare || 0)) {
        selectedPool = players90plus.filter(p => p.rating === 87);
      } else {
        selectedPool = players90plus.filter(p => p.rating === 86);
      }
    }
  }
  
  // If pool is still empty, fallback to random from pack range
  if (selectedPool.length === 0) {
    selectedPool = players90plus.filter(p => p.rating >= pack.minRating && p.rating <= pack.maxRating);
  }
  
  // If still empty, fallback to any player in range
  if (selectedPool.length === 0) {
    selectedPool = players90plus;
  }
  
  // Return random player from selected pool
  return selectedPool[Math.floor(Math.random() * selectedPool.length)];
};
