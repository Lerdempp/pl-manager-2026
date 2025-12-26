import { Team, Player, ViewState, GameState } from '../types';
import { generateMarketForWindow } from './geminiService';
import { generateInitialSquad } from './geminiService';
import { generateSeasonSchedule } from './matchEngine';
import { initializeFanSystem } from './fanSystem';
import { selectCaptain } from './captainService';

export interface TeamSelectionCallbacks {
    onSetLoading: (loading: boolean) => void;
    onSetLoadingMessage: (message: string) => void;
    onSetUserTeamId: (teamId: string) => void;
    onSetTeams: (teams: Team[]) => void;
    onSetMarketPlayers: (players: Player[]) => void;
    onSetFixtures: (fixtures: any[]) => void;
    onSetSeasonYear: (year: string) => void;
    onSetCurrentWeek: (week: number) => void;
    onSetGameState: (state: GameState) => void;
    onSetViewState: (state: ViewState) => void;
    onSetManagerAchievements: (achievements: any[]) => void;
    onSetManagerCareerHistory: (history: any[]) => void;
}

export const processTeamSelection = async (
    selectedTeam: Team,
    teams: Team[],
    translateNotificationLocal: (en: string, tr: string) => string,
    t: (key: string, params?: any) => string,
    callbacks: TeamSelectionCallbacks
): Promise<void> => {
    callbacks.onSetUserTeamId(selectedTeam.id);
    callbacks.onSetManagerAchievements([]); // Clear achievements when selecting a team (new game)
    callbacks.onSetManagerCareerHistory([]); // Clear careerHistory when selecting a team (trophies shown as achievements)
    // Clear all achievement and careerHistory keys from localStorage to prevent any leftover data
    for (let i = 0; i < 5; i++) {
        localStorage.removeItem(`achievements_${i}`);
        localStorage.removeItem(`careerHistory_${i}`); // Clear careerHistory too
    }
    console.log(`[ACHIEVEMENTS] Cleared all achievements and careerHistory when selecting team ${selectedTeam.name}`);
    callbacks.onSetLoading(true);
    callbacks.onSetLoadingMessage(t('negotiatingContract', { teamName: selectedTeam.name }));
    
    try {
        let squad = selectedTeam.players;
        
        // If the static data didn't have players (filler teams), generate them
        if (squad.length === 0) {
            callbacks.onSetLoadingMessage(t('scoutingPlayers', { teamName: selectedTeam.name }));
            squad = await generateInitialSquad(selectedTeam.name);
        }
        
        // Update the user team with squad and mark user's players as scouted
        // Also ensure fan system values are initialized if missing
        const teamsWithUserSquad = teams.map(t => {
            if (t.id === selectedTeam.id) {
                const updatedTeam = { 
                    ...t, 
                    players: squad.map(p => ({ ...p, scouted: true })) // User's own players are scouted
                };
                
                // Initialize fan system if missing
                if (t.fanCount === undefined || t.stadiumCapacity === undefined) {
                    const fanSystem = initializeFanSystem(t.name, t.baseRating, t.league || "Premier League");
                    Object.assign(updatedTeam, fanSystem);
                }
                
                // Ensure captain is selected if missing
                if (!updatedTeam.captainId && updatedTeam.players && updatedTeam.players.length > 0) {
                    // selectCaptain already imported at top
                    const captain = selectCaptain(updatedTeam);
                    if (captain) {
                        updatedTeam.captainId = captain.id;
                    }
                }
                
                return updatedTeam;
            }
            return t;
        });
        
        // Generate Market from OTHER teams
        const { market, updatedTeams } = generateMarketForWindow(teamsWithUserSquad, selectedTeam.id);
        
        // Generate fixtures for the season
        const seasonFixtures = generateSeasonSchedule(updatedTeams);
        
        callbacks.onSetTeams(updatedTeams);
        callbacks.onSetMarketPlayers(market);
        callbacks.onSetFixtures(seasonFixtures);
        callbacks.onSetSeasonYear("2025/2026"); // Ensure season starts at 2025/2026
        callbacks.onSetCurrentWeek(1);

        callbacks.onSetGameState(GameState.TRANSFER_WINDOW);
        callbacks.onSetViewState(ViewState.MAIN_MENU);
    } catch (e) {
        console.error(e);
    } finally {
        callbacks.onSetLoading(false);
    }
};

