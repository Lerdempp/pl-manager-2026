import { Team, Player, Fixture } from '../types';
import { getTransferWindows, isTransferWindowOpen } from '../utils/transferWindows';
import { enforceSquadSizeRule } from './squadSizeService';

export interface ContractCompleteCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetTeams: (updater: (prev: Team[]) => Team[]) => void;
    onSetPendingTeams: (updater: (prev: Team[] | null) => Team[] | null) => void;
    onSetMarketPlayers: (updater: (prev: Player[]) => Player[]) => void;
    onSetTransferHistory: (updater: (prev: any[]) => any[]) => void;
    onSetExpiringContractsModal: (open: boolean) => void;
    onSetContractNegotiation: (negotiation: null) => void;
    onSetPendingTransfer: (transfer: null) => void;
    onSetInspectTeam: (team: Team | null) => void;
}

export const processContractComplete = (
    wage: number,
    years: number,
    releaseClause: number | undefined,
    player: Player,
    mode: 'TRANSFER' | 'RENEWAL',
    pendingTransfer: { player: Player, fee: number, seller: Team } | null,
    teams: Team[],
    fixtures: Fixture[],
    currentWeek: number,
    userTeamId: string,
    seasonYear: string,
    expiringContractsModal: boolean,
    pendingTeams: Team[] | null,
    inspectTeam: Team | null,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: ContractCompleteCallbacks
): void => {
    if (expiringContractsModal && mode === 'RENEWAL') {
        if (pendingTeams) {
            const myTeam = pendingTeams.find(t => t.id === userTeamId);
            if (myTeam) {
                const expiringPlayers = myTeam.players.filter(p => {
                    if (p.id === player.id) {
                        return false;
                    }
                    return (p.contract?.yearsLeft || 0) <= 0;
                });
                
                if (expiringPlayers.length === 0) {
                    setTimeout(() => {
                        callbacks.onSetExpiringContractsModal(false);
                    }, 500);
                }
            }
        }
    }
    
    if (mode === 'TRANSFER' && pendingTransfer) {
        const maxWeeks = Math.max(...fixtures.map(f => f.week), 0);
        const transferWindowOpen = isTransferWindowOpen(currentWeek, maxWeeks);
        
        if (transferWindowOpen) {
            const { fee, seller } = pendingTransfer;

            callbacks.onSetTeams(prev => {
                let updatedTeams = prev.map(t => {
                    if (t.id === userTeamId) {
                        return {
                            ...t,
                            budget: t.budget - fee,
                            financials: {
                                ...t.financials,
                                expenses: {
                                    ...t.financials.expenses,
                                    transfers: t.financials.expenses.transfers + fee
                                }
                            },
                            players: (() => {
                                const playerExists = t.players.some(p => p.id === player.id);
                                if (playerExists) {
                                    console.warn(`Player ${player.name} (${player.id}) already exists in team ${t.name}, skipping duplicate add`);
                                    return t.players;
                                }
                                return [...t.players, { 
                                    ...player, 
                                    scouted: true,
                                    contract: { 
                                        wage, 
                                        yearsLeft: years, 
                                        performanceBonus: Math.floor(wage*0.1),
                                        releaseClause: releaseClause
                                    }
                                }];
                            })()
                        };
                    }
                    if (t.id === seller.id) {
                        return {
                            ...t,
                            budget: t.budget + fee,
                            players: t.players.filter(p => p.id !== player.id)
                        };
                    }
                    return t;
                });
                
                updatedTeams = updatedTeams.map(t => {
                    if (t.id === userTeamId || t.id === seller.id) {
                        return enforceSquadSizeRule(t);
                    }
                    return t;
                });
                
                if (inspectTeam && inspectTeam.id === seller.id) {
                    const updatedTeam = updatedTeams.find(t => t.id === seller.id);
                    if (updatedTeam) {
                        callbacks.onSetInspectTeam(updatedTeam);
                    }
                }
                
                return updatedTeams;
            });
            
            callbacks.onSetMarketPlayers(prev => prev.filter(p => p.id !== player.id));
            
            const myTeam = teams.find(t => t.id === userTeamId);
            callbacks.onSetTransferHistory(prev => [...prev, {
                id: `transfer-${Date.now()}-${Math.random()}`,
                playerName: player.name,
                fromTeam: seller.name,
                toTeam: myTeam?.name || 'Your Team',
                fee: fee,
                type: 'TRANSFER',
                date: seasonYear,
                week: currentWeek
            }]);
            
            const clauseText = releaseClause ? `, Release Clause: $${(releaseClause/1000000).toFixed(1)}M` : '';
            callbacks.onSetNotification({ 
                message: translateNotificationLocal(
                    `Signed ${player.name}! Fee: $${(fee/1000000).toFixed(1)}M, Wage: $${wage.toLocaleString()}/wk${clauseText}`,
                    `${player.name} ile anlaşma sağlandı! Ücret: $${(fee/1000000).toFixed(1)}M, Maaş: $${wage.toLocaleString('tr-TR')}/hafta${clauseText}`
                ), 
                type: 'success' 
            });
        } else {
            const windows = getTransferWindows(1, maxWeeks);
            const nextWindowWeek = currentWeek < windows.winterWindow.start 
                ? windows.winterWindow.start 
                : windows.summerWindow.start + (maxWeeks + 1);
            
            const targetTeam = teams.find(t => t.id === userTeamId);
            
            callbacks.onSetTeams(prev => prev.map(t => {
                if (t.id === pendingTransfer.seller.id) {
                    return {
                        ...t,
                        players: t.players.map(p => 
                            p.id === player.id 
                                ? { 
                                    ...p, 
                                    pendingTransfer: {
                                        targetTeamId: userTeamId,
                                        targetTeamName: targetTeam?.name || 'Your Team',
                                        transferDate: nextWindowWeek,
                                        fee: pendingTransfer.fee,
                                        type: 'TRANSFER'
                                    }
                                }
                                : p
                        )
                    };
                }
                return t;
            }));
            
            callbacks.onSetNotification({ 
                message: translateNotificationLocal(
                    `Transfer agreed! ${player.name} will join ${targetTeam?.name || 'your team'} in Week ${nextWindowWeek} (next transfer window).`,
                    `Transfer anlaşması tamam! ${player.name}, ${targetTeam?.name || 'takımınıza'} ${nextWindowWeek}. haftada (bir sonraki transfer döneminde) katılacak.`
                ), 
                type: 'info' 
            });
        }
    } 
    else if (mode === 'RENEWAL') {
        callbacks.onSetTeams(prev => prev.map(t => {
            if (t.id === userTeamId) {
                return {
                    ...t,
                    players: t.players.map(p => {
                        if (p.id === player.id) {
                            return {
                                ...p,
                                contract: {
                                    ...p.contract,
                                    wage: wage,
                                    yearsLeft: p.contract.yearsLeft + years,
                                    releaseClause: releaseClause !== undefined ? releaseClause : p.contract.releaseClause
                                }
                            };
                        }
                        return p;
                    })
                };
            }
            return t;
        }));
        
        if (pendingTeams) {
            callbacks.onSetPendingTeams(prev => prev?.map(t => {
                if (t.id === userTeamId) {
                    return {
                        ...t,
                        players: t.players.map(p => {
                            if (p.id === player.id) {
                                return {
                                    ...p,
                                    contract: {
                                        ...p.contract,
                                        wage: wage,
                                        yearsLeft: p.contract.yearsLeft + years,
                                        releaseClause: releaseClause !== undefined ? releaseClause : p.contract.releaseClause
                                    }
                                };
                            }
                            return p;
                        })
                    };
                }
                return t;
            }) || null);
        }
        
        const clauseText = releaseClause ? `, Release Clause: $${(releaseClause / 1000000).toFixed(1)}M` : '';
        callbacks.onSetNotification({
            message: translateNotificationLocal(
              `Contract renewed for ${player.name}! New Wage: $${wage.toLocaleString()}/wk${clauseText}`,
              `${player.name} için sözleşme yenilendi! Yeni Maaş: $${wage.toLocaleString('tr-TR')}/hafta${clauseText}`
            ),
            type: 'success'
        });
        
        if (expiringContractsModal) {
            setTimeout(() => {
                if (pendingTeams) {
                    const myTeam = pendingTeams.find(t => t.id === userTeamId);
                    if (myTeam) {
                        const expiringPlayers = myTeam.players.filter(p => (p.contract?.yearsLeft || 0) <= 0);
                        
                        if (expiringPlayers.length === 0) {
                            callbacks.onSetExpiringContractsModal(false);
                        }
                    }
                }
            }, 100);
        }
    }
    
    callbacks.onSetContractNegotiation(null);
    callbacks.onSetPendingTransfer(null);
};

