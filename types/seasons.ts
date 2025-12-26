export interface SeasonSummary {
  rank: number;
  prizeMoney: number;
  teamName: string;
  seasonYear: string;
  champion: {
    teamName: string;
    prizeMoney: number;
    points: number;
  };
  topScorer: {
    playerName: string;
    teamName: string;
    goals: number;
  };
  topAssister: {
    playerName: string;
    teamName: string;
    assists: number;
  };
  longestUnbeatenStreak: {
    teamName: string;
    matches: number;
  };
  longestWinStreak: {
    teamName: string;
    matches: number;
  };
  seasonPlayer: {
    playerName: string;
    playerId: string;
    teamName: string;
    teamId: string;
    goals: number;
    assists: number;
    total: number;
    mvpCount: number;
    avgRating: number;
    tackles: number;
    interceptions: number;
    saves: number;
    shots: number;
    passes: number;
    passAccuracy: number;
    matches: number;
  };
  seasonGoalkeeper: {
    playerName: string;
    teamName: string;
    goalsConceded: number;
  };
}

