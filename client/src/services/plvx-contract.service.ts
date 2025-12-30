/**
 * PLVX Contract Service
 * Handles all smart contract interactions for Premier League Virtual Betting
 */

import {
  CLPublicKey,
  CLValueBuilder,
  RuntimeArgs,
  DeployUtil,
  CLU256,
} from 'casper-js-sdk';
import { walletService } from './casper-wallet.service';
import { CasperCloudService } from './casper-cloud.service';

export interface MatchResult {
  HomeWin: null;
  Draw: null;
  AwayWin: null;
}

export interface BetType {
  MatchResult: { match_id: number };
  SeasonWinner: { season_id: number };
}

export interface Bet {
  bet_id: string;
  user: string;
  bet_type: BetType;
  predicted_result: MatchResult;
  amount: string;
  odds: string;
  is_settled: boolean;
  is_won: boolean;
  payout: string;
}

export interface Match {
  match_id: number;
  season_id: number;
  turn: number;
  home_team: number;
  away_team: number;
  home_score: number;
  away_score: number;
  is_played: boolean;
  result: MatchResult | null;
}

export interface TeamStats {
  team_id: number;
  name: string;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

export interface BettingPool {
  home_win_amount: string;
  draw_amount: string;
  away_win_amount: string;
  total_amount: string;
}

export interface Season {
  season_id: number;
  is_active: boolean;
  current_turn: number;
  total_turns: number;
  prize_pool: string;
}

export class PLVXContractService {
  private contractHash: string;
  private contractPackageHash: string;
  private cloudService: CasperCloudService;
  private network: 'casper' | 'casper-test';

  constructor(
    contractHash: string,
    contractPackageHash: string,
    cloudService: CasperCloudService,
    network: 'casper' | 'casper-test' = 'casper-test'
  ) {
    this.contractHash = contractHash;
    this.contractPackageHash = contractPackageHash;
    this.cloudService = cloudService;
    this.network = network;
  }

  /**
   * Create a deploy for contract interaction
   */
  private createDeploy(
    entryPoint: string,
    args: RuntimeArgs,
    paymentAmount: string = '5000000000' // 5 CSPR default
  ): any {
    const connection = walletService.getConnection();

    if (!connection.isConnected || !connection.account) {
      throw new Error('Wallet not connected');
    }

    const deployParams = new DeployUtil.DeployParams(
      connection.account.activeKey,
      this.network,
      1, // gas price
      1800000 // ttl: 30 minutes
    );

    const payment = DeployUtil.standardPayment(paymentAmount);

    const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(this.contractHash, 'hex')),
      entryPoint,
      args
    );

