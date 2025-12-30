/**
 * PLVX Premier League Frontend Integration
 *
 * This file provides TypeScript utilities for integrating with the
 * PremierLeagueImproved smart contract.
 */

import { CLPublicKey, CLValueBuilder, RuntimeArgs, decodeBase16 } from 'casper-js-sdk';

// ==================== TYPE DEFINITIONS ====================

export enum MatchResult {
  HomeWin = 'HomeWin',
  Draw = 'Draw',
  AwayWin = 'AwayWin',
}

export interface Match {
  match_id: number;
  season_id: number;
  turn_number: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  result: MatchResult | null;
  start_time: number;
  is_finished: boolean;
}

export interface Season {
  season_id: number;
  start_time: number;
  current_turn: number;
  is_active: boolean;
  winner_team_id: number | null;
  total_pool: string; // BigInt as string
  season_winner_pool: string; // BigInt as string
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

export interface Bet {
  bet_id: string; // BigInt as string
  user: string; // Address
  bet_type: 'MatchWinner' | 'SeasonWinner';
  predicted_result: MatchResult;
  amount: string; // BigInt as string
  odds: string; // BigInt as string (multiply by 1000)
  is_settled: boolean;
  is_won: boolean;
  payout: string; // BigInt as string
}

export interface BettingPool {
  home_win_amount: string;
  draw_amount: string;
  away_win_amount: string;
  total_amount: string;
}

export interface TeamBadge {
  token_id: string;
  team_id: number;
  owner: string;
  betting_bonus: number; // basis points
}

// ==================== CONTRACT CALL BUILDERS ====================

export class PLVXContractCalls {
  private contractHash: string;

  constructor(contractHash: string) {
    this.contractHash = contractHash;
  }

  /**
   * Place a bet on a match
   */
  placeBet(matchId: number, predictedResult: MatchResult, amount: string): RuntimeArgs {
    return RuntimeArgs.fromMap({
      match_id: CLValueBuilder.u32(matchId),
      predicted_result: this.buildMatchResultCLValue(predictedResult),
      amount: CLValueBuilder.u256(amount),
    });
  }

  /**
   * Settle a bet
   */
  settleBet(betId: string): RuntimeArgs {
    return RuntimeArgs.fromMap({
      bet_id: CLValueBuilder.u256(betId),
    });
  }

  /**
   * Predict season winner
   */
  predictSeasonWinner(seasonId: number, teamId: number): RuntimeArgs {
    return RuntimeArgs.fromMap({
      season_id: CLValueBuilder.u32(seasonId),
      team_id: CLValueBuilder.u8(teamId),
    });
  }

  /**
   * Claim season prize
   */
  claimSeasonPrize(seasonId: number): RuntimeArgs {
    return RuntimeArgs.fromMap({
      season_id: CLValueBuilder.u32(seasonId),
    });
  }

  /**
   * Mint a team badge NFT
   */
  mintBadge(teamId: number): RuntimeArgs {
    return RuntimeArgs.fromMap({
      team_id: CLValueBuilder.u8(teamId),
    });
  }

  /**
   * List badge for sale
   */
  listBadge(tokenId: string, price: string): RuntimeArgs {
    return RuntimeArgs.fromMap({
      token_id: CLValueBuilder.u256(tokenId),
      price: CLValueBuilder.u256(price),
    });
  }

  /**
   * Buy a listed badge
   */
  buyBadge(tokenId: string): RuntimeArgs {
    return RuntimeArgs.fromMap({
      token_id: CLValueBuilder.u256(tokenId),
    });
  }

  /**
   * Simulate a match (keeper/owner only)
   */
  simulateMatch(matchId: number): RuntimeArgs {
    return RuntimeArgs.fromMap({
      match_id: CLValueBuilder.u32(matchId),
    });
  }

  /**
   * Add a keeper (owner only)
   */
  addKeeper(keeperAddress: string): RuntimeArgs {
    return RuntimeArgs.fromMap({
      keeper: CLValueBuilder.key(CLPublicKey.fromHex(keeperAddress)),
    });
  }

  /**
   * Remove a keeper (owner only)
   */
  removeKeeper(keeperAddress: string): RuntimeArgs {
    return RuntimeArgs.fromMap({
      keeper: CLValueBuilder.key(CLPublicKey.fromHex(keeperAddress)),
    });
  }

