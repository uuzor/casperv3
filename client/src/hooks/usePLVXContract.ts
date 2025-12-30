/**
 * usePLVXContract Hook
 * React hook for PLVX contract interactions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PLVXContractService,
  Match,
  Season,
  TeamStats,
  Bet,
  BettingPool,
} from '../services/plvx-contract.service';

export interface UsePLVXContractReturn {
  // State
  currentSeason: Season | null;
  matches: Match[];
  userBets: Bet[];
  teamStats: TeamStats[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  placeBet: (matchId: number, result: 'HomeWin' | 'Draw' | 'AwayWin', amount: string) => Promise<string>;
  settleBet: (betId: string) => Promise<string>;
  predictSeasonWinner: (seasonId: number, teamId: number, amount: string) => Promise<string>;
  claimSeasonPrize: (seasonId: number) => Promise<string>;

  // Queries
  getOdds: (matchId: number, result: 'HomeWin' | 'Draw' | 'AwayWin') => Promise<string>;
  getBettingPool: (matchId: number) => Promise<BettingPool>;
  getMatch: (matchId: number) => Promise<Match | null>;
  getTurnMatches: (seasonId: number, turn: number) => Promise<Match[]>;

  // Refresh
  refresh: () => Promise<void>;
}

export const usePLVXContract = (
  contractService: PLVXContractService,
  userPublicKey: string | null
): UsePLVXContractReturn => {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load current season
      const season = await contractService.getCurrentSeason();
      setCurrentSeason(season);

      if (season) {
        // Load matches for current turn
        const turnMatches = await contractService.getTurnMatches(
          season.season_id,
          season.current_turn
        );
        setMatches(turnMatches);

        // Load team stats for all 20 teams
        const stats: TeamStats[] = [];
        for (let teamId = 0; teamId < 20; teamId++) {
          const teamStat = await contractService.getTeamStats(season.season_id, teamId);
          if (teamStat) {
            stats.push(teamStat);
          }
        }
        setTeamStats(stats.sort((a, b) => b.points - a.points));
      }

      // Load user bets if wallet is connected
      if (userPublicKey) {
        const bets = await contractService.getUserBets(userPublicKey);
        setUserBets(bets);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error loading contract data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractService, userPublicKey]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Place bet
  const placeBet = useCallback(
    async (matchId: number, result: 'HomeWin' | 'Draw' | 'AwayWin', amount: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const deployHash = await contractService.placeBet(matchId, result, amount);

        // Refresh data after bet placement
        await loadData();

        return deployHash;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contractService, loadData]
  );

  // Settle bet
  const settleBet = useCallback(
    async (betId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const deployHash = await contractService.settleBet(betId);
        await loadData();
        return deployHash;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contractService, loadData]
  );

  // Predict season winner
  const predictSeasonWinner = useCallback(
    async (seasonId: number, teamId: number, amount: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const deployHash = await contractService.predictSeasonWinner(seasonId, teamId, amount);
        await loadData();
        return deployHash;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contractService, loadData]
  );

  // Claim season prize
  const claimSeasonPrize = useCallback(
    async (seasonId: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const deployHash = await contractService.claimSeasonPrize(seasonId);
        await loadData();
        return deployHash;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contractService, loadData]
  );

  // Get odds
  const getOdds = useCallback(
    async (matchId: number, result: 'HomeWin' | 'Draw' | 'AwayWin') => {
      return await contractService.getCurrentOdds(matchId, result);
    },
    [contractService]
  );

  // Get betting pool
  const getBettingPool = useCallback(
    async (matchId: number) => {
      return await contractService.getBettingPool(matchId);
    },
    [contractService]
  );

  // Get match
  const getMatch = useCallback(
    async (matchId: number) => {
      return await contractService.getMatch(matchId);
    },
    [contractService]
  );

  // Get turn matches
  const getTurnMatches = useCallback(
    async (seasonId: number, turn: number) => {
      return await contractService.getTurnMatches(seasonId, turn);
    },
    [contractService]
  );

  return {
    currentSeason,
    matches,
    userBets,
    teamStats,
    isLoading,
    error,
    placeBet,
    settleBet,
    predictSeasonWinner,
    claimSeasonPrize,
    getOdds,
    getBettingPool,
    getMatch,
    getTurnMatches,
    refresh: loadData,
  };
};
