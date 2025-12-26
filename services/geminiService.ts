
import { Player, Position, Team, MatchStats, PlayerAttributes, Contract, Referee } from "../types";
import { REAL_PLAYERS, TEAM_COLORS, TEAM_MANAGERS, PREMIER_LEAGUE_REFEREES } from "./premierLeagueData";
import { initializeFanSystem } from "./fanSystem";
import { selectTraitsForPlayer } from "./playerTraits";
import { enforceSquadSizeRule } from "./squadSizeService";
import { selectCaptain } from "./captainService";
import { calculateMarketValue } from "./legendaryPlayers";

// Get random referee
export const getRandomReferee = (): Referee => {
  const randomName = PREMIER_LEAGUE_REFEREES[Math.floor(Math.random() * PREMIER_LEAGUE_REFEREES.length)];
  return { name: randomName };
};

// --- GENERATORS ---

const generateAttributes = (pos: Position, rating: number, age: number, manualStats?: PlayerAttributes): PlayerAttributes => {
    if (manualStats) return manualStats;

    // Helper for variation
    const randomOffset = (center: number, variance: number) => Math.floor(center + (Math.random() * variance * 2 - variance));
    const clamp = (val: number) => Math.max(30, Math.min(99, val));

    let pace, shooting, passing, dribbling, defending, physical;

    // Specific Archetype Logic
    switch (pos) {
        case Position.GK:
            pace = randomOffset(rating, 4);
            shooting = randomOffset(rating, 4);
            passing = randomOffset(rating - 10, 10);
            dribbling = randomOffset(rating + 2, 4);
            defending = randomOffset(50, 15);
            physical = randomOffset(rating, 4);
            break;
        
        case Position.LB:
        case Position.RB:
        case Position.LWB:
        case Position.RWB:
            pace = randomOffset(rating + 6, 4);
            defending = randomOffset(rating - 3, 4);
            physical = randomOffset(rating - 5, 5);
            dribbling = randomOffset(rating - 2, 5);
            passing = randomOffset(rating - 2, 5);
            shooting = randomOffset(60, 8);
            break;

        case Position.CB:
            pace = randomOffset(Math.max(50, rating - 12), 8);
            defending = randomOffset(rating + 4, 3);
            physical = randomOffset(rating + 5, 3);
            dribbling = randomOffset(60, 8);
            passing = randomOffset(rating - 10, 8);
            shooting = randomOffset(45, 10);
            break;

        case Position.CDM:
            pace = randomOffset(rating - 8, 6);
            defending = randomOffset(rating + 3, 4);
            physical = randomOffset(rating + 4, 4);
            passing = randomOffset(rating + 2, 4);
            dribbling = randomOffset(70, 6);
            shooting = randomOffset(65, 8);
            break;

        case Position.CM:
            pace = randomOffset(rating - 2, 5);
            passing = randomOffset(rating + 4, 3);
            dribbling = randomOffset(rating + 2, 4);
            defending = randomOffset(rating - 5, 6);
            physical = randomOffset(rating - 2, 5);
            shooting = randomOffset(70, 8);
            break;

        case Position.CAM:
            pace = randomOffset(rating, 5);
            passing = randomOffset(rating + 5, 3);
            dribbling = randomOffset(rating + 6, 3);
            shooting = randomOffset(rating - 2, 5);
            defending = randomOffset(50, 10);
            physical = randomOffset(60, 8);
            break;

        case Position.LW:
        case Position.RW:
        case Position.LM:
        case Position.RM:
            pace = randomOffset(rating + 7, 3);
            dribbling = randomOffset(rating + 6, 3);
            shooting = randomOffset(rating - 2, 5);
            passing = randomOffset(rating - 2, 5);
            defending = randomOffset(45, 10);
            physical = randomOffset(65, 8);
            break;

        case Position.ST:
        case Position.CF:
            pace = randomOffset(rating + 2, 6);
            shooting = randomOffset(rating + 5, 3);
            physical = randomOffset(rating + 2, 6);
            dribbling = randomOffset(rating, 5);
            passing = randomOffset(rating - 8, 8);
            defending = randomOffset(35, 8);
            break;
            
        default: // Fallback
             pace = randomOffset(rating, 5);
             shooting = randomOffset(rating, 5);
             passing = randomOffset(rating, 5);
             dribbling = randomOffset(rating, 5);
             defending = randomOffset(rating, 5);
             physical = randomOffset(rating, 5);
    }

    // Age Decline
    if (age > 31) {
        pace = Math.max(30, pace - (age - 30) * 3);
        physical = Math.max(30, physical - (age - 30) * 2);
    }
    
    return {
        pace: clamp(pace),
        shooting: clamp(shooting),
        passing: clamp(passing),
        dribbling: clamp(dribbling),
        defending: clamp(defending),
        physical: clamp(physical)
    };
};

