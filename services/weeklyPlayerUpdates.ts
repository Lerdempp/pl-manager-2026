import { Team, Player } from '../types';
import { injuryTypes, illnessTypes } from '../utils/injuryIllnessTypes';
import { calculateMarketValue } from './legendaryPlayers';

export interface WeeklyUpdateNotifications {
    recoveryMessages: Array<{ message: string; type: 'success' }>;
    injuryMessages: Array<{ message: string; type: 'error' }>;
    illnessMessages: Array<{ message: string; type: 'error' }>;
}

export const processWeeklyPlayerUpdates = (
    teams: Team[],
    userTeamId: string,
    t: (key: string) => string
): { updatedTeams: Team[]; notifications: WeeklyUpdateNotifications } => {
    const notifications: WeeklyUpdateNotifications = {
        recoveryMessages: [],
        injuryMessages: [],
        illnessMessages: []
    };

    const updatedTeams = teams.map(team => ({
        ...team,
        players: team.players.map(player => {
            // Skip if already injured or ill
            if (player.injury || player.illness) {
                // Decrease weeks out
                if (player.injury) {
                    const newWeeks = player.injury.weeksOut - 1;
                    if (newWeeks <= 0) {
                        // Injury healed
                        if (team.id === userTeamId) {
                            const injuryKey = `injury.${player.injury.type.replace(/\s+/g, '')}`;
                            const injuryTranslation = t(injuryKey.toLowerCase()) || player.injury.type;
                            notifications.recoveryMessages.push({
                                message: `${player.name} ${t('hasRecoveredFrom')} ${injuryTranslation.toLowerCase()}.`,
                                type: 'success'
                            });
                        }
                        return { ...player, injury: undefined };
                    }
                    return { ...player, injury: { ...player.injury, weeksOut: newWeeks } };
                }
                if (player.illness) {
                    const newWeeks = player.illness.weeksOut - 1;
                    if (newWeeks <= 0) {
                        // Illness recovered
                        if (team.id === userTeamId) {
                            const illnessKey = `illness.${player.illness.type.replace(/\s+/g, '')}`;
                            const illnessTranslation = t(illnessKey.toLowerCase()) || player.illness.type;
                            notifications.recoveryMessages.push({
                                message: `${player.name} ${t('hasRecoveredFrom')} ${illnessTranslation.toLowerCase()}.`,
                                type: 'success'
                            });
                        }
                        return { ...player, illness: undefined };
                    }
                    return { ...player, illness: { ...player.illness, weeksOut: newWeeks } };
                }
                return player;
            }
            
            // Chance of new injury (higher for older players and during matches)
            const injuryChance = 0.03 + (player.age > 30 ? 0.02 : 0) + (player.age > 35 ? 0.02 : 0);
            const illnessChance = 0.02;
            
            if (Math.random() < injuryChance) {
                // Random injury
                const injury = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];
                if (team.id === userTeamId) {
                    const injuryKey = `injury.${injury.type.replace(/\s+/g, '')}`;
                    const injuryTranslation = t(injuryKey.toLowerCase()) || injury.type;
                    notifications.injuryMessages.push({
                        message: `${player.name} ${t('hasSuffered')} ${injuryTranslation.toLowerCase()}. ${t('outFor')} ${injury.weeksOut} ${injury.weeksOut > 1 ? t('weeksOut') : t('weekOut')}.`,
                        type: 'error'
                    });
                }
                return { 
                    ...player, 
                    injury: {
                        type: injury.type,
                        severity: injury.severity,
                        weeksOut: injury.weeksOut,
                        description: injury.description
                    }
                };
            }
            
            if (Math.random() < illnessChance) {
                // Random illness
                const illness = illnessTypes[Math.floor(Math.random() * illnessTypes.length)];
                if (team.id === userTeamId) {
                    const illnessKey = `illness.${illness.type.replace(/\s+/g, '')}`;
                    const illnessTranslation = t(illnessKey.toLowerCase()) || illness.type;
                    notifications.illnessMessages.push({
                        message: `${player.name} ${t('hasContracted')} ${illnessTranslation.toLowerCase()}. ${t('outFor')} ${illness.weeksOut} ${illness.weeksOut > 1 ? t('weeksOut') : t('weekOut')}.`,
                        type: 'error'
                    });
                }
                return { 
                    ...player, 
                    illness: {
                        type: illness.type,
                        severity: illness.severity,
                        weeksOut: illness.weeksOut,
                        description: illness.description
                    }
                };
            }
            
            return player;
        })
    }));

    return { updatedTeams, notifications };
};

export const decreaseSuspensionGames = (teams: Team[]): Team[] => {
    return teams.map(team => ({
        ...team,
        players: team.players.map(player => ({
            ...player,
            suspensionGames: player.suspensionGames && player.suspensionGames > 0 
                ? player.suspensionGames - 1 
                : 0
        }))
    }));
};

export const updatePlayerMarketValues = (teams: Team[]): Team[] => {
    return teams.map(team => ({
        ...team,
        players: team.players.map(player => {
            const newMarketValue = calculateMarketValue(player.rating, player.age, player.potential);
            return {
                ...player,
                marketValue: Math.floor(newMarketValue),
                trueValue: Math.floor(newMarketValue)
            };
        })
    }));
};

