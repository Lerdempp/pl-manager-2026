import { Team, Player, Position, Contract } from '../types';
import { selectTraitsForPlayer } from './playerTraits';
import { calculateMarketValue } from './legendaryPlayers';

const MIN_SQUAD_SIZE = 20;
const MAX_SQUAD_SIZE = 25;
const U21_AGE_LIMIT = 21;

// Local helper function to generate youth player (avoids circular dependency with geminiService)
const createYouthPlayer = (index: number): Player => {
    const positions = [Position.GK, Position.CB, Position.LB, Position.RB, Position.CDM, Position.CM, Position.CAM, Position.LW, Position.RW, Position.ST];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const age = 15 + Math.floor(Math.random() * 4); // 15-18
    
    // Weighted Potential Logic
    const roll = Math.random();
    let potential = 70;
    if (roll < 0.03) {
        potential = 90 + Math.floor(Math.random() * 4); // 90-93
    } else if (roll < 0.13) {
        potential = 85 + Math.floor(Math.random() * 5); // 85-89
    } else if (roll < 0.43) {
        potential = 80 + Math.floor(Math.random() * 5); // 80-84
    } else {
        potential = 70 + Math.floor(Math.random() * 10); // 70-79
    }
    potential = Math.min(93, potential);
    
    const ratingMultiplier = 0.6 + Math.random() * 0.2;
    const rating = Math.floor(potential * ratingMultiplier);
    // Use the same market value calculation function for consistency
    // Youth academy players will naturally have lower value due to their lower rating and age
    const value = calculateMarketValue(rating, age, potential);

    const firstNames = ["Jack", "Harry", "George", "Charlie", "Leo", "Arthur", "Freddie", "Noah", "Oscar", "Oliver"];
    const lastNames = ["Smith", "Jones", "Williams", "Brown", "Taylor", "Davies", "Evans", "Thomas", "Roberts", "Walker"];
    const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

    const traits = selectTraitsForPlayer(pos);
    const baseWage = Math.floor(value * 0.0025);
    const wage = Math.max(500, Math.floor(baseWage + (baseWage * 0.1 * (Math.random() * 2 - 1))));
    const contract: Contract = {
        wage,
        yearsLeft: Math.floor(Math.random() * 5) + 1,
        performanceBonus: Math.floor(wage * (0.05 + Math.random() * 0.10)),
        releaseClause: Math.random() > 0.3 ? Math.floor(value * (0.6 + Math.random() * 0.2)) : undefined
    };

    // Simple attributes
    const randomOffset = (center: number, variance: number) => Math.floor(center + (Math.random() * variance * 2 - variance));
    const clamp = (val: number) => Math.max(30, Math.min(99, val));
    let pace = randomOffset(rating, 5);
    let shooting = randomOffset(rating, 5);
    let passing = randomOffset(rating, 5);
    let dribbling = randomOffset(rating, 5);
    let defending = randomOffset(rating, 5);
    let physical = randomOffset(rating, 5);

    // Generate personality traits
    // Youth players tend to be more ambitious (want success) and less greedy
    const greed = Math.floor(Math.random() * 70); // 0-70, youth players less greedy
    const ambition = Math.floor(50 + Math.random() * 50); // 50-100, youth players more ambitious

    return {
        id: `youth-${index}-${Date.now()}-${Math.random()}`,
        name,
        position: pos,
        age,
        rating,
        potential,
        marketValue: value,
        trueValue: value,
        scouted: true,
        attributes: {
            pace: clamp(pace),
            shooting: clamp(shooting),
            passing: clamp(passing),
            dribbling: clamp(dribbling),
            defending: clamp(defending),
            physical: clamp(physical)
        },
        contract,
        traits: traits && traits.length > 0 ? traits : undefined,
        personality: {
            greed,
            ambition
        },
        isYouthAcademy: true // Mark as youth academy player
    };
};

/**
 * Counts players aged 21 or older in a team
 */
export const countPlayers21Plus = (players: Player[] | undefined | null): number => {
    if (!players || !Array.isArray(players)) {
        return 0;
    }
    return players.filter(p => p.age >= U21_AGE_LIMIT).length;
};

/**
 * Checks if a team has more than 25 players aged 21 or older
 */
export const hasTooMany21PlusPlayers = (team: Team): boolean => {
    return countPlayers21Plus(team.players) > MAX_SQUAD_SIZE;
};

