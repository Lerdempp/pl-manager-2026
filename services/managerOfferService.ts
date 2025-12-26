import { Team, ManagerOffer, SeasonSummary } from '../types';

/**
 * Generates manager job offers based on season performance
 * Better performance = better team offers
 */
export function generateManagerOffers(
    currentTeamId: string,
    teams: Team[],
    seasonSummary: SeasonSummary | null,
    currentTeamName: string
): ManagerOffer[] {
    const offers: ManagerOffer[] = [];
    
    if (!seasonSummary) {
        // If no season summary, only low-tier offers
        return generateLowTierOffers(currentTeamId, teams, currentTeamName);
    }
    
    const rank = seasonSummary.rank;
    const isChampion = rank === 1;
    const isTop3 = rank <= 3;
    const isTop6 = rank <= 6;
    const isTopHalf = rank <= 10;
    
    // Filter out current team
    const availableTeams = teams.filter(t => t.id !== currentTeamId);
    
    // Elite offers (top teams) - Only for champions or top 3
    if (isChampion || isTop3) {
        const eliteTeams = availableTeams
            .filter(t => t.baseRating >= 80)
            .sort((a, b) => b.baseRating - a.baseRating)
            .slice(0, Math.random() < 0.7 ? 2 : 1); // 70% chance of 2 offers, 30% chance of 1
        
        eliteTeams.forEach(team => {
            const reason = isChampion 
                ? `offerReasonChampionshipWinner|${currentTeamName}`
                : `offerReasonTop3Finish|${rank}`;
            
            offers.push({
                id: `offer-${Date.now()}-${Math.random()}`,
                teamId: team.id,
                teamName: team.name,
                teamRating: team.baseRating,
                teamBudget: team.budget,
                offerReason: reason,
                prestige: 'ELITE'
            });
        });
    }
    
    // High tier offers (good teams) - For top 6 or champions
    if (isTop6 || isChampion) {
        const highTierTeams = availableTeams
            .filter(t => t.baseRating >= 70 && t.baseRating < 80)
            .sort((a, b) => b.baseRating - a.baseRating)
            .slice(0, Math.random() < 0.6 ? 2 : 1);
        
        highTierTeams.forEach(team => {
            const reason = isChampion
                ? 'offerReasonChampionshipImpressive'
                : 'offerReasonTop6Finish';
            
            offers.push({
                id: `offer-${Date.now()}-${Math.random()}`,
                teamId: team.id,
                teamName: team.name,
                teamRating: team.baseRating,
                teamBudget: team.budget,
                offerReason: reason,
                prestige: 'HIGH'
            });
        });
    }
    
    // Medium tier offers - For top half or better
    if (isTopHalf || isTop6) {
        const mediumTierTeams = availableTeams
            .filter(t => t.baseRating >= 60 && t.baseRating < 70)
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.random() < 0.5 ? 2 : 1);
        
        mediumTierTeams.forEach(team => {
            offers.push({
                id: `offer-${Date.now()}-${Math.random()}`,
                teamId: team.id,
                teamName: team.name,
                teamRating: team.baseRating,
                teamBudget: team.budget,
                offerReason: isTopHalf ? `offerReasonSolidSeason|${rank}` : 'offerReasonGoodPerformance',
                prestige: 'MEDIUM'
            });
        });
    }
    
    // Low tier offers - Always available
    const lowTierTeams = availableTeams
        .filter(t => t.baseRating < 60)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.random() < 0.4 ? 1 : 0);
    
    lowTierTeams.forEach(team => {
        offers.push({
            id: `offer-${Date.now()}-${Math.random()}`,
            teamId: team.id,
            teamName: team.name,
            teamRating: team.baseRating,
            teamBudget: team.budget,
            offerReason: rank <= 15 ? 'offerReasonLookingForLeadership' : 'offerReasonRebuilding',
            prestige: 'LOW'
        });
    });
    
    // If no offers generated, at least generate one low-tier offer
    if (offers.length === 0) {
        return generateLowTierOffers(currentTeamId, teams, currentTeamName);
    }
    
    // Shuffle offers so they're not always in prestige order
    return offers.sort(() => Math.random() - 0.5);
}

function generateLowTierOffers(
    currentTeamId: string,
    teams: Team[],
    currentTeamName: string
): ManagerOffer[] {
    const availableTeams = teams
        .filter(t => t.id !== currentTeamId && t.baseRating < 65)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.random() < 0.5 ? 1 : 0);
    
    return availableTeams.map(team => ({
        id: `offer-${Date.now()}-${Math.random()}`,
        teamId: team.id,
        teamName: team.name,
        teamRating: team.baseRating,
        teamBudget: team.budget,
        offerReason: 'offerReasonNewOpportunity',
        prestige: 'LOW' as const
    }));
}