const generateContract = (value: number, age: number): Contract => {
    // Approx wage: 0.25% of value, slightly randomized
    const baseWage = Math.floor(value * 0.0025);
    const variance = 0.1;
    const wage = Math.floor(baseWage + (baseWage * variance * (Math.random() * 2 - 1)));
    
    const yearsLeft = Math.floor(Math.random() * 5) + 1; // 1-5 years
    
    // Bonus: 5-15% of weekly wage
    const performanceBonus = Math.floor(wage * (0.05 + Math.random() * 0.10));

    // Release clause: 60-80% of market value (players want low release clause)
    // 30% chance of no release clause
    const hasReleaseClause = Math.random() > 0.3;
    const releaseClause = hasReleaseClause 
        ? Math.floor(value * (0.6 + Math.random() * 0.2))
        : undefined;

    return {
        wage: Math.max(500, wage), // Minimum wage 500
        yearsLeft,
        performanceBonus,
        releaseClause
    };
};

export const generateRandomPlayer = (index: number, baseRating: number): Player => {
    const positions = [Position.CB, Position.CB, Position.LB, Position.RB, Position.CM, Position.CM, Position.CDM, Position.CAM, Position.LW, Position.RW, Position.ST];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const age = 17 + Math.floor(Math.random() * 18);
    const rating = Math.max(60, baseRating - 5 + Math.floor(Math.random() * 10));
    const potential = Math.min(99, rating + Math.floor(Math.random() * 15));
    // Use the same market value calculation function for consistency
    const value = calculateMarketValue(rating, age, potential);
    
    const names = ["Smith", "Jones", "Brown", "Taylor", "Wilson", "Evans", "Thomas", "Johnson", "Roberts", "Walker", "Wright", "Robinson", "Thompson", "White", "Hughes", "Edwards", "Green", "Hall", "Wood", "Harris"];
    
    // Generate personality traits
    // Greed: 0-100, how much player values money
    // Ambition: 0-100, how much player values success/trophies
    // These are inversely related - high greed = low ambition, high ambition = low greed (but not always)
    const greed = Math.floor(Math.random() * 100);
    const ambition = Math.floor(Math.random() * 100);
    
    return {
        id: `gen-${index}-${Date.now()}`,
        name: `${names[Math.floor(Math.random() * names.length)]}`,
        position: pos,
        age,
        rating,
        potential,
        marketValue: Math.floor(value),
        trueValue: Math.floor(value),
        scouted: false,
        attributes: generateAttributes(pos, rating, age),
        contract: generateContract(value, age),
        personality: {
            greed,
            ambition
        }
    };
};

