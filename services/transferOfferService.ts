import { Team, Player, TransferOffer, Fixture } from '../types';
import { isTransferWindowOpen, getTransferWindows } from '../utils/transferWindows';
import { enforceSquadSizeRule } from './squadSizeService';

export interface TransferOfferCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetTeams: (updater: (prev: Team[]) => Team[]) => void;
    onSetInspectPlayer: (updater: (prev: Player | null) => Player | null) => void;
    onSetOfferModal: (modal: null) => void;
    onSetCounterOfferModal: (modal: null) => void;
    onSetNegotiation: (negotiation: null) => void;
}

export const processAcceptOffer = (
    offer: TransferOffer,
    player: Player,
    teams: Team[],
    fixtures: Fixture[],
    currentWeek: number,
    userTeamId: string,
    wouldViolateMinSquadSize: (player: Player) => boolean,
    translateNotificationLocal: (en: string, tr: string) => string,
    formatCurrencyLocal: (value: number) => string,
    callbacks: TransferOfferCallbacks
): void => {
    const team = teams.find(t => t.id === offer.teamId);
    if (!team) return;
    
    if (offer.type === 'TRANSFER') {
        if (wouldViolateMinSquadSize(player)) {
            callbacks.onSetNotification({
                message: translateNotificationLocal(
                    'Cannot accept transfer offer! Minimum squad size is 20 players.',
                    'Transfer teklifi kabul edilemez! Minimum kadro sayısı 20 oyuncudur.'
                ),
                type: 'error'
            });
            return;
        }
        
        const maxWeeks = Math.max(...fixtures.map(f => f.week), 0);
        const transferWindowOpen = isTransferWindowOpen(currentWeek, maxWeeks);
        
        if (transferWindowOpen) {
            let updatedTeams = teams.map(t => {
                if (t.id === userTeamId) {
                    return {
                        ...t,
                        budget: t.budget + offer.fee,
                        financials: {
                            ...t.financials,
                            income: {
                                ...t.financials.income,
                                transfers: t.financials.income.transfers + offer.fee
                            }
                        },
                        players: t.players
                            .filter(p => p.id !== player.id)
                            .map(p => ({
                                ...p,
                                offers: p.offers?.filter(o => !(o.id === offer.id && o.teamId === offer.teamId)) || []
                            }))
                    };
                }
                if (t.id === offer.teamId) {
                    const playerExists = t.players.some(p => p.id === player.id);
                    if (playerExists) {
                        console.warn(`Player ${player.name} (${player.id}) already exists in team ${t.name}, skipping duplicate add`);
                        return t;
                    }
                    return {
                        ...t,
                        budget: t.budget - offer.fee,
                        players: [...t.players, {
                            ...player,
                            contract: {
                                ...player.contract,
                                wage: offer.wage || player.contract.wage
                            },
                            onLoanList: false,
                            onTransferList: false,
                            offers: []
                        }]
                    };
                }
                return t;
            });
            
            updatedTeams = updatedTeams.map(t => {
                if (t.id === userTeamId || t.id === offer.teamId) {
                    return enforceSquadSizeRule(t);
                }
                return t;
            });
            
            callbacks.onSetTeams(() => updatedTeams);
            callbacks.onSetNotification({ 
                message: translateNotificationLocal(
                    `Transfer completed! ${player.name} sold to ${team.name} for ${formatCurrencyLocal(offer.fee)}.`,
                    `Transfer tamamlandı! ${player.name}, ${team.name} takımına ${formatCurrencyLocal(offer.fee)} bedelle satıldı.`
                ), 
                type: 'success' 
            });
        } else {
            if (wouldViolateMinSquadSize(player)) {
                callbacks.onSetNotification({
                    message: translateNotificationLocal(
                        'Cannot accept transfer offer! Minimum squad size is 20 players.',
                        'Transfer teklifi kabul edilemez! Minimum kadro sayısı 20 oyuncudur.'
                    ),
                    type: 'error'
                });
                return;
            }
            
            const windows = getTransferWindows(1, maxWeeks);
            const nextWindowWeek = currentWeek < windows.winterWindow.start 
                ? windows.winterWindow.start 
                : windows.summerWindow.start + (maxWeeks + 1);
            
            callbacks.onSetTeams(prev => {
                const updatedTeams = prev.map(t => {
                    if (t.id === userTeamId) {
                        return {
                            ...t,
                            players: t.players.map(p => 
                                p.id === player.id 
                                    ? { 
                                        ...p, 
                                        pendingTransfer: {
                                            targetTeamId: offer.teamId,
                                            targetTeamName: team.name,
                                            transferDate: nextWindowWeek,
                                            fee: offer.fee,
                                            type: 'TRANSFER'
                                        },
                                        offers: p.offers?.filter(o => o.id !== offer.id) || []
                                    }
                                    : p
                            )
                        };
                    }
                    return t;
                });
                
                callbacks.onSetInspectPlayer(prevInspect => {
                    if (prevInspect && prevInspect.id === player.id) {
                        const updatedPlayer = updatedTeams.find(t => t.id === userTeamId)?.players.find(p => p.id === player.id);
                        if (updatedPlayer) {
                            return updatedPlayer;
                        }
                    }
                    return prevInspect;
                });
                
                return updatedTeams;
            });
            
            callbacks.onSetOfferModal(null);
            
            callbacks.onSetNotification({ 
                message: translateNotificationLocal(
                    `${player.name} sold to ${team.name}. Will leave the team in the next transfer window.`,
                    `${player.name} ${team.name} takımına satıldı önümüzdeki transfer penceresinde takımdan ayrılacak.`
                ), 
                type: 'info' 
            });
        }
    } else {
        if (wouldViolateMinSquadSize(player)) {
            callbacks.onSetNotification({
                message: translateNotificationLocal(
                    'Cannot accept loan offer! Minimum squad size is 20 players.',
                    'Kiralama teklifi kabul edilemez! Minimum kadro sayısı 20 oyuncudur.'
                ),
                type: 'error'
            });
            return;
        }
        
        let updatedTeamsLoan = teams.map(t => {
            if (t.id === userTeamId) {
                return {
                    ...t,
                    budget: t.budget + offer.fee,
                    players: t.players.filter(p => p.id !== player.id)
                };
            }
            if (t.id === offer.teamId) {
                const playerExists = t.players.some(p => p.id === player.id);
                if (playerExists) {
                    console.warn(`Player ${player.name} (${player.id}) already exists in team ${t.name}, skipping duplicate add`);
                    return t;
                }
                return {
                    ...t,
                    budget: t.budget - offer.fee,
                    players: [...t.players, { ...player, onLoanList: false, offers: [] }]
                };
            }
            return t;
        });
        
        updatedTeamsLoan = updatedTeamsLoan.map(t => {
            if (t.id === userTeamId) {
                return enforceSquadSizeRule(t);
            }
            return t;
        });
        
        callbacks.onSetTeams(() => updatedTeamsLoan);
        callbacks.onSetTeams(prev => prev.map(t => {
            if (t.id === userTeamId) {
                return {
                    ...t,
                    players: t.players.map(p => 
                        p.id === player.id
                            ? { ...p, transferListWeekAdded: undefined, transferListPendingAction: undefined }
                            : p
                    )
                };
            }
            return t;
        }));
        callbacks.onSetNotification({ 
            message: translateNotificationLocal(
                `Loan completed! ${player.name} loaned to ${team.name} for ${formatCurrencyLocal(offer.fee)}.`,
                `Kiralama tamamlandı! ${player.name}, ${team.name} takımına ${formatCurrencyLocal(offer.fee)} bedelle kiralandı.`
            ), 
            type: 'success' 
        });
    }
    
    callbacks.onSetOfferModal(null);
    callbacks.onSetCounterOfferModal(null);
    callbacks.onSetNegotiation(null);
};

