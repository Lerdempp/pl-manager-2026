import { Fixture, Team } from '../types';
import { simulateMatch } from './matchEngine';

export interface WeekSimulationCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetSimulationResults: (results: Fixture[]) => void;
    onSetIsSimulating: (isSimulating: boolean) => void;
}

export const processWeekSimulation = (
    fixtures: Fixture[],
    teams: Team[],
    currentWeek: number,
    language: string,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: WeekSimulationCallbacks
): { shouldReturnEarly: boolean } => {
    // Check if fixtures exist
    if (fixtures.length === 0) {
        callbacks.onSetNotification({ 
            message: translateNotificationLocal("No fixtures available. Please wait for the season to start.", "Fikstür bulunamadı. Lütfen sezonun başlamasını bekleyin."),
            type: 'error' 
        });
        return { shouldReturnEarly: true };
    }

    const weekFixtures = fixtures.filter(f => f.week === currentWeek && !f.played);
    
    if (weekFixtures.length === 0) {
        callbacks.onSetNotification({ 
            message: translateNotificationLocal("No matches available for this week.", "Bu hafta için maç bulunmuyor."),
            type: 'info' 
        });
        return { shouldReturnEarly: true };
    }

    const updatedTeams = [...teams];
    const results: Fixture[] = [];

    weekFixtures.forEach(fixture => {
        const homeTeam = updatedTeams.find(t => t.id === fixture.homeTeamId);
        const awayTeam = updatedTeams.find(t => t.id === fixture.awayTeamId);
        
        if (!homeTeam || !awayTeam) {
            console.error(`Team not found for fixture ${fixture.id}`);
            return;
        }
        
        const result = simulateMatch(fixture, homeTeam, awayTeam, language);
        results.push(result);
        
        // Apply suspensions from red cards
        if (result.cards) {
            const redCards = result.cards.filter(c => c.type === 'RED');
            
            redCards.forEach(card => {
                const team = updatedTeams.find(t => t.id === card.teamId);
                if (team) {
                    const playerIndex = team.players.findIndex(p => p.id === card.playerId);
                    if (playerIndex !== -1) {
                        team.players[playerIndex] = {
                            ...team.players[playerIndex],
                            suspensionGames: (team.players[playerIndex].suspensionGames || 0) + 1
                        };
                    }
                }
            });
        }
    });

    if (results.length > 0) {
        callbacks.onSetSimulationResults(results);
        callbacks.onSetIsSimulating(true);
    }

    return { shouldReturnEarly: false };
};

