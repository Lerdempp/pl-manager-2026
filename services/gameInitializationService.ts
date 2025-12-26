import { Team, GameState } from '../types';
import { generateLeagueData } from './geminiService';

export interface GameInitializationCallbacks {
    onSetLoading: (loading: boolean) => void;
    onSetLoadingMessage: (message: string) => void;
    onSetTeams: (teams: Team[]) => void;
    onSetSeasonYear: (year: string) => void;
    onSetCurrentWeek: (week: number) => void;
    onSetGameState: (state: GameState) => void;
    onSetCareerSlot: (slot: number | null) => void;
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
}

export const processGameInitialization = async (
    translateNotificationLocal: (en: string, tr: string) => string,
    t: (key: string, params?: any) => string,
    callbacks: GameInitializationCallbacks
): Promise<void> => {
    callbacks.onSetLoading(true);
    callbacks.onSetLoadingMessage(t('initializingDatabase'));
    try {
        console.log("Starting game initialization...");
        const leagueTeams = await generateLeagueData();
        console.log(`Generated ${leagueTeams.length} teams`);
        
        // Make Marcus Bettinelli injured for testing
        const updatedTeams = leagueTeams.map(team => ({
            ...team,
            players: team.players.map(player => {
                if (player.name === "Marcus Bettinelli") {
                    return {
                        ...player,
                        injury: {
                            type: "Hamstring Strain",
                            weeksOut: 4
                        }
                    };
                }
                return player;
            })
        }));
        
        callbacks.onSetTeams(updatedTeams);
        callbacks.onSetSeasonYear("2025/2026"); // Ensure season starts at 2025/2026
        callbacks.onSetCurrentWeek(1);
        callbacks.onSetGameState(GameState.TEAM_SELECTION);
        console.log("Game initialization complete");
    } catch (e) {
        console.error("Failed to init", e);
        callbacks.onSetNotification({ 
            message: translateNotificationLocal(
                `Failed to initialize game: ${e instanceof Error ? e.message : 'Unknown error'}`,
                `Oyun başlatılamadı: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`
            ), 
            type: 'error' 
        });
        callbacks.onSetGameState(GameState.CAREER_SELECT);
        callbacks.onSetCareerSlot(null);
    } finally {
        callbacks.onSetLoading(false);
    }
};

