import React, { useState, useEffect } from 'react';
import { Match, MatchResult, PLVXUtils, BettingPool } from '../plvx-integration';

interface MatchCardProps {
  match: Match;
  bettingPool?: BettingPool | null;
  onPlaceBet: (matchId: number, result: MatchResult, amount: string) => Promise<void>;
  currentTime: number;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  bettingPool,
  onPlaceBet,
  currentTime,
}) => {
  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const status = PLVXUtils.getMatchStatus(match, currentTime);
  const homeTeam = PLVXUtils.getTeamName(match.home_team_id);
  const awayTeam = PLVXUtils.getTeamName(match.away_team_id);

  const handlePlaceBet = async () => {
    if (!selectedResult || !betAmount) return;

    setIsPlacingBet(true);
    try {
      const amountInBaseUnits = PLVXUtils.parseTokens(betAmount);
      await onPlaceBet(match.match_id, selectedResult, amountInBaseUnits);
      setBetAmount('');
      setSelectedResult(null);
    } catch (error) {
      console.error('Error placing bet:', error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const getOddsForResult = (result: MatchResult): string => {
    if (!bettingPool || bettingPool.total_amount === '0') {
      return '2.00x';
    }

    const total = BigInt(bettingPool.total_amount);
    let resultAmount: bigint;

    switch (result) {
      case MatchResult.HomeWin:
        resultAmount = BigInt(bettingPool.home_win_amount);
        break;
      case MatchResult.Draw:
        resultAmount = BigInt(bettingPool.draw_amount);
        break;
      case MatchResult.AwayWin:
        resultAmount = BigInt(bettingPool.away_win_amount);
        break;
    }

    if (resultAmount === BigInt(0)) {
      return '5.00x';
    }

    const rawOdds = (total * BigInt(1000)) / resultAmount;
    const clampedOdds = rawOdds > BigInt(50000) ? BigInt(50000) :
                        rawOdds < BigInt(1100) ? BigInt(1100) : rawOdds;

    return PLVXUtils.formatOdds(clampedOdds.toString());
  };

  const calculatePotentialWin = (): string => {
    if (!selectedResult || !betAmount) return '0';
    try {
      const amountInBaseUnits = PLVXUtils.parseTokens(betAmount);
      const odds = getOddsForResult(selectedResult);
      const oddsValue = (parseFloat(odds) * 1000).toString();
      const payout = PLVXUtils.calculatePayout(amountInBaseUnits, oddsValue);
      return PLVXUtils.formatTokens(payout);
    } catch {
      return '0';
    }
  };

  return (
    <div className="match-card bg-white rounded-lg shadow-md p-6 mb-4">
      {/* Match Header */}
      <div className="match-header mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Turn {match.turn_number} • Match #{match.match_id}
          </span>
          <span className={`status-badge px-3 py-1 rounded-full text-sm font-semibold ${
            status === 'finished' ? 'bg-gray-200 text-gray-700' :
            status === 'live' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {status === 'finished' ? '⚫ Finished' :
             status === 'live' ? '🔴 Live' :
             '⏰ Upcoming'}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="teams-section mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="team flex items-center flex-1">
            <div className="team-badge w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mr-3 flex items-center justify-center text-white font-bold">
              {homeTeam.charAt(0)}
            </div>
            <div>
              <div className="team-name font-bold text-lg">{homeTeam}</div>
              {status === 'finished' && (
                <div className="team-score text-2xl font-bold text-blue-600">
                  {match.home_score}
                </div>
              )}
            </div>
          </div>

          <div className="vs-divider px-4 text-gray-400 font-bold">VS</div>

          <div className="team flex items-center flex-1 justify-end">
            <div className="text-right mr-3">
              <div className="team-name font-bold text-lg">{awayTeam}</div>
              {status === 'finished' && (
                <div className="team-score text-2xl font-bold text-red-600">
                  {match.away_score}
                </div>
              )}
            </div>
            <div className="team-badge w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold">
              {awayTeam.charAt(0)}
            </div>
          </div>
        </div>

        {status === 'finished' && match.result && (
          <div className="result-badge mt-3 text-center py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
            🏆 {PLVXUtils.getResultText(match.result)}
          </div>
        )}

        {status === 'upcoming' && (
          <div className="time-until mt-3 text-center text-gray-600">
            ⏰ Starts in {PLVXUtils.formatTimeRemaining(
              PLVXUtils.getTimeUntilMatch(match, currentTime)
            )}
          </div>
        )}
      </div>

      {/* Betting Section - Only for upcoming matches */}
      {status === 'upcoming' && (
        <div className="betting-section border-t pt-4">
          <h3 className="font-bold mb-3">Place Your Bet</h3>

          {/* Betting Options */}
          <div className="betting-options grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setSelectedResult(MatchResult.HomeWin)}
              className={`bet-option p-3 rounded-lg border-2 transition-all ${
                selectedResult === MatchResult.HomeWin
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-semibold text-sm mb-1">Home Win</div>
              <div className="text-xl font-bold text-blue-600">
                {getOddsForResult(MatchResult.HomeWin)}
              </div>
            </button>

            <button
              onClick={() => setSelectedResult(MatchResult.Draw)}
              className={`bet-option p-3 rounded-lg border-2 transition-all ${
                selectedResult === MatchResult.Draw
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-yellow-300'
              }`}
            >
              <div className="font-semibold text-sm mb-1">Draw</div>
              <div className="text-xl font-bold text-yellow-600">
                {getOddsForResult(MatchResult.Draw)}
              </div>
            </button>

            <button
              onClick={() => setSelectedResult(MatchResult.AwayWin)}
              className={`bet-option p-3 rounded-lg border-2 transition-all ${
                selectedResult === MatchResult.AwayWin
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="font-semibold text-sm mb-1">Away Win</div>
              <div className="text-xl font-bold text-red-600">
                {getOddsForResult(MatchResult.AwayWin)}
              </div>
            </button>
          </div>

          {/* Bet Amount Input */}
          {selectedResult && (
            <div className="bet-amount-section">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bet Amount (LEAGUE)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
              />

              {betAmount && (
                <div className="potential-win mt-2 p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600">Potential Win</div>
                  <div className="text-xl font-bold text-green-600">
                    {calculatePotentialWin()} LEAGUE
                  </div>
                </div>
              )}

              <button
                onClick={handlePlaceBet}
                disabled={isPlacingBet || !betAmount || parseFloat(betAmount) <= 0}
                className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isPlacingBet ? 'Placing Bet...' : 'Place Bet'}
              </button>
            </div>
          )}

          {/* Betting Pool Info */}
          {bettingPool && bettingPool.total_amount !== '0' && (
            <div className="pool-info mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 mb-2">Total Pool</div>
              <div className="font-bold text-lg">
                {PLVXUtils.formatTokens(bettingPool.total_amount)} LEAGUE
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                  <div className="text-gray-500">Home</div>
                  <div className="font-semibold">
                    {PLVXUtils.formatTokens(bettingPool.home_win_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Draw</div>
                  <div className="font-semibold">
                    {PLVXUtils.formatTokens(bettingPool.draw_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Away</div>
                  <div className="font-semibold">
                    {PLVXUtils.formatTokens(bettingPool.away_win_amount)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
