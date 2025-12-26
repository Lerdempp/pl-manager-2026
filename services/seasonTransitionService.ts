import { Team, ViewState, GameState } from '../types';
import { generateMarketForWindow } from './geminiService';
import { generateSeasonSchedule } from './matchEngine';
import { enforceSquadSizeRule } from './squadSizeService';

export interface SeasonTransitionCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetExpiringContractsModal: (open: boolean) => void;
    onSetDevelopmentChanges: (changes: null) => void;
    onSetLoading: (loading: boolean) => void;
    onSetLoadingMessage: (message: string) => void;
    onSetTeams: (teams: Team[]) => void;
    onSetMarketPlayers: (players: any[]) => void;
    onSetFixtures: (fixtures: any[]) => void;
    onSetCurrentWeek: (week: number) => void;
    onSetSeasonYear: (year: string) => void;
    onSetPendingTeams: (teams: Team[] | null) => void;
    onSetYouthReloadCount: (count: number) => void;
    onSetGameState: (state: GameState) => void;
    onSetViewState: (state: ViewState) => void;
}

export const processExpiringContractsComplete = (
    pendingTeams: Team[] | null,
    userTeamId: string,
    seasonYear: string,
    translateNotificationLocal: (en: string, tr: string) => string,
    t: (key: string, params?: any) => string,
    callbacks: SeasonTransitionCallbacks
): { shouldReturnEarly: boolean } => {
    if (!pendingTeams) {
        return { shouldReturnEarly: true };
    }
    
    const myTeam = pendingTeams.find(t => t.id === userTeamId);
    if (!myTeam) {
        return { shouldReturnEarly: true };
    }
    
    // Check if there are still expiring contracts
    const expiringPlayers = myTeam.players.filter(p => (p.contract?.yearsLeft || 0) <= 0);
    
    if (expiringPlayers.length > 0) {
        callbacks.onSetNotification({ 
            message: translateNotificationLocal(`Please renew or release all expiring contracts before starting the new season.`, `Yeni sezona başlamadan önce süresi dolan tüm sözleşmeleri yenileyin veya oyuncuları serbest bırakın.`), 
            type: 'error' 
        });
        return { shouldReturnEarly: true };
    }
    
    // Ensure squad size rule is enforced (adds youth players if needed)
    const updatedMyTeam = enforceSquadSizeRule(myTeam);
    
    // Check minimum squad size after enforcement
    if (updatedMyTeam.players.length < 20) {
        callbacks.onSetNotification({ 
            message: translateNotificationLocal(
                `Cannot proceed. Team must have at least 20 players. After auto-enforcement, you have ${updatedMyTeam.players.length} players. Please renew some contracts.`,
                `Devam edilemez. Takımın en az 20 oyuncusu olmalıdır. Otomatik uygulama sonrası ${updatedMyTeam.players.length} oyuncunuz var. Lütfen bazı sözleşmeleri yenileyin.`
            ), 
            type: 'error' 
        });
        return { shouldReturnEarly: true };
    }
    
    const updatedPendingTeams = pendingTeams.map(t => t.id === userTeamId ? updatedMyTeam : t);
    
    // All contracts handled, proceed to next season
    callbacks.onSetExpiringContractsModal(false);
    callbacks.onSetDevelopmentChanges(null);
    callbacks.onSetLoading(true);
    callbacks.onSetLoadingMessage(t('finalizingPreSeason'));

    const [startYear, endYear] = seasonYear.split('/').map(Number);
    const newSeasonStr = `${startYear + 1}/${endYear + 1}`;

    setTimeout(() => {
        const { market, updatedTeams } = generateMarketForWindow(updatedPendingTeams, userTeamId);
        callbacks.onSetTeams(updatedTeams);
        callbacks.onSetMarketPlayers(market);
        
        const newFixtures = generateSeasonSchedule(updatedTeams);
        callbacks.onSetFixtures(newFixtures);
        
        callbacks.onSetCurrentWeek(1);
        callbacks.onSetSeasonYear(newSeasonStr);
        callbacks.onSetPendingTeams(null);
        callbacks.onSetYouthReloadCount(0); // Reset reload count at season start
        callbacks.onSetGameState(GameState.TRANSFER_WINDOW);
        callbacks.onSetViewState(ViewState.DASHBOARD);
        
        callbacks.onSetLoading(false);
    }, 2000);
    
    return { shouldReturnEarly: false };
};

