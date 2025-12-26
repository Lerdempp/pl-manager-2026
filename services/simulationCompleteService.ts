import { Team, Fixture } from '../types';
import { updateTeamStats } from './weeklyOperations';
import { decreaseSuspensionGames, updatePlayerMarketValues } from './weeklyPlayerUpdates';
import { processWeeklyPlayerUpdates } from './weeklyPlayerUpdates';
import { processScoutReports } from './scoutReportsService';
import { getTransferWindows, isTransferWindowOpen } from '../utils/transferWindows';
import { processCPUTransfers, TransferRecord } from './cpuTransferService';
import { processPendingTransfers } from './pendingTransfersService';
import { processNegotiationResponses } from './negotiationService';
import { payWeeklyWages } from './weeklyOperations';
import { processStadiumOperations } from './stadiumOperations';
import { getPlayersConsideringRetirement } from './retirementService';

export interface SimulationCompleteCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetTeams: (teams: Team[]) => void;
    onSetFixtures: (fixtures: Fixture[]) => void;
    onSetCurrentWeek: (week: number) => void;
    onSetIsSimulating: (isSimulating: boolean) => void;
    onSetSimulationResults: (results: any[]) => void;
    onSetRetirementWarningModal: (players: any[] | null) => void;
    onSetRetirementChecked: (checked: boolean) => void;
    onSetStadiumSponsorModal: (modal: any | null) => void;
    onSetInspectTeam: (team: Team | null) => void;
    onSetTransferHistory: (updater: (prev: TransferRecord[]) => TransferRecord[]) => void;
    onSaveCareer: () => void;
}

export interface SimulationResult {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    events?: Array<{ type: string; minute: number }>;
    cards?: Array<{ type: string; teamId: string; playerId: string }>;
    matchPerformances?: Array<{
        playerId: string;
        isHome: boolean;
        fixtureId: string;
        [key: string]: any;
    }>;
}