export const generateYouthPlayer = (index: number): Player => {
    const positions = [Position.GK, Position.CB, Position.LB, Position.RB, Position.CDM, Position.CM, Position.CAM, Position.LW, Position.RW, Position.ST];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const age = 15 + Math.floor(Math.random() * 4); // 15-18
    
    // Weighted Potential Logic
    const roll = Math.random();
    let potential = 70;

    if (roll < 0.03) {
        // 3% Chance: World Class (90-93) - Max 93 for youth academy
        potential = 90 + Math.floor(Math.random() * 4); // 90-93
    } else if (roll < 0.13) {
        // 10% Chance: Elite (85-89)
        potential = 85 + Math.floor(Math.random() * 5);
    } else if (roll < 0.43) {
        // 30% Chance: Great (80-84)
        potential = 80 + Math.floor(Math.random() * 5);
    } else {
        // 57% Chance: Good/Average (70-79)
        potential = 70 + Math.floor(Math.random() * 10);
    }
    
    // Ensure potential never exceeds 93
    potential = Math.min(93, potential);
    
    // Starting rating: 60% to 80% of potential
    const ratingMultiplier = 0.6 + Math.random() * 0.2; // 0.6 to 0.8
    const rating = Math.floor(potential * ratingMultiplier);

    // Value calculation - Youth academy players have lower value to prevent exploitation
    // Reduced multiplier: 0.3 instead of 0.5 for potential bonus, and lower base multiplier
    const value = Math.floor(rating * 5000 * (1 + (potential - rating) * 0.3));

    const firstNames = [
        "Jack", "Harry", "George", "Charlie", "Leo", "Arthur", "Freddie", "Noah", "Oscar", "Oliver",
        "Alfie", "Archie", "Theo", "James", "William", "Thomas", "Henry", "Alexander", "Daniel", "Matthew",
        "Joseph", "Samuel", "Benjamin", "David", "Michael", "Christopher", "Andrew", "Joshua", "Ryan", "Nathan",
        "Lucas", "Ethan", "Mason", "Logan", "Jacob", "Aiden", "Sebastian", "Max", "Liam", "Owen",
        "Carter", "Wyatt", "Luke", "Hunter", "Connor", "Grayson", "Jackson", "Levi", "Isaac", "Julian"
    ];
    const lastNames = [
        "Smith", "Jones", "Williams", "Brown", "Taylor", "Davies", "Evans", "Thomas", "Roberts", "Walker",
        "Wright", "Thompson", "White", "Johnson", "Wilson", "Moore", "Clark", "Hall", "Lewis", "Robinson",
        "Wood", "Harris", "Martin", "Jackson", "Thompson", "Green", "Adams", "Baker", "Nelson", "Carter",
        "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Edwards", "Collins", "Stewart",
        "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Cooper"
    ];
    const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

    // Select traits for this player based on position
    const traits = selectTraitsForPlayer(pos);

    // Generate personality traits
    // Youth players tend to be more ambitious (want success) and less greedy
    const greed = Math.floor(Math.random() * 70); // 0-70, youth players less greedy
    const ambition = Math.floor(50 + Math.random() * 50); // 50-100, youth players more ambitious

    return {
        id: `youth-${index}-${Date.now()}`,
        name,
        position: pos,
        age,
        rating,
        potential,
        marketValue: value,
        trueValue: value,
        scouted: true, // You know your own youth stats
        attributes: generateAttributes(pos, rating, age),
        contract: generateContract(value, age),
        traits: traits.length > 0 ? traits : undefined, // Only add if traits exist
        personality: {
            greed,
            ambition
        },
        isYouthAcademy: true // Mark as youth academy player
    };
};

// Formation optimization: Find the best formation for a team
interface FormationConfig {
    name: string;
    def: number;
    mid: number;
    fwd: number;
}

const FORMATIONS: FormationConfig[] = [
    { name: "4-3-3", def: 4, mid: 3, fwd: 3 },
    { name: "4-4-2", def: 4, mid: 4, fwd: 2 },
    { name: "4-2-3-1", def: 4, mid: 5, fwd: 1 }, // 2 CDM/CM geride, 3 ileride (LM/LW, CAM, RM/RW)
    { name: "3-5-2", def: 3, mid: 5, fwd: 2 },
    { name: "5-4-1", def: 5, mid: 4, fwd: 1 }, // 3 stoper + 2 kanat bek, 2 merkez + 2 kanat
    { name: "3-4-3", def: 3, mid: 4, fwd: 3 }, // 3 stoper, 2 merkez + 2 kanat, 1 santrafor + 2 kanat
    { name: "3-4-2-1", def: 3, mid: 6, fwd: 1 }, // 4 Mid (2 kanat: kanat bek veya orta saha kanat) + 2 CAM
    { name: "5-3-2", def: 5, mid: 3, fwd: 2 }, // 3 stoper + 2 kanat bek, 2 merkez + 1 CAM, 2 santrafor
    { name: "4-1-4-1", def: 4, mid: 5, fwd: 1 }, // 1 CDM geride, 2 CAM + 2 kanat ileride
];

