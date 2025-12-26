import { Team, Player, TransferOffer } from '../types';

export interface OfferGenerationCallbacks {
    onSetTeams: (updater: (prev: Team[]) => Team[]) => void;
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
}

export const generateOffersForPlayer = (
    player: Player,
    type: 'LOAN' | 'TRANSFER',
    teams: Team[],
    userTeamId: string,
    currentWeek: number,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: OfferGenerationCallbacks
): void => {
    setTimeout(() => {
        const interestedTeams = teams
            .filter(t => t.id !== userTeamId && t.budget > player.marketValue * 0.5)
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.floor(Math.random() * 3) + 1); // 1-3 teams interested
        
        interestedTeams.forEach(team => {
            // Youth academy players get lower offers (teams know they're from academy and less proven)
            const isYouthAcademy = player.isYouthAcademy || false;
            const baseMultiplier = isYouthAcademy ? 0.4 : 0.7; // Youth academy: 40-70%, Normal: 70-100%
            const rangeMultiplier = isYouthAcademy ? 0.3 : 0.3; // Same range but lower base
            
            const offerFee = type === 'TRANSFER' 
                ? Math.floor(player.marketValue * (baseMultiplier + Math.random() * rangeMultiplier))
                : Math.floor(player.marketValue * 0.1 * (0.5 + Math.random() * 0.5)); // 5-10% loan fee
            
            const offer: TransferOffer = {
                id: `offer-${Date.now()}-${Math.random()}`,
                teamId: team.id,
                teamName: team.name,
                playerId: player.id,
                type,
                fee: offerFee,
                wage: undefined, // No wage offers
                status: 'PENDING',
                createdAt: Date.now(),
                expiryWeek: currentWeek + 2, // Expires in 2 weeks
                negotiationRound: 0,
                originalFee: offerFee,
                negotiationHistory: [{
                    round: 0,
                    from: 'AI',
                    amount: offerFee,
                    timestamp: Date.now(),
                    note: 'Initial offer'
                }]
            };
            
            callbacks.onSetTeams(prev => prev.map(t => {
                if (t.id === userTeamId) {
                    return {
                        ...t,
                        players: t.players.map(p => 
                            p.id === player.id
                                ? { ...p, offers: [...(p.offers || []), offer] }
                                : p
                        )
                    };
                }
                return t;
            }));
        });
        
        if (interestedTeams.length > 0) {
            const offerWord = type === 'LOAN'
                ? translateNotificationLocal('loan', 'kiralık')
                : translateNotificationLocal('transfer', 'transfer');
            callbacks.onSetNotification({ 
                message: translateNotificationLocal(
                    `${interestedTeams.length} team(s) made ${offerWord} offers for ${player.name}.`,
                    `${interestedTeams.length} takım ${player.name} için ${offerWord} teklifi yaptı.`
                ), 
                type: 'info' 
            });
        }
        callbacks.onSetTeams(prev => prev.map(t => {
            if (t.id === userTeamId) {
                return {
                    ...t,
                    players: t.players.map(p => 
                        p.id === player.id
                            ? { ...p, transferListPendingAction: undefined }
                            : p
                    )
                };
            }
            return t;
        }));
    }, 2000);
};

