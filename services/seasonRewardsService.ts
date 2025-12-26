import { Team, Player, Fixture, MatchPerformance, Position, ManagerAchievement, ManagerCareerSeason, ManagerOffer } from '../types';
import { SeasonSummary } from '../types/seasons';
import { getPlayerStats } from './playerStats';
import { calculateMarketValue } from './legendaryPlayers';
import { replenishTeamsWithYouth, TransferRecord } from './cpuTransferService';
import { generateManagerOffers } from './managerOfferService';

export interface SeasonRewardsCallbacks {
    onNotification: (message: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetTeams: (teams: Team[]) => void;
    onSetSeasonSummary: (summary: SeasonSummary) => void;
    onSetDebtWarningModal: (show: boolean) => void;
    onSetGameOverModal: (show: boolean) => void;
    onSetTransferHistory: (updater: (prev: TransferRecord[]) => TransferRecord[]) => void;
    onSetManagerAchievements: (updater: (prev: ManagerAchievement[]) => ManagerAchievement[]) => void;
    onSetManagerCareerHistory: (history: ManagerCareerSeason[]) => void;
    onSetManagerOffers: (offers: ManagerOffer[] | null) => void;
}

export interface SeasonRewardsResult {
    updatedTeams: Team[];
    seasonSummary: SeasonSummary | null;
    shouldReturnEarly: boolean; // If true, don't proceed with rest of function
}

export const calculateEndOfSeasonRewards = (
    teams: Team[],
    fixtures: Fixture[],
    userTeamId: string,
    seasonYear: number,
    careerSlot: number | null,
    getPlayerStats: (player: Player, teams: Team[], fixtures: Fixture[]) => { goals: number; assists: number; apps: number; cards: number; teamName: string; form: boolean[] },
    formatCurrencyLocal: (value: number) => string,
    translateNotificationLocal: (en: string, tr: string) => string,
    callbacks: SeasonRewardsCallbacks
): SeasonRewardsResult => {
    const myTeam = teams.find(t => t.id === userTeamId);
    if (!myTeam) {
        return { updatedTeams: teams, seasonSummary: null, shouldReturnEarly: false };
    }

    const leagueTeams = teams.filter(t => t.league === myTeam.league);
    const sortedTeams = [...leagueTeams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
        return b.gf - a.gf;
    });

    let updatedTeams = [...teams];
    let userRank = 0;
    let userPrize = 0;

    sortedTeams.forEach((team, index) => {
        const rank = index + 1;
        const totalTeams = sortedTeams.length;
        const prize = 5000000 + ((totalTeams - rank) * 5000000);

        const teamIndex = updatedTeams.findIndex(t => t.id === team.id);
        if (teamIndex > -1) {
            const originalBudget = updatedTeams[teamIndex].budget;
            updatedTeams[teamIndex].budget = originalBudget + prize;
            updatedTeams[teamIndex].financials.income.prizeMoney += prize;
            
            if (team.id === userTeamId) {
                console.log(`[Prize Money] Adding ${prize} to team budget. Original: ${originalBudget}, New: ${updatedTeams[teamIndex].budget}`);
            }
        }

        if (team.id === userTeamId) {
            userRank = rank;
            userPrize = prize;
        }
    });

    const champion = sortedTeams[0];
    const championPrize = champion ? 5000000 + ((sortedTeams.length - 1) * 5000000) : 0;

    // Find top scorer and assister
    const allPlayers: { player: Player, team: Team }[] = [];
    leagueTeams.forEach(team => {
        team.players.forEach(player => {
            allPlayers.push({ player, team });
        });
    });

    const playerStats = allPlayers.map(({ player, team }) => {
        const stats = getPlayerStats(player, teams, fixtures);
        return {
            player,
            team,
            goals: stats.goals,
            assists: stats.assists
        };
    });

    const topScorer = playerStats.reduce((best, current) => 
        current.goals > best.goals ? current : best,
        playerStats[0] || { player: null as any, team: null as any, goals: 0, assists: 0 }
    );

    const topAssister = playerStats.reduce((best, current) => 
        current.assists > best.assists ? current : best,
        playerStats[0] || { player: null as any, team: null as any, goals: 0, assists: 0 }
    );

    // Find Season Player (MVP)
    const teamRankMap = new Map<string, number>();
    sortedTeams.forEach((team, index) => {
        teamRankMap.set(team.id, index + 1);
    });

    const totalTeams = sortedTeams.length;
    
