import { Team } from '../types';
import { calculateUpgradeWeeks } from './fanSystem';
import { generateSponsorOffer, isSponsorOfferExpired } from './stadiumSponsorService';

export interface StadiumOperationsResult {
    updatedTeams: Team[];
    notifications: Array<{ message: string; type: 'success' | 'info' }>;
    sponsorModal?: { team: Team; offer: any };
}

export const processStadiumOperations = (
    teams: Team[],
    currentWeek: number,
    userTeamId: string,
    stadiumSponsorModal: any,
    translateNotificationLocal: (en: string, tr: string) => string
): StadiumOperationsResult => {
    const nextWeek = currentWeek + 1;
    const notifications: Array<{ message: string; type: 'success' | 'info' }> = [];
    let sponsorModalData: { team: Team; offer: any } | undefined;
    
    const updatedTeams = teams.map(team => {
        let updatedTeam = { ...team };
        
        // Process stadium expansions
        if (team.pendingStadiumExpansion) {
            if (team.pendingStadiumExpansion.startWeek === 0) {
                const currentCapacity = team.stadiumCapacity || 0;
                const expansionWeeks = calculateUpgradeWeeks(currentCapacity) || 5;
                updatedTeam.pendingStadiumExpansion = {
                    ...team.pendingStadiumExpansion,
                    startWeek: nextWeek,
                    completionWeek: nextWeek + expansionWeeks
                };
            }
            
            if (nextWeek >= updatedTeam.pendingStadiumExpansion.completionWeek) {
                updatedTeam.stadiumCapacity = updatedTeam.pendingStadiumExpansion.newCapacity;
                updatedTeam.stadiumExpansionCount = (team.stadiumExpansionCount || 0) + 1;
                updatedTeam.pendingStadiumExpansion = undefined;
                
                if (team.id === userTeamId) {
                    notifications.push({
                        message: translateNotificationLocal(
                            `Stadium expansion completed! New capacity: ${updatedTeam.stadiumCapacity.toLocaleString()}`,
                            `Stadyum genişlemesi tamamlandı! Yeni kapasite: ${updatedTeam.stadiumCapacity.toLocaleString('tr-TR')}`
                        ),
                        type: 'success'
                    });
                }
            }
        }

        // Process stadium sponsor contracts
        if (team.stadiumNameSponsor && team.stadiumNameSponsor.endWeek) {
            if (nextWeek >= team.stadiumNameSponsor.endWeek) {
                const oldSponsorName = team.stadiumNameSponsor.sponsorName;
                const oldSponsorIncome = team.stadiumNameSponsor.annualPayment;
                
                updatedTeam.stadiumNameSponsor = undefined;
                updatedTeam.financials = {
                    ...team.financials,
                    income: {
                        ...team.financials.income,
                        sponsors: Math.max(0, (team.financials.income.sponsors || 0) - oldSponsorIncome)
                    }
                };
                
                if (team.id === userTeamId) {
                    notifications.push({
                        message: translateNotificationLocal(
                            `Stadium sponsor contract expired. ${oldSponsorName} Stadium sponsorship has ended.`,
                            `Stadyum sponsorluğu sona erdi. ${oldSponsorName} stadyum anlaşması bitti.`
                        ),
                        type: 'info'
                    });
                }
            }
        }
        
        // Process stadium sponsor offers
        if (team.pendingStadiumSponsorOffer) {
            if (isSponsorOfferExpired(team.pendingStadiumSponsorOffer, nextWeek)) {
                updatedTeam.pendingStadiumSponsorOffer = undefined;
                if (team.id === userTeamId) {
                    notifications.push({
                        message: translateNotificationLocal(
                            `Stadium sponsor offer has expired.`,
                            `Stadyum sponsorluk teklifi sona erdi.`
                        ),
                        type: 'info'
                    });
                }
            }
        } else if (team.id === userTeamId && team.stadiumCapacity && !stadiumSponsorModal) {
            const lastSponsorOfferWeek = team.stadiumNameSponsor?.signedWeek || 0;
            const weeksSinceLastOffer = nextWeek - lastSponsorOfferWeek;
            
            const shouldGenerate = weeksSinceLastOffer >= 6 && (
                weeksSinceLastOffer >= 12 || 
                (weeksSinceLastOffer >= 10 && Math.random() < 0.5) ||
                (weeksSinceLastOffer >= 6 && Math.random() < 0.3)
            );
            
            if (shouldGenerate) {
                const sponsorOffer = generateSponsorOffer(team.stadiumCapacity, nextWeek, team.id);
                if (sponsorOffer) {
                    updatedTeam.pendingStadiumSponsorOffer = sponsorOffer;
                    sponsorModalData = { team: updatedTeam, offer: sponsorOffer };
                }
            }
        }
        
        return updatedTeam;
    });
    
    return {
        updatedTeams,
        notifications,
        sponsorModal: sponsorModalData
    };
};