/**
 * Gets players who turned 21 (were 20, now are 21) in this age update
 */
export const getPlayersTurned21 = (oldPlayers: Player[], newPlayers: Player[]): Player[] => {
    const playersTurned21: Player[] = [];
    
    oldPlayers.forEach(oldPlayer => {
        if (oldPlayer.age === 20) {
            const newPlayer = newPlayers.find(p => p.id === oldPlayer.id);
            if (newPlayer && newPlayer.age === 21) {
                playersTurned21.push(newPlayer);
            }
        }
    });
    
    return playersTurned21;
};

/**
 * Frees lowest-rated 21+ players until team has 25 or fewer 21+ players
 * Returns the freed players and updated team
 */
export const freeLowestRated21PlusPlayers = (team: Team): { freedPlayers: Player[], updatedTeam: Team } => {
    const playersU21 = team.players.filter(p => p.age < U21_AGE_LIMIT);
    const players21Plus = team.players.filter(p => p.age >= U21_AGE_LIMIT);
    
    if (players21Plus.length <= MAX_SQUAD_SIZE) {
        return { freedPlayers: [], updatedTeam: team };
    }
    
    // Sort 21+ players by rating (lowest first)
    const sorted21Plus = [...players21Plus].sort((a, b) => a.rating - b.rating);
    const playersToFree = sorted21Plus.slice(0, players21Plus.length - MAX_SQUAD_SIZE);
    const remaining21Plus = players21Plus.filter(p => !playersToFree.some(pr => pr.id === p.id));
    
    return {
        freedPlayers: playersToFree,
        updatedTeam: {
            ...team,
            players: [...playersU21, ...remaining21Plus]
        }
    };
};

/**
 * Ensures a team has between MIN_SQUAD_SIZE and MAX_SQUAD_SIZE players (21+ only)
 * U21 players are unlimited
 * Adds youth players if below minimum, removes lowest-rated players if above maximum (only 21+ players count)
 */
export const enforceSquadSizeRule = (team: Team, only21Plus: boolean = false): Team => {
    // Separate U21 and 21+ players
    const playersU21 = team.players.filter(p => p.age < U21_AGE_LIMIT);
    const players21Plus = team.players.filter(p => p.age >= U21_AGE_LIMIT);
    
    // If only checking 21+ players (for transfer window end enforcement)
    if (only21Plus) {
        if (players21Plus.length > MAX_SQUAD_SIZE) {
            // Remove lowest-rated 21+ players until we have 25
            const sorted21Plus = [...players21Plus].sort((a, b) => a.rating - b.rating);
            const playersToRemove = sorted21Plus.slice(0, players21Plus.length - MAX_SQUAD_SIZE);
            const remaining21Plus = players21Plus.filter(p => !playersToRemove.some(pr => pr.id === p.id));
            
            return {
                ...team,
                players: [...playersU21, ...remaining21Plus]
            };
        }
        return team;
    }
    
    const totalPlayerCount = team.players.length;
    const players21PlusCount = players21Plus.length;
    
    // If team has too many 21+ players, remove lowest-rated 21+ players
    if (players21PlusCount > MAX_SQUAD_SIZE) {
        const sorted21Plus = [...players21Plus].sort((a, b) => a.rating - b.rating);
        const playersToRemove = sorted21Plus.slice(0, players21PlusCount - MAX_SQUAD_SIZE);
        const remaining21Plus = players21Plus.filter(p => !playersToRemove.some(pr => pr.id === p.id));
        
        return {
            ...team,
            players: [...playersU21, ...remaining21Plus]
        };
    }
    
    // If team has too few total players, add youth players
    if (totalPlayerCount < MIN_SQUAD_SIZE) {
        const playersToAdd: Player[] = [];
        const neededCount = MIN_SQUAD_SIZE - totalPlayerCount;
        
        for (let i = 0; i < neededCount; i++) {
            const youthPlayer = createYouthPlayer(team.players.length + i);
            playersToAdd.push(youthPlayer);
        }
        
        return {
            ...team,
            players: [...team.players, ...playersToAdd]
        };
    }
    
    // Team already has correct number of players
    return team;
};

/**
 * Applies squad size rule to all teams
 */
export const enforceSquadSizeRuleForAllTeams = (teams: Team[]): Team[] => {
    return teams.map(team => enforceSquadSizeRule(team));
};