const findBestFormation = (allPlayers: Player[]): { formation: string; startingXI: Player[]; rating: number } => {
    // Helpers for squad categorization
    const isGK = (p: Player) => p.position === Position.GK;
    const isDef = (p: Player) => [Position.LB, Position.RB, Position.CB, Position.LWB, Position.RWB].includes(p.position);
    const isMid = (p: Player) => [Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(p.position);
    const isFwd = (p: Player) => [Position.LW, Position.RW, Position.ST, Position.CF].includes(p.position);

    const sorted = [...allPlayers].sort((a, b) => b.rating - a.rating);
    const gks = sorted.filter(isGK);
    const defs = sorted.filter(isDef);
    const mids = sorted.filter(isMid);
    const fwds = sorted.filter(isFwd);

    // Get players by specific positions
    const lbs = sorted.filter(p => [Position.LB, Position.LWB].includes(p.position));
    const cbs = sorted.filter(p => p.position === Position.CB);
    const rbs = sorted.filter(p => [Position.RB, Position.RWB].includes(p.position));
    const dms = sorted.filter(p => p.position === Position.CDM);
    const cms = sorted.filter(p => p.position === Position.CM);
    const cams = sorted.filter(p => p.position === Position.CAM);
    const lms = sorted.filter(p => p.position === Position.LM);
    const rms = sorted.filter(p => p.position === Position.RM);
    const lws = sorted.filter(p => p.position === Position.LW);
    const sts = sorted.filter(p => [Position.ST, Position.CF].includes(p.position));
    const rws = sorted.filter(p => p.position === Position.RW);

    let bestFormation = "4-3-3";
    let bestXI: Player[] = [];
    let bestRating = -1;

    // Test each formation
    for (const formation of FORMATIONS) {
        const xi: Player[] = [];
        let positionPenalty = 0; // Penalty for playing players out of position
        
        // Always add best GK
        if (gks.length > 0) {
            xi.push(gks[0]);
        } else {
            continue; // Can't form a team without GK
        }
        
        // Select defenders based on formation requirements
        const neededDefs = formation.def;
        const selectedDefs: Player[] = [];
        
        // Try to get balanced defense: LB, CBs, RB
        if (neededDefs >= 4) {
            if (lbs.length > 0) selectedDefs.push(lbs[0]);
            if (cbs.length > 0) selectedDefs.push(cbs[0]);
            if (cbs.length > 1) selectedDefs.push(cbs[1]);
            else if (cbs.length > 0) selectedDefs.push(cbs[0]);
            if (rbs.length > 0) selectedDefs.push(rbs[0]);
        } else if (neededDefs === 3) {
            // 3 at the back: try to get CBs
            if (cbs.length > 0) selectedDefs.push(cbs[0]);
            if (cbs.length > 1) selectedDefs.push(cbs[1]);
            if (cbs.length > 2) selectedDefs.push(cbs[2]);
        } else if (neededDefs === 5) {
            // 5 at the back: LB, 3 CBs, RB
            if (lbs.length > 0) selectedDefs.push(lbs[0]);
            if (cbs.length > 0) selectedDefs.push(cbs[0]);
            if (cbs.length > 1) selectedDefs.push(cbs[1]);
            if (cbs.length > 2) selectedDefs.push(cbs[2]);
            else if (cbs.length > 1) selectedDefs.push(cbs[1]);
            if (rbs.length > 0) selectedDefs.push(rbs[0]);
        }
        
        // Fill remaining defender slots
        while (selectedDefs.length < neededDefs) {
            const remaining = defs.filter(p => !selectedDefs.includes(p));
            if (remaining.length === 0) break;
            selectedDefs.push(remaining[0]);
        }
        xi.push(...selectedDefs.slice(0, neededDefs));
        
        // Select midfielders
        const neededMids = formation.mid;
        const selectedMids: Player[] = [];
        
        // Prioritize specific midfield positions
        if (dms.length > 0 && neededMids > 0) selectedMids.push(dms[0]);
        if (cms.length > 0 && selectedMids.length < neededMids) selectedMids.push(cms[0]);
        if (cms.length > 1 && selectedMids.length < neededMids) selectedMids.push(cms[1]);
        if (cams.length > 0 && selectedMids.length < neededMids) selectedMids.push(cams[0]);
        if (lms.length > 0 && selectedMids.length < neededMids) selectedMids.push(lms[0]);
        if (rms.length > 0 && selectedMids.length < neededMids) selectedMids.push(rms[0]);
        
        // Fill remaining midfielder slots
        while (selectedMids.length < neededMids) {
            const remaining = mids.filter(p => !selectedMids.includes(p));
            if (remaining.length === 0) break;
            selectedMids.push(remaining[0]);
        }
        xi.push(...selectedMids.slice(0, neededMids));
        
        // Select forwards - THIS IS CRITICAL: Must match formation requirements
        const neededFwds = formation.fwd;
        const selectedFwds: Player[] = [];
        
        // For 4-3-3, 3-4-3: Need LW, ST, RW (left to right)
        if (formation.name === "4-3-3" || formation.name === "3-4-3") {
            if (lws.length > 0) {
                selectedFwds.push(lws[0]);
            } else {
                // No LW available - heavy penalty
                positionPenalty += 5;
            }
            if (sts.length > 0) {
                selectedFwds.push(sts[0]);
            } else {
                positionPenalty += 5;
            }
            if (rws.length > 0) {
                selectedFwds.push(rws[0]);
            } else {
                positionPenalty += 5;
            }
        }
        // For 4-4-2, 3-5-2, 5-3-2: Need 2 forwards (typically ST or ST + CF)
        else if (formation.name === "4-4-2" || formation.name === "3-5-2" || formation.name === "5-3-2") {
            if (sts.length > 0) selectedFwds.push(sts[0]);
            if (sts.length > 1) selectedFwds.push(sts[1]);
            else if (sts.length > 0) selectedFwds.push(sts[0]);
            else positionPenalty += 5;
        }
        // For single striker formations: Need 1 ST
        else if (formation.fwd === 1) {
            if (sts.length > 0) {
                selectedFwds.push(sts[0]);
            } else {
                positionPenalty += 5;
            }
        }
        // For 2 forward formations (other): Try to get ST + best available
        else if (formation.fwd === 2) {
            if (sts.length > 0) selectedFwds.push(sts[0]);
            const remaining = [...lws, ...rws, ...sts.slice(1)].filter(p => !selectedFwds.includes(p));
            if (remaining.length > 0) selectedFwds.push(remaining[0]);
        }
        
        // Fill remaining forward slots
        while (selectedFwds.length < neededFwds) {
            const remaining = fwds.filter(p => !selectedFwds.includes(p));
            if (remaining.length === 0) break;
            selectedFwds.push(remaining[0]);
            // Penalty for playing wrong position
            positionPenalty += 3;
        }
        xi.push(...selectedFwds.slice(0, neededFwds));

        // Fill remaining spots with best available players
        while (xi.length < 11) {
            const remaining = sorted.filter(p => !xi.includes(p));
            if (remaining.length === 0) break;
            xi.push(remaining[0]);
            positionPenalty += 2; // Penalty for filling with wrong position
        }

        // Calculate average rating with position penalty
        if (xi.length === 11) {
            const baseRating = xi.reduce((acc, p) => acc + p.rating, 0) / 11;
            const avgRating = Math.round(baseRating - positionPenalty);
            
            if (avgRating > bestRating) {
                bestRating = avgRating;
                bestFormation = formation.name;
                bestXI = [...xi];
            }
        }
    }

    return { formation: bestFormation, startingXI: bestXI, rating: bestRating };
};

export const generateLeagueData = async (): Promise<Team[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const teams: Team[] = [];
    let idCounter = 0;

    for (const [name, roster] of Object.entries(REAL_PLAYERS)) {
        const budget = roster.reduce((acc, p) => acc + p.value, 0) * 0.2; // Approx budget
        
        // Remove duplicate players by name before processing
        const seenNames = new Set<string>();
        const uniqueRoster = roster.filter(p => {
            const normalizedName = p.name.trim().toLowerCase();
            if (seenNames.has(normalizedName)) {
                console.warn(`Duplicate player found in ${name}: ${p.name}`);
                return false;
            }
            seenNames.add(normalizedName);
            return true;
        });
        
        const allPlayers: Player[] = uniqueRoster.map((p, idx) => {
            const contract = generateContract(p.value, p.age);
            // Ensure release clause is added (30% chance of no release clause is already in generateContract)
            // Add traits for players with rating >= 80 (Premier League stars)
            const traits = p.rating >= 80 ? selectTraitsForPlayer(p.pos) : undefined;
            return {
                id: `${name.substring(0,3).replace(/\s/g, '')}-${idx}`,
                name: p.name,
                position: p.pos,
                age: p.age,
                rating: p.rating,
                potential: p.potential,
                marketValue: p.value,
                trueValue: p.value,
                scouted: false, // Players are not scouted by default (only user's team players will be scouted)
                attributes: generateAttributes(p.pos, p.rating, p.age, p.stats),
                contract: contract,
                traits: traits && traits.length > 0 ? traits : undefined // Only add if traits exist
            };
        });
        
        // Final check: ensure no duplicate names in the final player list
        const finalPlayerNames = new Set<string>();
        const finalPlayers: Player[] = [];
        for (const player of allPlayers) {
            const normalizedName = player.name.trim().toLowerCase();
            if (!finalPlayerNames.has(normalizedName)) {
                finalPlayerNames.add(normalizedName);
                finalPlayers.push(player);
            } else {
                console.warn(`Duplicate player name detected in final list for ${name}: ${player.name}`);
            }
        }

        // Find best formation for this team
        const { formation, startingXI, rating: baseRating } = findBestFormation(finalPlayers);

        // Re-order squad: Starting XI first, then Reserves (sorted by rating)
        const reserves = finalPlayers.filter(p => !startingXI.includes(p)).sort((a, b) => b.rating - a.rating);
        let organizedSquad = [...startingXI, ...reserves];

        // Initialize fan system
        const fanSystem = initializeFanSystem(name, baseRating, "Premier League");

        // Ensure team name uses full name (for consistency)
        // REAL_PLAYERS keys already use full names, but this ensures consistency
        const teamName = name;

        const newTeam: Team = {
            id: `team-${idCounter++}`,
            name: teamName,
            league: "Premier League",
            budget: Math.floor(budget),
            players: organizedSquad,
            tactics: { formation, mentality: "Balanced" },
            financials: {
                income: { transfers: 0, tickets: 0, sponsors: Math.floor(baseRating * 500000), prizeMoney: 0 },
                expenses: { transfers: 0, wages: 0, facilities: Math.floor(baseRating * 50000) }
            },
            baseRating,
            starPlayerNames: startingXI.slice(0, 3).map(p => p.name.split(' ').pop() || p.name),
            color: TEAM_COLORS[teamName] || "linear-gradient(135deg, #18181b 0%, #09090b 100%)",
            manager: TEAM_MANAGERS[teamName] || undefined,
            played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
            premiumTickets: 0, // Initialize premium tickets
            ...fanSystem
        };

        // Enforce squad size rule (20-25 players) for the new team
        const teamWithCorrectSquadSize = enforceSquadSizeRule(newTeam);
        
        // Select a captain for the team (only if team has players)
        if (teamWithCorrectSquadSize.players && teamWithCorrectSquadSize.players.length > 0) {
            try {
                const captain = selectCaptain(teamWithCorrectSquadSize);
                if (captain && captain.id) {
                    teamWithCorrectSquadSize.captainId = captain.id;
                }
            } catch (error) {
                console.error(`Error selecting captain for ${teamName}:`, error);
                // Continue without captain if selection fails
            }
        }
        
        teams.push(teamWithCorrectSquadSize);
    }

    return teams;
};

export const generateInitialSquad = async (teamName: string): Promise<Player[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const squad: Player[] = [];
    const baseRating = 76; 
    for(let i=0; i<20; i++) {
        squad.push(generateRandomPlayer(i, baseRating));
    }
    return squad;
};

// UPDATED: Market generation now pulls from OTHER teams in the league
// Transfer list players stay on their teams, only non-transfer-list players are moved to market
export const generateMarketForWindow = (allTeams: Team[], userTeamId: string): { market: Player[], updatedTeams: Team[] } => {
    const marketList: Player[] = [];
    // Clone teams to safely modify
    let updatedTeams = [...allTeams];

    updatedTeams = updatedTeams.map(team => {
        // Skip user team
        if (team.id === userTeamId) return team;

        const players = [...team.players];
        // Filter out players on transfer/loan list - they stay on the team
        const availablePlayers = players.filter(p => !p.onTransferList && !p.onLoanList);
        
        // Determine how many players to list (0 to 2 per team)
        const numToList = Math.floor(Math.random() * 3);
        
        if (numToList > 0 && availablePlayers.length > 0) {
            // Sort by rating to keep best players, list fringe players
            // But sometimes list a star randomly
            for (let i = 0; i < numToList && i < availablePlayers.length; i++) {
                const isBigSale = Math.random() > 0.9; // 10% chance to sell a good player
                let targetIndex = -1;

                if (isBigSale) {
                    // Pick a random player from top half
                    targetIndex = Math.floor(Math.random() * (availablePlayers.length / 2));
                } else {
                    // Pick from bottom half (fringe players)
                    targetIndex = Math.floor(availablePlayers.length / 2) + Math.floor(Math.random() * (availablePlayers.length / 2));
                }

                // Safety check
                if (targetIndex >= 0 && targetIndex < availablePlayers.length) {
                    const playerToList = availablePlayers[targetIndex];
                    // Add to market with team information preserved
                    marketList.push({ 
                        ...playerToList, 
                        scouted: false, // Hide stats initially
                        // Preserve team info for display in favorites
                        teamId: team.id,
                        teamName: team.name
                    } as Player & { teamId: string; teamName: string });
                    // Remove from team (find original index in players array)
                    const originalIndex = players.findIndex(p => p.id === playerToList.id);
                    if (originalIndex >= 0) {
                        players.splice(originalIndex, 1);
                    }
                }
            }
        }
        return { ...team, players };
    });
    
    return { market: marketList, updatedTeams };
};

export const generateScoutReport = async (player: Player): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const diff = player.potential - player.rating;
    if (player.age < 21 && diff > 10) return "A generational talent. Sign him at all costs.";
    if (player.age < 23 && diff > 5) return "Shows great promise. Good investment.";
    if (player.rating > 85) return "World class. Will improve the squad immediately.";
    if (player.age > 30 && player.rating > 80) return "Experienced pro, but values will drop soon.";
    if (diff < 2) return "Has likely reached his peak.";
    return "A solid squad player with some room to grow.";
};

