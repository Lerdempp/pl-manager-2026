import { Team, Player } from '../types';

/**
 * Selects a captain for a team with a balanced approach:
 * - Sometimes chooses an experienced veteran (aged 28+ with high rating)
 * - Sometimes chooses a young promising star (aged 21-24 with high potential)
 * - Balances between experience and potential based on team composition
 */
export const selectCaptain = (team: Team): Player | null => {
    if (!team || !team.players || team.players.length === 0) {
        return null;
    }

    // Separate players into different categories
    const veterans = team.players.filter(p => p && p.age >= 28 && p.rating >= 70);
    const youngStars = team.players.filter(p => p && p.age >= 21 && p.age <= 24 && p.rating >= 70 && p.potential >= 80);
    const experiencedLeaders = team.players.filter(p => p && p.age >= 26 && p.rating >= 75);
    const risingStars = team.players.filter(p => p && p.age >= 18 && p.age <= 23 && p.rating >= 75 && p.potential >= 85);

    // Calculate team composition scores
    const hasStrongVeterans = veterans.length >= 2;
    const hasPromisingYouth = youngStars.length >= 2 || risingStars.length >= 2;
    const hasExperiencedCore = experiencedLeaders.length >= 3;

    // Decision logic: 60% chance to choose veteran, 40% chance to choose young star
    // But this can be adjusted based on team composition
    const roll = Math.random();

    if (roll < 0.6 && hasStrongVeterans) {
        // Choose a veteran captain (aged 28+ with highest rating and experience)
        const bestVeteran = veterans
            .sort((a, b) => {
                // Prioritize: rating > age (older = more experienced)
                if (b.rating !== a.rating) return b.rating - a.rating;
                return b.age - a.age;
            })[0];
        
        if (bestVeteran) return bestVeteran;
    }

    // If no suitable veteran or roll favored young star, choose a young star
    if (hasPromisingYouth && (youngStars.length > 0 || risingStars.length > 0)) {
        // Choose best young star (high potential and rating)
        const candidates = [...youngStars, ...risingStars];
        const bestYoungStar = candidates
            .sort((a, b) => {
                // Prioritize: rating > potential
                if (b.rating !== a.rating) return b.rating - a.rating;
                return b.potential - a.potential;
            })[0];
        
        if (bestYoungStar) return bestYoungStar;
    }

    // Fallback: choose highest rated player regardless of age
    const validPlayers = team.players.filter(p => p && p.rating !== undefined);
    if (validPlayers.length === 0) {
        return null;
    }
    
    const bestPlayer = validPlayers
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    
    return bestPlayer || null;
};

/**
 * Selects a captain for a team with a specific strategy
 */
export const selectCaptainWithStrategy = (
    team: Team,
    strategy: 'veteran' | 'young_star' | 'balanced'
): Player | null => {
    if (!team.players || team.players.length === 0) {
        return null;
    }

    if (strategy === 'veteran') {
        // Choose oldest experienced player (28+ with good rating)
        const veterans = team.players
            .filter(p => p.age >= 28 && p.rating >= 70)
            .sort((a, b) => {
                if (b.rating !== a.rating) return b.rating - a.rating;
                return b.age - a.age; // Older is better for veteran
            });
        
        return veterans[0] || null;
    }

    if (strategy === 'young_star') {
        // Choose best young player (21-24 with high potential)
        const youngStars = team.players
            .filter(p => p.age >= 18 && p.age <= 24 && p.rating >= 70 && p.potential >= 80)
            .sort((a, b) => {
                if (b.rating !== a.rating) return b.rating - a.rating;
                return b.potential - a.potential;
            });
        
        return youngStars[0] || null;
    }

    // Balanced strategy (default)
    return selectCaptain(team);
};

/**
 * Gets the current captain of a team
 */
export const getCaptain = (team: Team): Player | null => {
    if (!team.captainId) return null;
    return team.players.find(p => p.id === team.captainId) || null;
};

/**
 * Sets a new captain for a team
 */
export const setCaptain = (team: Team, playerId: string): Team => {
    return {
        ...team,
        captainId: playerId
    };
};

