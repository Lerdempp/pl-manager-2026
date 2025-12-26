
export enum Position {
  GK = 'GK',
  LB = 'LB',
  CB = 'CB',
  RB = 'RB',
  LWB = 'LWB',
  RWB = 'RWB',
  CDM = 'CDM',
  CM = 'CM',
  CAM = 'CAM',
  LM = 'LM',
  RM = 'RM',
  LW = 'LW',
  RW = 'RW',
  CF = 'CF',
  ST = 'ST'
}

export interface Tactics {
    formation: string;
    mentality: 'Attacking' | 'Balanced' | 'Defensive';
}

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface Contract {
    wage: number;          // Weekly wage
    yearsLeft: number;     // Years remaining on contract
    signingBonus?: number; // One-time fee (for transfer logic, mainly)
    performanceBonus: number; // Goal bonus (FWD/MID) or Clean Sheet bonus (DEF/GK)
    releaseClause?: number; // Release clause amount (optional, negotiated)
}

export interface Injury {
  type: string; // e.g., "Hamstring Strain", "Knee Injury", "Ankle Sprain"
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';
  weeksOut: number; // Number of weeks the player will be unavailable
  description: string; // Detailed description of the injury
}

export interface Illness {
  type: string; // e.g., "Flu", "Food Poisoning", "Viral Infection"
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  weeksOut: number; // Number of weeks the player will be unavailable
  description: string; // Detailed description of the illness
}

export interface MatchPerformance {
  playerId: string; // Player ID for easy matching
  fixtureId: string;
  week: number;
  opponentTeamId: string;
  opponentTeamName: string;
  isHome: boolean;
  result: 'WIN' | 'DRAW' | 'LOSS';
  teamScore: number;
  opponentScore: number;
  rating: number; // Match rating (1-10)
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number; // Percentage
  tackles?: number; // For defenders/midfielders
  interceptions?: number; // For defenders
  saves?: number; // For goalkeepers
  yellowCards: number;
  redCard: boolean;
  minutesPlayed: number; // Usually 90, but can be less if substituted or sent off
  manOfTheMatch: boolean;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  rating: number; // Current Ability (1-100)
  potential: number; // Potential Ability (1-100)
  marketValue: number; 
  trueValue: number; 
  scouted: boolean;
  scoutReport?: string;
  pendingScout?: number; // Week number when scout report will be ready
  attributes?: PlayerAttributes;
  contract: Contract;
  suspensionGames?: number; // Number of games suspended (0 = available)
  injury?: Injury; // Current injury (if any)
  illness?: Illness; // Current illness (if any)
  onLoanList?: boolean; // Player is available for loan
  onTransferList?: boolean; // Player is available for transfer
  offers?: TransferOffer[]; // Transfer/loan offers from other teams
  pendingTransfer?: {
    targetTeamId: string;
    targetTeamName: string;
    transferDate: number; // Week number when transfer will complete
    fee: number;
    type: 'TRANSFER' | 'LOAN';
  }; // Pending transfer scheduled for future
  transferListWeekAdded?: number;
  transferListPendingAction?: 'TRANSFER' | 'LOAN';
  matchPerformances?: MatchPerformance[]; // Detailed match-by-match performance data
  retirement?: {
    consideringRetirement: boolean; // Player is considering retirement
    retirementAnnounced: boolean; // Player has announced retirement
    retirementWeek?: number; // Week when player will retire
    persuasionAttempted?: boolean; // Manager tried to persuade player
    persuasionSuccessful?: boolean; // Player was persuaded to continue
  };
  traits?: string[]; // Player traits (e.g., ['gol_makinesi', 'superstar'])
  awards?: {
    type: 'mvp' | 'topScorer' | 'topAssister' | 'seasonGoalkeeper';
    season: string; // Season year (e.g., "2025/2026")
  }[];
  personality?: {
    greed: number; // 0-100, how much player values money (higher = more greedy)
    ambition: number; // 0-100, how much player values success/trophies (higher = more ambitious, willing to take less money for better team)
  };
  isYouthAcademy?: boolean; // True if player came from youth academy (affects market value and selling price)
}

export interface NegotiationHistoryEntry {
  round: number;
  from: 'USER' | 'AI';
  amount: number;
  timestamp: number;
  note?: string;
}

