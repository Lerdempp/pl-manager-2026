import { Team, Player, TransferRecord } from '../types';
import { enforceSquadSizeRule, hasTooMany21PlusPlayers, freeLowestRated21PlusPlayers, countPlayers21Plus } from './squadSizeService';

export interface PendingTransferResult {
    updatedTeams: Team[];
    transferHistory: TransferRecord[];
    notifications: Array<{ message: string; type: 'success' | 'error' | 'info' }>;
}

export const processPendingTransfers = (
    teams: Team[],
    nextWeek: number,
    userTeamId: string,
    seasonYear: number,
    formatCurrencyLocal: (value: number) => string,
    translateNotificationLocal: (en: string, tr: string) => string,
    isTransferWindowEnd: boolean
): PendingTransferResult => {
    let updatedTeams = [...teams];
    const transferHistory: TransferRecord[] = [];
    const notifications: Array<{ message: string; type: 'success' | 'error' | 'info' }> = [];

    updatedTeams.forEach(team => {
        team.players.forEach(player => {
            if (player.pendingTransfer && player.pendingTransfer.transferDate === nextWeek) {
                const { targetTeamId, targetTeamName, fee, type } = player.pendingTransfer;
                const targetTeam = updatedTeams.find(t => t.id === targetTeamId);
                const sellerTeam = team;
                
                if (targetTeam) {
                    if (type === 'TRANSFER') {
                        // Check minimum squad size for seller team (if it's user team)
                        if (sellerTeam.id === userTeamId) {
                            const remainingPlayers = sellerTeam.players.filter(p => p.id !== player.id);
                            if (remainingPlayers.length < 20) {
                                notifications.push({
                                    message: translateNotificationLocal(
                                        `Transfer cancelled! ${player.name} cannot leave as it would violate minimum squad size (20 players).`,
                                        `Transfer iptal edildi! ${player.name} minimum kadro sayısını (20 oyuncu) ihlal edeceği için takımdan ayrılamaz.`
                                    ),
                                    type: 'error'
                                });
                                
                                const teamIndex = updatedTeams.findIndex(t => t.id === sellerTeam.id);
                                if (teamIndex !== -1) {
                                    updatedTeams[teamIndex] = {
                                        ...updatedTeams[teamIndex],
                                        players: updatedTeams[teamIndex].players.map(p =>
                                            p.id === player.id
                                                ? { ...p, pendingTransfer: undefined }
                                                : p
                                        )
                                    };
                                }
                                return;
                            }
                        }
                        
                        // Remove from seller
                        const sellerIndex = updatedTeams.findIndex(t => t.id === sellerTeam.id);
                        if (sellerIndex !== -1) {
                            updatedTeams[sellerIndex] = {
                                ...updatedTeams[sellerIndex],
                                players: updatedTeams[sellerIndex].players.filter(p => p.id !== player.id),
                                budget: updatedTeams[sellerIndex].budget + fee,
                                financials: {
                                    ...updatedTeams[sellerIndex].financials,
                                    income: {
                                        ...updatedTeams[sellerIndex].financials.income,
                                        transfers: updatedTeams[sellerIndex].financials.income.transfers + fee
                                    }
                                }
                            };
                        }
                        
                        // Add to buyer
                        const buyerIndex = updatedTeams.findIndex(t => t.id === targetTeamId);
                        if (buyerIndex !== -1) {
                            const playerExists = updatedTeams[buyerIndex].players.some(p => p.id === player.id);
                            if (playerExists) {
                                console.warn(`Player ${player.name} (${player.id}) already exists in team ${updatedTeams[buyerIndex].name}, skipping duplicate add`);
                            } else {
                                const { pendingTransfer, ...playerWithoutPending } = player;
                                updatedTeams[buyerIndex] = {
                                    ...updatedTeams[buyerIndex],
                                    players: [...updatedTeams[buyerIndex].players, playerWithoutPending],
                                    budget: updatedTeams[buyerIndex].budget - fee,
                                    financials: {
                                        ...updatedTeams[buyerIndex].financials,
                                        expenses: {
                                            ...updatedTeams[buyerIndex].financials.expenses,
                                            transfers: updatedTeams[buyerIndex].financials.expenses.transfers + fee
                                        }
                                    }
                                };
                            }
                        }
                        
                        // Enforce squad size rule
                        const sellerTeamIdx = updatedTeams.findIndex(t => t.id === sellerTeam.id);
                        if (sellerTeamIdx !== -1) {
                            updatedTeams[sellerTeamIdx] = enforceSquadSizeRule(updatedTeams[sellerTeamIdx]);
                        }
                        if (buyerIndex !== -1) {
                            updatedTeams[buyerIndex] = enforceSquadSizeRule(updatedTeams[buyerIndex]);
                        }
                        
                        transferHistory.push({
                            id: `transfer-${Date.now()}-${Math.random()}`,
                            playerName: player.name,
                            fromTeam: sellerTeam.name,
                            toTeam: targetTeamName,
                            fee: fee,
                            type: 'TRANSFER',
                            date: seasonYear,
                            week: nextWeek
                        });
                        
                        const isSale = sellerTeam.id === userTeamId;
                        const isPurchase = targetTeamId === userTeamId;
                        
                        let notificationMessage = '';
                        if (isSale) {
                            notificationMessage = translateNotificationLocal(
                                `Transfer completed! ${player.name} sold to ${targetTeamName} for ${formatCurrencyLocal(fee)}.`,
                                `Transfer tamamlandı! ${player.name}, ${targetTeamName} takımına ${formatCurrencyLocal(fee)} bedelle satıldı.`
                            );
                        } else if (isPurchase) {
                            notificationMessage = translateNotificationLocal(
                                `Transfer completed! ${player.name} joined ${targetTeamName}.`,
                                `Transfer tamamlandı! ${player.name}, ${targetTeamName} takımına katıldı.`
                            );
                        } else {
                            notificationMessage = translateNotificationLocal(
                                `Transfer completed! ${player.name} joined ${targetTeamName}.`,
                                `Transfer tamamlandı! ${player.name}, ${targetTeamName} takımına katıldı.`
                            );
                        }
                        
                        notifications.push({
                            message: notificationMessage,
                            type: 'success'
                        });
                    }
                }
            }
        });
    });
    
    // Check and enforce squad size rule at transfer window end
    if (isTransferWindowEnd) {
        updatedTeams.forEach((team, index) => {
            if (hasTooMany21PlusPlayers(team)) {
                const { freedPlayers, updatedTeam } = freeLowestRated21PlusPlayers(team);
                updatedTeams[index] = updatedTeam;
                
                if (team.id === userTeamId && freedPlayers.length > 0) {
                    const freedCount = freedPlayers.length;
                    const freedNames = freedPlayers.map(p => p.name).join(', ');
                    notifications.push({
                        message: `Transfer sezonu sona erdi. Takımınızda 21 yaşından büyük 25'ten fazla oyuncu vardı (${countPlayers21Plus(team.players)}). En düşük ratingli ${freedCount} oyuncu otomatik olarak serbest bırakıldı: ${freedNames}`,
                        type: 'info'
                    });
                }
            }
        });
    }
    
    return {
        updatedTeams,
        transferHistory,
        notifications
    };
};

