
import { Team, Fixture, MatchEvent, PlayerAttributes, Position, Player, MatchPerformance } from '../types';
import { getRandomReferee } from './geminiService';

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate Round Robin Schedule for MULTIPLE LEAGUES
export const generateSeasonSchedule = (teams: Team[]): Fixture[] => {
  const fixtures: Fixture[] = [];
  
  const leagues = Array.from(new Set(teams.map(t => t.league)));

  leagues.forEach(leagueName => {
      const leagueTeams = teams.filter(t => t.league === leagueName);
      
      // Shuffle teams randomly each season to create different fixture order
      const shuffledTeams = shuffleArray(leagueTeams);
      const teamIds = shuffledTeams.map(t => t.id);
      const numTeams = teamIds.length;

      if (numTeams < 2) return;

      const rounds = (numTeams - 1) * 2; 
      const matchesPerRound = numTeams / 2;

      for (let round = 0; round < rounds; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
          const home = (round + match) % (numTeams - 1);
          const away = (numTeams - 1 - match + round) % (numTeams - 1);
          
          let teamA = teamIds[home];
          let teamB = teamIds[away];

          if (match === 0) {
            teamB = teamIds[numTeams - 1];
          }

          if (round % 2 === 1) {
             const temp = teamA;
             teamA = teamB;
             teamB = temp;
          }

          fixtures.push({
            id: `fix-${leagueName.replace(/\s/g, '')}-${Date.now()}-${round}-${match}`,
            week: round + 1,
            homeTeamId: teamA,
            awayTeamId: teamB,
            played: false,
            homeScore: 0,
            awayScore: 0,
            scorers: [],
            referee: getRandomReferee()
          });
        }
      }
  });
  
  return fixtures.sort((a, b) => a.week - b.week);
};

