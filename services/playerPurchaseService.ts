import { Team, Player } from '../types';

export interface PlayerPurchaseCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetPendingTransfer: (transfer: { player: Player, fee: number, seller: Team }) => void;
    onSetContractNegotiation: (negotiation: { player: Player, mode: 'TRANSFER' }) => void;
    onSetNegotiation: (negotiation: { player: Player, sellerTeam: Team }) => void;
}

export const processBuyPlayerDirect = (
    player: Player,
    teams: Team[],
    userTeamId: string,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: PlayerPurchaseCallbacks
): { shouldReturnEarly: boolean } => {
    const team = teams.find(t => t.id === userTeamId);
    if (!team) {
        return { shouldReturnEarly: true };
    }
    
    // Get seller team from player's teamId (added in generateMarketForWindow)
    const marketPlayer = player as any;
    const sellerTeamId = marketPlayer.teamId;
    
    // Use market value as the direct purchase price
    const purchasePrice = player.marketValue;
    
    if (!sellerTeamId || sellerTeamId === "free-agent") {
        // Free agent - go directly to contract negotiation
        if (team.budget < purchasePrice) {
            callbacks.onSetNotification({ 
                message: translateNotificationLocal("Insufficient funds!", "Yetersiz bütçe!"), 
                type: 'error' 
            });
            return { shouldReturnEarly: true };
        }
        callbacks.onSetPendingTransfer({ player, fee: purchasePrice, seller: team });
        callbacks.onSetContractNegotiation({ player, mode: 'TRANSFER' });
        return { shouldReturnEarly: true };
    }
    
    // Find seller team
    const sellerTeam = teams.find(t => t.id === sellerTeamId);
    if (!sellerTeam) {
        callbacks.onSetNotification({ 
            message: translateNotificationLocal("Could not find seller team.", "Satıcı takım bulunamadı."), 
            type: 'error' 
        });
        return { shouldReturnEarly: true };
    }
    
    // Check if buyer has enough budget
    if (team.budget < purchasePrice) {
        callbacks.onSetNotification({ 
            message: translateNotificationLocal("Insufficient funds!", "Yetersiz bütçe!"), 
            type: 'error' 
        });
        return { shouldReturnEarly: true };
    }
    
    // Set up pending transfer and open contract negotiation
    // Transfer will only complete after contract is signed in handleContractComplete
    callbacks.onSetPendingTransfer({ player, fee: purchasePrice, seller: sellerTeam });
    callbacks.onSetContractNegotiation({ player, mode: 'TRANSFER' });
    
    return { shouldReturnEarly: false };
};

export const processBuyPlayerNegotiate = (
    player: Player,
    teams: Team[],
    userTeamId: string,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: PlayerPurchaseCallbacks
): { shouldReturnEarly: boolean } => {
    const team = teams.find(t => t.id === userTeamId);
    if (!team) {
        return { shouldReturnEarly: true };
    }
    
    // Get seller team from player's teamId (added in generateMarketForWindow)
    const marketPlayer = player as any;
    const sellerTeamId = marketPlayer.teamId;
    
    if (!sellerTeamId || sellerTeamId === "free-agent") {
        // Free agent - go directly to contract negotiation
        if (team.budget < player.marketValue) {
            callbacks.onSetNotification({ 
                message: translateNotificationLocal("Insufficient funds!", "Yetersiz bütçe!"), 
                type: 'error' 
            });
            return { shouldReturnEarly: true };
        }
        callbacks.onSetPendingTransfer({ player, fee: player.marketValue, seller: team });
        callbacks.onSetContractNegotiation({ player, mode: 'TRANSFER' });
        return { shouldReturnEarly: true };
    }
    
    // Find seller team
    const sellerTeam = teams.find(t => t.id === sellerTeamId);
    if (!sellerTeam) {
        callbacks.onSetNotification({ 
            message: translateNotificationLocal("Could not find seller team.", "Satıcı takım bulunamadı."), 
            type: 'error' 
        });
        return { shouldReturnEarly: true };
    }
    
    // Start negotiation with seller team for transfer fee
    callbacks.onSetNegotiation({ player, sellerTeam });
    
    return { shouldReturnEarly: false };
};

