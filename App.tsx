import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Team, ViewState, Player, GameState, Fixture, PlayerAttributes, Position, TransferOffer, SponsorshipCategory, SponsorshipType, SponsorshipOffer, StadiumSponsorOffer, MatchPerformance, ManagerAchievement, ManagerCareerSeason, ManagerOffer, MailItem, NotificationPayload } from './types';
import { generateMarketForWindow, generateLeagueData, generateInitialSquad, generateScoutReport } from './services/geminiService';
import { generateSeasonSchedule, simulateMatch } from './services/matchEngine';
import { PortfolioView } from './components/SquadView';
import { MarketView } from './components/MarketView';
import { TeamSelection } from './components/TeamSelection';
import { LeagueView } from './components/LeagueView';
import { SponsorshipsView } from './components/SponsorshipsView';
import { SponsorshipCategoryView } from './components/SponsorshipCategoryView';
import { SponsorshipOfferModal } from './components/SponsorshipOfferModal';
import { generateSponsorshipOffers } from './services/sponsorshipService';
import { PlayerCard } from './components/PlayerCard';
import { SimulationOverlay } from './components/SimulationOverlay';
import { DevelopmentModal, DevelopmentChange } from './components/DevelopmentModal';
import { TeamDetailModal } from './components/TeamDetailModal';
import { NegotiationModal } from './components/NegotiationModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { YouthAcademyModal } from './components/YouthAcademyModal';
import { ContractNegotiationModal } from './components/ContractNegotiationModal';
import { CounterOfferModal } from './components/CounterOfferModal';
import { PlayerDetailModal } from './components/PlayerDetailModal';
import { FavoritesView } from './components/FavoritesView';
import { MainMenu } from './components/MainMenu';
import { MailView } from './components/MailView';
import { RetirementWarningModal } from './components/RetirementWarningModal';
import { checkPlayerRetirement, getPlayersConsideringRetirement } from './services/retirementService';
import { calculateMoraleChange, calculateAttendance, updateFanCount, isDerbyMatch, initializeFanSystem, calculateUpgradeWeeks } from './services/fanSystem';
import { replenishTeamsWithYouth, processCPUTransfers, TransferRecord } from './services/cpuTransferService';
import { generateSponsorOffer, isSponsorOfferExpired } from './services/stadiumSponsorService';
import { enforceSquadSizeRule, hasTooMany21PlusPlayers, getPlayersTurned21, freeLowestRated21PlusPlayers, countPlayers21Plus } from './services/squadSizeService';
import { selectCaptain } from './services/captainService';
import { StadiumSponsorModal } from './components/StadiumSponsorModal';
import { ManagerOfferModal } from './components/ManagerOfferModal';
import { SeasonPlayerModal } from './components/SeasonPlayerModal';
import { AchievementsView } from './components/AchievementsView';
import { ShopView } from './components/ShopView';
import { LanguageSelection } from './components/LanguageSelection';
import { useLanguage } from './contexts/LanguageContext';
import { generateManagerOffers } from './services/managerOfferService';
import { useNotificationManager } from './hooks/useNotificationManager';
import { calculateMarketValue } from './services/legendaryPlayers';
import { payWeeklyWages, updateTeamStats } from './services/weeklyOperations';
import { calculateAttributeGrowth } from './services/playerDevelopment';
import { getPlayerStats as getPlayerStatsUtil } from './services/playerStats';
import { processWeeklyPlayerUpdates, decreaseSuspensionGames, updatePlayerMarketValues } from './services/weeklyPlayerUpdates';
import { processSeasonDevelopment } from './services/developmentService';
import { processSimulationComplete } from './services/simulationCompleteService';
import { simulateRemainingSeason } from './services/seasonSimulationService';
import { processAcceptOffer } from './services/transferOfferService';
import { loadCareerService, saveCareerService } from './services/careerService';
import { processContractComplete } from './services/contractService';
import { processWeekSimulation } from './services/weekSimulationService';
import { processTeamSelection } from './services/teamSelectionService';
import { processExpiringContractsComplete } from './services/seasonTransitionService';
import { processGameInitialization } from './services/gameInitializationService';
import { generateOffersForPlayer as generateOffersForPlayerService } from './services/offerGenerationService';
import { processBuyPlayerDirect, processBuyPlayerNegotiate } from './services/playerPurchaseService';
import { processAddToLoanList, processAddToTransferList, processReleasePlayerFromSquad } from './services/playerListManagementService';
import { LoadingScreen } from './components/LoadingScreen';
import { CareerSelectionScreen } from './components/CareerSelectionScreen';
import { SeasonSummaryModal } from './components/SeasonSummaryModal';
import { GameOverModal } from './components/GameOverModal';
import { NotificationToast } from './components/NotificationToast';
import { NotificationTimer } from './components/NotificationTimer';
import { SellPlayerModal } from './components/SellPlayerModal';
import { OfferModal } from './components/OfferModal';
import { ExpiringContractsModal } from './components/ExpiringContractsModal';
import { DebtWarningModal } from './components/DebtWarningModal';
import { CounterOfferModalWrapper } from './components/CounterOfferModalWrapper';
import { OrientationWarning } from './components/OrientationWarning';
import { SeasonSummary } from './types/seasons';
import { formatCurrency, translateNotificationMessage, formatOfferRoundLabel, formatHistoryNote } from './utils/formatting';
import { isTransferWindowOpen, canPlayMatches, getTransferWindows } from './utils/transferWindows';
import { injuryTypes, illnessTypes } from './utils/injuryIllnessTypes';
import { processScoutReports } from './services/scoutReportsService';
import { processStadiumOperations } from './services/stadiumOperations';
import { processPendingTransfers } from './services/pendingTransfersService';
import { processNegotiationResponses } from './services/negotiationService';
import { calculateEndOfSeasonRewards as calculateEndOfSeasonRewardsService, SeasonRewardsCallbacks } from './services/seasonRewardsService';