export const processSimulationComplete = (
    simulationResults: SimulationResult[],
    fixtures: Fixture[],
    teams: Team[],
    currentWeek: number,
    userTeamId: string,
    seasonYear: number,
    retirementChecked: boolean,
    stadiumSponsorModal: any,
    careerSlot: number | null,
    translateNotificationLocal: (en: string, tr: string) => string,
    formatCurrencyLocal: (value: number) => string,
    t: (key: string) => string,
    callbacks: SimulationCompleteCallbacks
): { shouldReturnEarly: boolean } => {
    const updatedFixtures = [...fixtures];
    let updatedTeams = [...teams];

    simulationResults.forEach(result => {
        const fixIndex = updatedFixtures.findIndex(f => f.id === result.id);
        updatedFixtures[fixIndex] = result;

        const homeTeam = updatedTeams.find(t => t.id === result.homeTeamId);
        const awayTeam = updatedTeams.find(t => t.id === result.awayTeamId);
        
        if (homeTeam && awayTeam) {
            const lastMinuteGoal = result.events?.some(e => 
                e.type === 'GOAL' && e.minute >= 90
            ) || false;
            
            updateTeamStats(homeTeam, result.homeScore, result.awayScore, true, awayTeam, lastMinuteGoal);
            updateTeamStats(awayTeam, result.awayScore, result.homeScore, false, homeTeam, lastMinuteGoal);
            
            if (result.cards) {
                const redCards = result.cards.filter(c => c.type === 'RED');
                
                redCards.forEach(card => {
                    const team = card.teamId === homeTeam.id ? homeTeam : awayTeam;
                    const playerIndex = team.players.findIndex(p => p.id === card.playerId);
                    if (playerIndex !== -1) {
                        team.players[playerIndex] = {
                            ...team.players[playerIndex],
                            suspensionGames: (team.players[playerIndex].suspensionGames || 0) + 1
                        };
                    }
                });
            }
            
            if (result.matchPerformances) {
                result.matchPerformances.forEach(performance => {
                    const playerTeam = performance.isHome ? homeTeam : awayTeam;
                    const playerIndex = playerTeam.players.findIndex(p => p.id === performance.playerId);
                    if (playerIndex !== -1) {
                        const existingPerformances = playerTeam.players[playerIndex].matchPerformances || [];
                        if (!existingPerformances.some(p => p.fixtureId === performance.fixtureId)) {
                            playerTeam.players[playerIndex] = {
                                ...playerTeam.players[playerIndex],
                                matchPerformances: [...existingPerformances, performance]
                            };
                        }
                    }
                });
            }
        }
    });
    
    updatedFixtures.forEach(fixture => {
        if (fixture.matchPerformances && fixture.matchPerformances.length > 0) {
            fixture.matchPerformances.forEach(performance => {
                const playerTeam = performance.isHome 
                    ? updatedTeams.find(t => t.id === fixture.homeTeamId)
                    : updatedTeams.find(t => t.id === fixture.awayTeamId);
                
                if (playerTeam) {
                    const playerIndex = playerTeam.players.findIndex(p => p.id === performance.playerId);
                    if (playerIndex !== -1) {
                        const existingPerformances = playerTeam.players[playerIndex].matchPerformances || [];
                        if (!existingPerformances.some(p => p.fixtureId === performance.fixtureId)) {
                            playerTeam.players[playerIndex] = {
                                ...playerTeam.players[playerIndex],
                                matchPerformances: [...existingPerformances, performance]
                            };
                        }
                    }
                }
            });
        }
    });
    
    updatedTeams = decreaseSuspensionGames(updatedTeams);
    
    const { updatedTeams: teamsWithUpdates, notifications: updateNotifications } = processWeeklyPlayerUpdates(updatedTeams, userTeamId, t);
    updatedTeams = updatePlayerMarketValues(teamsWithUpdates);
    
    updateNotifications.recoveryMessages.forEach(n => callbacks.onSetNotification(n));
    updateNotifications.injuryMessages.forEach(n => callbacks.onSetNotification(n));
    updateNotifications.illnessMessages.forEach(n => callbacks.onSetNotification(n));
    
    processScoutReports(
        updatedTeams,
        currentWeek,
        callbacks.onSetTeams,
        callbacks.onSetInspectTeam,
        (msg) => callbacks.onSetNotification({ ...msg, message: translateNotificationLocal(msg.message, msg.message) }),
        null
    ).catch(console.error);
    
    const nextWeekForScout = currentWeek + 1;
    const maxWeeksForTransfer = Math.max(...updatedFixtures.map(f => f.week), 0);
    const transferWindowOpen = isTransferWindowOpen(nextWeekForScout, maxWeeksForTransfer);
    const transferWindowWasOpen = isTransferWindowOpen(currentWeek, maxWeeksForTransfer);
    const windows = getTransferWindows(1, maxWeeksForTransfer);
    const isTransferWindowEnd = transferWindowWasOpen && !transferWindowOpen && (
        currentWeek === windows.summerWindow.end || 
        currentWeek === windows.winterWindow.end
    );
    
    if (transferWindowOpen) {
        const { updatedTeams: teamsWithCPUTransfers, transfers: cpuTransfers } = processCPUTransfers(updatedTeams, userTeamId, seasonYear, nextWeekForScout);
        callbacks.onSetTransferHistory(prev => [...prev, ...cpuTransfers]);
        updatedTeams = teamsWithCPUTransfers;
    }
    
    if (transferWindowOpen || isTransferWindowEnd) {
        const transferResult = processPendingTransfers(
            updatedTeams,
            nextWeekForScout,
            userTeamId,
            seasonYear,
            formatCurrencyLocal,
            translateNotificationLocal,
            isTransferWindowEnd
        );
        updatedTeams = transferResult.updatedTeams;
        callbacks.onSetTransferHistory(prev => [...prev, ...transferResult.transferHistory]);
        transferResult.notifications.forEach(n => callbacks.onSetNotification(n));
    }
    
    const negotiationResult = processNegotiationResponses(
        updatedTeams,
        currentWeek,
        userTeamId,
        formatCurrencyLocal,
        translateNotificationLocal
    );
    updatedTeams = negotiationResult.updatedTeams;
    negotiationResult.notifications.forEach(note => callbacks.onSetNotification(note));

    payWeeklyWages(updatedTeams);
    
    const maxWeeksForRetirement = Math.max(...updatedFixtures.map(f => f.week), 0);
    const midSeasonWeek = Math.floor(maxWeeksForRetirement / 2);
    const nextWeekForRetirement = currentWeek + 1;
    
    const stadiumResult = processStadiumOperations(
        updatedTeams,
        currentWeek,
        userTeamId,
        stadiumSponsorModal,
        translateNotificationLocal
    );
    updatedTeams = stadiumResult.updatedTeams;
    stadiumResult.notifications.forEach(n => callbacks.onSetNotification(n));
    if (stadiumResult.sponsorModal) {
        setTimeout(() => callbacks.onSetStadiumSponsorModal(stadiumResult.sponsorModal!), 100);
    }
    
    if (nextWeekForRetirement === midSeasonWeek && !retirementChecked) {
        const myTeam = updatedTeams.find(t => t.id === userTeamId);
        if (myTeam) {
            const playersConsideringRetirement = getPlayersConsideringRetirement(myTeam.players);
            if (playersConsideringRetirement.length > 0) {
                callbacks.onSetRetirementWarningModal(playersConsideringRetirement);
                callbacks.onSetRetirementChecked(true);
                callbacks.onSetFixtures(updatedFixtures);
                callbacks.onSetTeams(updatedTeams);
                callbacks.onSetCurrentWeek(nextWeekForRetirement);
                
                if (careerSlot !== null) {
                    setTimeout(() => callbacks.onSaveCareer(), 100);
                }
                callbacks.onSetIsSimulating(false);
                callbacks.onSetSimulationResults([]);
                return { shouldReturnEarly: true };
            }
        }
    }
    
    callbacks.onSetFixtures(updatedFixtures);
    callbacks.onSetTeams(updatedTeams);
    callbacks.onSetCurrentWeek(nextWeekForRetirement);
    callbacks.onSetIsSimulating(false);
    callbacks.onSetSimulationResults([]);
    
    return { shouldReturnEarly: false };
};