export interface TransferOffer {
  id: string;
  teamId: string;
  teamName: string;
  playerId: string;
  type: 'TRANSFER' | 'LOAN';
  fee: number; // Transfer fee or loan fee
  wage?: number; // Wage offer (for transfers)
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'NEGOTIATING';
  createdAt: number; // Timestamp
  expiryWeek?: number; // Week when offer expires if not responded (2 weeks from creation)
  negotiationRound?: number; // Current negotiation round (0-3, 0 = initial offer, 1-3 = counter offers)
  lastCounterOffer?: number; // Last counter offer made by user
  originalFee?: number; // Original fee from first offer
  waitingForResponse?: boolean; // True when waiting for AI team's response to counter offer
  negotiationHistory?: NegotiationHistoryEntry[]; // Record of previous offers/counter offers
}

export interface MailItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
  week?: number;
  source?: string;
  relatedPlayerId?: string;
  read: boolean;
}

export interface NotificationPayload {
  message: string;
  type: 'success' | 'error' | 'info';
  source?: string;
  relatedPlayerId?: string;
}

export interface TeamFinancials {
    income: {
        transfers: number;
        tickets: number;
        sponsors: number;
        prizeMoney: number;
    };
    expenses: {
        transfers: number;
        wages: number;
        facilities: number;
    };
}

export interface Team {
  id: string;
  name: string;
  league: string;
  budget: number;
  players: Player[]; 
  
  tactics: Tactics;
  financials: TeamFinancials;

  // For CPU Teams
  baseRating: number; 
  starPlayerNames: string[]; 
  color?: string; // CSS Gradient string
  manager?: string; // Manager/Head Coach name
  captainId?: string; // ID of the team captain
  
  // League Stats
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; 
  ga: number;
  points: number;
  
  // Fan & Stadium System
  fanCount: number; // Number of fans
  stadiumCapacity: number; // Stadium capacity
  ticketPrice: number; // Current ticket price
  
  // Premium Pack Tickets (earned from winning trophies)
  premiumTickets?: number; // Number of premium pack tickets
  openedPackPlayers?: string[]; // Names of players that have been opened from packs (to prevent duplicates)
  shirtPrice: number; // Shirt price
  clubReputation: number; // Club reputation (1-100)
  baseTicketPrice: number; // Base ticket price for league level
  baseShirtPrice?: number; // Base shirt price (initial shirt price)
  fanMorale: number; // Fan morale (0-100, starts at 50)
  isBigSix?: boolean; // Whether team is in Big 6
  stadiumExpansionCount?: number; // Number of expansions completed
  pendingStadiumExpansion?: {
    startWeek: number; // Week when expansion started
    completionWeek: number; // Week when expansion will complete
    newCapacity: number; // New capacity after expansion
    cost: number; // Cost of expansion
  };
  stadiumNameSponsor?: {
    sponsorName: string; // Name of the sponsor company
    annualPayment: number; // Annual payment amount
    contractDuration: number; // Contract duration in years
    signedWeek: number; // Week when contract was signed
    startSeason: string; // Season when contract started (e.g., "2025/2026")
    endSeason: string; // Season when contract ends (e.g., "2027/2028")
    endWeek: number; // Week when contract ends (calculated from signedWeek + contractDuration * 38 weeks)
  };
  pendingStadiumSponsorOffer?: StadiumSponsorOffer; // Pending sponsor offer
  sponsorships?: {
    [key: string]: SponsorshipContract; // Key is sponsorship type (e.g., 'jersey', 'matchday', 'digital')
  };
  pendingSponsorshipOffers?: {
    [key: string]: PendingSponsorshipOffers; // Key is sponsorship type
  };
}

export type SponsorshipCategory = 'stadium' | 'jersey' | 'matchday' | 'digital';
export type SponsorshipType = 
  | 'naming_rights' 
  | 'vip_skybox' 
  | 'led_boards' 
  | 'stadium_tech'
  | 'jersey_front'
  | 'jersey_back'
  | 'jersey_sleeve'
  | 'training_kit'
  | 'matchday_presentation'
  | 'official_drink'
  | 'official_merchandise'
  | 'matchday_broadcast'
  | 'social_media'
  | 'app_partnership'
  | 'esports'
  | 'streaming_platform';

export interface SponsorshipContract {
  id: string;
  type: SponsorshipType;
  category: SponsorshipCategory;
  sponsorName: string;
  sponsorCompany: string;
  annualPayment: number;
  contractDuration: number; // years
  signedWeek: number;
  startSeason: string;
  endWeek: number;
  endSeason: string;
}

export interface SponsorshipOffer {
  id: string;
  type: SponsorshipType;
  category: SponsorshipCategory;
  sponsorCompany: string;
  annualPayment: number;
  contractDuration: number; // years
  offerWeek: number;
  expiryWeek: number;
  tier: number; // Based on team reputation/stadium capacity
}