export const generateGoalCommentary = async (scorerName: string, teamName: string, minute: number, language: 'en' | 'tr' = 'en'): Promise<string> => {
    const phrases = language === 'tr' ? [
        `${scorerName}'dan ne bitiriş! Üst köşe!`,
        `${scorerName} savunmayı geçti ve ağlara gönderdi!`,
        `${scorerName}'dan şimşek gibi bir şut! Kaleci şansı yoktu.`,
        `${scorerName} kalenin önündeki karışıklıktan sonra topu ağlara gönderdi.`,
        `${scorerName}'dan ${teamName}'ı öne geçiren harika bir kafa vuruşu!`,
        `Sakin bir şekilde, ${scorerName} bire bir pozisyonu gole çevirdi.`
    ] : [
        `What a finish by ${scorerName}! Top corner!`,
        `${scorerName} dances through the defense and slots it home!`,
        `A thunderbolt from ${scorerName}! The keeper had no chance.`,
        `${scorerName} taps it in after a goalmouth scramble.`,
        `Brilliant header by ${scorerName} to put ${teamName} ahead!`,
        `Cool as you like, ${scorerName} finishes the 1-on-1.`
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
};

export const getAssistantAnalysis = async (userTeam: Team, opponentTeam: Team, stats: MatchStats, minute: number, language: 'en' | 'tr' = 'en'): Promise<string> => {
    if (language === 'tr') {
        if (stats.homeScore > stats.awayScore) return "Kontrol bizde, baskıyı sürdür.";
        if (stats.homeScore < stats.awayScore) return "Daha yükseğe çıkmamız gerekiyor, eziliyoruz.";
        if (stats.possession < 40) return "Topu tutmakta zorlanıyoruz. Belki orta sahayı sıkıştırmalıyız?";
        if (stats.shotsHome > 5 && stats.homeScore === 0) return "Fırsatlar yaratıyoruz, gol gelecek.";
        return "Sıkı bir maç. Bir anlık büyü her şeyi belirleyebilir.";
    } else {
        if (stats.homeScore > stats.awayScore) return "We are in control, keep the pressure on.";
        if (stats.homeScore < stats.awayScore) return "We need to push higher, we're getting overrun.";
        if (stats.possession < 40) return "We're struggling to keep the ball. Maybe tighten up the midfield?";
        if (stats.shotsHome > 5 && stats.homeScore === 0) return "We're creating chances, the goal will come.";
        return "It's a tight game. One moment of magic could decide it.";
    }
};
