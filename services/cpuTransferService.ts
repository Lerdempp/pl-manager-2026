import { Team, Player, Position } from '../types';
import { generateYouthPlayer } from './geminiService';
import { enforceSquadSizeRule } from './squadSizeService';

export interface TransferRecord {
  id: string;
  playerName: string;
  fromTeam: string;
  toTeam: string;
  fee: number;
  type: 'TRANSFER' | 'YOUTH' | 'FREE';
  date: string; // Season year
  week?: number;
}

/**
 * Add youth players to teams that lost players due to retirement
 */
export const replenishTeamsWithYouth = (teams: Team[], seasonYear: string): { updatedTeams: Team[], transfers: TransferRecord[] } => {
  const updatedTeams = teams.map(team => ({ ...team, players: [...team.players] }));
  const transfers: TransferRecord[] = [];
  
  updatedTeams.forEach(team => {
    const beforeSize = team.players.length;
    
    // Enforce squad size rule (20-25 players)
    const teamWithCorrectSize = enforceSquadSizeRule(team);
    team.players = teamWithCorrectSize.players;
    
    // Track added youth players for transfer records
    const afterSize = team.players.length;
    const playersAdded = afterSize - beforeSize;
    
    if (playersAdded > 0) {
      // Get the newly added players (last playersAdded players)
      const newPlayers = team.players.slice(-playersAdded);
      
      newPlayers.forEach(youthPlayer => {
        transfers.push({
          id: `transfer-${Date.now()}-${Math.random()}`,
          playerName: youthPlayer.name,
          fromTeam: 'Youth Academy',
          toTeam: team.name,
          fee: 0,
          type: 'YOUTH',
          date: seasonYear
        });
      });
    }
  });
  
  return { updatedTeams, transfers };
};

/**
 * CPU teams make transfers between each other
 */
export const processCPUTransfers = (teams: Team[], userTeamId: string, seasonYear: string, week: number): { updatedTeams: Team[], transfers: TransferRecord[] } => {
  const updatedTeams = teams.map(team => ({ ...team, players: [...team.players] }));
  const transfers: TransferRecord[] = [];
  
  // Filter out user team
  const cpuTeams = updatedTeams.filter(t => t.id !== userTeamId);
  
  // Each CPU team has a chance to make a transfer
  cpuTeams.forEach(buyerTeam => {
    // Calculate budget ratio once (normalized to 500M max)
    const budgetRatio = Math.min(1, buyerTeam.budget / 500000000);
    
    // Dynamic chance based on budget - teams with more budget are more likely to spend
    // Base chance: 30%, increases with budget
    const baseChance = 0.3; // 30% base chance
    const budgetBonus = budgetRatio * 0.4; // Up to 40% bonus for high budget teams
    const transferChance = baseChance + budgetBonus; // 30-70% chance
    
    if (Math.random() < transferChance) {
      // Find a seller team (different from buyer)
      const potentialSellers = cpuTeams.filter(t => t.id !== buyerTeam.id && t.players.length > 18);
      
      if (potentialSellers.length === 0) return;
      
      const sellerTeam = potentialSellers[Math.floor(Math.random() * potentialSellers.length)];
      
      // Find a player to buy (prefer younger, higher potential players)
      // High budget teams are more aggressive and willing to pay more
      const availablePlayers = sellerTeam.players
        .filter(p => !p.onTransferList && !p.onLoanList)
        .sort((a, b) => {
          // Prefer younger players with higher potential
          const scoreA = (a.potential || 0) - (a.age || 30);
          const scoreB = (b.potential || 0) - (b.age || 30);
          return scoreB - scoreA;
        });
      
      if (availablePlayers.length === 0) return;
      
      // High budget teams look at better players (top 50% instead of top 30%)
      const topPlayerRatio = 0.3 + (budgetRatio * 0.2); // 30-50% of players
      const topPlayers = availablePlayers.slice(0, Math.max(1, Math.floor(availablePlayers.length * topPlayerRatio)));
      const targetPlayer = topPlayers[Math.floor(Math.random() * topPlayers.length)];
      
      // Calculate transfer fee (market value + premium)
      // Youth academy players get lower fees (teams know they're from academy)
      // High budget teams pay more (more aggressive)
      const isYouthAcademy = targetPlayer.isYouthAcademy || false;
      const basePremium = isYouthAcademy ? 0.8 : 1.2; // Youth academy: 80% of market value, Normal: 120%
      
      // High budget teams pay more premium (up to 50% more for very high budget teams)
      const budgetPremium = 1.0 + (budgetRatio * 0.5); // 1.0x to 1.5x multiplier
      const premiumMultiplier = basePremium * budgetPremium;
      
      const transferFee = Math.floor(targetPlayer.marketValue * premiumMultiplier);
      
      // High budget teams are more willing to spend (can spend up to 50% of budget on one player)
      const maxSpendable = Math.floor(buyerTeam.budget * 0.5);
      const canAfford = buyerTeam.budget >= transferFee || (buyerTeam.budget >= maxSpendable && transferFee <= maxSpendable);
      
      if (canAfford) {
        // Remove from seller
        const sellerIndex = updatedTeams.findIndex(t => t.id === sellerTeam.id);
        if (sellerIndex !== -1) {
          updatedTeams[sellerIndex].players = updatedTeams[sellerIndex].players.filter(p => p.id !== targetPlayer.id);
          updatedTeams[sellerIndex].budget += transferFee;
          updatedTeams[sellerIndex].financials.income.transfers += transferFee;
        }
        
        // Add to buyer
        const buyerIndex = updatedTeams.findIndex(t => t.id === buyerTeam.id);
        if (buyerIndex !== -1) {
          // Check if player already exists in team to prevent duplicates
          const playerExists = updatedTeams[buyerIndex].players.some(p => p.id === targetPlayer.id);
          if (playerExists) {
            console.warn(`Player ${targetPlayer.name} (${targetPlayer.id}) already exists in team ${buyerTeam.name}, skipping duplicate add`);
          } else {
            const { pendingTransfer, ...playerWithoutPending } = targetPlayer;
            updatedTeams[buyerIndex].players.push(playerWithoutPending);
            updatedTeams[buyerIndex].budget -= transferFee;
            updatedTeams[buyerIndex].financials.expenses.transfers += transferFee;
          }
        }
        
        transfers.push({
          id: `transfer-${Date.now()}-${Math.random()}`,
          playerName: targetPlayer.name,
          fromTeam: sellerTeam.name,
          toTeam: buyerTeam.name,
          fee: transferFee,
          type: 'TRANSFER',
          date: seasonYear,
          week
        });
      }
    }
  });
  
  return { updatedTeams, transfers };
};

