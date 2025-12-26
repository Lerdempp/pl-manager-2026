import { Player, Team, Fixture } from '../types';

export const getPlayerStats = (player: Player, teams: Team[], fixtures: Fixture[]) => {
    const playerTeam = teams.find(t => t.players.some(p => p.id === player.id));
    if (!playerTeam) return { goals: 0, assists: 0, apps: 0, cards: 0, teamName: 'Free Agent', form: [] };

    let goals = 0;
    let assists = 0;
    let apps = 0; // Only count matches where player actually played
    let cards = 0; // Count total cards (yellow + red)
    const recentForm: boolean[] = []; 

    const teamFixtures = fixtures.filter(f => f.played && (f.homeTeamId === playerTeam.id || f.awayTeamId === playerTeam.id));
    
    teamFixtures.forEach(f => {
        // Check if player was in starting XI for this match
        const isHomeMatch = f.homeTeamId === playerTeam.id;
        const startingXI = isHomeMatch ? f.homeStartingXI : f.awayStartingXI;
        const playedInMatch = startingXI?.includes(player.id) || false;
        
        // Count goals for this player in this match (regardless of whether they played)
        // This ensures all goals are counted, even if there's a bug with starting XI tracking
        const matchGoals = f.scorers.filter(s => {
            if (s.teamId !== playerTeam.id) return false;
            // Exact name match
            if (s.name === player.name) return true;
            // Also check if names match when normalized (remove extra spaces, case insensitive)
            const normalizedScorer = s.name.trim().toLowerCase();
            const normalizedPlayer = player.name.trim().toLowerCase();
            return normalizedScorer === normalizedPlayer;
        }).length;
        
        // Count assists for this player in this match
        const matchAssists = f.scorers.filter(s => {
            if (!s.assist || s.teamId !== playerTeam.id) return false;
            // Exact name match
            if (s.assist === player.name) return true;
            // Also check if names match when normalized
            const normalizedAssist = s.assist.trim().toLowerCase();
            const normalizedPlayer = player.name.trim().toLowerCase();
            return normalizedAssist === normalizedPlayer;
        }).length;
        
        // Count cards for this player in this match
        if (f.cards && f.cards.length > 0) {
            const playerCards = f.cards.filter(c => c.playerId === player.id);
            cards += playerCards.length;
        }
        
        if (playedInMatch) {
            apps++; // Only count if player actually played
            
            if (matchGoals > 0) {
                goals += matchGoals;
                recentForm.push(true);
            } else if (matchAssists > 0) {
                assists += matchAssists;
                recentForm.push(true);
            } else {
                recentForm.push(false);
            }
        } else {
            // Player didn't play but might have scored (shouldn't happen, but count it anyway for debugging)
            if (matchGoals > 0) {
                goals += matchGoals;
                console.warn(`Player ${player.name} scored but wasn't in starting XI for match ${f.id}`);
            }
            if (matchAssists > 0) {
                assists += matchAssists;
            }
        }
    });
    
    return {
        goals,
        assists,
        apps,
        cards,
        teamName: playerTeam.name,
        form: recentForm.slice(-5)
    };
};

