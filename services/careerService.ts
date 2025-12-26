import { Team, Player, GameState, ViewState, ManagerAchievement, ManagerCareerSeason, MailItem } from '../types';
import { selectCaptain } from './captainService';

export interface CareerLoadCallbacks {
    onSetLoading: (loading: boolean) => void;
    onSetLoadingMessage: (message: string) => void;
    onSetNotification: (notification: { message: string; type: 'success' | 'info' | 'error' }) => void;
    onSetTeams: (teams: Team[]) => void;
    onSetUserTeamId: (id: string) => void;
    onSetMarketPlayers: (players: Player[]) => void;
    onSetFixtures: (fixtures: any[]) => void;
    onSetCurrentWeek: (week: number) => void;
    onSetSeasonYear: (year: string) => void;
    onSetCareerSlot: (slot: number | null) => void;
    onSetGameState: (state: GameState) => void;
    onSetViewState: (state: ViewState) => void;
    onSetFavoritePlayers: (players: Set<string>) => void;
    onSetManagerAchievements: (achievements: ManagerAchievement[]) => void;
    onSetManagerCareerHistory: (history: ManagerCareerSeason[]) => void;
    onHydrateMailbox: (mailbox: MailItem[]) => void;
}

export const loadCareerService = async (
    slot: number,
    careerSlot: number | null,
    removeDuplicatePlayers: (teams: Team[]) => Team[],
    translateNotificationLocal: (en: string, tr: string) => string,
    t: (key: string) => string,
    callbacks: CareerLoadCallbacks
): Promise<void> => {
    console.log('=== LOADING CAREER SLOT', slot, '===');
    callbacks.onSetLoading(true);
    callbacks.onSetLoadingMessage(t('loadingCareer'));
    
    try {
        let savedDataStr: string | null = null;
        try {
            savedDataStr = localStorage.getItem(`career_${slot}`);
        } catch (storageError) {
            console.warn('[Storage] Failed to access localStorage:', storageError);
            callbacks.onSetLoading(false);
            callbacks.onSetNotification({
                message: translateNotificationLocal('Storage access denied. Please check browser settings.', 'Depolama erişimi reddedildi. Lütfen tarayıcı ayarlarını kontrol edin.'),
                type: 'error'
            });
            return;
        }
        if (!savedDataStr) {
            console.error('NO SAVE DATA FOUND for slot', slot);
            callbacks.onSetLoading(false);
            callbacks.onSetNotification({
                message: translateNotificationLocal('No saved data found for this slot.', 'Bu slot için kayıt bulunamadı.'),
                type: 'error'
            });
            return;
        }
        
        let data;
        try {
            data = JSON.parse(savedDataStr);
        } catch (parseError) {
            console.error('FAILED TO PARSE:', parseError);
            callbacks.onSetLoading(false);
            callbacks.onSetNotification({
                message: translateNotificationLocal('Corrupted save data.', 'Kayıtlı veri bozuk.'),
                type: 'error'
            });
            return;
        }
        
        let teams = data.teams || [];
        if (!Array.isArray(teams) || teams.length === 0) {
            console.error('NO TEAMS FOUND');
            callbacks.onSetLoading(false);
            callbacks.onSetNotification({
                message: translateNotificationLocal('Invalid save: no teams found.', 'Geçersiz kayıt: Takım bulunamadı.'),
                type: 'error'
            });
            return;
        }
        
        teams = removeDuplicatePlayers(teams);
        teams = teams.map(team => {
            if (!team.players || team.players.length === 0) return team;
            if (!team.captainId || !team.players.find(p => p.id === team.captainId)) {
                const captain = selectCaptain(team);
                if (captain) {
                    return { ...team, captainId: captain.id };
                }
            }
            return team;
        });
        
        let userTeamId = data.userTeamId || teams[0]?.id;
        if (!userTeamId) {
            console.error('NO USER TEAM ID');
            callbacks.onSetLoading(false);
            callbacks.onSetNotification({
                message: translateNotificationLocal('Invalid save: no user team.', 'Geçersiz kayıt: Kullanıcı takımı bulunamadı.'),
                type: 'error'
            });
            return;
        }
        
        let userTeam = teams.find(t => t.id === userTeamId);
        if (!userTeam) {
            userTeam = teams[0];
            userTeamId = userTeam?.id;
        }
        
        if (!userTeam) {
            console.error('NO VALID TEAM');
            callbacks.onSetLoading(false);
            callbacks.onSetNotification({
                message: translateNotificationLocal('Invalid save: no valid team.', 'Geçersiz kayıt: Geçerli takım yok.'),
                type: 'error'
            });
            return;
        }
        
        console.log('LOADING:', { slot, team: userTeam.name, gameState: data.gameState });
        
        const achievementsKey = `achievements_${careerSlot || slot}`;
        let savedAchievements: string | null = null;
        try {
            savedAchievements = localStorage.getItem(achievementsKey);
        } catch (e) {
            console.warn('[Storage] Failed to access localStorage for achievements:', e);
        }
        if (savedAchievements) {
            try {
                const parsedAchievements = JSON.parse(savedAchievements) as ManagerAchievement[];
                callbacks.onSetManagerAchievements(parsedAchievements);
                console.log(`[ACHIEVEMENTS] Loaded ${parsedAchievements.length} achievements from localStorage for slot ${slot}`);
            } catch (e) {
                console.error('Failed to parse saved achievements', e);
                callbacks.onSetManagerAchievements([]);
            }
        } else {
            callbacks.onSetManagerAchievements([]);
            console.log(`[ACHIEVEMENTS] No saved achievements found for slot ${slot}`);
        }
        
        const careerHistoryKey = `careerHistory_${careerSlot || slot}`;
        let savedCareerHistory: string | null = null;
        try {
            savedCareerHistory = localStorage.getItem(careerHistoryKey);
        } catch (e) {
            console.warn('[Storage] Failed to access localStorage for careerHistory:', e);
        }
        if (savedCareerHistory) {
            try {
                const parsedCareerHistory = JSON.parse(savedCareerHistory) as ManagerCareerSeason[];
                callbacks.onSetManagerCareerHistory(parsedCareerHistory);
                console.log(`[ACHIEVEMENTS] Loaded ${parsedCareerHistory.length} career history entries from localStorage for slot ${slot}`);
            } catch (e) {
                console.error('Failed to parse saved career history', e);
                callbacks.onSetManagerCareerHistory([]);
            }
        } else {
            callbacks.onSetManagerCareerHistory([]);
            console.log(`[ACHIEVEMENTS] No saved career history found for slot ${slot}`);
        }
        
        const fixtures = data.fixtures || [];
        fixtures.forEach((fixture: any) => {
            if (fixture.matchPerformances && fixture.matchPerformances.length > 0) {
                fixture.matchPerformances.forEach((performance: any) => {
                    const playerTeam = performance.isHome 
                        ? teams.find(t => t.id === fixture.homeTeamId)
                        : teams.find(t => t.id === fixture.awayTeamId);
                    
                    if (playerTeam) {
                        const playerIndex = playerTeam.players.findIndex(p => p.id === performance.playerId);
                        if (playerIndex !== -1) {
                            const existingPerformances = playerTeam.players[playerIndex].matchPerformances || [];
                            if (!existingPerformances.some(p => p.fixtureId === performance.fixtureId)) {
                                playerTeam.players[playerIndex] = {
                                    ...playerTeam.players[playerIndex],
                                    matchPerformances: [...existingPerformances, performance]
                                };
                            }
                        }
                    }
                });
            }
        });
        
        callbacks.onSetTeams(teams);
        callbacks.onSetUserTeamId(userTeamId);
        callbacks.onSetMarketPlayers(data.marketPlayers || []);
        callbacks.onSetFixtures(fixtures);
        callbacks.onSetCurrentWeek(data.currentWeek || 1);
        callbacks.onSetSeasonYear(data.seasonYear || "2025/2026");
        callbacks.onSetCareerSlot(slot);
        try {
            localStorage.setItem('activeCareerSlot', slot.toString());
        } catch (e) {
            console.warn('[Storage] Failed to save activeCareerSlot:', e);
        }
        
        let gameState = data.gameState;
        if (!gameState || gameState === GameState.CAREER_SELECT || gameState === GameState.START_SCREEN || gameState === GameState.TEAM_SELECTION) {
            gameState = GameState.TRANSFER_WINDOW;
        }
        callbacks.onSetGameState(gameState);
        callbacks.onSetViewState(data.viewState || ViewState.MAIN_MENU);
        
        callbacks.onSetFavoritePlayers(data.favoritePlayers ? new Set(data.favoritePlayers) : new Set());
        const savedMailbox: MailItem[] = Array.isArray(data.mailbox)
            ? data.mailbox.map((mail: MailItem) => ({
                ...mail,
                read: mail.read ?? false
            }))
            : [];
        callbacks.onHydrateMailbox(savedMailbox);
        
        localStorage.setItem(`career_${slot}`, JSON.stringify({
            ...data,
            teams,
            userTeamId,
            mailbox: data.mailbox || []
        }));
        
        console.log('=== LOADED SUCCESSFULLY ===');
        callbacks.onSetLoading(false);
        
    } catch (e) {
        console.error('=== ERROR ===', e);
        callbacks.onSetLoading(false);
        callbacks.onSetGameState(GameState.CAREER_SELECT);
        callbacks.onSetCareerSlot(null);
        callbacks.onSetNotification({
            message: translateNotificationLocal(
                `Load failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
                `Yükleme başarısız: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`
            ),
            type: 'error'
        });
    }
};

export interface CareerSaveCallbacks {
    onSetCareerSlots: (slots: any[]) => void;
}

export const saveCareerService = (
    careerSlot: number | null,
    teams: Team[],
    userTeamId: string,
    marketPlayers: Player[],
    fixtures: any[],
    currentWeek: number,
    seasonYear: string,
    gameState: GameState,
    viewState: ViewState,
    favoritePlayers: Set<string>,
    mailbox: MailItem[],
    managerAchievements: ManagerAchievement[],
    managerCareerHistory: ManagerCareerSeason[],
    careerSlots: any[],
    callbacks: CareerSaveCallbacks
): void => {
    if (careerSlot === null) return;
    
    if (gameState === GameState.CAREER_SELECT || gameState === GameState.START_SCREEN) {
        return;
    }
    
    // Aggressive data cleaning to reduce storage size
    const cleanedTeams = teams.map(team => ({
        ...team,
        players: team.players.map(player => {
            // Reduce matchPerformances to last 5 (was 10)
            let cleanedPlayer = { ...player };
            if (cleanedPlayer.matchPerformances && cleanedPlayer.matchPerformances.length > 5) {
                const sorted = [...cleanedPlayer.matchPerformances].sort((a, b) => b.week - a.week);
                cleanedPlayer = {
                    ...cleanedPlayer,
                    matchPerformances: sorted.slice(0, 5)
                };
            }
            // Remove unnecessary fields that can be regenerated
            delete (cleanedPlayer as any).scoutReport;
            delete (cleanedPlayer as any).pendingScout;
            // Keep only essential offer data
            if (cleanedPlayer.offers && cleanedPlayer.offers.length > 0) {
                cleanedPlayer.offers = cleanedPlayer.offers.map(offer => ({
                    id: offer.id,
                    teamId: offer.teamId,
                    teamName: offer.teamName,
                    playerId: offer.playerId,
                    type: offer.type,
                    fee: offer.fee,
                    status: offer.status,
                    expiryWeek: offer.expiryWeek,
                    // Remove negotiation history to save space
                    negotiationRound: offer.negotiationRound || 0,
                    originalFee: offer.originalFee || offer.fee
                }));
            }
            return cleanedPlayer;
        })
    }));
    
    // Clean fixtures - remove matchPerformances (can be regenerated)
    const cleanedFixtures = fixtures.map(fixture => {
        const cleaned = { ...fixture };
        delete (cleaned as any).matchPerformances;
        return cleaned;
    });
    
    // Limit mailbox to last 100 items
    const cleanedMailbox = mailbox.slice(-100);
    
    // Limit market players to essential fields only
    const cleanedMarketPlayers = marketPlayers.slice(0, 200).map(player => ({
        id: player.id,
        name: player.name,
        position: player.position,
        age: player.age,
        rating: player.rating,
        potential: player.potential,
        marketValue: player.marketValue,
        scouted: player.scouted,
        contract: player.contract,
        // Remove unnecessary fields
        attributes: undefined,
        matchPerformances: undefined
    }));
    
    const saveData = {
        teams: cleanedTeams,
        userTeamId,
        marketPlayers: cleanedMarketPlayers,
        fixtures: cleanedFixtures,
        currentWeek,
        seasonYear,
        gameState,
        viewState,
        favoritePlayers: Array.from(favoritePlayers),
        mailbox: cleanedMailbox
    };
    
    try {
        const jsonString = JSON.stringify(saveData);
        const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
        
        // Warn if data is getting large
        if (sizeInMB > 4) {
            console.warn(`Career save data is large: ${sizeInMB.toFixed(2)} MB`);
        }
        
        localStorage.setItem(`career_${careerSlot}`, jsonString);
        localStorage.setItem('activeCareerSlot', careerSlot.toString());
        
        const achievementsKey = `achievements_${careerSlot}`;
        localStorage.setItem(achievementsKey, JSON.stringify(managerAchievements));
        
        const careerHistoryKey = `careerHistory_${careerSlot}`;
        localStorage.setItem(careerHistoryKey, JSON.stringify(managerCareerHistory));
        
        const myTeam = teams.find(t => t.id === userTeamId);
        const updatedSlots = [...careerSlots];
        updatedSlots[careerSlot] = {
            slot: careerSlot,
            teamName: myTeam?.name || "Unknown",
            season: seasonYear,
            lastPlayed: new Date().toISOString()
        };
        callbacks.onSetCareerSlots(updatedSlots);
        localStorage.setItem('careerSlots', JSON.stringify(updatedSlots));
    } catch (e) {
        console.error('Failed to save career', e);
        // Throw error so caller can handle it (show notification to user)
        throw e;
    }
};