    const playerScores = allPlayers.map(({ player, team }) => {
        const basicStats = getPlayerStats(player, teams, fixtures);
        const goals = basicStats.goals;
        const assists = basicStats.assists;
        
        const teamFixtures = fixtures.filter(f => f.played && (f.homeTeamId === team.id || f.awayTeamId === team.id));
        
        const allPerformances: MatchPerformance[] = [];
        let mvpCount = 0;
        
        teamFixtures.forEach(f => {
            if (f.manOfTheMatch?.playerId === player.id) {
                mvpCount++;
            }
            
            if (f.matchPerformances && f.matchPerformances.length > 0) {
                const playerPerf = f.matchPerformances.find(p => p.playerId === player.id);
                if (playerPerf) {
                    allPerformances.push(playerPerf);
                }
            }
        });
        
        const playerPerformances = player.matchPerformances || [];
        if (playerPerformances.length > 0 && allPerformances.length === 0) {
            playerPerformances.forEach(perf => {
                allPerformances.push(perf);
            });
        }
        
        let totalRating = 0;
        let tackles = 0;
        let interceptions = 0;
        let saves = 0;
        let shots = 0;
        let passes = 0;
        let totalPassAccuracy = 0;
        let matches = 0;
        
        if (allPerformances.length > 0) {
            allPerformances.forEach(perf => {
                totalRating += perf.rating || 0;
                tackles += perf.tackles || 0;
                interceptions += perf.interceptions || 0;
                saves += perf.saves || 0;
                shots += perf.shots || 0;
                passes += perf.passes || 0;
                totalPassAccuracy += perf.passAccuracy || 0;
                if (perf.minutesPlayed > 0) matches++;
            });
        } else {
            // Fallback: estimate from fixtures
            teamFixtures.forEach(f => {
                const isHomeMatch = f.homeTeamId === team.id;
                const startingXI = isHomeMatch ? f.homeStartingXI : f.awayStartingXI;
                const playedInMatch = startingXI?.includes(player.id) || false;
                
                if (playedInMatch) {
                    matches++;
                    const isWin = (isHomeMatch && f.homeScore > f.awayScore) || (!isHomeMatch && f.awayScore > f.homeScore);
                    const isDraw = f.homeScore === f.awayScore;
                    const estimatedRating = isWin ? 7.5 : isDraw ? 6.5 : 5.5;
                    totalRating += estimatedRating;
                    if (player.position === Position.GK) {
                        saves += Math.floor(Math.random() * 5) + 2;
                    } else if ([Position.CB, Position.LB, Position.RB, Position.LWB, Position.RWB, Position.CDM, Position.CM, Position.CAM, Position.LM, Position.RM].includes(player.position)) {
                        tackles += Math.floor(Math.random() * 3) + 1;
                        interceptions += Math.floor(Math.random() * 2) + 1;
                    }
                    shots += Math.floor(Math.random() * 2);
                    passes += Math.floor(Math.random() * 30) + 20;
                    totalPassAccuracy += 75;
                }
            });
        }
        
        const avgRating = matches > 0 ? totalRating / matches : 0;
        const passAccuracy = matches > 0 && totalPassAccuracy > 0 ? totalPassAccuracy / matches : (basicStats.apps > 0 ? 75 : 0);
        
        const teamRank = teamRankMap.get(team.id) || totalTeams;
        const positionBonus = (totalTeams - teamRank + 1) * 0.5;
        
        const mvpScore = mvpCount * 10;
        const ratingScore = avgRating * 0.5;
        const goalScore = goals * 3;
        const assistScore = assists * 2;
        const tackleScore = tackles * 0.1;
        const interceptionScore = interceptions * 0.15;
        const saveScore = saves * 0.2;
        
        const totalScore = mvpScore + ratingScore + goalScore + assistScore + tackleScore + interceptionScore + saveScore + positionBonus;
        
        return {
            player,
            team,
            goals,
            assists,
            mvpCount,
            avgRating,
            tackles,
            interceptions,
            saves,
            shots,
            passes,
            passAccuracy,
            matches: matches || basicStats.apps,
            totalScore
        };
    });

    const seasonPlayer = playerScores.reduce((best, current) => 
        current.totalScore > best.totalScore ? current : best,
        playerScores[0] || { 
            player: null as any, 
            team: null as any, 
            goals: 0, 
            assists: 0, 
            mvpCount: 0,
            avgRating: 0,
            tackles: 0,
            interceptions: 0,
            saves: 0,
            shots: 0,
            passes: 0,
            passAccuracy: 0,
            matches: 0,
            totalScore: 0 
        }
    );

