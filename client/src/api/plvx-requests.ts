/**
 * PLVX Premier League API Requests
 *
 * Client-side utilities for fetching data from the PLVX backend API.
 * All data comes from events emitted by the smart contract and stored in the database.
 */

const API_URL = config.plvx_api_url;

// ==================== TYPES ====================

export interface Season {
  season_id: number;
  start_time: string;
  current_turn: number;
  is_active: boolean;
  winner_team_id?: number;
  total_pool: string;
  season_winner_pool: string;
}

export interface Match {
  match_id: number;
  season_id: number;
  turn_number: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  result?: 'HomeWin' | 'Draw' | 'AwayWin';
  start_time: string;
  is_finished: boolean;
}

export interface Bet {
  bet_id: string;
  user: string;
  match_id: number;
  predicted_result: 'HomeWin' | 'Draw' | 'AwayWin';
  amount: string;
  odds: string;
  is_settled: boolean;
  is_won: boolean;
  payout: string;
}

export interface Badge {
  token_id: string;
  team_id: number;
  owner: string;
  betting_bonus: number;
}

export interface Keeper {
  address: string;
  added_at: string;
}

export interface TeamStats {
  team_id: number;
  season_id: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

interface ApiResponse<T> {
  data: T;
}

interface ApiListResponse<T> {
  data: T[];
  total?: number;
}

// ==================== SEASON ENDPOINTS ====================

/**
 * Get all seasons
 */
export const getSeasons = async (): Promise<Season[]> => {
  const res = await fetch(`${API_URL}/premier/seasons`);
  if (!res.ok) {
    throw new Error(`Failed to fetch seasons: ${res.statusText}`);
  }
  const json: ApiListResponse<Season> = await res.json();
  return json.data;
};

/**
 * Get a specific season by ID
 */
export const getSeason = async (seasonId: number): Promise<Season> => {
  const res = await fetch(`${API_URL}/premier/seasons/${seasonId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch season ${seasonId}: ${res.statusText}`);
  }
  const json: ApiResponse<Season> = await res.json();
  return json.data;
};

/**
 * Get the current active season
 */
export const getCurrentSeason = async (): Promise<Season | null> => {
  const seasons = await getSeasons();
  return seasons.find((s) => s.is_active) || null;
};

// ==================== MATCH ENDPOINTS ====================

/**
 * Get matches with optional filters
 */
export const getMatches = async (params?: {
  seasonId?: number;
  turnNumber?: number;
}): Promise<Match[]> => {
  const queryParams = new URLSearchParams();
  if (params?.seasonId) queryParams.set('seasonId', params.seasonId.toString());
  if (params?.turnNumber) queryParams.set('turnNumber', params.turnNumber.toString());

  const url = `${API_URL}/premier/matches${queryParams.toString() ? `?${queryParams}` : ''}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch matches: ${res.statusText}`);
  }

  const json: ApiListResponse<Match> = await res.json();
  return json.data;
};

/**
 * Get a specific match by ID
 */
export const getMatch = async (matchId: number): Promise<Match> => {
  const res = await fetch(`${API_URL}/premier/matches/${matchId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch match ${matchId}: ${res.statusText}`);
  }
  const json: ApiResponse<Match> = await res.json();
  return json.data;
};

/**
 * Get matches for the current turn of a season
 */
export const getCurrentTurnMatches = async (seasonId: number): Promise<Match[]> => {
  const season = await getSeason(seasonId);
  return getMatches({ seasonId, turnNumber: season.current_turn });
};

/**
 * Get upcoming matches (not finished)
 */
export const getUpcomingMatches = async (seasonId?: number): Promise<Match[]> => {
  const matches = await getMatches(seasonId ? { seasonId } : undefined);
  return matches.filter((m) => !m.is_finished);
};

/**
 * Get finished matches
 */
export const getFinishedMatches = async (seasonId?: number): Promise<Match[]> => {
  const matches = await getMatches(seasonId ? { seasonId } : undefined);
  return matches.filter((m) => m.is_finished);
};

// ==================== BET ENDPOINTS ====================

/**
 * Get bets for a specific match
 */
export const getMatchBets = async (matchId: number): Promise<Bet[]> => {
  const res = await fetch(`${API_URL}/premier/matches/${matchId}/bets`);
  if (!res.ok) {
    throw new Error(`Failed to fetch bets for match ${matchId}: ${res.statusText}`);
  }
  const json: ApiListResponse<Bet> = await res.json();
  return json.data;
};

/**
 * Get a specific bet by ID
 */
