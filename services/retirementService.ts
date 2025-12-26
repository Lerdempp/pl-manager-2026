import { Player, Position } from '../types';

/**
 * Get retirement age range based on player position
 */
export const getRetirementAgeRange = (position: Position): { min: number; max: number } => {
  // Forwards / Wingers / Attacking roles: 33-36
  if ([Position.ST, Position.CF, Position.LW, Position.RW, Position.CAM].includes(position)) {
    return { min: 33, max: 36 };
  }
  
  // Midfielders - Defensive roles: 34-37
  if ([Position.CDM, Position.CM, Position.LM, Position.RM].includes(position)) {
    return { min: 34, max: 37 };
  }
  
  // Defenders (CB, LB, RB, LWB, RWB): 35-38
  if ([Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(position)) {
    return { min: 35, max: 38 };
  }
  
  // Goalkeepers: 36-40 (2 years later than others)
  if (position === Position.GK) {
    return { min: 36, max: 40 };
  }
  
  // Default fallback
  return { min: 34, max: 37 };
};

/**
 * Get retirement probability based on age
 * Goalkeepers have 2-year delay
 */
export const getRetirementProbability = (age: number, position: Position): number => {
  const isGoalkeeper = position === Position.GK;
  const adjustedAge = isGoalkeeper ? age - 2 : age;
  
  const probabilities: Record<number, number> = {
    34: 0.05,
    35: 0.10,
    36: 0.20,
    37: 0.35,
    38: 0.50,
    39: 0.70,
    40: 0.90,
  };
  
  if (adjustedAge < 34) return 0;
  if (adjustedAge >= 40) return 0.90;
  
  return probabilities[adjustedAge] || 0;
};

/**
 * Check if player should consider retirement at season start
 */
export const checkPlayerRetirement = (player: Player): boolean => {
  // Skip if already announced retirement
  if (player.retirement?.retirementAnnounced) return false;
  
  // Skip if already persuaded to continue
  if (player.retirement?.persuasionSuccessful) return false;
  
  const ageRange = getRetirementAgeRange(player.position);
  
  // Player must be within retirement age range
  if (player.age < ageRange.min || player.age > ageRange.max) {
    return false;
  }
  
  // Calculate retirement probability
  const probability = getRetirementProbability(player.age, player.position);
  
  // Roll for retirement
  return Math.random() < probability;
};

/**
 * Attempt to persuade player to continue playing
 * Success rate depends on player's rating and age
 */
export const attemptPersuasion = (player: Player): boolean => {
  if (!player.retirement?.consideringRetirement) return false;
  
  // Base success rate: 50%
  let successRate = 0.50;
  
  // Higher rated players are easier to persuade (they enjoy playing more)
  if (player.rating >= 85) successRate += 0.20;
  else if (player.rating >= 75) successRate += 0.10;
  else if (player.rating < 65) successRate -= 0.10;
  
  // Younger players in retirement range are easier to persuade
  const ageRange = getRetirementAgeRange(player.position);
  const ageProgress = (player.age - ageRange.min) / (ageRange.max - ageRange.min);
  if (ageProgress < 0.5) successRate += 0.15; // First half of range
  else if (ageProgress > 0.8) successRate -= 0.15; // Near max age
  
  // Clamp between 10% and 90%
  successRate = Math.max(0.10, Math.min(0.90, successRate));
  
  return Math.random() < successRate;
};

/**
 * Get players considering retirement from a team
 */
export const getPlayersConsideringRetirement = (players: Player[]): Player[] => {
  return players.filter(p => p.retirement?.consideringRetirement && !p.retirement?.retirementAnnounced);
};