    // Find Season Goalkeeper
    const goalkeeperStats = leagueTeams.map(team => {
        const gk = team.players.find(p => p.position === Position.GK);
        return {
            player: gk,
            team: team,
            goalsConceded: team.ga
        };
    }).filter(g => g.player);

    const seasonGoalkeeper = goalkeeperStats.reduce((best, current) => 
        current.goalsConceded < best.goalsConceded ? current : best,
        goalkeeperStats[0] || { player: null as any, team: null as any, goalsConceded: Infinity }
    );

    // Calculate streaks
    const leagueFixtures = fixtures.filter(f => 
        f.played && 
        (leagueTeams.some(t => t.id === f.homeTeamId) || leagueTeams.some(t => t.id === f.awayTeamId))
    );

    const teamStreaks = leagueTeams.map(team => {
        const teamMatches = leagueFixtures
            .filter(f => f.homeTeamId === team.id || f.awayTeamId === team.id)
            .sort((a, b) => a.week - b.week);

        let longestUnbeaten = 0;
        let currentUnbeaten = 0;
        let longestWin = 0;
        let currentWin = 0;

        teamMatches.forEach(match => {
            const isHome = match.homeTeamId === team.id;
            const teamScore = isHome ? match.homeScore : match.awayScore;
            const opponentScore = isHome ? match.awayScore : match.homeScore;

            if (teamScore > opponentScore) {
                currentWin++;
                currentUnbeaten++;
                longestWin = Math.max(longestWin, currentWin);
                longestUnbeaten = Math.max(longestUnbeaten, currentUnbeaten);
            } else if (teamScore === opponentScore) {
                currentUnbeaten++;
                longestUnbeaten = Math.max(longestUnbeaten, currentUnbeaten);
                currentWin = 0;
            } else {
                currentUnbeaten = 0;
                currentWin = 0;
            }
        });

        return {
            team,
            longestUnbeaten,
            longestWin
        };
    });

    const longestUnbeatenStreak = teamStreaks.reduce((best, current) => 
        current.longestUnbeaten > best.longestUnbeaten ? current : best,
        teamStreaks[0] || { team: null as any, longestUnbeaten: 0, longestWin: 0 }
    );

    const longestWinStreak = teamStreaks.reduce((best, current) => 
        current.longestWin > best.longestWin ? current : best,
        teamStreaks[0] || { team: null as any, longestUnbeaten: 0, longestWin: 0 }
    );

    // Remove retiring players
    updatedTeams.forEach(team => {
        const retiringPlayers: Player[] = [];
        team.players = team.players.filter(player => {
            if (player.retirement?.retirementAnnounced && !player.retirement?.persuasionSuccessful) {
                retiringPlayers.push(player);
                return false;
            }
            return true;
        });
        
        if (team.id === userTeamId && retiringPlayers.length > 0) {
            retiringPlayers.forEach(player => {
                callbacks.onNotification({
                    message: translateNotificationLocal(
                        `${player.name} has retired from professional football.`,
                        `${player.name} profesyonel futbolu bıraktı.`
                    ),
                    type: 'info'
                });
            });
        }
    });
    
    // Check financial status after prize money
    const userTeamIndex = updatedTeams.findIndex(t => t.id === userTeamId);
    let shouldReturnEarly = false;
    if (userTeamIndex > -1) {
        const userTeam = updatedTeams[userTeamIndex];
        const isInDebt = userTeam.budget < 0;
        
        if (isInDebt) {
            const debtCountKey = `debtCount_${userTeamId}`;
            const currentDebtCount = parseInt(localStorage.getItem(debtCountKey) || '0', 10);
            const newDebtCount = currentDebtCount + 1;
            
            if (newDebtCount === 1) {
                localStorage.setItem(debtCountKey, '1');
                callbacks.onSetDebtWarningModal(true);
                updatedTeams[userTeamIndex].budget = 0;
            } else if (newDebtCount >= 2) {
                localStorage.setItem(debtCountKey, '2');
                callbacks.onSetGameOverModal(true);
                callbacks.onSetTeams(updatedTeams);
                return { updatedTeams, seasonSummary: null, shouldReturnEarly: true };
            }
        } else {
            const debtCountKey = `debtCount_${userTeamId}`;
            localStorage.removeItem(debtCountKey);
        }
    }