  /**
   * Start a new season (owner only)
   */
  startSeason(): RuntimeArgs {
    return RuntimeArgs.fromMap({});
  }

  /**
   * End a season (owner only)
   */
  endSeason(seasonId: number): RuntimeArgs {
    return RuntimeArgs.fromMap({
      season_id: CLValueBuilder.u32(seasonId),
    });
  }

  private buildMatchResultCLValue(result: MatchResult) {
    // Build enum variant for MatchResult
    const variantIndex = result === MatchResult.HomeWin ? 0 :
                        result === MatchResult.Draw ? 1 : 2;
    return CLValueBuilder.u8(variantIndex);
  }
}

// ==================== API CLIENT ====================

export class PLVXApiClient {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get current season
   */
  async getCurrentSeason(): Promise<Season | null> {
    const response = await fetch(`${this.apiBaseUrl}/season/current`);
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Get season by ID
   */
  async getSeason(seasonId: number): Promise<Season | null> {
    const response = await fetch(`${this.apiBaseUrl}/season/${seasonId}`);
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Get match by ID
   */
  async getMatch(matchId: number): Promise<Match | null> {
    const response = await fetch(`${this.apiBaseUrl}/match/${matchId}`);
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Get matches for a turn
   */
  async getTurnMatches(seasonId: number, turnNumber: number): Promise<Match[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/season/${seasonId}/turn/${turnNumber}/matches`
    );
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Get live matches (not finished, started)
   */
  async getLiveMatches(): Promise<Match[]> {
    const response = await fetch(`${this.apiBaseUrl}/matches/live`);
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Get upcoming matches (not started)
   */
  async getUpcomingMatches(): Promise<Match[]> {
    const response = await fetch(`${this.apiBaseUrl}/matches/upcoming`);
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Get team stats for a season
   */
  async getTeamStats(seasonId: number, teamId: number): Promise<TeamStats | null> {
    const response = await fetch(
      `${this.apiBaseUrl}/season/${seasonId}/team/${teamId}/stats`
    );
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Get league table for a season
   */
  async getLeagueTable(seasonId: number): Promise<TeamStats[]> {
    const response = await fetch(`${this.apiBaseUrl}/season/${seasonId}/table`);
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Get user bets
   */
  async getUserBets(userAddress: string): Promise<Bet[]> {
    const response = await fetch(`${this.apiBaseUrl}/user/${userAddress}/bets`);
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Get bet by ID
   */
  async getBet(betId: string): Promise<Bet | null> {
    const response = await fetch(`${this.apiBaseUrl}/bet/${betId}`);
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Get current odds for a match outcome
   */
  async getCurrentOdds(matchId: number, result: MatchResult): Promise<string> {
    const response = await fetch(
      `${this.apiBaseUrl}/match/${matchId}/odds/${result}`
    );
    if (!response.ok) return '2000'; // Default 2.0x
    const data = await response.json();
    return data.odds;
  }

  /**
   * Get betting pool for a match
   */
  async getBettingPool(matchId: number): Promise<BettingPool | null> {
    const response = await fetch(`${this.apiBaseUrl}/match/${matchId}/pool`);
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Get user badges
   */
  async getUserBadges(userAddress: string): Promise<TeamBadge[]> {
    const response = await fetch(`${this.apiBaseUrl}/user/${userAddress}/badges`);
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Get badge by token ID
   */
  async getBadge(tokenId: string): Promise<TeamBadge | null> {
    const response = await fetch(`${this.apiBaseUrl}/badge/${tokenId}`);
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Get listed badges (marketplace)
   */
  async getListedBadges(): Promise<TeamBadge[]> {
    const response = await fetch(`${this.apiBaseUrl}/marketplace/badges`);
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Check if user has claimed season prize
   */
  async hasClaimedSeasonPrize(seasonId: number, userAddress: string): Promise<boolean> {
    const response = await fetch(
      `${this.apiBaseUrl}/season/${seasonId}/user/${userAddress}/claimed`
    );
    if (!response.ok) return false;
    const data = await response.json();
    return data.claimed;
  }
}

// ==================== UTILITY FUNCTIONS ====================

export class PLVXUtils {
  /**
   * Format odds for display (e.g., 2000 -> "2.00x")
   */
  static formatOdds(odds: string): string {
    const oddsNum = parseInt(odds);
    return (oddsNum / 1000).toFixed(2) + 'x';
  }

  /**
   * Calculate potential payout
   */
  static calculatePayout(amount: string, odds: string): string {
    const amountBigInt = BigInt(amount);
    const oddsBigInt = BigInt(odds);
    const payout = (amountBigInt * oddsBigInt) / BigInt(1000);
    return payout.toString();
  }

  /**
   * Format tokens with decimals (assuming 18 decimals)
   */
  static formatTokens(amount: string, decimals: number = 18): string {
    const amountBigInt = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = amountBigInt / divisor;
    const fraction = amountBigInt % divisor;
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 2);
    return `${whole}.${fractionStr}`;
  }

  /**
   * Parse token input to base units
   */
  static parseTokens(amount: string, decimals: number = 18): string {
    const parts = amount.split('.');
    const whole = parts[0] || '0';
    const fraction = (parts[1] || '0').padEnd(decimals, '0').slice(0, decimals);
    return (BigInt(whole) * BigInt(10 ** decimals) + BigInt(fraction)).toString();
  }

  /**
   * Get match status
   */
  static getMatchStatus(match: Match, currentTime: number): 'upcoming' | 'live' | 'finished' {
    if (match.is_finished) return 'finished';
    if (currentTime >= match.start_time) return 'live';
    return 'upcoming';
  }

  /**
   * Calculate time until match starts (in seconds)
   */
  static getTimeUntilMatch(match: Match, currentTime: number): number {
    return Math.max(0, match.start_time - currentTime);
  }

  /**
   * Format time remaining (e.g., "5m 30s" or "2h 15m")
   */
  static formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Get team name by ID (Premier League teams)
   */
  static getTeamName(teamId: number): string {
    const teams = [
      '', // Index 0 unused
      'Arsenal',
      'Aston Villa',
      'Bournemouth',
      'Brentford',
      'Brighton',
      'Chelsea',
      'Crystal Palace',
      'Everton',
      'Fulham',
      'Liverpool',
      'Luton Town',
      'Manchester City',
      'Manchester United',
      'Newcastle',
      'Nottingham Forest',
      'Sheffield United',
      'Tottenham',
      'West Ham',
      'Wolves',
      'Burnley',
    ];
    return teams[teamId] || `Team ${teamId}`;
  }

  /**
   * Get result display text
   */
  static getResultText(result: MatchResult): string {
    switch (result) {
      case MatchResult.HomeWin:
        return 'Home Win';
      case MatchResult.Draw:
        return 'Draw';
      case MatchResult.AwayWin:
        return 'Away Win';
    }
  }

  /**
   * Calculate win percentage
   */
  static calculateWinPercentage(stats: TeamStats): number {
    const totalMatches = stats.wins + stats.draws + stats.losses;
    if (totalMatches === 0) return 0;
    return (stats.wins / totalMatches) * 100;
  }

  /**
   * Calculate goal difference
   */
  static calculateGoalDifference(stats: TeamStats): number {
    return stats.goals_for - stats.goals_against;
  }
}

// ==================== WEBSOCKET EVENT LISTENER ====================

export interface PLVXEvent {
  type: string;
  data: any;
}

export class PLVXEventListener {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(private wsUrl: string) {}

  /**
   * Connect to WebSocket
   */
  connect(): void {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const message: PLVXEvent = JSON.parse(event.data);
        this.emit(message.type, message.data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Auto-reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  /**
   * Subscribe to an event
   */
  on(eventType: string, handler: (data: any) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, handler: (data: any) => void): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to all handlers
   */
  private emit(eventType: string, data: any): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ==================== EXAMPLE USAGE ====================

/**
 * Example: Initialize PLVX integration
 */
export function initializePLVX(
  contractHash: string,
  apiBaseUrl: string,
  wsUrl: string
) {
  const contractCalls = new PLVXContractCalls(contractHash);
  const apiClient = new PLVXApiClient(apiBaseUrl);
  const eventListener = new PLVXEventListener(wsUrl);

  // Connect to WebSocket
  eventListener.connect();

  // Subscribe to events
  eventListener.on('MatchFinished', (data) => {
    console.log('Match finished:', data);
  });

  eventListener.on('BetPlaced', (data) => {
    console.log('Bet placed:', data);
  });

  eventListener.on('BetSettled', (data) => {
    console.log('Bet settled:', data);
  });

  return {
    contractCalls,
    apiClient,
    eventListener,
    utils: PLVXUtils,
  };
}