export const getBet = async (betId: string): Promise<Bet> => {
  const res = await fetch(`${API_URL}/premier/bets/${betId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch bet ${betId}: ${res.statusText}`);
  }
  const json: ApiResponse<Bet> = await res.json();
  return json.data;
};

/**
 * Get user's bets (requires filtering on client side or new endpoint)
 */
export const getUserBets = async (userAddress: string, matchId?: number): Promise<Bet[]> => {
  // If matchId is provided, fetch bets for that match and filter
  if (matchId) {
    const bets = await getMatchBets(matchId);
    return bets.filter((bet) => bet.user.toLowerCase() === userAddress.toLowerCase());
  }

  // TODO: Add a dedicated endpoint for user bets in the backend
  // For now, this is a placeholder
  throw new Error('Getting all user bets requires a dedicated backend endpoint');
};

// ==================== BADGE ENDPOINTS ====================

/**
 * Get a specific badge by token ID
 */
export const getBadge = async (tokenId: string): Promise<Badge> => {
  const res = await fetch(`${API_URL}/premier/badges/${tokenId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch badge ${tokenId}: ${res.statusText}`);
  }
  const json: ApiResponse<Badge> = await res.json();
  return json.data;
};

// ==================== KEEPER ENDPOINTS ====================

/**
 * Get all keepers
 */
export const getKeepers = async (): Promise<Keeper[]> => {
  const res = await fetch(`${API_URL}/premier/keepers`);
  if (!res.ok) {
    throw new Error(`Failed to fetch keepers: ${res.statusText}`);
  }
  const json: ApiListResponse<Keeper> = await res.json();
  return json.data;
};

// ==================== STATISTICS & ANALYTICS ====================

/**
 * Calculate betting pool distribution for a match
 */
export const getMatchBettingPool = async (matchId: number) => {
  const bets = await getMatchBets(matchId);

  const pool = {
    homeWin: 0,
    draw: 0,
    awayWin: 0,
    total: 0,
  };

  bets.forEach((bet) => {
    const amount = parseInt(bet.amount, 10);
    pool.total += amount;

    switch (bet.predicted_result) {
      case 'HomeWin':
        pool.homeWin += amount;
        break;
      case 'Draw':
        pool.draw += amount;
        break;
      case 'AwayWin':
        pool.awayWin += amount;
        break;
    }
  });

  return pool;
};

/**
 * Calculate dynamic odds for a match outcome
 */
export const calculateOdds = async (matchId: number, predictedResult: 'HomeWin' | 'Draw' | 'AwayWin'): Promise<number> => {
  const pool = await getMatchBettingPool(matchId);

  if (pool.total === 0) {
    return 2.0; // Default odds
  }

  const resultAmount = {
    HomeWin: pool.homeWin,
    Draw: pool.draw,
    AwayWin: pool.awayWin,
  }[predictedResult];

  if (resultAmount === 0) {
    return 5.0; // High odds for first bet
  }

  // Odds formula: total_pool / result_amount
  const rawOdds = pool.total / resultAmount;

  // Clamp between min (1.1) and max (50)
  return Math.max(1.1, Math.min(50, rawOdds));
};

/**
 * Get team statistics for a season
 */
export const getTeamStats = async (seasonId: number, teamId: number): Promise<TeamStats | null> => {
  // This would require a dedicated endpoint
  // Placeholder for now
  throw new Error('Team stats endpoint not yet implemented');
};

/**
 * Get league table (standings) for a season
 */
export const getLeagueTable = async (seasonId: number): Promise<TeamStats[]> => {
  // This would require a dedicated endpoint
  // Placeholder for now
  throw new Error('League table endpoint not yet implemented');
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if betting is still open for a match
 */
export const isBettingOpen = (match: Match): boolean => {
  if (match.is_finished) return false;

  const startTime = new Date(match.start_time).getTime();
  const now = Date.now();

  return now < startTime;
};

/**
 * Get time remaining until match starts
 */
export const getTimeUntilMatch = (match: Match): number => {
  const startTime = new Date(match.start_time).getTime();
  const now = Date.now();

  return Math.max(0, startTime - now);
};

/**
 * Format time remaining as human-readable string
 */
export const formatTimeRemaining = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Convert motes to CSPR for display
 */
export const formatCsprAmount = (motes: string): string => {
  const cspr = parseInt(motes, 10) / 1_000_000_000;
  return cspr.toFixed(2);
};

/**
 * Get match result as emoji
 */
export const getMatchResultEmoji = (result: string): string => {
  switch (result) {
    case 'HomeWin':
      return '🏠';
    case 'Draw':
      return '🤝';
    case 'AwayWin':
      return '✈️';
    default:
      return '❓';
  }
};
