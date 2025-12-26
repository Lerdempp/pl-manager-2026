import { Team, Player } from '../types';
import { generateScoutReport } from './geminiService';

export interface ScoutReportResult {
    player: Player;
    teamId: string;
    report: string;
}

export const processScoutReports = async (
    teams: Team[],
    currentWeek: number,
    onUpdateTeams: (updater: (prevTeams: Team[]) => Team[]) => void,
    onUpdateInspectTeam: (updater: (prevTeam: Team | null) => Team | null) => void,
    onNotification: (message: { message: string; type: 'success' | 'error' | 'info' }) => void,
    inspectTeam: Team | null
): Promise<void> => {
    const nextWeekForScout = currentWeek + 1;
    const playersToScout: { player: Player; teamId: string }[] = [];
    
    teams.forEach(team => {
        team.players.forEach(player => {
            if (player.pendingScout && player.pendingScout <= nextWeekForScout) {
                playersToScout.push({ player, teamId: team.id });
            }
        });
    });
    
    if (playersToScout.length === 0) return;
    
    const results = await Promise.all(
        playersToScout.map(async ({ player, teamId }) => {
            try {
                const report = await generateScoutReport(player);
                return { player, teamId, report };
            } catch (e) {
                console.error(`Failed to generate scout report for ${player.name}:`, e);
                return null;
            }
        })
    );
    
    onUpdateTeams(prevTeams => {
        const newTeams = [...prevTeams];
        results.forEach(result => {
            if (!result) return;
            
            const { player, teamId, report } = result;
            const team = newTeams.find(t => t.id === teamId);
            if (team) {
                const playerIndex = team.players.findIndex(p => p.id === player.id);
                if (playerIndex !== -1) {
                    team.players[playerIndex] = {
                        ...team.players[playerIndex],
                        scouted: true,
                        scoutReport: report,
                        pendingScout: undefined
                    };
                }
            }
            
            onNotification({
                message: `Scout report received for ${player.name}`,
                type: 'success'
            });
        });
        return newTeams;
    });
    
    // Update inspectTeam if it's the scouted team
    results.forEach(result => {
        if (!result) return;
        const { player, teamId, report } = result;
        if (inspectTeam && inspectTeam.id === teamId) {
            onUpdateInspectTeam(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    players: prev.players.map(p => 
                        p.id === player.id 
                            ? { ...p, scouted: true, scoutReport: report, pendingScout: undefined }
                            : p
                    )
                };
            });
        }
    });
};

