import { Team, Player, TransferOffer, NotificationPayload } from '../types';

export interface NegotiationResult {
    updatedTeams: Team[];
    notifications: NotificationPayload[];
}

export const processNegotiationResponses = (
    teams: Team[],
    currentWeek: number,
    userTeamId: string,
    formatCurrencyLocal: (value: number) => string,
    translateNotificationLocal: (en: string, tr: string) => string
): NegotiationResult => {
    const updatedTeams = [...teams];
    const notifications: NotificationPayload[] = [];

    updatedTeams.forEach(team => {
        if (team.id === userTeamId) {
            team.players = team.players.map(player => {
                if (!player.offers || player.offers.length === 0) return player;
                
                const updatedOffers = player.offers.map(offer => {
                    // Check if offer expired (2 weeks from creation)
                    if ((offer.status === 'PENDING' || offer.status === 'NEGOTIATING') && offer.expiryWeek && currentWeek >= offer.expiryWeek) {
                        notifications.push({
                            message: translateNotificationLocal(
                                `Transfer offer from ${offer.teamName} for ${player.name} has expired (no response within 2 weeks).`,
                                `${offer.teamName}'den ${player.name} için transfer teklifi süresi doldu (2 hafta içinde cevap verilmedi).`
                            ),
                            type: 'info',
                            relatedPlayerId: player.id
                        });
                        return { ...offer, status: 'REJECTED' as const };
                    }
                    
                    // Process negotiation responses
                    if (offer.status === 'NEGOTIATING' && offer.waitingForResponse && offer.negotiationRound) {
                        const responseChance = 0.7;
                        const acceptThreshold = offer.lastCounterOffer ? offer.lastCounterOffer * 0.95 : offer.fee * 0.95;
                        
                        const nextRound = (offer.negotiationRound || 0) + 1;
                        const baseHistory = offer.negotiationHistory || [];
                        
                        if (Math.random() < responseChance && offer.lastCounterOffer && offer.lastCounterOffer <= acceptThreshold) {
                            // AI accepts counter offer
                            notifications.push({
                                message: translateNotificationLocal(
                                    `${offer.teamName} accepted your ${formatCurrencyLocal(offer.lastCounterOffer)} counter offer for ${player.name}.`,
                                    `${offer.teamName}, ${player.name} için ${formatCurrencyLocal(offer.lastCounterOffer)} değerindeki karşı teklifinizi kabul etti.`
                                ),
                                type: 'success',
                                relatedPlayerId: player.id
                            });
                            return { 
                                ...offer, 
                                fee: offer.lastCounterOffer,
                                status: 'PENDING' as const,
                                waitingForResponse: false,
                                negotiationRound: nextRound,
                                negotiationHistory: [
                                    ...baseHistory,
                                    {
                                        round: nextRound,
                                        from: 'AI',
                                        amount: offer.lastCounterOffer,
                                        timestamp: Date.now(),
                                        note: 'Accepted counter offer'
                                    }
                                ]
                            };
                        } else if (offer.negotiationRound >= 3) {
                            // Max rounds reached, reject
                            notifications.push({
                                message: translateNotificationLocal(
                                    `${offer.teamName} rejected negotiations for ${player.name}.`,
                                    `${offer.teamName}, ${player.name} için pazarlıkları reddetti.`
                                ),
                                type: 'error',
                                relatedPlayerId: player.id
                            });
                            return { 
                                ...offer, 
                                status: 'REJECTED' as const, 
                                waitingForResponse: false,
                                negotiationRound: nextRound,
                                negotiationHistory: [
                                    ...baseHistory,
                                    {
                                        round: nextRound,
                                        from: 'AI',
                                        amount: offer.lastCounterOffer || offer.fee,
                                        timestamp: Date.now(),
                                        note: 'Offer rejected'
                                    }
                                ]
                            };
                        } else {
                            // AI makes counter offer
                            const aiCounterOffer = offer.lastCounterOffer 
                                ? Math.floor(offer.lastCounterOffer * (0.9 + Math.random() * 0.1))
                                : Math.floor(offer.fee * (0.9 + Math.random() * 0.1));
                            notifications.push({
                                message: translateNotificationLocal(
                                    `${offer.teamName} sent a counter offer of ${formatCurrencyLocal(aiCounterOffer)} for ${player.name}.`,
                                    `${offer.teamName}, ${player.name} için ${formatCurrencyLocal(aiCounterOffer)} değerinde karşı teklif gönderdi.`
                                ),
                                type: 'info',
                                relatedPlayerId: player.id
                            });
                            
                            return { 
                                ...offer, 
                                fee: aiCounterOffer,
                                status: 'PENDING' as const,
                                waitingForResponse: false,
                                negotiationRound: nextRound,
                                negotiationHistory: [
                                    ...baseHistory,
                                    {
                                        round: nextRound,
                                        from: 'AI',
                                        amount: aiCounterOffer,
                                        timestamp: Date.now(),
                                        note: 'Counter offer'
                                    }
                                ]
                            };
                        }
                    }
                    
                    return offer;
                });
                
                return { ...player, offers: updatedOffers };
            });
        }
    });

    return {
        updatedTeams,
        notifications
    };
};