export interface PendingSponsorshipOffers {
  type: SponsorshipType;
  category: SponsorshipCategory;
  offers: SponsorshipOffer[];
  lastOfferWeek: number; // Last week when offers were generated
}

export interface StadiumSponsorOffer {
  id: string;
  sponsorName: string;
  sponsorCompany: string; // Company name
  annualPayment: number; // Annual payment amount
  contractDuration: number; // Contract duration in years
  offerWeek: number; // Week when offer was made
  expiryWeek: number; // Week when offer expires (typically 4 weeks from offer)
  tier: number; // Sponsor tier (1-6, based on stadium capacity)
}

export interface ManagerOffer {
  id: string;
  teamId: string;
  teamName: string;
  teamRating: number; // Base team rating
  teamBudget: number;
  offerReason: string; // Why they're interested (e.g., "Championship Winner", "Top 3 Finish")
  prestige: 'LOW' | 'MEDIUM' | 'HIGH' | 'ELITE'; // Team prestige level
}

export interface MatchEvent {
    minute: number;
    type: 'WHISTLE' | 'GOAL' | 'SAVE' | 'MISS' | 'CARD' | 'POST' | 'FOUL' | 'PENALTY' | 'VAR' | 'CORNER' | 'INJURY' | 'SUBSTITUTION';
    description: string;
    isImportant: boolean;
    teamName?: string;
}

export interface Referee {
  name: string;
}

export interface Fixture {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeScore: number;
  awayScore: number;
  scorers: { name: string; minute: number; teamId: string; assist?: string }[];
  events?: MatchEvent[];
  homeStartingXI?: string[]; // Player IDs who played for home team
  awayStartingXI?: string[]; // Player IDs who played for away team
  cards?: { playerId: string; teamId: string; type: 'YELLOW' | 'RED'; minute: number }[]; // Cards given in this match
  manOfTheMatch?: { playerId: string; teamId: string }; // Man of the Match
  referee?: Referee; // Match referee
  matchPerformances?: MatchPerformance[]; // Detailed performance data for all players in this match
}

export interface MatchStats {
    homeScore: number;
    awayScore: number;
    possession: number;
    shotsHome: number;
    shotsAway: number;
    onTargetHome: number;
    onTargetAway: number;
}

export enum GameState {
  CAREER_SELECT = 'CAREER_SELECT',
  START_SCREEN = 'START_SCREEN',
  TEAM_SELECTION = 'TEAM_SELECTION',
  TRANSFER_WINDOW = 'TRANSFER_WINDOW',
  SEASON_ONGOING = 'SEASON_ONGOING',
  SEASON_FINISHED = 'SEASON_FINISHED'
}

export enum SponsorshipCategory {
  STADIUM = 'stadium',
  JERSEY = 'jersey',
  MATCHDAY = 'matchday',
  DIGITAL = 'digital'
}

export interface ManagerAchievement {
  type: 'championship' | 'runnerUp' | 'thirdPlace' | 'topFour' | 'relegationAvoided' | 'topScorerPlayer' | 'mvpPlayer' | 'topAssisterPlayer' | 'seasonGoalkeeperPlayer' | 'unbeatenStreak' | 'winStreak' | 'financialSuccess' | 'stadiumExpansion';
  season: string; // Season year (e.g., "2025/2026")
  teamName: string;
  value?: number; // Optional value (e.g., points, streak length, etc.)
  description: string;
}

export interface ManagerCareerSeason {
  season: string; // Season year (e.g., "2025/2026")
  teamName: string;
  teamId: string;
  leaguePosition: number; // Final league position (rank)
  trophies: string[]; // Trophy types won (e.g., ['premier_league', 'fa_cup'])
}

export enum ViewState {
  MAIN_MENU = 'MAIN_MENU',
  DASHBOARD = 'DASHBOARD',
  MARKET = 'MARKET',
  LEAGUE = 'LEAGUE',
  FAVORITES = 'FAVORITES',
  FORMATION_VIEW = 'FORMATION_VIEW',
  FINANCIAL_TABLE = 'FINANCIAL_TABLE',
  SPONSORSHIPS = 'SPONSORSHIPS',
  SPONSORSHIP_CATEGORY = 'SPONSORSHIP_CATEGORY',
  KULUP_YONETIMI = 'KULUP_YONETIMI',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  SHOP = 'SHOP',
  MAILBOX = 'MAILBOX'
}