    // Replenish teams with youth players
    let teamsAfterRetirement = updatedTeams;
    const { updatedTeams: teamsWithYouth, transfers: youthTransfers } = replenishTeamsWithYouth(teamsAfterRetirement, String(seasonYear));
    callbacks.onSetTransferHistory(prev => [...prev, ...youthTransfers]);
    
    teamsWithYouth.forEach((teamWithYouth) => {
        const originalTeam = teamsAfterRetirement.find(t => t.id === teamWithYouth.id);
        if (originalTeam) {
            teamWithYouth.budget = originalTeam.budget;
            teamWithYouth.financials = { ...originalTeam.financials };
        }
    });
    
    updatedTeams = teamsWithYouth;
    
    // Award prizes to players
    const awardPlayer = (playerId: string | undefined, teamId: string | undefined, awardType: 'mvp' | 'topScorer' | 'topAssister' | 'seasonGoalkeeper') => {
        if (!playerId || !teamId) return;
        const teamIndex = updatedTeams.findIndex(t => t.id === teamId);
        if (teamIndex > -1) {
            const playerIndex = updatedTeams[teamIndex].players.findIndex(p => p.id === playerId);
            if (playerIndex > -1) {
                const existingAwards = updatedTeams[teamIndex].players[playerIndex].awards || [];
                if (!existingAwards.some(a => a.type === awardType && a.season === String(seasonYear))) {
                    updatedTeams[teamIndex].players[playerIndex].awards = [
                        ...existingAwards,
                        { type: awardType, season: String(seasonYear) }
                    ];
                }
            }
        }
    };
    
    awardPlayer(seasonPlayer.player?.id, seasonPlayer.team?.id, 'mvp');
    awardPlayer(topScorer.player?.id, topScorer.team?.id, 'topScorer');
    awardPlayer(topAssister.player?.id, topAssister.team?.id, 'topAssister');
    awardPlayer(seasonGoalkeeper.player?.id, seasonGoalkeeper.team?.id, 'seasonGoalkeeper');
    
    // Create season summary
    const seasonSummaryData: SeasonSummary = {
        rank: userRank,
        prizeMoney: userPrize,
        teamName: myTeam.name,
        seasonYear: String(seasonYear),
        champion: {
            teamName: champion?.name || 'Unknown',
            prizeMoney: championPrize,
            points: champion?.points || 0
        },
        topScorer: {
            playerName: topScorer.player?.name || 'Unknown',
            teamName: topScorer.team?.name || 'Unknown',
            goals: topScorer.goals
        },
        topAssister: {
            playerName: topAssister.player?.name || 'Unknown',
            teamName: topAssister.team?.name || 'Unknown',
            assists: topAssister.assists
        },
        longestUnbeatenStreak: {
            teamName: longestUnbeatenStreak.team?.name || 'Unknown',
            matches: longestUnbeatenStreak.longestUnbeaten
        },
        longestWinStreak: {
            teamName: longestWinStreak.team?.name || 'Unknown',
            matches: longestWinStreak.longestWin
        },
        seasonPlayer: {
            playerName: seasonPlayer.player?.name || 'Unknown',
            playerId: seasonPlayer.player?.id || '',
            teamName: seasonPlayer.team?.name || 'Unknown',
            teamId: seasonPlayer.team?.id || '',
            goals: seasonPlayer.goals || 0,
            assists: seasonPlayer.assists || 0,
            total: seasonPlayer.totalScore || 0,
            mvpCount: seasonPlayer.mvpCount || 0,
            avgRating: Math.round((seasonPlayer.avgRating || 0) * 10) / 10,
            tackles: seasonPlayer.tackles || 0,
            interceptions: seasonPlayer.interceptions || 0,
            saves: seasonPlayer.saves || 0,
            shots: seasonPlayer.shots || 0,
            passes: seasonPlayer.passes || 0,
            passAccuracy: Math.round(seasonPlayer.passAccuracy || 0),
            matches: seasonPlayer.matches || 0
        },
        seasonGoalkeeper: {
            playerName: seasonGoalkeeper.player?.name || 'Unknown',
            teamName: seasonGoalkeeper.team?.name || 'Unknown',
            goalsConceded: seasonGoalkeeper.goalsConceded
        }
    };
    
    callbacks.onSetSeasonSummary(seasonSummaryData);
    
    // Save manager achievements
    const newAchievements: ManagerAchievement[] = [];
    