export const simulateMatch = (fixture: Fixture, homeTeam: Team, awayTeam: Team, language: 'en' | 'tr' = 'en'): Fixture => {
    
    // Helper to check broad position category
    const isAttacker = (p: Position) => [Position.ST, Position.CF, Position.RW, Position.LW].includes(p);
    const isMidfielder = (p: Position) => [Position.CAM, Position.CM, Position.CDM, Position.RM, Position.LM].includes(p);
    const isDefender = (p: Position) => [Position.LB, Position.RB, Position.CB, Position.LWB, Position.RWB].includes(p);
    const isGK = (p: Position) => p === Position.GK;

    // Parse formation string (e.g., "4-3-3" -> {def: 4, mid: 3, fwd: 3})
    const parseFormation = (formation: string): { def: number; mid: number; fwd: number } => {
        const parts = formation.split('-').map(Number);
        if (parts.length === 3) {
            return { def: parts[0], mid: parts[1], fwd: parts[2] };
        } else if (parts.length === 4) {
            // Handle formations like "4-2-3-1" (def-mid1-mid2-fwd)
            return { def: parts[0], mid: parts[1] + parts[2], fwd: parts[3] };
        }
        // Default to 4-3-3 if parsing fails
        return { def: 4, mid: 3, fwd: 3 };
    };

    // Helper to get position category
    const getPositionCategory = (pos: Position): 'GK' | 'DEF' | 'MID' | 'FWD' => {
        if (isGK(pos)) return 'GK';
        if (isDefender(pos)) return 'DEF';
        if (isMidfielder(pos)) return 'MID';
        if (isAttacker(pos)) return 'FWD';
        return 'MID'; // Default fallback
    };

    // Calculate rating penalty for playing out of position
    const getPositionPenalty = (playerPos: Position, playingCategory: 'GK' | 'DEF' | 'MID' | 'FWD'): number => {
        const playerCategory = getPositionCategory(playerPos);
        
        // Same category - no penalty (or minimal for specific mismatches)
        if (playerCategory === playingCategory) {
            // Check for specific position mismatches within same category
            if (playerCategory === 'DEF') {
                // LB playing RB or vice versa - minimal penalty
                if ((playerPos === Position.LB || playerPos === Position.LWB) && 
                    (playingCategory === 'DEF')) return 0; // No penalty for side switches
                if ((playerPos === Position.RB || playerPos === Position.RWB) && 
                    (playingCategory === 'DEF')) return 0; // No penalty for side switches
            }
            if (playerCategory === 'MID') {
                // CM playing CAM or CDM - small penalty
                if (playerPos === Position.CM && (playingCategory === 'MID')) return 0; // CM can play anywhere in midfield
                if ((playerPos === Position.CAM || playerPos === Position.CDM) && 
                    (playingCategory === 'MID')) return 2; // Small penalty for CAM/CDM playing other midfield roles
            }
            if (playerCategory === 'FWD') {
                // LW/RW/ST/CF can play any forward position - minimal penalty
                if (playingCategory === 'FWD') return 0;
            }
            return 0;
        }
        
        // Different categories - calculate penalty based on distance
        // GK playing anywhere else - massive penalty
        if (playerCategory === 'GK') return 50;
        
        // Forward playing defense - very high penalty
        if (playerCategory === 'FWD' && playingCategory === 'DEF') return 35;
        // Defender playing forward - high penalty
        if (playerCategory === 'DEF' && playingCategory === 'FWD') return 30;
        
        // Forward playing midfield - medium penalty
        if (playerCategory === 'FWD' && playingCategory === 'MID') return 20;
        // Midfielder playing forward - medium penalty
        if (playerCategory === 'MID' && playingCategory === 'FWD') return 15;
        // Midfielder playing defense - medium penalty
        if (playerCategory === 'MID' && playingCategory === 'DEF') return 18;
        // Defender playing midfield - medium penalty
        if (playerCategory === 'DEF' && playingCategory === 'MID') return 15;
        
        // Default penalty for any other mismatch
        return 25;
    };

    // Helper to get Starting XI for a team with position assignments
    const getStartingXI = (t: Team): { player: Player; playingPosition: 'GK' | 'DEF' | 'MID' | 'FWD' }[] => {
        if (!t.players || t.players.length === 0) return [];
        
        // Filter out suspended, injured, and ill players
        const availablePlayers = t.players.filter(p => 
            (!p.suspensionGames || p.suspensionGames === 0) && 
            !p.injury && 
            !p.illness
        );
        
        // Sorting helps ensure we get best available
        const sorted = [...availablePlayers].sort((a, b) => b.rating - a.rating);
        
        const gks = sorted.filter(p => isGK(p.position));
        const defs = sorted.filter(p => isDefender(p.position));
        const mids = sorted.filter(p => isMidfielder(p.position));
        const fwds = sorted.filter(p => isAttacker(p.position));

        // Parse team's formation
        const formation = parseFormation(t.tactics?.formation || "4-3-3");
        
        const xi: { player: Player; playingPosition: 'GK' | 'DEF' | 'MID' | 'FWD' }[] = [];
        
        // Always add best GK
        if (gks.length > 0) xi.push({ player: gks[0], playingPosition: 'GK' });
        
        // Add players based on formation
        defs.slice(0, formation.def).forEach(p => xi.push({ player: p, playingPosition: 'DEF' }));
        mids.slice(0, formation.mid).forEach(p => xi.push({ player: p, playingPosition: 'MID' }));
        fwds.slice(0, formation.fwd).forEach(p => xi.push({ player: p, playingPosition: 'FWD' }));

        // Fill remaining spots if specialized positions are missing
        while (xi.length < 11) {
            const remaining = sorted.filter(p => !xi.some(x => x.player.id === p.id));
            if (remaining.length === 0) break;
            
            // Determine what position category is needed
            const currentDef = xi.filter(x => x.playingPosition === 'DEF').length;
            const currentMid = xi.filter(x => x.playingPosition === 'MID').length;
            const currentFwd = xi.filter(x => x.playingPosition === 'FWD').length;
            
            let neededCategory: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';
            if (currentDef < formation.def) neededCategory = 'DEF';
            else if (currentMid < formation.mid) neededCategory = 'MID';
            else if (currentFwd < formation.fwd) neededCategory = 'FWD';
            
            xi.push({ player: remaining[0], playingPosition: neededCategory });
        }
        
        return xi;
    };

    // 1. Calculate Strengths based on team's actual formation with position penalties
    const getTeamStrength = (t: Team) => {
        const xi = getStartingXI(t);
        
        if (xi.length === 0) return t.baseRating;

        // Calculate effective rating for each player (with position penalty)
        const getEffectiveRating = (entry: { player: Player; playingPosition: 'GK' | 'DEF' | 'MID' | 'FWD' }): number => {
            const penalty = getPositionPenalty(entry.player.position, entry.playingPosition);
            return Math.max(1, entry.player.rating - penalty);
        };

        // Calculate Attack Rating (forwards)
        const attackers = xi.filter(x => x.playingPosition === 'FWD');
        const attackRating = attackers.length > 0 
            ? Math.round(attackers.reduce((acc, x) => acc + getEffectiveRating(x), 0) / attackers.length)
            : 0;
        
        // Calculate Defense Rating (defenders + goalkeeper)
        const defenders = xi.filter(x => x.playingPosition === 'DEF' || x.playingPosition === 'GK');
        const defenseRating = defenders.length > 0
            ? Math.round(defenders.reduce((acc, x) => acc + getEffectiveRating(x), 0) / defenders.length)
            : 0;
        
        // Calculate Midfield Rating
        const midfielders = xi.filter(x => x.playingPosition === 'MID');
        const midfieldRating = midfielders.length > 0
            ? Math.round(midfielders.reduce((acc, x) => acc + getEffectiveRating(x), 0) / midfielders.length)
            : 0;
        
        // Return average of 3 ratings
        const ratings = [attackRating, defenseRating, midfieldRating].filter(r => r > 0);
        return ratings.length > 0 ? Math.round(ratings.reduce((acc, r) => acc + r, 0) / ratings.length) : t.baseRating;
    };
    
    // Calculate team strengths with dynamic player count adjustments
    const getDynamicTeamStrength = (team: Team, activePlayerCount: number): number => {
        const baseStrength = getTeamStrength(team);
        const playerCount = activePlayerCount;
        const fullSquad = 11;
        
        // Penalty for having fewer players (each missing player reduces strength)
        const missingPlayers = fullSquad - playerCount;
        const penalty = missingPlayers * 3; // 3 rating points per missing player
        
        return Math.max(1, baseStrength - penalty);
    };

    let homeRating = getTeamStrength(homeTeam);
    let awayRating = getTeamStrength(awayTeam);
    let ratingDiff = homeRating - awayRating;
    
    let homeDominance = Math.max(0.1, Math.min(0.9, 0.5 + 0.05 + (ratingDiff * 0.04)));
    
    // Get starting XI for both teams at the start of the match
    const homeXI = getStartingXI(homeTeam);
    const awayXI = getStartingXI(awayTeam);
    
    let homeGoals = 0;
    let awayGoals = 0;
    const events: MatchEvent[] = [];
    const currentScorers: { name: string; minute: number; teamId: string; assist?: string }[] = [];
    const cards: { playerId: string; teamId: string; type: 'YELLOW' | 'RED'; minute: number }[] = [];
    
    // Track yellow cards per player in this match
    const yellowCards: Map<string, number> = new Map(); // playerId -> count
    
    // Track active players (can be sent off)
    let activeHomePlayers = homeXI.map(x => x.player.id);
    let activeAwayPlayers = awayXI.map(x => x.player.id);
    
    const matchEvents = 30 + Math.floor(Math.random() * 10); 

    const getPlayerName = (team: Team, group?: 'DEF' | 'MID' | 'FWD' | 'GK') => {
        // Use starting XI instead of all players
        const startingXI = team.id === homeTeam.id ? homeXI : awayXI;
        if (!startingXI || startingXI.length === 0) return "Unknown Player";
        
        let pool = startingXI;
        
        if (group === 'GK') pool = startingXI.filter(x => x.player.position === Position.GK);
        else if (group === 'DEF') pool = startingXI.filter(x => [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(x.player.position));
        else if (group === 'MID') pool = startingXI.filter(x => isMidfielder(x.player.position));
        else if (group === 'FWD') pool = startingXI.filter(x => isAttacker(x.player.position));
        
        if (pool.length === 0) pool = startingXI; // Fallback to all starting XI
        return pool[Math.floor(Math.random() * pool.length)].player.name;
    };

    const getWeightedPlayer = (team: Team, group: 'FWD' | 'MID' | 'DEF' | undefined, attribute: keyof PlayerAttributes): string => {
        // Use starting XI instead of all players
        const startingXI = team.id === homeTeam.id ? homeXI : awayXI;
        if (!startingXI || startingXI.length === 0) return "Unknown Player";
        
        let pool = startingXI;
        if (group === 'FWD') pool = startingXI.filter(x => isAttacker(x.player.position));
        else if (group === 'MID') pool = startingXI.filter(x => isMidfielder(x.player.position));
        else if (group === 'DEF') pool = startingXI.filter(x => !isAttacker(x.player.position) && !isMidfielder(x.player.position) && x.player.position !== Position.GK);

        if (pool.length === 0) pool = startingXI.filter(x => x.player.position !== Position.GK); 

        let totalWeight = 0;
        const weightedPool = pool.map(x => {
            const p = x.player;
            const stat = p.attributes ? p.attributes[attribute] : p.rating;
            
            // For shooting attribute, apply strong boost based on shooting stat
            let weight = Math.pow(stat, 3.0);
            
            if (attribute === 'shooting') {
                // Strong boost for high shooting stats
                const shootingStat = p.attributes?.shooting || p.rating;
                if (shootingStat >= 90) {
                    weight *= 3.0; // 3x boost for 90+ shooting
                } else if (shootingStat >= 85) {
                    weight *= 2.2; // 2.2x boost for 85-89 shooting
                } else if (shootingStat >= 80) {
                    weight *= 1.6; // 1.6x boost for 80-84 shooting
                } else if (shootingStat >= 75) {
                    weight *= 1.2; // 1.2x boost for 75-79 shooting
                }
                
                // Additional boost for forwards with high shooting
                if (isAttacker(p.position) && shootingStat >= 85) {
                    weight *= 1.5; // Extra 1.5x for high-rated forwards
                }
                
                // Pace boost for shooting - faster players get more chances
                const paceStat = p.attributes?.pace || p.rating;
                if (paceStat >= 90) {
                    weight *= 1.4; // 1.4x boost for 90+ pace
                } else if (paceStat >= 85) {
                    weight *= 1.25; // 1.25x boost for 85-89 pace
                } else if (paceStat >= 80) {
                    weight *= 1.15; // 1.15x boost for 80-84 pace
                }
            } else if (attribute === 'passing') {
                // Dribbling boost for passing - better dribblers create more assists
                const dribblingStat = p.attributes?.dribbling || p.rating;
                if (dribblingStat >= 90) {
                    weight *= 1.5; // 1.5x boost for 90+ dribbling
                } else if (dribblingStat >= 85) {
                    weight *= 1.3; // 1.3x boost for 85-89 dribbling
                } else if (dribblingStat >= 80) {
                    weight *= 1.2; // 1.2x boost for 80-84 dribbling
                } else if (dribblingStat >= 75) {
                    weight *= 1.1; // 1.1x boost for 75-79 dribbling
                }
            }
            
            totalWeight += weight;
            return { player: p, weight };
        });

        let r = Math.random() * totalWeight;
        for (const item of weightedPool) {
            r -= item.weight;
            if (r <= 0) return item.player.name; // Return exact player name from player object
        }
        return weightedPool[0] ? weightedPool[0].player.name : "Unknown Player";
    };

    const getMissText = (p: string) => {
        const texts = language === 'tr' ? [
            `${p} uzaktan genişe attı!`,
            `Fırsat! ${p} üstten auta gönderdi.`,
            `${p} şutu kötü vurdu, kaleci için kolay.`,
            `Çok yakın! ${p} direğin yanından geçirdi.`
        ] : [
            `${p} fires wide from distance!`,
            `Chance! ${p} heads it over the bar.`,
            `${p} scuffs the shot, easy for the keeper.`,
            `So close! ${p} curls it inches past the post.`
        ];
        return texts[Math.floor(Math.random() * texts.length)];
    };

    const getSaveText = (keeper: string, shooter: string) => {
        const texts = language === 'tr' ? [
            `${keeper}, ${shooter}'ı engellemek için harika bir kurtarış yaptı!`,
            `${shooter} şut çekti ama ${keeper} buna eşit!`,
            `Parmak ucu kurtarış! ${keeper} topu üstten çıkardı.`,
            `${keeper} topu rahatça topladı.`
        ] : [
            `Brilliant save by ${keeper} to deny ${shooter}!`,
            `${shooter} shoots but ${keeper} is equal to it.`,
            `Fingertip save! ${keeper} tips it over.`,
            `${keeper} gathers the loose ball easily.`
        ];
        return texts[Math.floor(Math.random() * texts.length)];
    };

    const getGoalText = (scorer: string, assist?: string) => {
        const bases = language === 'tr' ? [
            `GOL! ${scorer} ağları buldu!`,
            `${scorer}'dan ne bitiriş! Üst köşe!`,
            `${scorer} sakin bir şekilde ağlara gönderdi.`,
            `İçerde! ${scorer} takımına öne geçirdi.`
        ] : [
            `GOAL! ${scorer} finds the back of the net!`,
            `What a finish by ${scorer}! Top corner!`,
            `${scorer} slots it home calmly.`,
            `It's in! ${scorer} gives them the lead.`
        ];
        const base = bases[Math.floor(Math.random() * bases.length)];
        
        if (assist) {
            return language === 'tr' 
                ? `${base} ${assist}'dan harika pas.`
                : `${base} Great ball from ${assist}.`;
        }
        return base;
    };

    const minutes = Array.from({length: 90}, (_, i) => i + 1);
    for (let i = minutes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [minutes[i], minutes[j]] = [minutes[j], minutes[i]];
    }
    
    // Track VAR checks to prevent events during VAR review period
    const varBlockedMinutes = new Set<number>();
    
    for (let i = 0; i < matchEvents; i++) {
        const minute = minutes[i];
        
        // Skip this minute if it's blocked by an active VAR check
        if (varBlockedMinutes.has(minute)) {
            continue;
        }
        
        // Update dominance based on current player counts
        homeRating = getDynamicTeamStrength(homeTeam, activeHomePlayers.length);
        awayRating = getDynamicTeamStrength(awayTeam, activeAwayPlayers.length);
        ratingDiff = homeRating - awayRating;
        homeDominance = Math.max(0.1, Math.min(0.9, 0.5 + 0.05 + (ratingDiff * 0.04)));
        
        const isHomeAction = Math.random() < homeDominance;
        const activeTeam = isHomeAction ? homeTeam : awayTeam;
        const passiveTeam = isHomeAction ? awayTeam : homeTeam;
        
        const roll = Math.random();

        if (roll < 0.065) {
            // GOAL
            let group: 'FWD' | 'MID' | 'DEF' = 'FWD';
            const posRoll = Math.random();
            if (posRoll > 0.4) group = 'MID'; 
            if (posRoll > 0.8) group = 'DEF'; 

            const scorer = getWeightedPlayer(activeTeam, group, 'shooting');
            
            // Pace affects goal probability - faster players are more likely to score
            const scorerPlayer = (activeTeam.id === homeTeam.id ? homeXI : awayXI)
                .find(x => x.player.name === scorer)?.player;
            let paceBonus = 0;
            if (scorerPlayer) {
                const pace = scorerPlayer.attributes?.pace || scorerPlayer.rating;
                if (pace >= 90) paceBonus = 0.15; // 15% more likely to score
                else if (pace >= 85) paceBonus = 0.10; // 10% more likely
                else if (pace >= 80) paceBonus = 0.05; // 5% more likely
            }
            
            // Apply pace modifier - if pace is low, chance to convert goal to save/miss
            if (paceBonus === 0 && Math.random() < 0.15) {
                // Low pace players have 15% chance to miss even when selected
                const keeper = getPlayerName(passiveTeam, 'GK');
                events.push({
                    minute,
                    type: 'SAVE',
                    description: getSaveText(keeper, scorer),
                    isImportant: false,
                    teamName: passiveTeam.name
                });
                continue; // Skip goal, move to next event
            }
            
            let assistName: string | undefined = undefined;
            if (Math.random() < 0.7) {
                const assistRoll = Math.random();
                let assistGroup: 'MID' | 'FWD' | 'DEF' = 'MID';
                if (assistRoll > 0.5) assistGroup = 'FWD';
                if (assistRoll > 0.85) assistGroup = 'DEF'; 

                assistName = getWeightedPlayer(activeTeam, assistGroup, 'passing');
                if (assistName === scorer) assistName = undefined;
                
                // Dribbling affects assist quality - better dribblers create better assists
                const assistPlayer = (activeTeam.id === homeTeam.id ? homeXI : awayXI)
                    .find(x => x.player.name === assistName)?.player;
                if (assistPlayer) {
                    const dribbling = assistPlayer.attributes?.dribbling || assistPlayer.rating;
                    if (dribbling >= 90 && Math.random() < 0.15) {
                        // 15% chance for "brilliant assist" description with high dribbling
                        events.push({
                            minute,
                            type: 'GOAL',
                            description: language === 'tr' 
                                ? `GOL! ${scorer}'dan harika bir bitiriş! ${assistName}'dan inanılmaz bir dripling ve asist!`
                                : `GOAL! ${scorer} with a brilliant finish! ${assistName} with an incredible dribble and assist!`,
                            isImportant: true,
                            teamName: activeTeam.name
                        });
                        currentScorers.push({
                            name: scorer,
                            minute,
                            teamId: activeTeam.id,
                            assist: assistName
                        });
                        if (activeTeam.id === homeTeam.id) homeGoals++; else awayGoals++;
                        continue;
                    }
                }
            }

            events.push({
                minute,
                type: 'GOAL',
                description: getGoalText(scorer, assistName),
                isImportant: true,
                teamName: activeTeam.name
            });

            currentScorers.push({
                name: scorer,
                minute,
                teamId: activeTeam.id,
                assist: assistName
            });

            // Use activeTeam to determine which team scored (more reliable than isHomeAction)
            if (activeTeam.id === homeTeam.id) homeGoals++; else awayGoals++;

        } else if (roll < 0.25) {
            // SAVE
            const shooter = getPlayerName(activeTeam, Math.random() > 0.5 ? 'FWD' : 'MID');
            const keeper = getPlayerName(passiveTeam, 'GK');
            events.push({
                minute,
                type: 'SAVE',
                description: getSaveText(keeper, shooter),
                isImportant: false,
                teamName: passiveTeam.name
            });

        } else if (roll < 0.45) {
            // MISS
            const shooter = getWeightedPlayer(activeTeam, Math.random() > 0.6 ? 'MID' : 'FWD', 'shooting');
            events.push({
                minute,
                type: 'MISS',
                description: getMissText(shooter),
                isImportant: false,
                teamName: activeTeam.name
            });

        } else if (roll < 0.58) {
            // CARD (Yellow or Red)
            const activeXI = activeTeam.id === homeTeam.id ? homeXI : awayXI;
            const activePlayerIds = activeTeam.id === homeTeam.id ? activeHomePlayers : activeAwayPlayers;
            
            if (activePlayerIds.length > 0) {
                const randomPlayerIndex = Math.floor(Math.random() * activePlayerIds.length);
                const playerId = activePlayerIds[randomPlayerIndex];
                const player = activeXI.find(x => x.player.id === playerId);
                
                if (player) {
                    const currentYellows = yellowCards.get(playerId) || 0;
                    const isRedCard = Math.random() < 0.15; // 15% chance of direct red
                    const isSecondYellow = currentYellows >= 1 && !isRedCard; // Second yellow = red
                    
                    if (isRedCard || isSecondYellow) {
                        // RED CARD - Player sent off
                        cards.push({ playerId, teamId: activeTeam.id, type: 'RED', minute });
                        yellowCards.delete(playerId); // Remove from yellow card tracking
                        
                        // Remove player from active list
                        if (activeTeam.id === homeTeam.id) {
                            activeHomePlayers = activeHomePlayers.filter(id => id !== playerId);
                        } else {
                            activeAwayPlayers = activeAwayPlayers.filter(id => id !== playerId);
                        }
                        
                        events.push({
                            minute,
                            type: 'CARD',
                            description: language === 'tr' 
                                ? `KIRMIZI KART! ${player.player.name}, ${activeTeam.name} için oyundan atıldı!`
                                : `RED CARD! ${player.player.name} is sent off for ${activeTeam.name}!`,
                            isImportant: true,
                            teamName: activeTeam.name
                        });
                    } else {
                        // YELLOW CARD
                        yellowCards.set(playerId, currentYellows + 1);
                        cards.push({ playerId, teamId: activeTeam.id, type: 'YELLOW', minute });
                        
                        events.push({
                            minute,
                            type: 'CARD',
                            description: language === 'tr' 
                                ? `${player.player.name}, ${activeTeam.name} için sarı kart gördü.`
                                : `${player.player.name} receives a yellow card for ${activeTeam.name}.`,
                            isImportant: false,
                            teamName: activeTeam.name
                        });
                    }
                }
            }
            
        } else if (roll < 0.65) {
            // CORNER
            events.push({
                minute,
                type: 'CORNER',
                description: language === 'tr' 
                    ? `${activeTeam.name} korner kazandı.`
                    : `Corner kick won by ${activeTeam.name}.`,
                isImportant: false,
                teamName: activeTeam.name
            });
            
            // Corner result (1-2 minutes after corner)
            const cornerDelay = Math.floor(Math.random() * 2) + 1; // 1 or 2 minutes
            const cornerResultMinute = Math.min(minute + cornerDelay, 90);
            const cornerOutcome = Math.random();
            if (cornerOutcome < 0.15) {
                // Header goal
                const scorer = getWeightedPlayer(activeTeam, 'DEF', 'shooting');
                events.push({
                    minute: cornerResultMinute,
                    type: 'GOAL',
                    description: language === 'tr' 
                        ? `GOL! ${scorer}'dan kornerden harika bir kafa vuruşu!`
                        : `GOAL! ${scorer} with a brilliant header from the corner!`,
                    isImportant: true,
                    teamName: activeTeam.name
                });
                currentScorers.push({
                    name: scorer,
                    minute: cornerResultMinute,
                    teamId: activeTeam.id
                });
                if (activeTeam.id === homeTeam.id) homeGoals++; else awayGoals++;
            } else if (cornerOutcome < 0.25) {
                // Bicycle kick goal
                const scorer = getWeightedPlayer(activeTeam, 'FWD', 'shooting');
                events.push({
                    minute: cornerResultMinute,
                    type: 'GOAL',
                    description: language === 'tr' 
                        ? `GOL! ${scorer}'dan inanılmaz bir bisiklet vuruşu! Kesinlikle muhteşem!`
                        : `GOAL! What an incredible bicycle kick by ${scorer}! Absolutely stunning!`,
                    isImportant: true,
                    teamName: activeTeam.name
                });
                currentScorers.push({
                    name: scorer,
                    minute: cornerResultMinute,
                    teamId: activeTeam.id
                });
                if (activeTeam.id === homeTeam.id) homeGoals++; else awayGoals++;
            } else {
                // Defense cleared / goalkeeper caught
                const defender = getPlayerName(passiveTeam, 'DEF');
                const keeper = getPlayerName(passiveTeam, 'GK');
                const clearText = language === 'tr' 
                    ? (Math.random() > 0.5 
                        ? `Savunma tehlikeyi temizledi. ${defender} önce oraya ulaştı!`
                        : `Kaleci çıktı ve topu aldı! ${keeper} güvenli bir şekilde yakaladı.`)
                    : (Math.random() > 0.5 
                        ? `The defense clears the danger. ${defender} gets there first!`
                        : `The goalkeeper comes out and claims it! ${keeper} with a confident catch.`);
                events.push({
                    minute: cornerResultMinute,
                    type: 'SAVE',
                    description: clearText,
                    isImportant: false,
                    teamName: passiveTeam.name
                });
            }

        } else if (roll < 0.60) {
            // FOUL
            const offender = getPlayerName(activeTeam, 'DEF');
            events.push({
                minute,
                type: 'FOUL',
                description: language === 'tr' 
                    ? `${offender} faul yaptı.`
                    : `Foul committed by ${offender}.`,
                isImportant: false,
                teamName: activeTeam.name
            });

        } else if (roll < 0.62) {
            // CARD
            const offender = getPlayerName(activeTeam, 'DEF');
            events.push({
                minute,
                type: 'CARD',
                description: language === 'tr' 
                    ? `${offender}, aldatıcı bir müdahaleden sonra sarı kart gördü.`
                    : `Yellow card for ${offender} after a cynical challenge.`,
                isImportant: true,
                teamName: activeTeam.name
            });
        } else if (roll < 0.63) {
             // POST
             const shooter = getWeightedPlayer(activeTeam, undefined, 'shooting');
             events.push({
                 minute,
                 type: 'POST',
                 description: language === 'tr' 
                     ? `${shooter} direğe vurdu! Çok şanssız!`
                     : `${shooter} hits the woodwork! So unlucky!`,
                 isImportant: true,
                 teamName: activeTeam.name
             });
        } else if (roll < 0.64) {
             // SUBSTITUTION
             const subOut = getPlayerName(activeTeam);
             events.push({
                 minute,
                 type: 'SUBSTITUTION',
                 description: language === 'tr' 
                     ? `${activeTeam.name} için oyuncu değişikliği. ${subOut} çıkıyor.`
                     : `Substitution for ${activeTeam.name}. ${subOut} is coming off.`,
                 isImportant: false,
                 teamName: activeTeam.name
             });
        } else if (roll < 0.645) {
             // VAR
             events.push({
                 minute,
                 type: 'VAR',
                 description: language === 'tr' 
                     ? `VAR kontrolü devam ediyor...`
                     : `VAR Check in progress...`,
                 isImportant: true,
                 teamName: activeTeam.name
             });
             
             // VAR result (1-2 minutes after VAR check)
             const varDelay = Math.floor(Math.random() * 2) + 1; // 1 or 2 minutes
             const varResultMinute = Math.min(minute + varDelay, 90);
             
             // Block minutes between VAR check and VAR result
             for (let blockedMin = minute + 1; blockedMin < varResultMinute; blockedMin++) {
                 varBlockedMinutes.add(blockedMin);
             }
             const varResult = Math.random();
             if (varResult < 0.25) {
                 // Penalty awarded
                 const fouledPlayer = getWeightedPlayer(activeTeam, 'FWD', 'shooting');
                 events.push({
                     minute: varResultMinute,
                     type: 'PENALTY',
                     description: language === 'tr' 
                         ? `VAR penaltıyı onayladı! ${fouledPlayer} ceza sahasında faul yedi.`
                         : `VAR confirms the penalty! ${fouledPlayer} was fouled in the box.`,
                     isImportant: true,
                     teamName: activeTeam.name
                 });
                 
                 // Penalty outcome (1-2 minutes after penalty decision)
                 const penaltyDelay = Math.floor(Math.random() * 2) + 1; // 1 or 2 minutes
                 const penaltyOutcomeMinute = Math.min(varResultMinute + penaltyDelay, 90);
                 const penaltyOutcome = Math.random();
                 if (penaltyOutcome < 0.75) {
                     // Goal from penalty
                     const scorer = fouledPlayer;
                     events.push({
                         minute: penaltyOutcomeMinute,
                         type: 'GOAL',
                         description: language === 'tr' 
                             ? `GOL! ${scorer} penaltıyı gole çevirdi!`
                             : `GOAL! ${scorer} converts the penalty!`,
                         isImportant: true,
                         teamName: activeTeam.name
                     });
                     currentScorers.push({
                         name: scorer,
                         minute: penaltyOutcomeMinute,
                         teamId: activeTeam.id
                     });
                     if (activeTeam.id === homeTeam.id) homeGoals++; else awayGoals++;
                 } else {
                     // Penalty saved
                     const keeper = getPlayerName(passiveTeam, 'GK');
                     events.push({
                         minute: penaltyOutcomeMinute,
                         type: 'SAVE',
                         description: language === 'tr' 
                             ? `İnanılmaz kurtarış! ${keeper} penaltıyı engelledi!`
                             : `Incredible save! ${keeper} denies the penalty!`,
                         isImportant: true,
                         teamName: passiveTeam.name
                     });
                 }
             } else if (varResult < 0.45) {
                 // Offside
                 events.push({
                     minute: varResultMinute,
                     type: 'VAR',
                     description: language === 'tr' 
                         ? `VAR onayladı: OFSAYD! Gol iptal edildi.`
                         : `VAR confirms: OFFSIDE! The goal is disallowed.`,
                     isImportant: true,
                     teamName: activeTeam.name
                 });
             } else if (varResult < 0.65) {
                 // Foul confirmed
                 const offender = getPlayerName(passiveTeam, 'DEF');
                 events.push({
                     minute: varResultMinute,
                     type: 'FOUL',
                     description: language === 'tr' 
                         ? `VAR, ${offender}'ın faulünü onayladı. Serbest vuruş verildi.`
                         : `VAR confirms the foul by ${offender}. Free kick awarded.`,
                     isImportant: true,
                     teamName: passiveTeam.name
                 });
             } else {
                 // No infringement
                 events.push({
                     minute: varResultMinute,
                     type: 'VAR',
                     description: language === 'tr' 
                         ? `VAR kontrolü tamamlandı: İhlal yok. Oyun devam ediyor.`
                         : `VAR Check complete: No infringement. Play continues.`,
                     isImportant: false,
                     teamName: activeTeam.name
                 });
             }
        }
    }

    events.sort((a, b) => a.minute - b.minute);

    // Verify goal counts match scorers array - scorers array is the source of truth
    const homeScorersCount = currentScorers.filter(s => s.teamId === homeTeam.id).length;
    const awayScorersCount = currentScorers.filter(s => s.teamId === awayTeam.id).length;
    
    // Debug: Log if there's a mismatch
    if (homeScorersCount !== homeGoals || awayScorersCount !== awayGoals) {
        console.warn(`Goal count mismatch detected:`, {
            homeTeam: homeTeam.name,
            homeGoals,
            homeScorersCount,
            awayTeam: awayTeam.name,
            awayGoals,
            awayScorersCount,
            totalScorers: currentScorers.length
        });
    }
    
    // Always use scorers count as source of truth to ensure consistency
    // This ensures that GF in league table matches sum of player goals
    homeGoals = homeScorersCount;
    awayGoals = awayScorersCount;

    // Calculate Man of the Match based on performance
    const calculateManOfTheMatch = (): { playerId: string; teamId: string } | undefined => {
        const allPlayers = [...homeXI.map(x => x.player), ...awayXI.map(x => x.player)];
        
        // Calculate performance score for each player
        const playerScores = allPlayers.map(player => {
            // Count goals
            const goals = currentScorers.filter(s => s.name === player.name).length;
            
            // Count assists
            const assists = currentScorers.filter(s => s.assist === player.name).length;
            
            // Base score from rating (multiply by 2 to give more weight to rating)
            let score = player.rating * 2;
            
            // Goals are worth a lot (each goal = +25 points, reduced to give more weight to rating)
            score += goals * 25;
            
            // Assists are worth less but still significant (each assist = +12 points)
            score += assists * 12;
            
            // Bonus for players from winning team
            if (homeGoals > awayGoals && homeXI.some(x => x.player.id === player.id)) {
                score += 5; // Winning team bonus
            } else if (awayGoals > homeGoals && awayXI.some(x => x.player.id === player.id)) {
                score += 5; // Winning team bonus
            }
            
            // Bonus for goalkeepers if they kept a clean sheet
            if (player.position === Position.GK) {
                const isHomeGK = homeXI.some(x => x.player.id === player.id);
                if (isHomeGK && awayGoals === 0) {
                    score += 10; // Clean sheet bonus for home GK
                } else if (!isHomeGK && homeGoals === 0) {
                    score += 10; // Clean sheet bonus for away GK
                }
            }
            
            return {
                player,
                score,
                goals,
                assists,
                teamId: homeXI.some(x => x.player.id === player.id) ? homeTeam.id : awayTeam.id
            };
        });
        
        // Find player with highest score, using rating as tiebreaker
        const motm = playerScores.reduce((best, current) => {
            if (current.score > best.score) {
                return current;
            } else if (current.score === best.score) {
                // If scores are equal, prefer higher rating
                return current.player.rating > best.player.rating ? current : best;
            }
            return best;
        }, playerScores[0]);
        
        return {
            playerId: motm.player.id,
            teamId: motm.teamId
        };
    };

    const manOfTheMatch = calculateManOfTheMatch();
    const referee = getRandomReferee();

    // Generate match performance data for all players
    const generateMatchPerformances = (): MatchPerformance[] => {
        const performances: MatchPerformance[] = [];
        
        // Process home team players
        homeXI.forEach(({ player }) => {
            const goals = currentScorers.filter(s => s.name === player.name && s.teamId === homeTeam.id).length;
            const assists = currentScorers.filter(s => s.assist === player.name && s.teamId === homeTeam.id).length;
            const playerCards = cards.filter(c => c.playerId === player.id && c.teamId === homeTeam.id);
            const yellowCards = playerCards.filter(c => c.type === 'YELLOW').length;
            const redCard = playerCards.some(c => c.type === 'RED');
            
            // Generate stats first (based on base rating) to use in rating calculation
            const isAttacker = [Position.ST, Position.CF, Position.RW, Position.LW].includes(player.position);
            const isMidfielder = [Position.CM, Position.CAM, Position.CDM, Position.LM, Position.RM].includes(player.position);
            const isDefender = [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(player.position);
            
            // Base performance estimate from player rating
            const basePerformance = (player.rating - 50) / 50; // 0.0 to 1.0
            
            let shots = 0;
            let shotsOnTarget = 0;
            let passes = 0;
            let passAccuracy = 0;
            let tackles = 0;
            let interceptions = 0;
            let saves = 0;
            
            if (isAttacker) {
                shots = Math.floor(Math.random() * 5) + Math.floor(basePerformance * 3);
                shotsOnTarget = Math.floor(shots * (0.3 + basePerformance * 0.2));
                passes = Math.floor(Math.random() * 20) + 15 + Math.floor(basePerformance * 10);
                passAccuracy = 70 + basePerformance * 20;
            } else if (isMidfielder) {
                shots = Math.floor(Math.random() * 3) + Math.floor(basePerformance * 1.5);
                shotsOnTarget = Math.floor(shots * 0.4);
                passes = Math.floor(Math.random() * 30) + 30 + Math.floor(basePerformance * 15);
                passAccuracy = 75 + basePerformance * 16;
                tackles = Math.floor(Math.random() * 5) + 2 + Math.floor(basePerformance * 3);
                interceptions = Math.floor(Math.random() * 3) + 1 + Math.floor(basePerformance * 2);
            } else if (isDefender) {
                shots = Math.floor(Math.random() * 2);
                shotsOnTarget = Math.floor(shots * 0.5);
                passes = Math.floor(Math.random() * 25) + 20 + Math.floor(basePerformance * 10);
                passAccuracy = 80 + basePerformance * 9;
                tackles = Math.floor(Math.random() * 6) + 3 + Math.floor(basePerformance * 3.5);
                interceptions = Math.floor(Math.random() * 4) + 2 + Math.floor(basePerformance * 2);
            } else if (player.position === Position.GK) {
                passes = Math.floor(Math.random() * 15) + 10 + Math.floor(basePerformance * 7.5);
                passAccuracy = 60 + basePerformance * 20;
                saves = Math.floor(Math.random() * 5) + Math.floor(awayGoals * 0.5) + (awayGoals === 0 ? 2 : 0);
            }
            
            // Ensure non-negative values
            shots = Math.max(0, shots);
            shotsOnTarget = Math.max(0, Math.min(shotsOnTarget, shots));
            passes = Math.max(0, passes);
            passAccuracy = Math.max(0, Math.min(100, passAccuracy));
            tackles = Math.max(0, tackles);
            interceptions = Math.max(0, interceptions);
            saves = Math.max(0, saves);
            
            // Calculate match rating (6.0-10.0 based on performance)
            // Base rating starts from player's base rating, normalized to 6.0-7.5 range
            const baseRatingNormalized = 6.0 + ((player.rating - 50) / 50) * 1.5; // 50 rating = 6.0, 100 rating = 7.5
            let matchRating = baseRatingNormalized;
            
            // Goal contributions
            matchRating += goals * 0.8; // Each goal adds 0.8
            matchRating += assists * 0.5; // Each assist adds 0.5
            
            // Match result bonus
            if (homeGoals > awayGoals) matchRating += 0.3; // Win bonus
            else if (homeGoals === awayGoals) matchRating += 0.1; // Draw bonus
            else matchRating -= 0.1; // Loss penalty
            
            // Position-specific bonuses
            if (player.position === Position.GK && awayGoals === 0) matchRating += 0.5; // Clean sheet for GK
            if (player.position === Position.GK && awayGoals > 0) {
                // GK rating affected by goals conceded (more goals = lower rating)
                matchRating -= awayGoals * 0.15;
            }
            
            // Performance stats bonuses
            if (isAttacker) {
                if (shotsOnTarget > 0) matchRating += (shotsOnTarget / shots) * 0.3; // Shot accuracy bonus
                if (passAccuracy > 80) matchRating += (passAccuracy - 80) / 100; // High pass accuracy bonus
            } else if (isMidfielder) {
                if (passes > 40) matchRating += (passes - 40) / 200; // High pass count bonus
                if (passAccuracy > 85) matchRating += (passAccuracy - 85) / 100; // High pass accuracy bonus
                if (tackles > 4) matchRating += (tackles - 4) * 0.05; // Tackle bonus
            } else if (isDefender) {
                if (passAccuracy > 85) matchRating += (passAccuracy - 85) / 100; // High pass accuracy bonus
                if (tackles > 5) matchRating += (tackles - 5) * 0.05; // Tackle bonus
                if (interceptions > 3) matchRating += (interceptions - 3) * 0.05; // Interception bonus
            } else if (player.position === Position.GK) {
                if (saves > 3) matchRating += (saves - 3) * 0.1; // Save bonus
                if (passAccuracy > 70) matchRating += (passAccuracy - 70) / 200; // GK pass accuracy bonus
            }
            
            // Card penalties
            if (redCard) matchRating -= 1.5; // Red card penalty
            else if (yellowCards > 0) matchRating -= 0.2 * yellowCards; // Yellow card penalty
            
            // Random variation to add diversity (-0.2 to +0.2)
            matchRating += (Math.random() - 0.5) * 0.4;
            
            matchRating = Math.min(10.0, Math.max(4.0, matchRating)); // Clamp between 4.0 and 10.0
            
            const minutesPlayed = redCard ? Math.floor(Math.random() * 60) + 30 : 90; // If red card, played 30-89 minutes
            
            performances.push({
                playerId: player.id, // Add player ID for easy matching
                fixtureId: fixture.id,
                week: fixture.week,
                opponentTeamId: awayTeam.id,
                opponentTeamName: awayTeam.name,
                isHome: true,
                result: homeGoals > awayGoals ? 'WIN' : homeGoals === awayGoals ? 'DRAW' : 'LOSS',
                teamScore: homeGoals,
                opponentScore: awayGoals,
                rating: Math.round(matchRating * 10) / 10, // Round to 1 decimal
                goals,
                assists,
                shots,
                shotsOnTarget,
                passes,
                passAccuracy: Math.round(passAccuracy),
                tackles: isDefender || isMidfielder ? tackles : undefined,
                interceptions: isDefender || isMidfielder ? interceptions : undefined,
                saves: player.position === Position.GK ? saves : undefined,
                yellowCards,
                redCard,
                minutesPlayed,
                manOfTheMatch: manOfTheMatch?.playerId === player.id
            });
        });
        
        // Process away team players
        awayXI.forEach(({ player }) => {
            const goals = currentScorers.filter(s => s.name === player.name && s.teamId === awayTeam.id).length;
            const assists = currentScorers.filter(s => s.assist === player.name && s.teamId === awayTeam.id).length;
            const playerCards = cards.filter(c => c.playerId === player.id && c.teamId === awayTeam.id);
            const yellowCards = playerCards.filter(c => c.type === 'YELLOW').length;
            const redCard = playerCards.some(c => c.type === 'RED');
            
            // Generate stats first (based on base rating) to use in rating calculation
            const isAttacker = [Position.ST, Position.CF, Position.RW, Position.LW].includes(player.position);
            const isMidfielder = [Position.CM, Position.CAM, Position.CDM, Position.LM, Position.RM].includes(player.position);
            const isDefender = [Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB].includes(player.position);
            
            // Base performance estimate from player rating
            const basePerformance = (player.rating - 50) / 50; // 0.0 to 1.0
            
            let shots = 0;
            let shotsOnTarget = 0;
            let passes = 0;
            let passAccuracy = 0;
            let tackles = 0;
            let interceptions = 0;
            let saves = 0;
            
            if (isAttacker) {
                shots = Math.floor(Math.random() * 5) + Math.floor(basePerformance * 3);
                shotsOnTarget = Math.floor(shots * (0.3 + basePerformance * 0.2));
                passes = Math.floor(Math.random() * 20) + 15 + Math.floor(basePerformance * 10);
                passAccuracy = 70 + basePerformance * 20;
            } else if (isMidfielder) {
                shots = Math.floor(Math.random() * 3) + Math.floor(basePerformance * 1.5);
                shotsOnTarget = Math.floor(shots * 0.4);
                passes = Math.floor(Math.random() * 30) + 30 + Math.floor(basePerformance * 15);
                passAccuracy = 75 + basePerformance * 16;
                tackles = Math.floor(Math.random() * 5) + 2 + Math.floor(basePerformance * 3);
                interceptions = Math.floor(Math.random() * 3) + 1 + Math.floor(basePerformance * 2);
            } else if (isDefender) {
                shots = Math.floor(Math.random() * 2);
                shotsOnTarget = Math.floor(shots * 0.5);
                passes = Math.floor(Math.random() * 25) + 20 + Math.floor(basePerformance * 10);
                passAccuracy = 80 + basePerformance * 9;
                tackles = Math.floor(Math.random() * 6) + 3 + Math.floor(basePerformance * 3.5);
                interceptions = Math.floor(Math.random() * 4) + 2 + Math.floor(basePerformance * 2);
            } else if (player.position === Position.GK) {
                passes = Math.floor(Math.random() * 15) + 10 + Math.floor(basePerformance * 7.5);
                passAccuracy = 60 + basePerformance * 20;
                saves = Math.floor(Math.random() * 5) + Math.floor(homeGoals * 0.5) + (homeGoals === 0 ? 2 : 0);
            }
            
            // Ensure non-negative values
            shots = Math.max(0, shots);
            shotsOnTarget = Math.max(0, Math.min(shotsOnTarget, shots));
            passes = Math.max(0, passes);
            passAccuracy = Math.max(0, Math.min(100, passAccuracy));
            tackles = Math.max(0, tackles);
            interceptions = Math.max(0, interceptions);
            saves = Math.max(0, saves);
            
            // Calculate match rating
            // Base rating starts from player's base rating, normalized to 6.0-7.5 range
            const baseRatingNormalized = 6.0 + ((player.rating - 50) / 50) * 1.5; // 50 rating = 6.0, 100 rating = 7.5
            let matchRating = baseRatingNormalized;
            
            // Goal contributions
            matchRating += goals * 0.8; // Each goal adds 0.8
            matchRating += assists * 0.5; // Each assist adds 0.5
            
            // Match result bonus
            if (awayGoals > homeGoals) matchRating += 0.3; // Win bonus
            else if (awayGoals === homeGoals) matchRating += 0.1; // Draw bonus
            else matchRating -= 0.1; // Loss penalty
            
            // Position-specific bonuses
            if (player.position === Position.GK && homeGoals === 0) matchRating += 0.5; // Clean sheet for GK
            if (player.position === Position.GK && homeGoals > 0) {
                // GK rating affected by goals conceded (more goals = lower rating)
                matchRating -= homeGoals * 0.15;
            }
            
            // Performance stats bonuses
            if (isAttacker) {
                if (shotsOnTarget > 0 && shots > 0) matchRating += (shotsOnTarget / shots) * 0.3; // Shot accuracy bonus
                if (passAccuracy > 80) matchRating += (passAccuracy - 80) / 100; // High pass accuracy bonus
            } else if (isMidfielder) {
                if (passes > 40) matchRating += (passes - 40) / 200; // High pass count bonus
                if (passAccuracy > 85) matchRating += (passAccuracy - 85) / 100; // High pass accuracy bonus
                if (tackles > 4) matchRating += (tackles - 4) * 0.05; // Tackle bonus
            } else if (isDefender) {
                if (passAccuracy > 85) matchRating += (passAccuracy - 85) / 100; // High pass accuracy bonus
                if (tackles > 5) matchRating += (tackles - 5) * 0.05; // Tackle bonus
                if (interceptions > 3) matchRating += (interceptions - 3) * 0.05; // Interception bonus
            } else if (player.position === Position.GK) {
                if (saves > 3) matchRating += (saves - 3) * 0.1; // Save bonus
                if (passAccuracy > 70) matchRating += (passAccuracy - 70) / 200; // GK pass accuracy bonus
            }
            
            // Card penalties
            if (redCard) matchRating -= 1.5; // Red card penalty
            else if (yellowCards > 0) matchRating -= 0.2 * yellowCards; // Yellow card penalty
            
            // Random variation to add diversity (-0.2 to +0.2)
            matchRating += (Math.random() - 0.5) * 0.4;
            
            matchRating = Math.min(10.0, Math.max(4.0, matchRating)); // Clamp between 4.0 and 10.0
            
            const minutesPlayed = redCard ? Math.floor(Math.random() * 60) + 30 : 90;
            
            performances.push({
                playerId: player.id, // Add player ID for easy matching
                fixtureId: fixture.id,
                week: fixture.week,
                opponentTeamId: homeTeam.id,
                opponentTeamName: homeTeam.name,
                isHome: false,
                result: awayGoals > homeGoals ? 'WIN' : awayGoals === homeGoals ? 'DRAW' : 'LOSS',
                teamScore: awayGoals,
                opponentScore: homeGoals,
                rating: Math.round(matchRating * 10) / 10,
                goals,
                assists,
                shots,
                shotsOnTarget,
                passes,
                passAccuracy: Math.round(passAccuracy),
                tackles: isDefender || isMidfielder ? tackles : undefined,
                interceptions: isDefender || isMidfielder ? interceptions : undefined,
                saves: player.position === Position.GK ? saves : undefined,
                yellowCards,
                redCard,
                minutesPlayed,
                manOfTheMatch: manOfTheMatch?.playerId === player.id
            });
        });
        
        return performances;
    };

    const matchPerformances = generateMatchPerformances();

    return {
        ...fixture,
        played: true,
        homeScore: homeGoals,
        awayScore: awayGoals,
        scorers: currentScorers,
        events: events,
        homeStartingXI: homeXI.map(x => x.player.id),
        awayStartingXI: awayXI.map(x => x.player.id),
        cards: cards,
        manOfTheMatch: manOfTheMatch,
        referee: referee,
        matchPerformances: matchPerformances // Add match performances to fixture
    };
};
