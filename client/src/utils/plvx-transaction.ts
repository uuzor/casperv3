import {
  Args,
  CLValue,
  PublicKey,
  ContractCallBuilder,
  Transaction,
  Key,
} from 'casper-js-sdk';
import { CSPRToMotes } from './currency';

/**
 * PLVX Premier League Betting Contract - Transaction Builders
 *
 * This module provides utilities for building transactions to interact with the
 * PremierLeagueImproved smart contract deployed on Casper.
 *
 * Contract Package Hash: e1b3a8a7d762a94ec02b3eb5562eb4206e8567095752aacc92595280612fa508
 */

// ==================== TYPES ====================

export enum MatchResult {
  HomeWin = 0,
  Draw = 1,
  AwayWin = 2,
}

// ==================== GAS PRICES ====================

// Gas prices for PLVX operations (in CSPR)
const START_SEASON_GAS = 10;
const PLACE_BET_GAS = 5;
const SETTLE_BET_GAS = 3;
const SIMULATE_MATCH_GAS = 8;
const PREDICT_SEASON_GAS = 2;
const CLAIM_PRIZE_GAS = 3;
const MINT_BADGE_GAS = 3;
const LIST_BADGE_GAS = 2;
const BUY_BADGE_GAS = 4;
const KEEPER_MANAGEMENT_GAS = 2;
const BATCH_SETTLE_GAS = 10;

// ==================== SEASON MANAGEMENT ====================

/**
 * Start a new season (Owner only)
 */
