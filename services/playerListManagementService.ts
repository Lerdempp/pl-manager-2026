import { Team, Player } from '../types';

export interface PlayerListManagementCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetTeams: (updater: (prev: Team[]) => Team[]) => void;
    onSetSellPlayerModal: (modal: null) => void;
    onGenerateOffersForPlayer: (player: Player, type: 'LOAN' | 'TRANSFER') => void;
}

export const processAddToLoanList = (
    player: Player,
    teams: Team[],
    userTeamId: string,
    currentWeek: number,
    wouldViolateMinSquadSize: (player: Player) => boolean,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: PlayerListManagementCallbacks
): { shouldReturnEarly: boolean } => {
    // Check minimum squad size (loan means player will leave temporarily)
    if (wouldViolateMinSquadSize(player)) {
        callbacks.onSetNotification({
            message: translateNotificationLocal(
                'Cannot loan player! Minimum squad size is 20 players.',
                'Oyuncu kiralanamaz! Minimum kadro sayısı 20 oyuncudur.'
            ),
            type: 'error'
        });
        callbacks.onSetSellPlayerModal(null);
        return { shouldReturnEarly: true };
    }
    
    callbacks.onSetTeams(prev => prev.map(t => {
        if (t.id === userTeamId) {
            return {
                ...t,
                players: t.players.map(p => 
                    p.id === player.id 
                        ? { ...p, onLoanList: true, offers: [], transferListWeekAdded: currentWeek, transferListPendingAction: 'LOAN' }
                        : p
                )
            };
        }
        return t;
    }));
    callbacks.onSetSellPlayerModal(null);
    callbacks.onSetNotification({ 
        message: translateNotificationLocal(`${player.name} added to loan list.`, `${player.name} kiralık listesine eklendi.`), 
        type: 'info' 
    });
    callbacks.onGenerateOffersForPlayer(player, 'LOAN');
    
    return { shouldReturnEarly: false };
};

export const processAddToTransferList = (
    player: Player,
    teams: Team[],
    userTeamId: string,
    currentWeek: number,
    wouldViolateMinSquadSize: (player: Player) => boolean,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: PlayerListManagementCallbacks
): { shouldReturnEarly: boolean } => {
    // Check minimum squad size (transfer means player will leave when sold)
    if (wouldViolateMinSquadSize(player)) {
        callbacks.onSetNotification({
            message: translateNotificationLocal(
                'Cannot list player for transfer! Minimum squad size is 20 players.',
                'Oyuncu transfer listesine eklenemez! Minimum kadro sayısı 20 oyuncudur.'
            ),
            type: 'error'
        });
        callbacks.onSetSellPlayerModal(null);
        return { shouldReturnEarly: true };
    }
    
    callbacks.onSetTeams(prev => prev.map(t => {
        if (t.id === userTeamId) {
            return {
                ...t,
                players: t.players.map(p => 
                    p.id === player.id 
                        ? { ...p, onTransferList: true, offers: [], transferListWeekAdded: currentWeek, transferListPendingAction: 'TRANSFER' }
                        : p
                )
            };
        }
        return t;
    }));
    callbacks.onSetSellPlayerModal(null);
    callbacks.onSetNotification({ 
        message: translateNotificationLocal(`${player.name} added to transfer list.`, `${player.name} transfer listesine eklendi.`), 
        type: 'info' 
    });
    callbacks.onGenerateOffersForPlayer(player, 'TRANSFER');
    
    return { shouldReturnEarly: false };
};

export const processReleasePlayerFromSquad = (
    player: Player,
    teams: Team[],
    userTeamId: string,
    wouldViolateMinSquadSize: (player: Player) => boolean,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: PlayerListManagementCallbacks
): { shouldReturnEarly: boolean } => {
    // Check minimum squad size
    if (wouldViolateMinSquadSize(player)) {
        callbacks.onSetNotification({
            message: translateNotificationLocal(
                'Cannot release player! Minimum squad size is 20 players.',
                'Oyuncu serbest bırakılamaz! Minimum kadro sayısı 20 oyuncudur.'
            ),
            type: 'error'
        });
        callbacks.onSetSellPlayerModal(null);
        return { shouldReturnEarly: true };
    }
    
    callbacks.onSetTeams(prev => prev.map(t => {
        if (t.id === userTeamId) {
            return {
                ...t,
                players: t.players.filter(p => p.id !== player.id)
            };
        }
        return t;
    }));
    callbacks.onSetSellPlayerModal(null);
    callbacks.onSetNotification({ 
        message: translateNotificationLocal(
            `${player.name} has been released from the team.`, 
            `${player.name} takımdan serbest bırakıldı.`
        ), 
        type: 'info' 
    });
    
    return { shouldReturnEarly: false };
};