    if (champion?.id === userTeamId) {
        newAchievements.push({
            type: 'championship',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: champion?.points || 0,
            description: `${champion?.points || 0} points`
        });
    }
    
    if (userRank === 2) {
        newAchievements.push({
            type: 'runnerUp',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: userRank,
            description: `2nd place`
        });
    }
    
    if (userRank === 3) {
        newAchievements.push({
            type: 'thirdPlace',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: userRank,
            description: `3rd place`
        });
    }
    
    if (userRank >= 1 && userRank <= 4 && userRank > 3) {
        newAchievements.push({
            type: 'topFour',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: userRank,
            description: `${userRank}th place`
        });
    }
    
    if (topScorer.team?.id === userTeamId && topScorer.player) {
        newAchievements.push({
            type: 'topScorerPlayer',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: topScorer.goals,
            description: `${topScorer.player.name} - ${topScorer.goals} goals`
        });
    }
    
    if (seasonPlayer.team?.id === userTeamId && seasonPlayer.player) {
        newAchievements.push({
            type: 'mvpPlayer',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: seasonPlayer.totalScore || 0,
            description: `${seasonPlayer.player.name} - MVP`
        });
    }
    
    if (topAssister.team?.id === userTeamId && topAssister.player) {
        newAchievements.push({
            type: 'topAssisterPlayer',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: topAssister.assists,
            description: `${topAssister.player.name} - ${topAssister.assists} assists`
        });
    }
    
    if (seasonGoalkeeper.team?.id === userTeamId && seasonGoalkeeper.player) {
        newAchievements.push({
            type: 'seasonGoalkeeperPlayer',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: seasonGoalkeeper.goalsConceded,
            description: `${seasonGoalkeeper.player.name} - ${seasonGoalkeeper.goalsConceded} goals conceded`
        });
    }
    
    if (longestUnbeatenStreak.team?.id === userTeamId) {
        newAchievements.push({
            type: 'unbeatenStreak',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: longestUnbeatenStreak.longestUnbeaten,
            description: `${longestUnbeatenStreak.longestUnbeaten} matches unbeaten`
        });
    }
    
    if (longestWinStreak.team?.id === userTeamId) {
        newAchievements.push({
            type: 'winStreak',
            season: String(seasonYear),
            teamName: myTeam.name,
            value: longestWinStreak.longestWin,
            description: `${longestWinStreak.longestWin} consecutive wins`
        });
    }
    
    if (newAchievements.length > 0) {
        callbacks.onSetManagerAchievements(prev => [...prev, ...newAchievements]);
    }
    
    // Save career season history
    if (careerSlot !== null) {
        const careerHistoryKey = `careerHistory_${careerSlot}`;
        const existingHistory = JSON.parse(localStorage.getItem(careerHistoryKey) || '[]') as ManagerCareerSeason[];
        
        const trophies: string[] = [];
        let premiumTicketsEarned = 0;
        if (champion?.id === userTeamId) {
            trophies.push('premier_league');
            premiumTicketsEarned = 1;
        }
        
        if (premiumTicketsEarned > 0) {
            const userTeamIndex = updatedTeams.findIndex(t => t.id === userTeamId);
            if (userTeamIndex > -1) {
                updatedTeams[userTeamIndex].premiumTickets = (updatedTeams[userTeamIndex].premiumTickets || 0) + premiumTicketsEarned;
            }
        }
        
        const careerSeason: ManagerCareerSeason = {
            season: String(seasonYear),
            teamName: myTeam.name,
            teamId: myTeam.id,
            leaguePosition: userRank,
            trophies: trophies
        };
        
        const seasonExists = existingHistory.some(s => s.season === String(seasonYear) && s.teamId === myTeam.id);
        if (!seasonExists) {
            const updatedHistory = [...existingHistory, careerSeason];
            localStorage.setItem(careerHistoryKey, JSON.stringify(updatedHistory));
            callbacks.onSetManagerCareerHistory(updatedHistory);
        }
    }
    
    // Generate manager job offers
    const offers = generateManagerOffers(userTeamId, updatedTeams, seasonSummaryData, myTeam.name);
    if (offers.length > 0) {
        setTimeout(() => {
            callbacks.onSetManagerOffers(offers);
        }, 500);
    }
    
    callbacks.onSetTeams(updatedTeams);
    
    return {
        updatedTeams,
        seasonSummary: seasonSummaryData,
        shouldReturnEarly: false
    };
};