export const prepareStartSeasonTransaction = async (
  playerPublicKey: PublicKey
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('start_season')
    .runtimeArgs(Args.fromMap({}))
    .payment(CSPRToMotes(START_SEASON_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

/**
 * End a season and declare winner (Owner only)
 */
export const prepareEndSeasonTransaction = async (
  playerPublicKey: PublicKey,
  seasonId: number
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('end_season')
    .runtimeArgs(Args.fromMap({
      season_id: CLValue.newCLUInt32(seasonId),
    }))
    .payment(CSPRToMotes(START_SEASON_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

// ==================== BETTING ====================

/**
 * Place a bet on a match
 *
 * @param playerPublicKey - The player's public key
 * @param matchId - The ID of the match to bet on
 * @param predictedResult - The predicted match result (0=HomeWin, 1=Draw, 2=AwayWin)
 * @param amount - Bet amount in smallest unit (similar to motes for LEAGUE token)
 */
export const preparePlaceBetTransaction = async (
  playerPublicKey: PublicKey,
  matchId: number,
  predictedResult: MatchResult,
  amount: string
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('place_bet')
    .runtimeArgs(Args.fromMap({
      match_id: CLValue.newCLUInt32(matchId),
      predicted_result: CLValue.newCLUint8(predictedResult),
      amount: CLValue.newCLUInt256(amount),
    }))
    .payment(CSPRToMotes(PLACE_BET_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

/**
 * Settle a bet after match finishes
 */
export const prepareSettleBetTransaction = async (
  playerPublicKey: PublicKey,
  betId: string
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('settle_bet')
    .runtimeArgs(Args.fromMap({
      bet_id: CLValue.newCLUInt256(betId),
    }))
    .payment(CSPRToMotes(SETTLE_BET_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

// ==================== SEASON WINNER PREDICTIONS ====================

/**
 * Predict season winner (Free - no tokens required)
 *
 * @param playerPublicKey - The player's public key
 * @param seasonId - The season ID
 * @param teamId - The team ID (1-20)
 */
export const preparePredictSeasonWinnerTransaction = async (
  playerPublicKey: PublicKey,
  seasonId: number,
  teamId: number
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('predict_season_winner')
    .runtimeArgs(Args.fromMap({
      season_id: CLValue.newCLUInt32(seasonId),
      team_id: CLValue.newCLUint8(teamId),
    }))
    .payment(CSPRToMotes(PREDICT_SEASON_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

/**
 * Claim season prize after season ends
 */
export const prepareClaimSeasonPrizeTransaction = async (
  playerPublicKey: PublicKey,
  seasonId: number
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('claim_season_prize')
    .runtimeArgs(Args.fromMap({
      season_id: CLValue.newCLUInt32(seasonId),
    }))
    .payment(CSPRToMotes(CLAIM_PRIZE_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

// ==================== MATCH SIMULATION (Keeper/Owner only) ====================

/**
 * Simulate a match (Keeper or Owner only)
 */
export const prepareSimulateMatchTransaction = async (
  playerPublicKey: PublicKey,
  matchId: number
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('simulate_match')
    .runtimeArgs(Args.fromMap({
      match_id: CLValue.newCLUInt32(matchId),
    }))
    .payment(CSPRToMotes(SIMULATE_MATCH_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

/**
 * Settle multiple bets in batch (Keeper or Owner only)
 */
export const prepareSettleMatchBetsBatchTransaction = async (
  playerPublicKey: PublicKey,
  matchId: number,
  start: number,
  count: number
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('settle_match_bets_batch')
    .runtimeArgs(Args.fromMap({
      match_id: CLValue.newCLUInt32(matchId),
      start: CLValue.newCLUInt32(start),
      count: CLValue.newCLUInt32(count),
    }))
    .payment(CSPRToMotes(BATCH_SETTLE_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

// ==================== NFT BADGES ====================

/**
 * Mint a team badge NFT
 *
 * @param playerPublicKey - The player's public key
 * @param teamId - The team ID (1-20)
 */
export const prepareMintBadgeTransaction = async (
  playerPublicKey: PublicKey,
  teamId: number
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('mint_badge')
    .runtimeArgs(Args.fromMap({
      team_id: CLValue.newCLUint8(teamId),
    }))
    .payment(CSPRToMotes(MINT_BADGE_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

/**
 * List a badge for sale
 */
export const prepareListBadgeTransaction = async (
  playerPublicKey: PublicKey,
  tokenId: string,
  price: string
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('list_badge')
    .runtimeArgs(Args.fromMap({
      token_id: CLValue.newCLUInt256(tokenId),
      price: CLValue.newCLUInt256(price),
    }))
    .payment(CSPRToMotes(LIST_BADGE_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

/**
 * Buy a listed badge
 */
export const prepareBuyBadgeTransaction = async (
  playerPublicKey: PublicKey,
  tokenId: string
): Promise<Transaction> => {
  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('buy_badge')
    .runtimeArgs(Args.fromMap({
      token_id: CLValue.newCLUInt256(tokenId),
    }))
    .payment(CSPRToMotes(BUY_BADGE_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

// ==================== KEEPER MANAGEMENT (Owner only) ====================

/**
 * Add a keeper who can execute matches
 */
export const prepareAddKeeperTransaction = async (
  playerPublicKey: PublicKey,
  keeperAccountHash: string
): Promise<Transaction> => {
  const keeperKey = Key.newKey(`account-hash-${keeperAccountHash}`);

  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('add_keeper')
    .runtimeArgs(Args.fromMap({
      keeper: CLValue.newCLKey(keeperKey),
    }))
    .payment(CSPRToMotes(KEEPER_MANAGEMENT_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

/**
 * Remove a keeper
 */
export const prepareRemoveKeeperTransaction = async (
  playerPublicKey: PublicKey,
  keeperAccountHash: string
): Promise<Transaction> => {
  const keeperKey = Key.newKey(`account-hash-${keeperAccountHash}`);

  return new ContractCallBuilder()
    .from(playerPublicKey)
    .byPackageHash(config.plvx_contract_package_hash)
    .entryPoint('remove_keeper')
    .runtimeArgs(Args.fromMap({
      keeper: CLValue.newCLKey(keeperKey),
    }))
    .payment(CSPRToMotes(KEEPER_MANAGEMENT_GAS))
    .chainName(config.cspr_chain_name)
    .build();
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Convert LEAGUE tokens to smallest unit (assumes 18 decimals like CSPR)
 */
export const leagueToSmallestUnit = (league: number | string): string => {
  const amount = typeof league === 'string' ? parseFloat(league) : league;
  return (amount * 1_000_000_000_000_000_000).toString();
};

/**
 * Convert smallest unit to LEAGUE tokens (assumes 18 decimals)
 */
export const smallestUnitToLeague = (smallestUnit: string): number => {
  return parseInt(smallestUnit, 10) / 1_000_000_000_000_000_000;
};

/**
 * Format LEAGUE amount for display
 */
export const formatLeagueAmount = (smallestUnit: string): string => {
  const league = smallestUnitToLeague(smallestUnit);
  return league.toFixed(2);
};

/**
 * Format match result enum to string
 */
export const matchResultToString = (result: MatchResult): string => {
  switch (result) {
    case MatchResult.HomeWin:
      return 'Home Win';
    case MatchResult.Draw:
      return 'Draw';
    case MatchResult.AwayWin:
      return 'Away Win';
    default:
      return 'Unknown';
  }
};

/**
 * Get team name by ID (Premier League teams)
 */
export const getTeamName = (teamId: number): string => {
  const teams = [
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
    'Newcastle United',
    'Nottingham Forest',
    'Sheffield United',
    'Tottenham',
    'West Ham',
    'Wolverhampton',
    'Burnley',
  ];
  return teams[teamId - 1] || `Team ${teamId}`;
};

/**
 * Get team emoji/logo by ID
 */
export const getTeamEmoji = (teamId: number): string => {
  // You can replace these with actual team logos/emojis
  return '⚽';
};

/**
 * Parse match result string to enum
 */
export const parseMatchResult = (result: string): MatchResult => {
  switch (result.toLowerCase().replace(/\s+/g, '')) {
    case 'homewin':
      return MatchResult.HomeWin;
    case 'draw':
      return MatchResult.Draw;
    case 'awaywin':
      return MatchResult.AwayWin;
    default:
      throw new Error(`Invalid match result: ${result}`);
  }
};
