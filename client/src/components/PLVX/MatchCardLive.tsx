/**
 * MatchCardLive Component
 * Enhanced match card with real-time odds and betting functionality
 */

import React, { useState, useEffect } from 'react';
import { Match, BettingPool } from '../../services/plvx-contract.service';
import './MatchCardLive.css';

interface MatchCardLiveProps {
  match: Match;
  onPlaceBet: (matchId: number, result: 'HomeWin' | 'Draw' | 'AwayWin', amount: string) => Promise<void>;
  getOdds: (matchId: number, result: 'HomeWin' | 'Draw' | 'AwayWin') => Promise<string>;
  getBettingPool: (matchId: number) => Promise<BettingPool>;
  isConnected: boolean;
}

const TEAM_NAMES = [
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
  'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool',
  'Manchester City', 'Manchester United', 'Newcastle', 'Nottingham Forest',
  'Southampton', 'Tottenham', 'West Ham', 'Wolves', 'Leicester', 'Leeds'
];

export const MatchCardLive: React.FC<MatchCardLiveProps> = ({
  match,
  onPlaceBet,
  getOdds,
  getBettingPool,
  isConnected,
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<'HomeWin' | 'Draw' | 'AwayWin' | null>(null);
  const [betAmount, setBetAmount] = useState('100');
  const [odds, setOdds] = useState<Record<string, string>>({
    HomeWin: '2.00',
    Draw: '3.00',
    AwayWin: '2.50',
  });
  const [pool, setPool] = useState<BettingPool | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [betSuccess, setBetSuccess] = useState(false);

  const homeTeam = TEAM_NAMES[match.home_team] || `Team ${match.home_team}`;
  const awayTeam = TEAM_NAMES[match.away_team] || `Team ${match.away_team}`;

  // Load odds and pool data
  useEffect(() => {
    const loadOddsAndPool = async () => {
      try {
        const [homeOdds, drawOdds, awayOdds, poolData] = await Promise.all([
          getOdds(match.match_id, 'HomeWin'),
          getOdds(match.match_id, 'Draw'),
          getOdds(match.match_id, 'AwayWin'),
          getBettingPool(match.match_id),
        ]);

        setOdds({
          HomeWin: (parseInt(homeOdds) / 1000).toFixed(2),
          Draw: (parseInt(drawOdds) / 1000).toFixed(2),
          AwayWin: (parseInt(awayOdds) / 1000).toFixed(2),
        });

        setPool(poolData);
      } catch (error) {
        console.error('Error loading odds:', error);
      }
    };

    if (!match.is_played) {
      loadOddsAndPool();
      // Refresh every 10 seconds
      const interval = setInterval(loadOddsAndPool, 10000);
      return () => clearInterval(interval);
    }
  }, [match, getOdds, getBettingPool]);

  const handlePlaceBet = async () => {
    if (!selectedOutcome || !isConnected) return;

    setIsPlacingBet(true);
    try {
      await onPlaceBet(match.match_id, selectedOutcome, betAmount);
      setBetSuccess(true);
      setTimeout(() => {
        setBetSuccess(false);
        setSelectedOutcome(null);
      }, 2000);
    } catch (error) {
      console.error('Error placing bet:', error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const calculatePotentialWin = (): string => {
    if (!selectedOutcome) return '0';
    const amount = parseFloat(betAmount);
    const odd = parseFloat(odds[selectedOutcome]);
    return (amount * odd).toFixed(2);
  };

  const getPoolPercentage = (outcome: 'HomeWin' | 'Draw' | 'AwayWin'): number => {
    if (!pool || parseFloat(pool.total_amount) === 0) return 33.33;

    const amounts = {
      HomeWin: parseFloat(pool.home_win_amount),
      Draw: parseFloat(pool.draw_amount),
      AwayWin: parseFloat(pool.away_win_amount),
    };

    const total = parseFloat(pool.total_amount);
    return (amounts[outcome] / total) * 100;
  };

  if (match.is_played) {
    return (
      <div className="match-card-live played">
        <div className="match-header">
          <span className="match-status finished">Final</span>
          <span className="match-turn">Turn {match.turn}</span>
        </div>
        <div className="match-teams">
          <div className="team home">
            <span className="team-name">{homeTeam}</span>
            <span className="team-score">{match.home_score}</span>
          </div>
          <div className="vs">VS</div>
          <div className="team away">
            <span className="team-score">{match.away_score}</span>
            <span className="team-name">{awayTeam}</span>
          </div>
        </div>
        <div className="match-result">
          {match.result === 'HomeWin' && '🏆 Home Win'}
          {match.result === 'Draw' && '🤝 Draw'}
          {match.result === 'AwayWin' && '🏆 Away Win'}
        </div>
      </div>
    );
  }

  return (
    <div className={`match-card-live ${selectedOutcome ? 'selected' : ''} ${betSuccess ? 'success' : ''}`}>
      <div className="match-header">
        <span className="match-status live">⚡ Live Betting</span>
        <span className="match-turn">Turn {match.turn}</span>
      </div>

      <div className="match-teams">
        <div className="team home">
          <span className="team-name">{homeTeam}</span>
        </div>
        <div className="vs">VS</div>
        <div className="team away">
          <span className="team-name">{awayTeam}</span>
        </div>
      </div>

      <div className="betting-options">
        <button
          className={`bet-option ${selectedOutcome === 'HomeWin' ? 'active' : ''}`}
          onClick={() => setSelectedOutcome('HomeWin')}
          disabled={!isConnected}
        >
          <span className="option-label">Home</span>
          <span className="option-odds">{odds.HomeWin}</span>
          <div className="pool-bar" style={{ width: `${getPoolPercentage('HomeWin')}%` }}></div>
        </button>

        <button
          className={`bet-option ${selectedOutcome === 'Draw' ? 'active' : ''}`}
          onClick={() => setSelectedOutcome('Draw')}
          disabled={!isConnected}
        >
          <span className="option-label">Draw</span>
          <span className="option-odds">{odds.Draw}</span>
          <div className="pool-bar" style={{ width: `${getPoolPercentage('Draw')}%` }}></div>
        </button>

        <button
          className={`bet-option ${selectedOutcome === 'AwayWin' ? 'active' : ''}`}
          onClick={() => setSelectedOutcome('AwayWin')}
          disabled={!isConnected}
        >
          <span className="option-label">Away</span>
          <span className="option-odds">{odds.AwayWin}</span>
          <div className="pool-bar" style={{ width: `${getPoolPercentage('AwayWin')}%` }}></div>
        </button>
      </div>

      {selectedOutcome && (
        <div className="bet-input-section">
          <div className="input-group">
            <label>Bet Amount (LEAGUE tokens)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
            />
          </div>

          <div className="potential-win">
            <span>Potential Win:</span>
            <span className="win-amount">{calculatePotentialWin()} LEAGUE</span>
          </div>

          <button
            className="btn-place-bet"
            onClick={handlePlaceBet}
            disabled={isPlacingBet || !isConnected}
          >
            {isPlacingBet ? 'Placing Bet...' : betSuccess ? '✓ Bet Placed!' : 'Place Bet'}
          </button>
        </div>
      )}

      {!isConnected && (
        <div className="connect-prompt">
          <span>🔒 Connect wallet to place bets</span>
        </div>
      )}

      {pool && (
        <div className="pool-info">
          <span className="pool-label">Total Pool:</span>
          <span className="pool-amount">
            {(parseFloat(pool.total_amount) / 1e9).toFixed(2)} LEAGUE
          </span>
        </div>
      )}
    </div>
  );
};
