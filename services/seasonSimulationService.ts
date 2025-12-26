import { Team, Fixture } from '../types';
import { simulateMatch } from './matchEngine';
import { updateTeamStats, payWeeklyWages } from './weeklyOperations';
import { decreaseSuspensionGames, processWeeklyPlayerUpdates, updatePlayerMarketValues } from './weeklyPlayerUpdates';
import { isTransferWindowOpen } from '../utils/transferWindows';
import { processCPUTransfers, TransferRecord } from './cpuTransferService';
import { processStadiumOperations } from './stadiumOperations';

export interface SeasonSimulationCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetLoading: (loading: boolean) => void;
    onSetLoadingMessage: (message: string) => void;
    onSetFixtures: (fixtures: Fixture[]) => void;
    onSetTeams: (teams: Team[]) => void;
    onSetCurrentWeek: (week: number) => void;
    onSetTransferHistory: (updater: (prev: TransferRecord[]) => TransferRecord[]) => void;
    onSaveCareer: () => void;
}

export const simulateRemainingSeason = async (
    fixtures: Fixture[],
    teams: Team[],
    currentWeek: number,
    userTeamId: string,
    seasonYear: number,
    language: string,
    t: (key: string) => string,
    callbacks: SeasonSimulationCallbacks
): Promise<void> => {
    if (fixtures.length === 0) {
        callbacks.onSetNotification({ 
            message: "No fixtures available. Please wait for the season to start.",
            type: 'error' 
        });
        return;
    }

    callbacks.onSetLoading(true);
    callbacks.onSetLoadingMessage(t('simulatingRemainder'));
    
    await new Promise(r => setTimeout(r, 100));

    const updatedFixtures = [...fixtures];
    let updatedTeams = [...teams];
    
    const remainingFixtures = updatedFixtures.filter(f => !f.played);
    const maxWeeks = Math.max(...fixtures.map(f => f.week), 0);

    if (remainingFixtures.length === 0) {
        callbacks.onSetNotification({ 
            message: "All matches have already been played.",
            type: 'info' 
        });
        callbacks.onSetLoading(false);
        return;
    }

    const processedWeeks = new Set<number>();
    const allCpuTransfers: TransferRecord[] = [];
    let currentTeams = updatedTeams;
    
    remainingFixtures.forEach(fixture => {
        const homeTeam = currentTeams.find(t => t.id === fixture.homeTeamId);
        const awayTeam = currentTeams.find(t => t.id === fixture.awayTeamId);
        
        if (!homeTeam || !awayTeam) {
            console.error(`Team not found for fixture ${fixture.id}`);
            return;
        }
        
        const result = simulateMatch(fixture, homeTeam, awayTeam, language);
        
        const fixIndex = updatedFixtures.findIndex(f => f.id === fixture.id);
        if (fixIndex !== -1) {
            updatedFixtures[fixIndex] = result;
        }

        const lastMinuteGoal = result.events?.some(e => 
            e.type === 'GOAL' && e.minute >= 90
        ) || false;
        
        updateTeamStats(homeTeam, result.homeScore, result.awayScore, true, awayTeam, lastMinuteGoal);
        updateTeamStats(awayTeam, result.awayScore, result.homeScore, false, homeTeam, lastMinuteGoal);
        
        if (!processedWeeks.has(fixture.week)) {
            processedWeeks.add(fixture.week);
            
            payWeeklyWages(currentTeams);
            
            currentTeams = decreaseSuspensionGames(currentTeams);
            const { updatedTeams: teamsWithUpdates } = processWeeklyPlayerUpdates(currentTeams, userTeamId, t);
            currentTeams = updatePlayerMarketValues(teamsWithUpdates);
            
            const transferWindowOpen = isTransferWindowOpen(fixture.week, maxWeeks);
            
            if (transferWindowOpen) {
                const { updatedTeams: teamsWithCPUTransfers, transfers: cpuTransfers } = processCPUTransfers(currentTeams, userTeamId, seasonYear, fixture.week);
                allCpuTransfers.push(...cpuTransfers);
                currentTeams = teamsWithCPUTransfers;
            }
            
            const stadiumResult = processStadiumOperations(
                currentTeams,
                fixture.week - 1,
                userTeamId,
                null,
                () => "" // translateNotificationLocal not needed for season simulation
            );
            currentTeams = stadiumResult.updatedTeams;
        }
    });

    if (allCpuTransfers.length > 0) {
        callbacks.onSetTransferHistory(prev => [...prev, ...allCpuTransfers]);
    }

    callbacks.onSetFixtures(updatedFixtures);
    callbacks.onSetTeams(currentTeams);
    callbacks.onSetCurrentWeek(maxWeeks + 1);
    callbacks.onSetLoading(false);
    
    setTimeout(() => callbacks.onSaveCareer(), 100);
};

