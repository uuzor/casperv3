import React from 'react';
import { Bet, PLVXUtils, MatchResult } from '../plvx-integration';

interface UserBetsProps {
  bets: Bet[];
  onSettleBet: (betId: string) => Promise<void>;
}

export const UserBets: React.FC<UserBetsProps> = ({ bets, onSettleBet }) => {
  const [settlingBet, setSettlingBet] = React.useState<string | null>(null);

  const handleSettle = async (betId: string) => {
    setSettlingBet(betId);
    try {
      await onSettleBet(betId);
    } catch (error) {
      console.error('Error settling bet:', error);
    } finally {
      setSettlingBet(null);
    }
  };

  const activeBets = bets.filter((bet) => !bet.is_settled);
  const settledBets = bets.filter((bet) => bet.is_settled);

  const totalStaked = bets.reduce((sum, bet) => sum + BigInt(bet.amount), BigInt(0));
  const totalWon = settledBets
    .filter((bet) => bet.is_won)
    .reduce((sum, bet) => sum + BigInt(bet.payout), BigInt(0));
  const totalLost = settledBets
    .filter((bet) => !bet.is_won)
    .reduce((sum, bet) => sum + BigInt(bet.amount), BigInt(0));

  const winRate =
    settledBets.length > 0
      ? (settledBets.filter((bet) => bet.is_won).length / settledBets.length) * 100
      : 0;

  const BetCard = ({ bet }: { bet: Bet }) => {
    const isMatchBet = typeof bet.bet_type === 'object' && 'MatchWinner' in bet.bet_type;

    return (
      <div
        className={`bet-card p-4 rounded-lg border-2 mb-3 ${
          bet.is_settled
            ? bet.is_won
              ? 'border-green-300 bg-green-50'
              : 'border-red-300 bg-red-50'
            : 'border-blue-300 bg-blue-50'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-lg">
              {isMatchBet ? `Match #${(bet.bet_type as any).MatchWinner}` : 'Season Winner'}
            </div>
            <div className="text-sm text-gray-600">
              Bet ID: {bet.bet_id.slice(0, 8)}...
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                bet.is_settled
                  ? bet.is_won
                    ? 'bg-green-200 text-green-800'
                    : 'bg-red-200 text-red-800'
                  : 'bg-yellow-200 text-yellow-800'
              }`}
            >
              {bet.is_settled ? (bet.is_won ? '✓ Won' : '✗ Lost') : '⏳ Pending'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-600">Prediction</div>
            <div className="font-semibold">{PLVXUtils.getResultText(bet.predicted_result)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Odds</div>
            <div className="font-semibold text-blue-600">{PLVXUtils.formatOdds(bet.odds)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Amount</div>
            <div className="font-semibold">{PLVXUtils.formatTokens(bet.amount)} LEAGUE</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">
              {bet.is_settled ? (bet.is_won ? 'Won' : 'Lost') : 'Potential Win'}
            </div>
            <div
              className={`font-semibold ${
                bet.is_settled
                  ? bet.is_won
                    ? 'text-green-600'
                    : 'text-red-600'
                  : 'text-gray-700'
              }`}
            >
              {bet.is_settled && bet.is_won
                ? PLVXUtils.formatTokens(bet.payout)
                : bet.is_settled
                ? '0'
                : PLVXUtils.formatTokens(
                    PLVXUtils.calculatePayout(bet.amount, bet.odds)
                  )}{' '}
              LEAGUE
            </div>
          </div>
        </div>

        {!bet.is_settled && (
          <button
            onClick={() => handleSettle(bet.bet_id)}
            disabled={settlingBet === bet.bet_id}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {settlingBet === bet.bet_id ? 'Settling...' : 'Settle Bet'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="user-bets bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">📊 My Bets</h2>

      {/* Stats Summary */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Staked</div>
          <div className="text-xl font-bold text-blue-600">
            {PLVXUtils.formatTokens(totalStaked.toString())}
          </div>
        </div>
        <div className="stat-card bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Won</div>
          <div className="text-xl font-bold text-green-600">
            {PLVXUtils.formatTokens(totalWon.toString())}
          </div>
        </div>
        <div className="stat-card bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Lost</div>
          <div className="text-xl font-bold text-red-600">
            {PLVXUtils.formatTokens(totalLost.toString())}
          </div>
        </div>
        <div className="stat-card bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Win Rate</div>
          <div className="text-xl font-bold text-purple-600">{winRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Active Bets */}
      {activeBets.length > 0 && (
        <div className="active-bets mb-6">
          <h3 className="text-lg font-bold mb-3">⏳ Active Bets ({activeBets.length})</h3>
          {activeBets.map((bet) => (
            <BetCard key={bet.bet_id} bet={bet} />
          ))}
        </div>
      )}

      {/* Settled Bets */}
      {settledBets.length > 0 && (
        <div className="settled-bets">
          <h3 className="text-lg font-bold mb-3">
            ✓ Bet History ({settledBets.length})
          </h3>
          {settledBets.map((bet) => (
            <BetCard key={bet.bet_id} bet={bet} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {bets.length === 0 && (
        <div className="empty-state text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🎲</div>
          <div className="text-xl font-semibold mb-2">No Bets Yet</div>
          <div>Start betting on matches to see your bets here!</div>
        </div>
      )}
    </div>
  );
};