const App: React.FC = () => {
  const { languageSelected, setLanguageSelected, language, setLanguage, t, translatePosition } = useLanguage();
  
  // Orientation check - require landscape on mobile
  const [isPortrait, setIsPortrait] = useState(false);
  
  useEffect(() => {
    const checkOrientation = () => {
      // Check if device is mobile (small screen width)
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) {
        setIsPortrait(false);
        return;
      }
      
      // Check orientation
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isPortraitMode);
    };
    
    // Initial check
    checkOrientation();
    
    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Also listen for screen orientation API if available
    if (screen.orientation) {
      screen.orientation.addEventListener('change', checkOrientation);
    }
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);
  
  const [gameState, setGameState] = useState<GameState>(GameState.START_SCREEN);
  const [viewState, setViewState] = useState<ViewState>(GameState.TEAM_SELECTION === gameState ? ViewState.DASHBOARD : ViewState.DASHBOARD);
  const [viewHistory, setViewHistory] = useState<ViewState[]>([ViewState.MAIN_MENU]);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeamId, setUserTeamId] = useState<string>("");
  const [marketPlayers, setMarketPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [seasonYear, setSeasonYear] = useState("2025/2026");
  
  
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<Fixture[]>([]);

  // Favorites
  const [favoritePlayers, setFavoritePlayers] = useState<Set<string>>(new Set());
  
  // Modals
  const [inspectPlayer, setInspectPlayer] = useState<Player | null>(null);
  const [inspectTeam, setInspectTeam] = useState<Team | null>(null);
  const [matchDetailModal, setMatchDetailModal] = useState<Fixture | null>(null);
  const [offerIndices, setOfferIndices] = useState<Record<string, number>>({});
  const [negotiation, setNegotiation] = useState<{ player: Player, sellerTeam: Team } | null>(null);
  const [contractNegotiation, setContractNegotiation] = useState<{ player: Player, mode: 'TRANSFER' | 'RENEWAL' } | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<{ player: Player, fee: number, seller: Team } | null>(null);
  const [isYouthModalOpen, setIsYouthModalOpen] = useState(false);
  const [youthProspects, setYouthProspects] = useState<Player[]>([]);
  const [youthScoutStarted, setYouthScoutStarted] = useState(false);
  const [youthReloadCount, setYouthReloadCount] = useState(0);
  
  // Season Rewards State
  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
  const [debtWarningModal, setDebtWarningModal] = useState<boolean>(false);
  const [gameOverModal, setGameOverModal] = useState<boolean>(false);
  const [expiringContractsModal, setExpiringContractsModal] = useState<boolean>(false);

  // End of Season Development State
  const [developmentChanges, setDevelopmentChanges] = useState<DevelopmentChange[] | null>(null);
  const [stadiumSponsorModal, setStadiumSponsorModal] = useState<{ team: Team, offer: StadiumSponsorOffer } | null>(null);
  const [selectedSponsorshipCategory, setSelectedSponsorshipCategory] = useState<SponsorshipCategory | null>(null);
  const [sponsorshipOfferModal, setSponsorshipOfferModal] = useState<{ offers: SponsorshipOffer[], type: SponsorshipType } | null>(null);
  const [pendingTeams, setPendingTeams] = useState<Team[] | null>(null);
  const [managerOffers, setManagerOffers] = useState<ManagerOffer[] | null>(null);
  const [seasonPlayerModal, setSeasonPlayerModal] = useState<boolean>(false);
  const [managerAchievements, setManagerAchievements] = useState<ManagerAchievement[]>([]);
  const [managerCareerHistory, setManagerCareerHistory] = useState<ManagerCareerSeason[]>([]);
  
  // Retirement State
  const [retirementWarningModal, setRetirementWarningModal] = useState<Player[] | null>(null);
  const [retirementChecked, setRetirementChecked] = useState(false);
  
  // Transfer History
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);

  const {
    notification,
    mailbox,
    unreadMailCount,
    handleMarkAllMailRead,
    handleClearMailbox,
    handleDeleteMail,
    handleToggleMailRead,
    handleNotificationToastClick,
    hydrateMailbox,
    setNotification
  } = useNotificationManager({
    currentWeek,
    viewState,
    onNavigateToMailbox: () => setViewState(ViewState.MAILBOX)
  });

  // Formatting helpers
  const formatCurrencyLocal = useCallback((value: number) => formatCurrency(value, language), [language]);
  const translateNotificationLocal = useCallback((en: string, tr: string) => translateNotificationMessage(en, tr, language), [language]);
  const formatOfferRoundLocal = useCallback((round: number) => formatOfferRoundLabel(round, t), [t]);
  const formatHistoryNoteLocal = useCallback((note?: string) => formatHistoryNote(note, t), [t]);
  
  // Transfer/Loan List State
  const [sellPlayerModal, setSellPlayerModal] = useState<{ player: Player; show: boolean } | null>(null);
  const [offerModal, setOfferModal] = useState<{ offer: TransferOffer; player: Player } | null>(null);
  const [counterOfferModal, setCounterOfferModal] = useState<{ offer: TransferOffer; player: Player } | null>(null);

  // Career Slot State
  const [careerSlot, setCareerSlot] = useState<number | null>(null);
  const [careerSlots, setCareerSlots] = useState<Array<{ slot: number; teamName: string; season: string; lastPlayed: string } | null>>([null, null, null]);
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<number | null>(null);

  // --- INITIALIZATION ---

  useEffect(() => {
    // Load career slots from localStorage
    try {
      const savedSlots = localStorage.getItem('careerSlots');
      if (savedSlots) {
        try {
          const slots = JSON.parse(savedSlots);
          setCareerSlots(slots);
        } catch (e) {
          console.error('Failed to load career slots', e);
        }
      }
    } catch (e) {
      console.warn('[Storage] Failed to access localStorage for careerSlots:', e);
    }
    
    // Always show career selection screen on page load/refresh
    setGameState(GameState.CAREER_SELECT);
  }, []);

  // Remove duplicate players from teams by name
  const removeDuplicatePlayers = (teams: Team[]): Team[] => {
    return teams.map(team => {
      const seenNames = new Map<string, Player>();
      const uniquePlayers: Player[] = [];
      
      for (const player of team.players) {
        const normalizedName = player.name.trim().toLowerCase();
        if (!seenNames.has(normalizedName)) {
          seenNames.set(normalizedName, player);
          uniquePlayers.push(player);
        } else {
          console.warn(`Duplicate player removed from ${team.name}: ${player.name}`);
        }
      }
      
      return {
        ...team,
        players: uniquePlayers
      };
    });
  };

  // Load career from localStorage
  const loadCareer = async (slot: number) => {
      await loadCareerService(
          slot,
          careerSlot,
          removeDuplicatePlayers,
          translateNotificationLocal,
          t,
          {
              onSetLoading: setLoading,
              onSetLoadingMessage: setLoadingMessage,
              onSetNotification: setNotification,
              onSetTeams: setTeams,
              onSetUserTeamId: setUserTeamId,
              onSetMarketPlayers: setMarketPlayers,
              onSetFixtures: setFixtures,
              onSetCurrentWeek: setCurrentWeek,
              onSetSeasonYear: setSeasonYear,
              onSetCareerSlot: setCareerSlot,
              onSetGameState: setGameState,
              onSetViewState: setViewState,
              onSetFavoritePlayers: setFavoritePlayers,
              onSetManagerAchievements: setManagerAchievements,
              onSetManagerCareerHistory: setManagerCareerHistory,
              onHydrateMailbox: hydrateMailbox
          }
      );
  };

  // Remove duplicate players from teams immediately when component mounts or teams change
  useEffect(() => {
    if (teams.length > 0) {
      const cleanedTeams = removeDuplicatePlayers(teams);
      // Check if any team had duplicates removed
      let hadDuplicates = false;
      for (let i = 0; i < cleanedTeams.length; i++) {
        if (cleanedTeams[i].players.length !== teams[i]?.players.length) {
          hadDuplicates = true;
          break;
        }
      }
      if (hadDuplicates) {
        console.log('Removing duplicate players from teams...');
        setTeams(cleanedTeams);
        // Also save immediately if career is loaded
        if (careerSlot !== null) {
          const saveData = {
            teams: cleanedTeams,
            userTeamId,
            marketPlayers,
            fixtures,
            currentWeek,
            seasonYear,
            gameState,
            viewState,
            mailbox
          };
          try {
            localStorage.setItem(`career_${careerSlot}`, JSON.stringify(saveData));
          } catch (e) {
            console.error('Failed to save cleaned teams', e);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, careerSlot, mailbox]); // Run when teams, mailbox or careerSlot changes

  // Save career to localStorage
  const saveCareer = () => {
      try {
          saveCareerService(
              careerSlot,
              teams,
              userTeamId,
              marketPlayers,
              fixtures,
              currentWeek,
              seasonYear,
              gameState,
              viewState,
              favoritePlayers,
              mailbox,
              managerAchievements,
              managerCareerHistory,
              careerSlots,
              {
                  onSetCareerSlots: setCareerSlots
              }
          );
      } catch (e) {
          console.error('Failed to save career', e);
          if (e instanceof Error && e.name === 'QuotaExceededError') {
              setNotification({
                  message: translateNotificationLocal(
                      'Storage quota exceeded! Please delete old career saves or clear browser storage.',
                      'Depolama kotası aşıldı! Lütfen eski kariyer kayıtlarını silin veya tarayıcı depolamasını temizleyin.'
                  ),
                  type: 'error'
              });
          }
      }
  };

  // Auto-save on state changes - more frequent and reliable
  useEffect(() => {
    if (careerSlot !== null && gameState !== GameState.CAREER_SELECT && gameState !== GameState.START_SCREEN) {
      // Save immediately on critical changes, debounce others
      const shouldSaveImmediately = 
        currentWeek !== undefined || 
        teams.length > 0 || 
        userTeamId;
      
      if (shouldSaveImmediately) {
        // Immediate save for critical state changes
        saveCareer();
      } else {
        // Debounced save for other changes
        const timer = setTimeout(() => {
          saveCareer();
        }, 500); // Reduced debounce time
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, userTeamId, currentWeek, seasonYear, gameState, viewState, careerSlot, favoritePlayers, fixtures, marketPlayers, mailbox]);
  
  // Additional auto-save: Save on window beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (careerSlot !== null) {
        saveCareer();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [careerSlot, teams, userTeamId, currentWeek, seasonYear]);

  // Handle mobile back button
  const backButtonHandledRef = useRef(false);
  const isInitializedRef = useRef(false);
  const historyDepthRef = useRef(0);
  
  // Track view state history for back button navigation
  const isNavigatingBackRef = useRef(false);
  
  // Track view changes and update history (except when going back)
  useEffect(() => {
    // Skip if we're navigating back (history will be updated by back button handler)
    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      return;
    }
    
    // Initialize history if empty
    if (viewHistory.length === 0) {
      setViewHistory([ViewState.MAIN_MENU]);
      if (viewState !== ViewState.MAIN_MENU) {
        setViewHistory([ViewState.MAIN_MENU, viewState]);
      }
      return;
    }
    
    // Add new view to history if it's different from the last one
    const lastView = viewHistory[viewHistory.length - 1];
    if (lastView !== viewState) {
      // Don't add MAIN_MENU multiple times consecutively
      if (viewState === ViewState.MAIN_MENU && lastView === ViewState.MAIN_MENU) {
        return;
      }
      setViewHistory(prev => {
        // Only keep last 10 views to prevent memory issues
        return [...prev, viewState].slice(-10);
      });
    }
  }, [viewState]);
  
  // Push history state when modals open or view changes
  useEffect(() => {
    // Only handle back button in active game states
    if (gameState === GameState.CAREER_SELECT || gameState === GameState.START_SCREEN || gameState === GameState.TEAM_SELECTION) {
      backButtonHandledRef.current = false;
      isInitializedRef.current = false;
      historyDepthRef.current = 0;
      return;
    }

    // Check if any modal is open or view is not main menu
    const hasModal = 
      counterOfferModal || offerModal || negotiation || contractNegotiation ||
      inspectPlayer || inspectTeam || matchDetailModal || isYouthModalOpen ||
      seasonPlayerModal || stadiumSponsorModal || sponsorshipOfferModal ||
      selectedSponsorshipCategory || sellPlayerModal || debtWarningModal ||
      gameOverModal || expiringContractsModal || retirementWarningModal ||
      seasonSummary || developmentChanges;

    const shouldPushState = hasModal || viewState !== ViewState.MAIN_MENU;

    // Initialize history state on first load - always push at least 2 states for mobile
    if (!isInitializedRef.current && (gameState === GameState.TRANSFER_WINDOW || gameState === GameState.SEASON_ONGOING)) {
      // Push first state
      window.history.pushState({ preventBack: true, depth: 1 }, '');
      // Push second state to ensure we always have a buffer
      window.history.pushState({ preventBack: true, depth: 2 }, '');
      historyDepthRef.current = 2;
      isInitializedRef.current = true;
      backButtonHandledRef.current = true;
    }
    // Push state when modal opens or view changes
    else if (shouldPushState && backButtonHandledRef.current) {
      historyDepthRef.current += 1;
      window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
    }
    // Even at main menu, ensure we have at least 2 history states
    else if (viewState === ViewState.MAIN_MENU && backButtonHandledRef.current && historyDepthRef.current < 2) {
      historyDepthRef.current += 1;
      window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
    }
  }, [
    gameState, viewState, inspectPlayer, inspectTeam, matchDetailModal, 
    negotiation, contractNegotiation, isYouthModalOpen, seasonPlayerModal,
    stadiumSponsorModal, sponsorshipOfferModal, selectedSponsorshipCategory,
    sellPlayerModal, debtWarningModal, gameOverModal, expiringContractsModal,
    retirementWarningModal, seasonSummary, developmentChanges, offerModal, counterOfferModal
  ]);
  
  // Load achievements when career slot changes (preserve across team changes)
  useEffect(() => {
    if (careerSlot === null) {
      // No slot selected, clear achievements
      setManagerAchievements([]);
      setManagerCareerHistory([]);
      return;
    }
    
    // Load achievements and career history from localStorage for this slot
    try {
      const achievementsKey = `achievements_${careerSlot}`;
      const savedAchievements = localStorage.getItem(achievementsKey);
      if (savedAchievements) {
        try {
          const parsedAchievements = JSON.parse(savedAchievements) as ManagerAchievement[];
          setManagerAchievements(parsedAchievements);
          console.log(`[ACHIEVEMENTS] useEffect: Loaded ${parsedAchievements.length} achievements for slot ${careerSlot}`);
        } catch (e) {
          console.error('Failed to parse saved achievements in useEffect', e);
          setManagerAchievements([]);
        }
      } else {
        setManagerAchievements([]);
        console.log(`[ACHIEVEMENTS] useEffect: No saved achievements found for slot ${careerSlot}`);
      }
      
      // Load career history
      const careerHistoryKey = `careerHistory_${careerSlot}`;
      const savedCareerHistory = localStorage.getItem(careerHistoryKey);
      if (savedCareerHistory) {
        try {
          const parsedCareerHistory = JSON.parse(savedCareerHistory) as ManagerCareerSeason[];
          setManagerCareerHistory(parsedCareerHistory);
          console.log(`[ACHIEVEMENTS] useEffect: Loaded ${parsedCareerHistory.length} career history entries for slot ${careerSlot}`);
        } catch (e) {
          console.error('Failed to parse saved career history in useEffect', e);
          setManagerCareerHistory([]);
        }
      } else {
        setManagerCareerHistory([]);
        console.log(`[ACHIEVEMENTS] useEffect: No saved career history found for slot ${careerSlot}`);
      }
    } catch (e) {
      console.warn('[Storage] Failed to access localStorage for achievements/careerHistory:', e);
      setManagerAchievements([]);
      setManagerCareerHistory([]);
    }
  }, [careerSlot]);

  useEffect(() => {
    // Only handle back button in active game states
    if (gameState === GameState.CAREER_SELECT || gameState === GameState.START_SCREEN || gameState === GameState.TEAM_SELECTION) {
      return;
    }

    const handlePopState = (e: PopStateEvent) => {
      // Decrease history depth
      if (historyDepthRef.current > 0) {
        historyDepthRef.current -= 1;
      }

      // First, close any open modals (priority order)
      if (counterOfferModal) {
        setCounterOfferModal(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (offerModal) {
        setOfferModal(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (negotiation) {
        setNegotiation(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (contractNegotiation) {
        setContractNegotiation(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (inspectPlayer) {
        setInspectPlayer(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (inspectTeam) {
        setInspectTeam(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (matchDetailModal) {
        setMatchDetailModal(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (isYouthModalOpen) {
        setIsYouthModalOpen(false);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (seasonPlayerModal) {
        setSeasonPlayerModal(false);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (stadiumSponsorModal) {
        setStadiumSponsorModal(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (sponsorshipOfferModal) {
        setSponsorshipOfferModal(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (selectedSponsorshipCategory) {
        setSelectedSponsorshipCategory(null);
        // Go back to SPONSORSHIPS view when closing category view
        if (viewState === ViewState.SPONSORSHIP_CATEGORY) {
          isNavigatingBackRef.current = true;
          // Update viewHistory: remove SPONSORSHIP_CATEGORY and ensure SPONSORSHIPS is in history
          setViewHistory(prev => {
            const newHistory = [...prev];
            // Remove SPONSORSHIP_CATEGORY if it's the last item
            if (newHistory[newHistory.length - 1] === ViewState.SPONSORSHIP_CATEGORY) {
              newHistory.pop();
            }
            // Ensure SPONSORSHIPS is in history (add if not present or if it was removed)
            if (newHistory[newHistory.length - 1] !== ViewState.SPONSORSHIPS) {
              // Check if SPONSORSHIPS exists in history
              const sponsorshipsIndex = newHistory.indexOf(ViewState.SPONSORSHIPS);
              if (sponsorshipsIndex !== -1) {
                // SPONSORSHIPS exists, remove it and add to end
                newHistory.splice(sponsorshipsIndex, 1);
              }
              newHistory.push(ViewState.SPONSORSHIPS);
            }
            return newHistory;
          });
          setViewState(ViewState.SPONSORSHIPS);
        }
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (sellPlayerModal) {
        setSellPlayerModal(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (debtWarningModal) {
        setDebtWarningModal(false);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (gameOverModal) {
        setGameOverModal(false);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (expiringContractsModal) {
        setExpiringContractsModal(false);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (retirementWarningModal) {
        setRetirementWarningModal(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (seasonSummary) {
        setSeasonSummary(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }
      
      if (developmentChanges) {
        setDevelopmentChanges(null);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        return;
      }

      // If no modals are open, navigate back using view history
      // Always go to previous view in history, or main menu if no history
      if (viewHistory.length > 1) {
        // Remove current view from history and go to previous one
        isNavigatingBackRef.current = true;
        const newHistory = [...viewHistory];
        newHistory.pop(); // Remove current view
        const previousView = newHistory[newHistory.length - 1] || ViewState.MAIN_MENU;
        setViewHistory(newHistory);
        setViewState(previousView);
        historyDepthRef.current += 1;
        window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
      } else {
        // Already at main menu or no history, prevent app from closing
        const statesToPush = Math.max(2 - historyDepthRef.current, 1);
        for (let i = 0; i < statesToPush; i++) {
          historyDepthRef.current += 1;
          window.history.pushState({ preventBack: true, depth: historyDepthRef.current }, '');
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    gameState, viewState, inspectPlayer, inspectTeam, matchDetailModal, 
    negotiation, contractNegotiation, isYouthModalOpen, seasonPlayerModal,
    stadiumSponsorModal, sponsorshipOfferModal, selectedSponsorshipCategory,
    sellPlayerModal, debtWarningModal, gameOverModal, expiringContractsModal,
    retirementWarningModal, seasonSummary, developmentChanges, offerModal, counterOfferModal
  ]);

  // Start new career in slot
  const startNewCareer = async (slot: number) => {
    setCareerSlot(slot);
    setFavoritePlayers(new Set()); // Clear favorites when starting new career
    setManagerAchievements([]); // Clear achievements when starting new career
    setManagerCareerHistory([]); // Clear careerHistory when starting new career (trophies shown as achievements)
    // Clear all achievement and careerHistory keys from localStorage to prevent any leftover data
    try {
      for (let i = 0; i < 5; i++) {
        localStorage.removeItem(`achievements_${i}`);
        localStorage.removeItem(`careerHistory_${i}`); // Clear careerHistory too
      }
    } catch (e) {
      console.warn('[Storage] Failed to clear achievements/careerHistory:', e);
    }
    console.log(`[ACHIEVEMENTS] Cleared all achievements and careerHistory when starting new career in slot ${slot}`);
    setSeasonYear("2025/2026"); // Ensure season starts at 2025/2026
    setCurrentWeek(1);
    try {
      await initializeGame();
    } catch (e) {
      console.error("Failed to start new career:", e);
      setNotification({ 
        message: translateNotificationLocal('Failed to start new career. Please try again.', 'Yeni kariyer başlatılamadı. Lütfen tekrar deneyin.'), 
        type: 'error' 
      });
      setLoading(false);
      // Reset to career select if initialization fails
      setGameState(GameState.CAREER_SELECT);
      setCareerSlot(null);
    }
  };

  // Exit to career select screen
  const exitToCareerSelect = () => {
    if (careerSlot !== null) {
      saveCareer(); // Save before exiting
    }
    setGameState(GameState.CAREER_SELECT);
    setCareerSlot(null);
    setFavoritePlayers(new Set()); // Clear favorites when exiting
    try {
      localStorage.removeItem('activeCareerSlot');
    } catch (e) {
      console.warn('[Storage] Failed to remove activeCareerSlot:', e);
    }
  };

  // Delete career slot
  const handleDeleteCareer = (slot: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent slot selection
    setDeleteConfirmSlot(slot);
  };

  const confirmDeleteCareer = (slot: number) => {
    // Delete from localStorage
    try {
      localStorage.removeItem(`career_${slot}`);
      localStorage.removeItem(`achievements_${slot}`); // Clear achievements for deleted slot
      localStorage.removeItem(`careerHistory_${slot}`); // Clear career history for deleted slot
      
      // Update career slots
      const updatedSlots = [...careerSlots];
      updatedSlots[slot] = null;
      setCareerSlots(updatedSlots);
      localStorage.setItem('careerSlots', JSON.stringify(updatedSlots));
      
      // If active slot was deleted, clear it
      const activeSlot = localStorage.getItem('activeCareerSlot');
      if (activeSlot && parseInt(activeSlot) === slot) {
        localStorage.removeItem('activeCareerSlot');
      }
    } catch (e) {
      console.warn('[Storage] Failed to delete career slot from localStorage:', e);
    }
    setCareerSlot(null);
    setManagerAchievements([]); // Clear achievements from state
    setManagerCareerHistory([]); // Clear careerHistory from state (trophies shown as achievements)
    
    setDeleteConfirmSlot(null);
  };

  const initializeGame = async () => {
    await processGameInitialization(
      translateNotificationLocal,
      t,
      {
        onSetLoading: setLoading,
        onSetLoadingMessage: setLoadingMessage,
        onSetTeams: setTeams,
        onSetSeasonYear: setSeasonYear,
        onSetCurrentWeek: setCurrentWeek,
        onSetGameState: setGameState,
        onSetCareerSlot: setCareerSlot,
        onSetNotification: setNotification
      }
    );
  };

  // --- ACTIONS ---

  const handleSelectTeam = async (selectedTeam: Team) => {
    await processTeamSelection(
      selectedTeam,
      teams,
      translateNotificationLocal,
      t,
      {
        onSetLoading: setLoading,
        onSetLoadingMessage: setLoadingMessage,
        onSetUserTeamId: setUserTeamId,
        onSetTeams: setTeams,
        onSetMarketPlayers: setMarketPlayers,
        onSetFixtures: setFixtures,
        onSetSeasonYear: setSeasonYear,
        onSetCurrentWeek: setCurrentWeek,
        onSetGameState: setGameState,
        onSetViewState: setViewState,
        onSetManagerAchievements: setManagerAchievements,
        onSetManagerCareerHistory: setManagerCareerHistory
      }
    );
  };

  const handleBuyPlayer = (player: Player) => {
    // Legacy function - redirects to negotiate
    handleBuyPlayerNegotiate(player);
  };

  const handleBuyPlayerDirect = (player: Player) => {
    processBuyPlayerDirect(
      player,
      teams,
      userTeamId,
      translateNotificationLocal,
      {
        onSetNotification: setNotification,
        onSetPendingTransfer: setPendingTransfer,
        onSetContractNegotiation: setContractNegotiation,
        onSetNegotiation: setNegotiation
      }
    );
  };

  const handleBuyPlayerNegotiate = (player: Player) => {
    processBuyPlayerNegotiate(
      player,
      teams,
      userTeamId,
      translateNotificationLocal,
      {
        onSetNotification: setNotification,
        onSetPendingTransfer: setPendingTransfer,
        onSetContractNegotiation: setContractNegotiation,
        onSetNegotiation: setNegotiation
      }
    );
  };

  // Check if removing a player would violate minimum squad size
  const wouldViolateMinSquadSize = (playerToRemove: Player): boolean => {
    const myTeam = teams.find(t => t.id === userTeamId);
    if (!myTeam) return false;
    
    // Count current players (excluding the one to be removed)
    const remainingPlayers = myTeam.players.filter(p => p.id !== playerToRemove.id);
    return remainingPlayers.length < 20; // MIN_SQUAD_SIZE = 20
  };

  const handleSellPlayer = (player: Player) => {
    // Check minimum squad size
    if (wouldViolateMinSquadSize(player)) {
      setNotification({
        message: translateNotificationLocal(
          'Cannot sell player! Minimum squad size is 20 players.',
          'Oyuncu satılamaz! Minimum kadro sayısı 20 oyuncudur.'
        ),
        type: 'error'
      });
      return;
    }
    
    // Show modal to choose loan or transfer list
    if (player.transferListWeekAdded === currentWeek) {
      setNotification({
        message: translateNotificationLocal(
          `${player.name} already listed this week.`,
          `${player.name} bu hafta zaten listelendi.`
        ),
        type: 'info'
      });
      return;
    }
    setSellPlayerModal({ player, show: true });
  };
  
  const handleAddToLoanList = (player: Player) => {
    processAddToLoanList(
      player,
      teams,
      userTeamId,
      currentWeek,
      wouldViolateMinSquadSize,
      translateNotificationLocal,
      {
        onSetNotification: setNotification,
        onSetTeams: setTeams,
        onSetSellPlayerModal: setSellPlayerModal,
        onGenerateOffersForPlayer: generateOffersForPlayer
      }
    );
  };
  
  const handleAddToTransferList = (player: Player) => {
    processAddToTransferList(
      player,
      teams,
      userTeamId,
      currentWeek,
      wouldViolateMinSquadSize,
      translateNotificationLocal,
      {
        onSetNotification: setNotification,
        onSetTeams: setTeams,
        onSetSellPlayerModal: setSellPlayerModal,
        onGenerateOffersForPlayer: generateOffersForPlayer
      }
    );
  };

  const handleReleasePlayerFromSquad = (player: Player) => {
    processReleasePlayerFromSquad(
      player,
      teams,
      userTeamId,
      wouldViolateMinSquadSize,
      translateNotificationLocal,
      {
        onSetNotification: setNotification,
        onSetTeams: setTeams,
        onSetSellPlayerModal: setSellPlayerModal,
        onGenerateOffersForPlayer: generateOffersForPlayer
      }
    );
  };
  
  // Generate offers from AI teams for listed players
  const generateOffersForPlayer = (player: Player, type: 'LOAN' | 'TRANSFER') => {
    generateOffersForPlayerService(
      player,
      type,
      teams,
      userTeamId,
      currentWeek,
      translateNotificationLocal,
      {
        onSetTeams: setTeams,
        onSetNotification: setNotification
      }
    );
  };
  
  const handleAcceptOffer = (offer: TransferOffer, player: Player) => {
      processAcceptOffer(
          offer,
          player,
          teams,
          fixtures,
          currentWeek,
          userTeamId,
          wouldViolateMinSquadSize,
          translateNotificationLocal,
          formatCurrencyLocal,
          {
              onSetNotification: setNotification,
              onSetTeams: setTeams,
              onSetInspectPlayer: setInspectPlayer,
              onSetOfferModal: setOfferModal,
              onSetCounterOfferModal: setCounterOfferModal,
              onSetNegotiation: setNegotiation
          }
      );
  };
  
  const handleRejectOffer = (offer: TransferOffer, player: Player) => {
    const updateOfferList = (offers?: TransferOffer[]) => (offers || []).map(o =>
      o.id === offer.id ? { ...o, status: 'REJECTED', waitingForResponse: false } : o
    );
    setTeams(prev => prev.map(t => {
      if (t.id === userTeamId) {
        return {
          ...t,
          players: t.players.map(p => 
            p.id === player.id
              ? { ...p, offers: updateOfferList(p.offers) }
              : p
          )
        };
      }
      return t;
    }));
    setInspectPlayer(prev => {
      if (!prev || prev.id !== player.id) return prev;
      return { ...prev, offers: updateOfferList(prev.offers) };
    });
    // Close all related modals
    setOfferModal(null);
    setCounterOfferModal(null);
    setNegotiation(null);
    setNotification({ message: translateNotificationLocal(`Offer from ${offer.teamName} rejected.`, `${offer.teamName} takımından gelen teklif reddedildi.`), type: 'info' });
  };
  
  const handleCounterOffer = (offer: TransferOffer, player: Player, counterFee: number) => {
    const currentRound = offer.negotiationRound ?? 0;
    if (currentRound >= 3) {
      setNotification({ message: translateNotificationLocal('Maximum negotiation rounds reached. Please accept or reject.', 'Maksimum pazarlık turuna ulaşıldı. Lütfen kabul edin veya reddedin.'), type: 'error' });
      return;
    }
    
    const nextRound = currentRound + 1;
    
    // Mark the offer as being negotiated so the AI can respond next week
    const historyEntry = {
      round: nextRound,
      from: 'USER' as const,
      amount: counterFee,
      timestamp: Date.now(),
      note: 'Counter offer'
    };

    const updateOfferState = (offers?: TransferOffer[]) => {
      return (offers || []).map(o => 
        o.id === offer.id
          ? {
              ...o,
              fee: counterFee,
              status: 'NEGOTIATING',
              waitingForResponse: true,
              negotiationRound: nextRound,
              lastCounterOffer: counterFee,
              expiryWeek: Math.max(o.expiryWeek ?? currentWeek + 2, currentWeek + 2),
              negotiationHistory: [...(o.negotiationHistory || []), historyEntry]
            }
          : o
      );
    };
    
    setTeams(prev => prev.map(t => {
      if (t.id === userTeamId) {
        return {
          ...t,
          players: t.players.map(p => 
            p.id === player.id
              ? { ...p, offers: updateOfferState(p.offers) }
              : p
          )
        };
      }
      return t;
    }));

    // Keep player detail modal in sync so the offer disappears instantly
    setInspectPlayer(prev => {
      if (!prev || prev.id !== player.id) return prev;
      return { ...prev, offers: updateOfferState(prev.offers) };
    });
    setCounterOfferModal(null);
    setOfferModal(null);
    setNotification({ 
      message: translateNotificationLocal(`Counter offer sent to ${offer.teamName}. Response will come next week.`, `${offer.teamName} takımına karşı teklif gönderildi. Yanıt gelecek hafta ulaşacak.`), 
      type: 'info' 
    });
  };

  // --- YOUTH ACADEMY ---
  const handleSignYouth = (player: Player, cost: number) => {
      setTeams(prev => prev.map(t => {
          if (t.id === userTeamId) {
              // Check if player already exists in team to prevent duplicates
              const playerExists = t.players.some(p => p.id === player.id);
              if (playerExists) {
                  console.warn(`Player ${player.name} (${player.id}) already exists in team ${t.name}, skipping duplicate add`);
                  return t;
              }
              return {
                  ...t,
                  budget: t.budget - cost,
                  players: [...t.players, player]
              };
          }
          return t;
      }));
  };

  const handleDeductFunds = (amount: number) => {
      setTeams(prev => prev.map(t => {
          if (t.id === userTeamId) {
              return {
                  ...t,
                  budget: t.budget - amount,
                  financials: {
                      ...t.financials,
                      expenses: {
                          ...t.financials.expenses,
                          facilities: t.financials.expenses.facilities + amount // Log scouting as 'facilities/ops'
                      }
                  }
              };
          }
          return t;
      }));
  };

  const handleUpdateTeam = (updatedTeam: Team) => {
      setTeams(prev => prev.map(t => {
          if (t.id === userTeamId) {
              return updatedTeam;
          }
          return t;
      }));
  };

  // --- NEGOTIATION SYSTEM (Transfers) ---

  const handleInspectTeam = (team: Team) => {
      if (team.id === userTeamId) {
          setViewState(ViewState.DASHBOARD); // Go to own dashboard
      } else {
          // For opponent teams, ensure players are not marked as scouted unless explicitly scouted
          // Get the actual team from teams array to check real scouted status
          const actualTeam = teams.find(t => t.id === team.id);
          const teamWithScoutedPlayers = {
              ...team,
              players: team.players.map(p => {
                  // Check if this player was actually scouted in the actual team data
                  const actualPlayer = actualTeam?.players.find(ap => ap.id === p.id);
                  const wasScouted = actualPlayer?.scouted === true;
                  const hasPendingScout = actualPlayer?.pendingScout !== undefined;
                  
                  return {
                      ...p,
                      scouted: wasScouted || false,
                      pendingScout: hasPendingScout ? actualPlayer?.pendingScout : undefined
                  };
              })
          };
          setInspectTeam(teamWithScoutedPlayers);
      }
  };

  const handleApproachPlayer = (player: Player) => {
      // Open player inspection modal instead of negotiation
      setInspectPlayer(player);
  };

  const handleViewOffers = (player: Player) => {
    const firstPendingOffer = player.offers?.find(
      offer => offer.status === 'PENDING' && !offer.waitingForResponse
    );
    if (firstPendingOffer) {
      setOfferModal({ offer: firstPendingOffer, player });
    }
  };

  const handleStartNegotiation = (player: Player) => {
      if (!inspectTeam) return;
      setInspectPlayer(null); // Close player inspection modal
      setNegotiation({ player, sellerTeam: inspectTeam });
  };

  // Called when Transfer Fee is AGREED with the Club
  const handleTransferFeeAgreed = (finalPrice: number) => {
      if (!negotiation) return;
      
      // Don't move player yet. Start Contract Negotiation.
      setPendingTransfer({ player: negotiation.player, fee: finalPrice, seller: negotiation.sellerTeam });
      setNegotiation(null);
      setContractNegotiation({ player: negotiation.player, mode: 'TRANSFER' });
  };

  // --- CONTRACT SYSTEM ---

  const handleRenewPlayer = (player: Player) => {
      setContractNegotiation({ player, mode: 'RENEWAL' });
  };

  const handleContractComplete = (wage: number, years: number, releaseClause?: number) => {
    if (!contractNegotiation) return;
      
      processContractComplete(
                                        wage, 
          years,
          releaseClause,
          contractNegotiation.player,
          contractNegotiation.mode,
          pendingTransfer,
          teams,
          fixtures,
          currentWeek,
          userTeamId,
          seasonYear,
          expiringContractsModal,
          pendingTeams,
          inspectTeam,
          translateNotificationLocal,
          {
              onSetNotification: setNotification,
              onSetTeams: setTeams,
              onSetPendingTeams: setPendingTeams,
              onSetMarketPlayers: setMarketPlayers,
              onSetTransferHistory: setTransferHistory,
              onSetExpiringContractsModal: setExpiringContractsModal,
              onSetContractNegotiation: setContractNegotiation,
              onSetPendingTransfer: setPendingTransfer,
              onSetInspectTeam: setInspectTeam
          }
      );
  };

  const handleFinishTransferWindow = () => {
      setLoading(true);
      setLoadingMessage(t('simulatingDeadlineDay'));

      setTimeout(() => {
          setMarketPlayers([]);
          const sched = generateSeasonSchedule(teams);
          setFixtures(sched);
          setGameState(GameState.SEASON_ONGOING);
          setViewState(ViewState.LEAGUE);
          setLoading(false);
      }, 1500);
  };

  // Trigger the visual simulation
  const handleSimulateWeek = () => {
      const result = processWeekSimulation(
          fixtures,
          teams,
          currentWeek,
          language,
          translateNotificationLocal,
          {
              onSetNotification: setNotification,
              onSetSimulationResults: setSimulationResults,
              onSetIsSimulating: setIsSimulating
          }
      );
      
      if (result.shouldReturnEarly) {
          return;
      }
  };


  const handleSimulationComplete = () => {
      const result = processSimulationComplete(
          simulationResults,
          fixtures,
          teams,
          currentWeek,
          userTeamId,
          seasonYear,
          retirementChecked,
          stadiumSponsorModal,
          careerSlot,
          translateNotificationLocal,
          formatCurrencyLocal,
          t,
          {
              onSetNotification: setNotification,
              onSetTeams: setTeams,
              onSetFixtures: setFixtures,
              onSetCurrentWeek: setCurrentWeek,
              onSetIsSimulating: setIsSimulating,
              onSetSimulationResults: setSimulationResults,
              onSetRetirementWarningModal: setRetirementWarningModal,
              onSetRetirementChecked: setRetirementChecked,
              onSetStadiumSponsorModal: setStadiumSponsorModal,
              onSetInspectTeam: setInspectTeam,
              onSetTransferHistory: setTransferHistory,
              onSaveCareer: saveCareer
          }
      );
      
      if (result.shouldReturnEarly) {
            return;
          }
  };

  const handleSimulateSeason = async () => {
      await simulateRemainingSeason(
          fixtures,
          teams,
          currentWeek,
          userTeamId,
          seasonYear,
          language,
          t,
          {
              onSetNotification: (notification) => setNotification({
                  ...notification,
                  message: translateNotificationLocal(notification.message, notification.message)
              }),
              onSetLoading: setLoading,
              onSetLoadingMessage: setLoadingMessage,
              onSetFixtures: setFixtures,
              onSetTeams: setTeams,
              onSetCurrentWeek: setCurrentWeek,
              onSetTransferHistory: setTransferHistory,
              onSaveCareer: () => {
      if (careerSlot !== null) {
                      saveCareer();
                  }
              }
          }
      );
  };

  const calculateEndOfSeasonRewards = () => {
      const callbacks: SeasonRewardsCallbacks = {
          onNotification: setNotification,
          onSetTeams: setTeams,
          onSetSeasonSummary: setSeasonSummary,
          onSetDebtWarningModal: setDebtWarningModal,
          onSetGameOverModal: setGameOverModal,
          onSetTransferHistory: setTransferHistory,
          onSetManagerAchievements: setManagerAchievements,
          onSetManagerCareerHistory: setManagerCareerHistory,
          onSetManagerOffers: setManagerOffers
      };
      
      const result = calculateEndOfSeasonRewardsService(
          teams,
          fixtures,
          userTeamId,
          seasonYear,
          careerSlot,
          (player: Player) => getPlayerStatsUtil(player, teams, fixtures),
          formatCurrencyLocal,
          translateNotificationLocal,
          callbacks
      );
      
      if (result.shouldReturnEarly) {
          return;
      }
      
      // Teams and season summary are already set by service via callbacks
  };

  const handleAcceptManagerOffer = (offer: ManagerOffer) => {
      const newTeam = teams.find(t => t.id === offer.teamId);
      if (!newTeam) return;
      
      // Update user team ID
      setUserTeamId(offer.teamId);
      
      // Close modals
      setManagerOffers(null);
      setSeasonSummary(null);
      
      // Show notification
      setNotification({ 
          message: translateNotificationLocal(`You've joined ${offer.teamName} as their new manager!`, `${offer.teamName} takımına yeni teknik direktör olarak katıldınız!`), 
          type: 'success' 
      });
      
      // Proceed to next season with new team - pass the new team ID explicitly
      handleProceedToDevelopment(offer.teamId);
  };

  const handleRejectManagerOffer = (offer: ManagerOffer) => {
      setManagerOffers(prev => {
          if (!prev) return null;
          const filtered = prev.filter(o => o.id !== offer.id);
          return filtered.length > 0 ? filtered : null;
      });
  };

  const handleRejectAllManagerOffers = () => {
      setManagerOffers(null);
  };

  const handleProceedToDevelopment = (targetTeamId?: string) => {
      processSeasonDevelopment(
          teams,
          userTeamId,
          targetTeamId,
          translateNotificationLocal,
          {
              onSetNotification: setNotification,
              onSetPendingTeams: setPendingTeams,
              onSetDevelopmentChanges: setDevelopmentChanges,
              onSetSeasonSummary: setSeasonSummary,
              onSetManagerOffers: setManagerOffers
          }
      );
  };

  // Auto-renew contracts for expiring players
  const autoRenewExpiringContracts = (team: Team): { renewed: Player[], failed: Player[] } => {
    const expiringPlayers = team.players.filter(p => (p.contract?.yearsLeft || 0) <= 0);
    const renewed: Player[] = [];
    const failed: Player[] = [];
    
    expiringPlayers.forEach(player => {
      // Calculate renewal offer (similar to ContractNegotiationModal logic)
      const baseWage = Math.floor(player.trueValue * 0.0045);
      const currentWage = player.contract?.wage || 0;
      const demand = Math.max(baseWage, Math.floor(currentWage * 1.2));
      const offer = Math.floor(demand * 0.9); // Offer 90% of demand
      
      // 70% chance of acceptance if offer is reasonable
      const acceptanceChance = offer >= demand * 0.85 ? 0.7 : 0.3;
      const accepted = Math.random() < acceptanceChance;
      
      if (accepted) {
        // Renew contract
        renewed.push({
          ...player,
          contract: {
            ...player.contract!,
            wage: offer,
            yearsLeft: 3 // Standard 3 year renewal
          }
        });
      } else {
        // Contract renewal failed
        failed.push(player);
      }
    });
    
    return { renewed, failed };
  };
  
  // Transfer failed renewal players to other teams (free transfer)
  const transferExpiredPlayers = (failedPlayers: Player[], allTeams: Team[]): Team[] => {
    let updatedTeams = [...allTeams];
    
    failedPlayers.forEach(player => {
      // Find a random team that can afford the player's wage
      const interestedTeams = updatedTeams
        .filter(t => t.id !== userTeamId && t.budget > (player.contract?.wage || 0) * 52 * 2) // Can afford 2 years of wages
        .sort(() => Math.random() - 0.5);
      
      if (interestedTeams.length > 0) {
        const newTeam = interestedTeams[0];
        const teamIndex = updatedTeams.findIndex(t => t.id === newTeam.id);
        
        if (teamIndex !== -1) {
          // Remove from user team
          const userTeamIndex = updatedTeams.findIndex(t => t.id === userTeamId);
          if (userTeamIndex !== -1) {
            updatedTeams[userTeamIndex] = {
              ...updatedTeams[userTeamIndex],
              players: updatedTeams[userTeamIndex].players.filter(p => p.id !== player.id)
            };
          }
          
          // Add to new team
          // Check if player already exists in team to prevent duplicates
          const playerExists = updatedTeams[teamIndex].players.some(p => p.id === player.id);
          if (playerExists) {
            console.warn(`Player ${player.name} (${player.id}) already exists in team ${updatedTeams[teamIndex].name}, skipping duplicate add`);
          } else {
            updatedTeams[teamIndex] = {
              ...updatedTeams[teamIndex],
              players: [...updatedTeams[teamIndex].players, player]
            };
          }
        }
      }
    });
    
    return updatedTeams;
  };

  const applyNextSeason = async () => {
    if (!pendingTeams) return;

    const myTeam = pendingTeams.find(t => t.id === userTeamId);
    if (myTeam) {
      // Check for expiring contracts
      const expiringPlayers = myTeam.players.filter(p => (p.contract?.yearsLeft || 0) <= 0);
      
      if (expiringPlayers.length > 0) {
        // Show mandatory contract renewal modal
        setExpiringContractsModal(true);
        return; // Don't proceed until user handles expiring contracts
      }
    }

    // No expiring contracts, proceed normally
    setDevelopmentChanges(null);
    setLoading(true);
    setLoadingMessage(t('finalizingPreSeason'));

    const [startYear, endYear] = seasonYear.split('/').map(Number);
    const newSeasonStr = `${startYear + 1}/${endYear + 1}`;

    setTimeout(() => {
        const { market, updatedTeams } = generateMarketForWindow(pendingTeams, userTeamId);
        setTeams(updatedTeams);
        setMarketPlayers(market);
        
        const newFixtures = generateSeasonSchedule(updatedTeams);
        setFixtures(newFixtures);
        
        setCurrentWeek(1);
        setSeasonYear(newSeasonStr);
        setPendingTeams(null);
        setYouthReloadCount(0); // Reset reload count at season start
        setGameState(GameState.TRANSFER_WINDOW);
        setViewState(ViewState.DASHBOARD);
        
        setLoading(false);
    }, 2000);
  };
  
  const handleExpiringContractsComplete = () => {
    const result = processExpiringContractsComplete(
      pendingTeams,
      userTeamId,
      seasonYear,
      translateNotificationLocal,
      t,
      {
        onSetNotification: setNotification,
        onSetExpiringContractsModal: setExpiringContractsModal,
        onSetDevelopmentChanges: setDevelopmentChanges,
        onSetLoading: setLoading,
        onSetLoadingMessage: setLoadingMessage,
        onSetTeams: setTeams,
        onSetMarketPlayers: setMarketPlayers,
        onSetFixtures: setFixtures,
        onSetCurrentWeek: setCurrentWeek,
        onSetSeasonYear: setSeasonYear,
        onSetPendingTeams: setPendingTeams,
        onSetYouthReloadCount: setYouthReloadCount,
        onSetGameState: setGameState,
        onSetViewState: setViewState
      }
    );
    
    if (result.shouldReturnEarly) {
      return;
    }
  };
  
  const handleReleasePlayer = (player: Player) => {
    if (!pendingTeams) return;
    
    const myTeam = pendingTeams.find(t => t.id === userTeamId);
    if (!myTeam) return;
    
    // Check if releasing this player would drop below minimum squad size
    if (myTeam.players.length <= 20) {
      setNotification({ 
        message: translateNotificationLocal(
          `Cannot release player. Team must maintain at least 20 players. You currently have ${myTeam.players.length} players.`,
          `Oyuncu serbest bırakılamaz. Takım en az 20 oyuncu bulundurmalıdır. Şu anda ${myTeam.players.length} oyuncunuz var.`
        ),
        type: 'error' 
      });
      return;
    }
    
    setPendingTeams(prev => prev?.map(t => {
      if (t.id === userTeamId) {
        return {
          ...t,
          players: t.players.filter(p => p.id !== player.id)
        };
      }
      return t;
    }) || null);
    
    setNotification({ 
      message: translateNotificationLocal(`${player.name} has been released from the team.`, `${player.name} takımdan serbest bırakıldı.`),
      type: 'info' 
    });
  };

  const getPlayerStats = (player: Player) => getPlayerStatsUtil(player, teams, fixtures);

  if (loading) {
      return <LoadingScreen message={loadingMessage} />;
  }

  const myTeam = teams.find(t => t.id === userTeamId);
  const userMatch = simulationResults.find(f => f.homeTeamId === userTeamId || f.awayTeamId === userTeamId);
  const overlayFixtures = userMatch ? [userMatch] : simulationResults;

  // Orientation check - show warning if in portrait mode on mobile
  // Check this BEFORE language selection so user sees the warning immediately
  if (isPortrait) {
    return <OrientationWarning />;
  }

  // Language Selection Screen - Show before everything else if language not selected
  if (!languageSelected) {
    return (
      <LanguageSelection 
        onLanguageSelected={() => {
          setLanguageSelected(true);
          setGameState(GameState.CAREER_SELECT);
        }} 
      />
    );
  }

  // Career Selection Screen
  if (gameState === GameState.CAREER_SELECT) {
    return (
      <CareerSelectionScreen
        careerSlots={careerSlots}
        deleteConfirmSlot={deleteConfirmSlot}
        setDeleteConfirmSlot={setDeleteConfirmSlot}
        loading={loading}
        onSlotSelect={async (slotIndex, isEmpty) => {
                      if (isEmpty) {
            await startNewCareer(slotIndex);
                      } else {
                        console.log('Loading career for slot', slotIndex);
                        try {
                          await loadCareer(slotIndex);
                        } catch (e) {
                          console.error('Error in loadCareer button handler', e);
                          setLoading(false);
                        }
                      }
                    }}
        onDeleteConfirm={confirmDeleteCareer}
        onDeleteClick={handleDeleteCareer}
      />
    );
  }

  return (
    <div className="h-screen w-full font-sans overflow-hidden relative">
        <div className="absolute fixed inset-0 w-full h-full pointer-events-none z-0">
             <div className="absolute top-[-20%] left-[20%] w-[60vw] h-[60vw] bg-emerald-900/10 blur-[150px] rounded-full opacity-40"></div>
             <div className="absolute bottom-[-20%] right-[20%] w-[60vw] h-[60vw] bg-indigo-900/10 blur-[150px] rounded-full opacity-40"></div>
        </div>

        {/* Modals */}
        {isSimulating && simulationResults.length > 0 && (
            <SimulationOverlay 
              fixtures={overlayFixtures} 
              teams={teams} 
              userTeamId={userTeamId} 
              onComplete={handleSimulationComplete}
              onCancel={() => setIsSimulating(false)}
            />
        )}

        {seasonSummary && (
            <SeasonSummaryModal
                seasonSummary={seasonSummary}
                managerOffers={managerOffers}
                onProceedToDevelopment={handleProceedToDevelopment}
                onSeasonPlayerClick={() => setSeasonPlayerModal(true)}
            />
        )}

        {/* Season Player Modal */}
        {seasonPlayerModal && seasonSummary && (
            <SeasonPlayerModal
                seasonPlayer={seasonSummary.seasonPlayer}
                onClose={() => setSeasonPlayerModal(false)}
            />
        )}

        {/* Manager Job Offers Modal */}
        {managerOffers && managerOffers.length > 0 && myTeam && (
            <ManagerOfferModal
                offers={managerOffers}
                currentTeamName={myTeam.name}
                currentTeamRating={myTeam.baseRating}
                currentTeamBudget={myTeam.budget}
                onAccept={handleAcceptManagerOffer}
                onReject={handleRejectManagerOffer}
                onRejectAll={handleRejectAllManagerOffers}
            />
        )}

        {developmentChanges && !expiringContractsModal && !contractNegotiation && (
            <DevelopmentModal changes={developmentChanges} onProceed={applyNextSeason} />
        )}

        {/* Retirement Warning Modal */}
        {retirementWarningModal && retirementWarningModal.length > 0 && (
            <RetirementWarningModal
                players={retirementWarningModal}
                onPersuade={(player, success) => {
                    setTeams(prevTeams => {
                        const updated = prevTeams.map(team => {
                            if (team.id === userTeamId) {
                                return {
                                    ...team,
                                    players: team.players.map(p => {
                                        if (p.id === player.id) {
                                            if (success) {
                                                // Player was persuaded
                                                setNotification({
                                                    message: translateNotificationLocal(`${player.name} has agreed to continue playing for one more season!`, `${player.name} bir sezon daha oynamayı kabul etti!`),
                                                    type: 'success'
                                                });
                                                return {
                                                    ...p,
                                                    retirement: {
                                                        ...p.retirement!,
                                                        persuasionAttempted: true,
                                                        persuasionSuccessful: true,
                                                        consideringRetirement: false
                                                    }
                                                };
                                            } else {
                                                // Player refused
                                                setNotification({
                                                    message: translateNotificationLocal(`${player.name} has decided to retire despite your efforts.`, `${player.name} çabalarınıza rağmen emekli olmaya karar verdi.`),
                                                    type: 'info'
                                                });
                                                return {
                                                    ...p,
                                                    retirement: {
                                                        ...p.retirement!,
                                                        persuasionAttempted: true,
                                                        persuasionSuccessful: false,
                                                        retirementAnnounced: true
                                                    }
                                                };
                                            }
                                        }
                                        return p;
                                    })
                                };
                            }
                            return team;
                        });
                        return updated;
                    });
                    
                    // Remove from modal list
                    setRetirementWarningModal(prev => prev?.filter(p => p.id !== player.id) || null);
                }}
                onAccept={(player) => {
                    setTeams(prevTeams => {
                        const updated = prevTeams.map(team => {
                            if (team.id === userTeamId) {
                                return {
                                    ...team,
                                    players: team.players.map(p => {
                                        if (p.id === player.id) {
                                            return {
                                                ...p,
                                                retirement: {
                                                    ...p.retirement!,
                                                    retirementAnnounced: true
                                                }
                                            };
                                        }
                                        return p;
                                    })
                                };
                            }
                            return team;
                        });
                        return updated;
                    });
                    
                    setNotification({
                        message: translateNotificationLocal(`${player.name} will retire at the end of the season.`, `${player.name} sezon sonunda emekli olacak.`),
                        type: 'info'
                    });
                    
                    // Remove from modal list
                    setRetirementWarningModal(prev => prev?.filter(p => p.id !== player.id) || null);
                }}
                onClose={() => {
                    setRetirementWarningModal(null);
                }}
            />
        )}

        {/* Opponent Inspection Modal */}
        {inspectTeam && (
            <TeamDetailModal 
                team={inspectTeam} 
                onClose={() => setInspectTeam(null)} 
                onApproachPlayer={handleApproachPlayer}
                onToggleFavorite={(player) => {
                    setFavoritePlayers(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(player.id)) {
                            newSet.delete(player.id);
                            setNotification({ message: translateNotificationLocal(`${player.name} removed from favorites`, `${player.name} favorilerden çıkarıldı`), type: 'info' });
                        } else {
                            newSet.add(player.id);
                            setNotification({ message: translateNotificationLocal(`${player.name} added to favorites`, `${player.name} favorilere eklendi`), type: 'success' });
                        }
                        return newSet;
                    });
                }}
                favoritePlayerIds={favoritePlayers}
                onScout={async (player: Player) => {
                    if (!myTeam) return;
                    if (myTeam.budget < 50000) {
                        setNotification({ message: translateNotificationLocal("Insufficient funds to scout ($50k required)", "Scout için yetersiz bütçe (50 bin $ gerekli)"), type: 'error' });
                        return;
                    }
                    
                    // Set pending scout (2 weeks from now)
                    const scoutReadyWeek = currentWeek + 2;
                    setTeams(prev => prev.map(t => {
                        if (t.id === inspectTeam.id) {
                            return {
                                ...t,
                                players: t.players.map(p => 
                                    p.id === player.id 
                                        ? { ...p, pendingScout: scoutReadyWeek }
                                        : p
                                )
                            };
                        }
                        return t;
                    }));
                    
                    // Update inspectTeam state
                    setInspectTeam(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            players: prev.players.map(p => 
                                p.id === player.id 
                                    ? { ...p, pendingScout: scoutReadyWeek }
                                    : p
                            )
                        };
                    });
                    
                    // Deduct scout cost
                    setTeams(prev => prev.map(t => 
                        t.id === userTeamId
                            ? {
                                ...t,
                                budget: t.budget - 50000,
                                financials: {
                                    ...t.financials,
                                    expenses: {
                                        ...t.financials.expenses,
                                        facilities: t.financials.expenses.facilities + 50000
                                    }
                                }
                            }
                            : t
                    ));
                    
                    setNotification({ 
                        message: translateNotificationLocal(`Scout report for ${player.name} will be ready in 2 weeks`, `${player.name} için scout raporu 2 hafta içinde hazır olacak`),
                        type: 'info' 
                    });
                }}
                userTeamBudget={myTeam?.budget}
            />
        )}

        {/* Negotiation Minigame Modal (Fee) */}
        {negotiation && myTeam && (
            <NegotiationModal 
                player={negotiation.player}
                sellerTeam={negotiation.sellerTeam}
                buyerBudget={myTeam.budget}
                onClose={() => setNegotiation(null)}
                onSuccess={handleTransferFeeAgreed}
            />
        )}
        
        {/* Contract Negotiation Modal (Wage) */}
        {contractNegotiation && (
            <ContractNegotiationModal 
                player={contractNegotiation.player}
                mode={contractNegotiation.mode}
                onClose={() => {
                    const wasRenewal = contractNegotiation.mode === 'RENEWAL';
                    // If this was a renewal from expiring contracts modal, reopen it if there are still expiring players
                    if (wasRenewal && pendingTeams) {
                        const myTeam = pendingTeams.find(t => t.id === userTeamId);
                        if (myTeam) {
                            const expiringPlayers = myTeam.players.filter(p => (p.contract?.yearsLeft || 0) <= 0);
                            if (expiringPlayers.length > 0) {
                                // Temporarily hide developmentChanges to prevent it from showing
                                const currentDevelopmentChanges = developmentChanges;
                                if (currentDevelopmentChanges) {
                                    setDevelopmentChanges(null);
                                }
                                // First open expiringContractsModal
                                setExpiringContractsModal(true);
                                // Then close contract negotiation
                                setContractNegotiation(null);
                                setPendingTransfer(null);
                                // Restore developmentChanges after expiringContractsModal is rendered
                                if (currentDevelopmentChanges) {
                                    setTimeout(() => {
                                        setDevelopmentChanges(currentDevelopmentChanges);
                                    }, 100);
                                }
                                return;
                            }
                        }
                    }
                    // No expiring contracts, close normally
                    setContractNegotiation(null);
                    setPendingTransfer(null);
                }}
                onSign={handleContractComplete}
            />
        )}

        {/* Youth Academy Modal */}
        {isYouthModalOpen && myTeam && (
            <YouthAcademyModal 
                team={myTeam}
                prospects={youthProspects}
                scoutStarted={youthScoutStarted}
                reloadCount={youthReloadCount}
                onProspectsChange={setYouthProspects}
                onScoutStartedChange={setYouthScoutStarted}
                onReloadCountChange={setYouthReloadCount}
                onClose={() => setIsYouthModalOpen(false)} 
                onSignPlayer={handleSignYouth}
                onNotification={(message, type) => setNotification({ message, type: type || 'info' })}
                onDeductFunds={(amount) => {
                    if (myTeam && myTeam.budget < amount) {
                        setNotification({ message: translateNotificationLocal("Insufficient funds for scouting mission.", "Scout görevi için yetersiz bütçe."), type: 'error' });
                        return;
                    }
                    handleDeductFunds(amount);
                }}
            />
        )}

        {/* Global Player Inspection Modal */}
        {inspectPlayer && (
          <PlayerDetailModal
            player={inspectPlayer}
            teams={teams}
            userTeamId={userTeamId}
            seasonYear={seasonYear}
            offerIndices={offerIndices}
            onClose={() => {
              setInspectPlayer(null);
              // If expiringContractsModal should be open, temporarily hide developmentChanges
              if (pendingTeams) {
                const myTeam = pendingTeams.find(t => t.id === userTeamId);
                if (myTeam) {
                  const expiringPlayers = myTeam.players.filter(p => (p.contract?.yearsLeft || 0) <= 0);
                  if (expiringPlayers.length > 0) {
                    // Temporarily hide developmentChanges to prevent it from showing
                    const currentDevelopmentChanges = developmentChanges;
                    if (currentDevelopmentChanges && !expiringContractsModal) {
                      // If expiringContractsModal is not open, open it
                      setExpiringContractsModal(true);
                      // Hide developmentChanges temporarily
                      setDevelopmentChanges(null);
                      // Restore it after a short delay to ensure expiringContractsModal renders first
                      setTimeout(() => {
                        setDevelopmentChanges(currentDevelopmentChanges);
                      }, 50);
                    }
                  }
                }
              }
            }}
            onSetOfferIndex={(playerId, index) => setOfferIndices(prev => ({ ...prev, [playerId]: index }))}
            onOpenOfferModal={(offer, player) => setOfferModal({ offer, player })}
            onSetInspectTeam={setInspectTeam}
            onSetNegotiation={(player, sellerTeam) => {
              setInspectPlayer(null);
              setInspectTeam(sellerTeam);
              setTimeout(() => {
                setNegotiation({ player, sellerTeam });
              }, 100);
            }}
            getPlayerStats={getPlayerStats}
          />
        )}

      <div className="relative z-10 h-full flex flex-col overflow-y-auto">
        {gameState === GameState.TEAM_SELECTION && (
            <TeamSelection teams={teams} onSelect={handleSelectTeam} onInspect={(p) => setInspectPlayer(p)} />
        )}

        {(gameState === GameState.TRANSFER_WINDOW || gameState === GameState.SEASON_ONGOING) && myTeam && (
            <>
                {/* Main Menu */}
                {viewState === ViewState.MAIN_MENU && (
                    <MainMenu 
                        team={myTeam}
                        onNavigate={setViewState}
                        favoriteCount={favoritePlayers.size}
                        mailCount={unreadMailCount}
                        onOpenYouth={() => setIsYouthModalOpen(true)}
                    />
                )}

                {/* Navigation Menu */}
                {viewState === ViewState.MAIN_MENU ? (
                    // Main Menu: Only exit to career select button (auto-save is automatic)
                    <div className="absolute top-6 right-4 z-20 px-6">
                        <button
                            onClick={exitToCareerSelect}
                            className="px-4 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t('exitToCareerSelect')}
                        </button>
                    </div>
                ) : (
                    // All other views: Only back button (except League view which has its own back button in fixtures)
                    viewState !== ViewState.LEAGUE && (
                        <div className="absolute top-6 left-4 z-20 px-6">
                            <button
                                onClick={() => {
                                    if (viewState === ViewState.SPONSORSHIP_CATEGORY) {
                                        setSelectedSponsorshipCategory(null);
                                    }
                                    
                                    // Navigate to previous view in history
                                    if (viewHistory.length <= 1) {
                                        // If no history, go to main menu
                                        isNavigatingBackRef.current = true;
                                        setViewState(ViewState.MAIN_MENU);
                                        setViewHistory([ViewState.MAIN_MENU]);
                                    } else {
                                        // Remove current view and go to previous
                                        isNavigatingBackRef.current = true;
                                        const newHistory = viewHistory.slice(0, -1);
                                        const previousView = newHistory[newHistory.length - 1] || ViewState.MAIN_MENU;
                                        setViewState(previousView);
                                        setViewHistory(newHistory);
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white font-bold text-sm transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                {t('back') || 'Back'}
                            </button>
                        </div>
                    )
                )}
                
                {viewState === ViewState.DASHBOARD && (
                    <>
                        <PortfolioView 
                            team={myTeam} 
                            gameState={gameState}
                            currentWeek={currentWeek}
                            onSell={handleSellPlayer}
                            onGoToMarket={() => setViewState(ViewState.MARKET)}
                            onBackToLeague={() => setViewState(ViewState.LEAGUE)}
                            onInspect={(p) => setInspectPlayer(p)}
                            onOpenYouth={() => setIsYouthModalOpen(true)}
                            onRenew={handleRenewPlayer}
                            onUpdateTeam={handleUpdateTeam}
                            fixtures={fixtures}
                            teams={teams}
                            onViewOffers={handleViewOffers}
                            onOpenSponsorOffer={(team, offer) => {
                                setStadiumSponsorModal({ team, offer });
                            }}
                        />
                    </>
                )}

                {viewState === ViewState.MAILBOX && (
                    <MailView
                        mail={mailbox}
                        onBack={() => setViewState(ViewState.MAIN_MENU)}
                        onMarkAllRead={handleMarkAllMailRead}
                        onClearAll={handleClearMailbox}
                        onDelete={handleDeleteMail}
                        onToggleRead={handleToggleMailRead}
                    />
                )}

                {viewState === ViewState.MARKET && (
                    <MarketView 
                        marketPlayers={marketPlayers}
                        team={myTeam}
                        onBuy={handleBuyPlayer}
                        onBuyDirect={handleBuyPlayerDirect}
                        onNegotiate={handleBuyPlayerNegotiate}
                        onBack={() => setViewState(ViewState.MAIN_MENU)}
                        onFinishWindow={handleFinishTransferWindow}
                        onInspect={(p) => setInspectPlayer(p)}
                        transferHistory={transferHistory}
                        onToggleFavorite={(player) => {
                            setFavoritePlayers(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(player.id)) {
                                    newSet.delete(player.id);
                                setNotification({ message: translateNotificationLocal(`${player.name} removed from favorites`, `${player.name} favorilerden çıkarıldı`), type: 'info' });
                                } else {
                                    newSet.add(player.id);
                                setNotification({ message: translateNotificationLocal(`${player.name} added to favorites`, `${player.name} favorilere eklendi`), type: 'success' });
                                }
                                return newSet;
                            });
                        }}
                        favoritePlayerIds={favoritePlayers}
                    />
                )}

                {viewState === ViewState.FAVORITES && (
                    <FavoritesView
                        favoritePlayerIds={favoritePlayers}
                        allTeams={teams}
                        marketPlayers={marketPlayers}
                        userTeamId={userTeamId}
                        onRemoveFavorite={(playerId) => {
                            setFavoritePlayers(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(playerId);
                                return newSet;
                            });
                        }}
                        onInspect={(p) => setInspectPlayer(p)}
                        onBack={() => setViewState(ViewState.MAIN_MENU)}
                    />
                )}

                {viewState === ViewState.FORMATION_VIEW && (
                    <>
                        <PortfolioView 
                            team={myTeam} 
                            gameState={gameState}
                            currentWeek={currentWeek}
                            onSell={handleSellPlayer}
                            onGoToMarket={() => setViewState(ViewState.MARKET)}
                            onBackToLeague={() => setViewState(ViewState.LEAGUE)}
                            onInspect={(p) => setInspectPlayer(p)}
                            onOpenYouth={() => setIsYouthModalOpen(true)}
                            onRenew={handleRenewPlayer}
                            onUpdateTeam={handleUpdateTeam}
                            fixtures={fixtures}
                            teams={teams}
                            onViewOffers={(player) => {
                                const firstPendingOffer = player.offers?.find(o => o.status === 'PENDING' && !o.waitingForResponse);
                                if (firstPendingOffer) {
                                    setOfferModal({ offer: firstPendingOffer, player });
                                }
                            }}
                            viewMode="FORMATION"
                            onOpenSponsorOffer={(team, offer) => {
                                setStadiumSponsorModal({ team, offer });
                            }}
                        />
                    </>
                )}

                {viewState === ViewState.ACHIEVEMENTS && (
                    <AchievementsView
                        key={`achievements-${careerSlot ?? 'no-slot'}`} // Force re-render when slot changes
                        achievements={managerAchievements}
                        careerHistory={managerCareerHistory}
                        onBack={() => setViewState(ViewState.MAIN_MENU)}
                    />
                )}

                {viewState === ViewState.SHOP && myTeam && (
                    <ShopView
                        team={myTeam}
                        onBack={() => setViewState(ViewState.MAIN_MENU)}
                        onPurchase={(itemId, cost) => {
                            if (itemId === 'premium_ticket') {
                                // Premium pack - use ticket
                                if ((myTeam.premiumTickets || 0) >= 1) {
                                    setTeams(prev => prev.map(t => {
                                        if (t.id === myTeam.id) {
                                            return {
                                                ...t,
                                                premiumTickets: (t.premiumTickets || 0) - 1
                                            };
                                        }
                                        return t;
                                    }));
                                    setNotification({
                                        message: t('ticketUsed') || 'Premium ticket used!',
                                        type: 'success'
                                    });
                                } else {
                                    setNotification({
                                        message: t('noPremiumTickets') || 'No premium tickets!',
                                        type: 'error'
                                    });
                                }
                            } else {
                                // Other packs - use money
                                if (myTeam.budget >= cost) {
                                    setTeams(prev => prev.map(t => {
                                        if (t.id === myTeam.id) {
                                            return {
                                                ...t,
                                                budget: t.budget - cost
                                            };
                                        }
                                        return t;
                                    }));
                                    setNotification({
                                        message: t('purchaseSuccess') || 'Purchase successful!',
                                        type: 'success'
                                    });
                                } else {
                                    setNotification({
                                        message: t('insufficientFunds') || 'Insufficient funds!',
                                        type: 'error'
                                    });
                                }
                            }
                        }}
                        onAddPlayer={(player) => {
                            // Add legendary player directly to team (no transfer fee, already paid in gacha)
                            const team = teams.find(t => t.id === userTeamId);
                            if (!team) return;

                            // Check squad size rules
                            const teamPlayers = team.players || [];
                            const players21Plus = countPlayers21Plus(teamPlayers);
                            if (player.age >= 21 && players21Plus >= 25) {
                                setNotification({
                                    message: t('squadSizeLimitReached') || 'Squad size limit reached! You must sell a player first.',
                                    type: 'error'
                                });
                                return;
                            }

                            // Add player to team
                            setTeams(prev => prev.map(t => {
                                if (t.id === userTeamId) {
                                    // Check if player already exists in team to prevent duplicates
                                    const playerExists = (t.players || []).some(p => p.id === player.id);
                                    if (playerExists) {
                                        console.warn(`Player ${player.name} (${player.id}) already exists in team ${t.name}, skipping duplicate add`);
                                        return t;
                                    }
                                    
                                    // If this is a pack player (id starts with 'legendary-'), add to openedPackPlayers
                                    const isPackPlayer = player.id.startsWith('legendary-');
                                    const openedPackPlayers = t.openedPackPlayers || [];
                                    const updatedOpenedPackPlayers = isPackPlayer && !openedPackPlayers.includes(player.name)
                                        ? [...openedPackPlayers, player.name]
                                        : openedPackPlayers;
                                    
                                    return {
                                        ...t,
                                        players: [...(t.players || []), player],
                                        openedPackPlayers: updatedOpenedPackPlayers
                                    };
                                }
                                return t;
                            }));

                            setNotification({
                                message: `${player.name} ${t('addedToTeam') || 'added to team'}!`,
                                type: 'success'
                            });
                        }}
                    />
                )}

                {viewState === ViewState.SPONSORSHIPS && myTeam && (
                    <SponsorshipsView
                        team={myTeam}
                        onBack={() => setViewState(ViewState.MAIN_MENU)}
                        onCategorySelect={(category) => {
                            setSelectedSponsorshipCategory(category);
                            setViewState(ViewState.SPONSORSHIP_CATEGORY);
                        }}
                        onNavigateToSponsorshipCategory={(category) => {
                            setSelectedSponsorshipCategory(category);
                            setViewState(ViewState.SPONSORSHIP_CATEGORY);
                        }}
                    />
                )}

                {viewState === ViewState.SPONSORSHIP_CATEGORY && myTeam && selectedSponsorshipCategory && (
                    <SponsorshipCategoryView
                        team={myTeam}
                        category={selectedSponsorshipCategory}
                        onBack={() => {
                            setSelectedSponsorshipCategory(null);
                            setViewState(ViewState.SPONSORSHIPS);
                        }}
                        onSponsorshipSelect={(type) => {
                            // Check if there are existing pending offers
                            const pendingOffers = myTeam.pendingSponsorshipOffers?.[type];
                            let offers;
                            
                            if (pendingOffers && pendingOffers.offers.length > 0) {
                                // Use existing offers
                                offers = pendingOffers.offers;
                            } else {
                                // Generate new offers and save them
                                offers = generateSponsorshipOffers(type, selectedSponsorshipCategory, myTeam, currentWeek);
                                
                                // Save offers to team state
                                setTeams(prevTeams => prevTeams.map(t => {
                                    if (t.id === myTeam.id) {
                                        if (!t.pendingSponsorshipOffers) {
                                            t.pendingSponsorshipOffers = {};
                                        }
                                        t.pendingSponsorshipOffers[type] = {
                                            type,
                                            category: selectedSponsorshipCategory,
                                            offers: offers,
                                            lastOfferWeek: currentWeek
                                        };
                                    }
                                    return t;
                                }));
                            }
                            
                            setSponsorshipOfferModal({ offers, type });
                        }}
                    />
                )}

                {viewState === ViewState.FINANCIAL_TABLE && (
                    <>
                        <PortfolioView 
                            team={myTeam} 
                            gameState={gameState}
                            currentWeek={currentWeek}
                            onSell={handleSellPlayer}
                            onGoToMarket={() => setViewState(ViewState.MARKET)}
                            onBackToLeague={() => setViewState(ViewState.LEAGUE)}
                            onInspect={(p) => setInspectPlayer(p)}
                            onOpenYouth={() => setIsYouthModalOpen(true)}
                            onRenew={handleRenewPlayer}
                            onUpdateTeam={handleUpdateTeam}
                            fixtures={fixtures}
                            teams={teams}
                            onViewOffers={(player) => {
                                const firstPendingOffer = player.offers?.find(o => o.status === 'PENDING' && !o.waitingForResponse);
                                if (firstPendingOffer) {
                                    setOfferModal({ offer: firstPendingOffer, player });
                                }
                            }}
                            viewMode="FINANCIAL"
                            onOpenSponsorOffer={(team, offer) => {
                                setStadiumSponsorModal({ team, offer });
                            }}
                        />
                    </>
                )}

                {viewState === ViewState.LEAGUE && (
                    <div className="pt-5">
                    <LeagueView 
                        teams={teams}
                        fixtures={fixtures}
                        currentWeek={currentWeek}
                        userTeamId={userTeamId}
                        seasonYear={seasonYear}
                        onSimulateWeek={handleSimulateWeek}
                        onSimulateSeason={handleSimulateSeason}
                        onNewSeason={calculateEndOfSeasonRewards} 
                        onInspectTeam={handleInspectTeam}
                        onInspectPlayer={(playerName, teamId) => {
                            const team = teams.find(t => t.id === teamId);
                            if (team) {
                                const player = team.players.find(p => {
                                    // Try exact match first
                                    if (p.name === playerName) return true;
                                    // Also try normalized match
                                    const normalizedPlayerName = p.name.trim().toLowerCase();
                                    const normalizedSearchName = playerName.trim().toLowerCase();
                                    return normalizedPlayerName === normalizedSearchName;
                                });
                                if (player) {
                                    setInspectPlayer(player);
                                }
                            }
                        }}
                        onViewMatchDetail={(fixture) => setMatchDetailModal(fixture)}
                        onBack={() => {
                            // Navigate to previous view in history
                            if (viewHistory.length <= 1) {
                                // If no history, go to main menu
                                isNavigatingBackRef.current = true;
                                setViewState(ViewState.MAIN_MENU);
                                setViewHistory([ViewState.MAIN_MENU]);
                            } else {
                                // Remove current view and go to previous
                                isNavigatingBackRef.current = true;
                                const newHistory = viewHistory.slice(0, -1);
                                const previousView = newHistory[newHistory.length - 1] || ViewState.MAIN_MENU;
                                setViewState(previousView);
                                setViewHistory(newHistory);
                            }
                        }}
                    />
                    </div>
                )}
            </>
        )}
      </div>

        {/* Notification Toast */}
        {notification && (
            <NotificationToast
                notification={notification}
                onClose={() => setNotification(null)}
                onClick={handleNotificationToastClick}
            />
        )}

        {/* Auto-hide notification after 2 seconds */}
        {notification && (
            <NotificationTimer 
                key={`timer-${notification.message}-${notification.type}`}
                duration={2000} 
                onComplete={() => setNotification(null)} 
            />
        )}

        {/* Sell Player Modal - Choose Loan or Transfer List */}
        {sellPlayerModal && sellPlayerModal.show && (
            <SellPlayerModal
                player={sellPlayerModal.player}
                onAddToLoanList={handleAddToLoanList}
                onAddToTransferList={handleAddToTransferList}
                onReleasePlayerFromSquad={handleReleasePlayerFromSquad}
                onClose={() => setSellPlayerModal(null)}
            />
        )}

        {/* Offer Modal - Accept/Reject Offers */}
        {offerModal && (
            <OfferModal
                offer={offerModal.offer}
                player={offerModal.player}
                formatCurrency={formatCurrencyLocal}
                formatOfferRoundLabel={formatOfferRoundLocal}
                formatHistoryNote={formatHistoryNoteLocal}
                onAccept={handleAcceptOffer}
                onReject={handleRejectOffer}
                onNegotiate={() => {
                                            setCounterOfferModal({ offer: offerModal.offer, player: offerModal.player });
                                            setOfferModal(null);
                                        }}
                onClose={() => setOfferModal(null)}
            />
        )}

        {/* Counter Offer Modal */}
        {counterOfferModal && (
            <CounterOfferModalWrapper
                        offer={counterOfferModal.offer}
                        player={counterOfferModal.player}
                language={language}
                        onCounter={(fee) => {
                            handleCounterOffer(counterOfferModal.offer, counterOfferModal.player, fee);
                            setCounterOfferModal(null);
                        }}
                        onClose={() => setCounterOfferModal(null)}
                    />
        )}

        {/* Expiring Contracts Modal - Mandatory before new season */}
        {expiringContractsModal && pendingTeams && (() => {
                        const myTeam = pendingTeams.find(t => t.id === userTeamId);
                        if (!myTeam) return null;
                        
                            return (
                <ExpiringContractsModal
                    team={myTeam}
                    userTeamId={userTeamId}
                    onPlayerInspect={(player) => {
                                                                setInspectPlayer(player);
                    }}
                    onRenewContract={(player) => {
                                                            setInspectPlayer(null);
                                                            setExpiringContractsModal(false);
                                                            setContractNegotiation({ player, mode: 'RENEWAL' });
                                                        }}
                    onReleasePlayer={handleReleasePlayer}
                    onComplete={handleExpiringContractsComplete}
                    translatePosition={translatePosition}
                />
                        );
                    })()}

        {/* Match Detail Modal */}
        {matchDetailModal && (
            <MatchDetailModal
                fixture={matchDetailModal}
                teams={teams}
                userTeamId={userTeamId}
                seasonYear={seasonYear}
                onClose={() => setMatchDetailModal(null)}
                onInspectPlayer={(player) => {
                    setMatchDetailModal(null);
                    setInspectPlayer(player);
                }}
            />
        )}

        {/* Debt Warning Modal */}
        {debtWarningModal && (
            <DebtWarningModal
                onClose={() => setDebtWarningModal(false)}
            />
        )}


        {/* Sponsorship Offer Modal */}
        {sponsorshipOfferModal && myTeam && (
            <SponsorshipOfferModal
                team={myTeam}
                offers={sponsorshipOfferModal.offers}
                currentWeek={currentWeek}
                currentSeason={seasonYear}
                onAccept={(offer) => {
                    const updatedTeams = teams.map(t => {
                        if (t.id === myTeam.id) {
                            const existingSponsorship = t.sponsorships?.[sponsorshipOfferModal.type];
                            
                            // Calculate termination fee if needed
                            let terminationFee = 0;
                            if (existingSponsorship && existingSponsorship.endWeek && currentWeek < existingSponsorship.endWeek) {
                                const weeksRemaining = existingSponsorship.endWeek - currentWeek;
                                terminationFee = Math.floor((weeksRemaining / 38) * existingSponsorship.annualPayment);
                                
                                if (t.budget < terminationFee) {
                                    setNotification({
                                        message: translateNotificationLocal(`Insufficient budget to terminate current sponsor contract.`, `Mevcut sponsorluk sözleşmesini feshetmek için bütçe yetersiz.`),
                                        type: 'error'
                                    });
                                    return t;
                                }
                                
                                t.budget -= terminationFee;
                                t.financials.expenses.facilities += terminationFee;
                                
                                // Remove old sponsor income
                                const oldIncome = existingSponsorship.annualPayment;
                                t.financials.income.sponsors = Math.max(0, (t.financials.income.sponsors || 0) - oldIncome);
                            }
                            
                            // Initialize sponsorships object if needed
                            if (!t.sponsorships) {
                                t.sponsorships = {};
                            }
                            
                            // Calculate contract end
                            const contractWeeks = offer.contractDuration * 38;
                            const endWeek = currentWeek + contractWeeks;
                            const currentSeasonParts = seasonYear.split('/');
                            const startYear = parseInt(currentSeasonParts[0]);
                            const endYear = startYear + offer.contractDuration;
                            const endSeason = `${endYear}/${endYear + 1}`;
                            
                            // Add new sponsorship
                            t.sponsorships[sponsorshipOfferModal.type] = {
                                id: offer.id,
                                type: sponsorshipOfferModal.type,
                                category: selectedSponsorshipCategory!,
                                sponsorName: offer.sponsorCompany.split(' ')[0],
                                sponsorCompany: offer.sponsorCompany,
                                annualPayment: offer.annualPayment,
                                contractDuration: offer.contractDuration,
                                signedWeek: currentWeek,
                                startSeason: seasonYear,
                                endWeek: endWeek,
                                endSeason: endSeason,
                            };
                            
                            // Add new sponsor income
                            t.financials.income.sponsors = (t.financials.income.sponsors || 0) + offer.annualPayment;
                            
                            setNotification({
                                message: translateNotificationLocal(`Sponsorship deal signed! ${offer.sponsorCompany}`, `Sponsorluk anlaşması imzalandı! ${offer.sponsorCompany}`),
                                type: 'success'
                            });
                        }
                        return t;
                    });
                    
                    setTeams(updatedTeams);
                    setSponsorshipOfferModal(null);
                    
                    // Remove pending offers after acceptance
                    setTeams(prevTeams => prevTeams.map(t => {
                        if (t.id === myTeam.id && t.pendingSponsorshipOffers?.[sponsorshipOfferModal.type]) {
                            const newPendingOffers = { ...t.pendingSponsorshipOffers };
                            delete newPendingOffers[sponsorshipOfferModal.type];
                            return {
                                ...t,
                                pendingSponsorshipOffers: newPendingOffers
                            };
                        }
                        return t;
                    }));
                }}
                onClose={() => {
                    setSponsorshipOfferModal(null);
                }}
            />
        )}

        {/* Stadium Sponsor Offer Modal */}
        {stadiumSponsorModal && (
            <StadiumSponsorModal
                team={stadiumSponsorModal.team}
                offer={stadiumSponsorModal.offer}
                currentWeek={currentWeek}
                onAccept={() => {
                    const updatedTeams = teams.map(t => {
                        if (t.id === stadiumSponsorModal.team.id) {
                            const oldSponsor = t.stadiumNameSponsor;
                            const oldSponsorIncome = oldSponsor?.annualPayment || 0;
                            const newSponsorIncome = stadiumSponsorModal.offer.annualPayment;
                            
                            // Calculate termination fee if old sponsor exists and contract hasn't expired
                            let terminationFee = 0;
                            if (oldSponsor && oldSponsor.endWeek && currentWeek < oldSponsor.endWeek) {
                                const weeksRemaining = oldSponsor.endWeek - currentWeek;
                                // Calculate remaining contract value (proportional to years)
                                terminationFee = Math.floor((weeksRemaining / 38) * oldSponsor.annualPayment);
                                
                                // Check if team can afford termination fee
                                if (t.budget < terminationFee) {
                                    setNotification({
                                        message: translateNotificationLocal(
                                          `Insufficient budget to terminate current sponsor contract. You need ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(terminationFee)}`,
                                          `Mevcut sponsorluk sözleşmesini feshetmek için bütçe yetersiz. İhtiyacınız olan tutar: ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(terminationFee)}`
                                        ),
                                        type: 'error'
                                    });
                                    return t; // Don't update if can't afford
                                }
                                
                                // Deduct termination fee
                                t.budget -= terminationFee;
                                t.financials.expenses.facilities += terminationFee;
                            }
                            
                            // Calculate end week and end season for new sponsor
                            const contractWeeks = stadiumSponsorModal.offer.contractDuration * 38; // 38 weeks per season
                            const endWeek = currentWeek + contractWeeks;
                            
                            // Calculate end season (simplified: just add years)
                            const currentSeasonParts = seasonYear.split('/');
                            const startYear = parseInt(currentSeasonParts[0]);
                            const endYear = startYear + stadiumSponsorModal.offer.contractDuration;
                            const endSeason = `${endYear}/${endYear + 1}`;
                            
                            // Update sponsor
                            t.stadiumNameSponsor = {
                                sponsorName: stadiumSponsorModal.offer.sponsorName,
                                annualPayment: stadiumSponsorModal.offer.annualPayment,
                                contractDuration: stadiumSponsorModal.offer.contractDuration,
                                signedWeek: currentWeek,
                                startSeason: seasonYear,
                                endWeek: endWeek,
                                endSeason: endSeason
                            };
                            
                            // Update financial income
                            t.financials.income.sponsors = (t.financials.income.sponsors || 0) - oldSponsorIncome + newSponsorIncome;
                            
                            // Clear pending offer
                            t.pendingStadiumSponsorOffer = undefined;
                            
                            // Show notification
                            const message = terminationFee > 0 
                                ? `Stadium naming rights deal signed! ${stadiumSponsorModal.offer.sponsorName} Stadium - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stadiumSponsorModal.offer.annualPayment)}/year. Termination fee paid: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(terminationFee)}`
                                : `Stadium naming rights deal signed! ${stadiumSponsorModal.offer.sponsorName} Stadium - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stadiumSponsorModal.offer.annualPayment)}/year`;
                            
                            setNotification({
                                message: message,
                                type: 'success'
                            });
                        }
                        return t;
                    });
                    
                    setTeams(updatedTeams);
                    setStadiumSponsorModal(null);
                }}
                onReject={() => {
                    const updatedTeams = teams.map(t => {
                        if (t.id === stadiumSponsorModal.team.id) {
                            t.pendingStadiumSponsorOffer = undefined;
                        }
                        return t;
                    });
                    
                    setTeams(updatedTeams);
                    setStadiumSponsorModal(null);
                }}
            />
        )}

        {/* Game Over Modal */}
        {gameOverModal && (
            <GameOverModal
                onBackToCareerSelect={() => {
                                setGameOverModal(false);
                                setGameState(GameState.CAREER_SELECT);
                                setCareerSlot(null);
                                localStorage.removeItem('activeCareerSlot');
                            }}
            />
        )}
    </div>
  );
};


export default App;