    return DeployUtil.makeDeploy(deployParams, session, payment);
  }

  /**
   * Place a bet on a match
   */
  async placeBet(
    matchId: number,
    predictedResult: 'HomeWin' | 'Draw' | 'AwayWin',
    amount: string
  ): Promise<string> {
    const args = RuntimeArgs.fromMap({
      match_id: CLValueBuilder.u32(matchId),
      predicted_result: this.buildMatchResultCLValue(predictedResult),
      amount: CLValueBuilder.u256(amount),
    });

    const deploy = this.createDeploy('place_bet', args, '6000000000');
    return await walletService.signAndSendDeploy(deploy);
  }

  /**
   * Get current odds for a match outcome
   */
  async getCurrentOdds(
    matchId: number,
    result: 'HomeWin' | 'Draw' | 'AwayWin'
  ): Promise<string> {
    const stateKey = `odds_${matchId}_${result}`;
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value;
    } catch (error) {
      console.error('Error fetching odds:', error);
      return '2000'; // Default 2.0x odds
    }
  }

  /**
   * Get betting pool for a match
   */
  async getBettingPool(matchId: number): Promise<BettingPool> {
    const stateKey = `betting_pool_${matchId}`;
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value;
    } catch (error) {
      console.error('Error fetching betting pool:', error);
      return {
        home_win_amount: '0',
        draw_amount: '0',
        away_win_amount: '0',
        total_amount: '0',
      };
    }
  }

  /**
   * Get user's bets
   */
  async getUserBets(userPublicKey: string): Promise<Bet[]> {
    const stateKey = `user_bets_${userPublicKey}`;
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value || [];
    } catch (error) {
      console.error('Error fetching user bets:', error);
      return [];
    }
  }

  /**
   * Get match details
   */
  async getMatch(matchId: number): Promise<Match | null> {
    const stateKey = `match_${matchId}`;
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value;
    } catch (error) {
      console.error('Error fetching match:', error);
      return null;
    }
  }

  /**
   * Get current season
   */
  async getCurrentSeason(): Promise<Season | null> {
    const stateKey = 'current_season';
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value;
    } catch (error) {
      console.error('Error fetching season:', error);
      return null;
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(seasonId: number, teamId: number): Promise<TeamStats | null> {
    const stateKey = `team_stats_${seasonId}_${teamId}`;
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value;
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return null;
    }
  }

  /**
   * Get matches for a specific turn
   */
  async getTurnMatches(seasonId: number, turn: number): Promise<Match[]> {
    const stateKey = `turn_matches_${seasonId}_${turn}`;
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value || [];
    } catch (error) {
      console.error('Error fetching turn matches:', error);
      return [];
    }
  }

  /**
   * Settle a bet (after match is played)
   */
  async settleBet(betId: string): Promise<string> {
    const args = RuntimeArgs.fromMap({
      bet_id: CLValueBuilder.u256(betId),
    });

    const deploy = this.createDeploy('settle_bet', args);
    return await walletService.signAndSendDeploy(deploy);
  }

  /**
   * Predict season winner
   */
  async predictSeasonWinner(
    seasonId: number,
    teamId: number,
    amount: string
  ): Promise<string> {
    const args = RuntimeArgs.fromMap({
      season_id: CLValueBuilder.u32(seasonId),
      predicted_team_id: CLValueBuilder.u8(teamId),
      amount: CLValueBuilder.u256(amount),
    });

    const deploy = this.createDeploy('predict_season_winner', args, '6000000000');
    return await walletService.signAndSendDeploy(deploy);
  }

  /**
   * Claim season prize
   */
  async claimSeasonPrize(seasonId: number): Promise<string> {
    const args = RuntimeArgs.fromMap({
      season_id: CLValueBuilder.u32(seasonId),
    });

    const deploy = this.createDeploy('claim_season_prize', args);
    return await walletService.signAndSendDeploy(deploy);
  }

  /**
   * Check if user has claimed season prize
   */
  async hasClaimedSeasonPrize(
    seasonId: number,
    userPublicKey: string
  ): Promise<boolean> {
    const stateKey = `claimed_${seasonId}_${userPublicKey}`;
    try {
      const value = await this.cloudService.queryContractState(
        this.contractHash,
        stateKey
      );
      return value === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper: Build MatchResult CLValue
   */
  private buildMatchResultCLValue(result: 'HomeWin' | 'Draw' | 'AwayWin'): any {
    // Build enum variant based on schema
    const variants = {
      HomeWin: 0,
      Draw: 1,
      AwayWin: 2,
    };

    return CLValueBuilder.option(
      CLValueBuilder.u8(variants[result]),
      CLValueBuilder.u8(0).clType()
    );
  }

  /**
   * Subscribe to contract events
   */
  onBetPlaced(callback: (event: any) => void): () => void {
    return this.cloudService.onContractEvent('BetPlaced', callback);
  }

  onMatchPlayed(callback: (event: any) => void): () => void {
    return this.cloudService.onContractEvent('MatchPlayed', callback);
  }

  onBetSettled(callback: (event: any) => void): () => void {
    return this.cloudService.onContractEvent('BetSettled', callback);
  }

  onSeasonEnded(callback: (event: any) => void): () => void {
    return this.cloudService.onContractEvent('SeasonEnded', callback);
  }
}
