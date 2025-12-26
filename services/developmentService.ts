import { Team, Player, DevelopmentChange } from '../types';
import { calculateAttributeGrowth } from './playerDevelopment';
import { calculateMarketValue } from './legendaryPlayers';
import { getPlayersTurned21, countPlayers21Plus } from './squadSizeService';

export interface DevelopmentServiceCallbacks {
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetPendingTeams: (teams: Team[]) => void;
    onSetDevelopmentChanges: (changes: DevelopmentChange[]) => void;
    onSetSeasonSummary: (summary: null) => void;
    onSetManagerOffers: (offers: null) => void;
}

export const processSeasonDevelopment = (
    teams: Team[],
    userTeamId: string,
    targetTeamId: string | undefined,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: DevelopmentServiceCallbacks
): void => {
    callbacks.onSetSeasonSummary(null);
    callbacks.onSetManagerOffers(null);
    
    const changes: DevelopmentChange[] = [];
    const teamIdForDevelopment = targetTeamId || userTeamId;
    
    if (!teamIdForDevelopment) {
        console.error('processSeasonDevelopment: No team ID available!', { targetTeamId, userTeamId });
        return;
    }

    const nextSeasonTeams = teams.map(t => {
        const updatedPlayers = t.players.filter(p => {
            const newAge = p.age + 1;
            
            let retirementChance = 0;
            if (newAge >= 38) {
                retirementChance = 0.8;
            } else if (newAge >= 36) {
                retirementChance = 0.5;
            } else if (newAge >= 34) {
                retirementChance = 0.2;
            } else if (newAge >= 32 && p.rating < 60) {
                retirementChance = 0.3;
            } else if (newAge >= 30 && p.rating < 55) {
                retirementChance = 0.2;
            }
            
            const willRetire = Math.random() < retirementChance;
            
            if (willRetire && t.id === teamIdForDevelopment) {
                callbacks.onSetNotification({ 
                    message: translateNotificationLocal(
                        `${p.name} (${newAge} years old) has decided to retire from professional football.`,
                        `${p.name} (${newAge} yaşında) profesyonel futbolu bırakmaya karar verdi.`
                    ),
                    type: 'info' 
                });
            }
            
            return !willRetire;
        }).map(p => {
            let newRating = p.rating;
            let diff = 0;

            if (p.age < 24 && p.rating < p.potential) {
                const gap = p.potential - p.rating;
                const growth = Math.ceil(gap * (Math.random() * 0.3 + 0.1)); 
                diff = Math.max(1, growth);
            } else if (p.age < 29 && p.rating < p.potential) {
                 diff = 1;
            } else if (p.age > 31) {
                diff = -Math.floor(Math.random() * 3); 
            }

            newRating = Math.max(50, Math.min(99, newRating + diff));
            diff = newRating - p.rating;

            const { newAttrs, changes: attrChanges } = calculateAttributeGrowth(p, diff);

            const newContract = {
                ...p.contract,
                yearsLeft: Math.max(0, (p.contract?.yearsLeft || 1) - 1)
            };

            const newAge = p.age + 1;
            const newMarketValue = calculateMarketValue(newRating, newAge, p.potential);
            
            const newPlayerObj = {
                ...p,
                age: newAge,
                rating: newRating,
                marketValue: Math.floor(newMarketValue),
                trueValue: Math.floor(newMarketValue),
                attributes: newAttrs,
                contract: newContract
            };

            if (t.id === teamIdForDevelopment) {
                changes.push({
                    playerId: p.id,
                    name: p.name,
                    position: p.position,
                    oldRating: p.rating,
                    newRating: newRating,
                    diff: diff,
                    playerSnapshot: newPlayerObj,
                    attributeChanges: attrChanges
                });
            }
            return newPlayerObj;
        });
        
        const baseSponsor = Math.floor(t.baseRating * 500000);
        let baseFacilities = Math.floor(t.baseRating * 50000);

        let adjustedBudget = t.budget;
        if (t.id !== userTeamId && t.budget > 100000000) {
            const excessBudget = t.budget - 100000000;
            const spendPercentage = 0.2 + Math.random() * 0.2;
            const infrastructureSpending = Math.floor(excessBudget * spendPercentage);
            adjustedBudget = t.budget - infrastructureSpending;
            baseFacilities += infrastructureSpending;
        }

        return {
            ...t,
            budget: adjustedBudget,
            played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
            players: updatedPlayers,
            financials: {
                income: { transfers: 0, tickets: 0, sponsors: baseSponsor, prizeMoney: 0 },
                expenses: { transfers: 0, wages: 0, facilities: baseFacilities }
            }
        };
    });

    const userTeam = nextSeasonTeams.find(t => t.id === teamIdForDevelopment);
    if (userTeam) {
        const oldUserTeam = teams.find(t => t.id === teamIdForDevelopment);
        if (oldUserTeam) {
            const playersTurned21 = getPlayersTurned21(oldUserTeam.players, userTeam.players);
            const players21PlusCount = countPlayers21Plus(userTeam.players);
            
            if (playersTurned21.length > 0 && players21PlusCount > 25) {
                callbacks.onSetNotification({
                    message: `${playersTurned21.length} oyuncu 21 yaşına ulaştı. Takımınızda 21 yaşından büyük 25'ten fazla oyuncu var (${players21PlusCount}). Transfer sezonu sonuna kadar oyuncuları satmak zorundasınız, aksi halde en düşük ratingli oyuncular otomatik olarak serbest kalacak.`,
                    type: 'info'
                });
            }
        }
    }

    callbacks.onSetPendingTeams(nextSeasonTeams);
    
    if (changes.length === 0) {
        console.warn('processSeasonDevelopment: No development changes found!', {
            teamIdForDevelopment,
            teamFound: teams.find(t => t.id === teamIdForDevelopment) !== undefined,
            teamPlayersCount: teams.find(t => t.id === teamIdForDevelopment)?.players.length || 0
        });
    }
    
    callbacks.onSetDevelopmentChanges(changes);
};

