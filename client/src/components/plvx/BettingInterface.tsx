import React, { useState, useEffect } from 'react';
import { PublicKey } from 'casper-js-sdk';
import { TransactionStatus } from '@make-software/csprclick-core-types';
import { useClickRef } from '@make-software/csprclick-ui';
import {
  preparePlaceBetTransaction,
  preparePredictSeasonWinnerTransaction,
  prepareMintBadgeTransaction,
  MatchResult,
  matchResultToString,
  leagueToSmallestUnit,
  smallestUnitToLeague,
  getTeamName,
} from '@/utils';
import {
  getCurrentSeason,
  getUpcomingMatches,
  calculateOdds,
  isBettingOpen,
  formatTimeRemaining,
  getTimeUntilMatch,
  Match,
  Season,
} from '@/api';

/**
 * Example PLVX Betting Interface Component
 *
 * This demonstrates how to use the PLVX transaction builders and API utilities.
 * You can use this as a reference for building your own betting UI.
 */

interface BettingInterfaceProps {
  userPublicKey?: string; // Connected wallet public key (hex format)
}

export const BettingInterface: React.FC<BettingInterfaceProps> = ({ userPublicKey }) => {
  const [season, setSeason] = useState<Season | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedResult, setSelectedResult] = useState<MatchResult>(MatchResult.HomeWin);
  const [betAmount, setBetAmount] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [odds, setOdds] = useState<number>(2.0);

  const clickRef = useClickRef();
  const activeAccount = clickRef?.getActiveAccount();

  // Load current season and matches
  useEffect(() => {
    loadSeasonData();
  }, []);

  // Update odds when match or prediction changes
  useEffect(() => {
    if (selectedMatch) {
      updateOdds();
    }
  }, [selectedMatch, selectedResult]);

  const loadSeasonData = async () => {
    try {
      setLoading(true);
      const currentSeason = await getCurrentSeason();
      if (!currentSeason) {
        setError('No active season found');
        return;
      }

      setSeason(currentSeason);

      // Load upcoming matches
      const upcomingMatches = await getUpcomingMatches(currentSeason.season_id);
      setMatches(upcomingMatches);

      if (upcomingMatches.length > 0) {
        setSelectedMatch(upcomingMatches[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOdds = async () => {
    if (!selectedMatch) return;

    try {
      const resultStr = matchResultToString(selectedResult).replace(' ', '') as
        | 'HomeWin'
        | 'Draw'
        | 'AwayWin';
      const calculatedOdds = await calculateOdds(selectedMatch.match_id, resultStr);
      setOdds(calculatedOdds);
    } catch (err) {
      console.error('Failed to calculate odds:', err);
    }
  };

  const handlePlaceBet = async () => {
    if (!userPublicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!selectedMatch) {
      setError('Please select a match');
      return;
    }

    if (!isBettingOpen(selectedMatch)) {
      setError('Betting is closed for this match');
      return;
    }

    if (!clickRef) {
      setError('CsprClick not initialized');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Convert bet amount to smallest unit (LEAGUE token has 18 decimals)
      const amountInSmallestUnit = leagueToSmallestUnit(betAmount);

      // Parse public key
      const publicKey = PublicKey.fromHex(userPublicKey);

      // Build transaction
      const transaction = await preparePlaceBetTransaction(
        publicKey,
        selectedMatch.match_id,
        selectedResult,
        amountInSmallestUnit
      );

      // Create status update handler
      const onStatusUpdate = (status: string, data: any) => {
        if (status === TransactionStatus.CANCELLED) {
          setError('Transaction cancelled by user');
          setLoading(false);
        }
        if (status === TransactionStatus.ERROR) {
          setError(`Transaction error: ${data?.error || 'Unknown error'}`);
          setLoading(false);
        }
        if (status === TransactionStatus.PROCESSED) {
          if (data.csprCloudTransaction?.error_message === null) {
            alert('Bet placed successfully! Refreshing matches...');
            loadSeasonData();
          } else {
            setError(`Transaction failed: ${data.csprCloudTransaction?.error_message}`);
          }
          setLoading(false);
        }
      };

      // Send transaction via CsprClick
      clickRef.send(transaction, userPublicKey, onStatusUpdate).catch((err: any) => {
        setError(`Failed to send transaction: ${err.message}`);
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      console.error('Failed to place bet:', err);
    }
  };

  const handlePredictSeasonWinner = async (teamId: number) => {
    if (!userPublicKey || !season || !clickRef) return;

    try {
      setLoading(true);
      setError('');

      const publicKey = PublicKey.fromHex(userPublicKey);

      const transaction = await preparePredictSeasonWinnerTransaction(
        publicKey,
        season.season_id,
        teamId
      );

      const onStatusUpdate = (status: string, data: any) => {
        if (status === TransactionStatus.CANCELLED) {
          setLoading(false);
        }
        if (status === TransactionStatus.ERROR) {
          setError(`Error: ${data?.error || 'Unknown error'}`);
          setLoading(false);
        }
        if (status === TransactionStatus.PROCESSED) {
          if (data.csprCloudTransaction?.error_message === null) {
            alert(`Prediction placed for ${getTeamName(teamId)}!`);
          } else {
            setError(`Failed: ${data.csprCloudTransaction?.error_message}`);
          }
          setLoading(false);
        }
      };

      clickRef.send(transaction, userPublicKey, onStatusUpdate).catch((err: any) => {
        setError(err.message);
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleMintBadge = async (teamId: number) => {
    if (!userPublicKey || !clickRef) return;

    try {
      setLoading(true);
      setError('');

      const publicKey = PublicKey.fromHex(userPublicKey);

      const transaction = await prepareMintBadgeTransaction(publicKey, teamId);

      const onStatusUpdate = (status: string, data: any) => {
        if (status === TransactionStatus.CANCELLED) {
          setLoading(false);
        }
        if (status === TransactionStatus.ERROR) {
          setError(`Error: ${data?.error || 'Unknown error'}`);
          setLoading(false);
        }
        if (status === TransactionStatus.PROCESSED) {
          if (data.csprCloudTransaction?.error_message === null) {
            alert(`Badge minted for ${getTeamName(teamId)}!`);
          } else {
            setError(`Failed: ${data.csprCloudTransaction?.error_message}`);
          }
          setLoading(false);
        }
      };

      clickRef.send(transaction, userPublicKey, onStatusUpdate).catch((err: any) => {
        setError(err.message);
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading && !season) {
    return <div>Loading...</div>;
  }

  if (!season) {
    return <div>No active season</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>⚽ Premier League Betting</h1>

      {error && (
        <div
          style={{
            padding: '10px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            marginBottom: '10px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2>Season {season.season_id}</h2>
        <p>Turn: {season.current_turn} / 36</p>
        <p>Total Pool: {smallestUnitToLeague(season.total_pool).toFixed(2)} LEAGUE</p>
        <p>Status: {season.is_active ? '🟢 Active' : '🔴 Ended'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Upcoming Matches ({matches.length})</h3>

        {matches.map((match) => (
          <div
            key={match.match_id}
            onClick={() => setSelectedMatch(match)}
            style={{
              padding: '10px',
              margin: '5px 0',
              border:
                selectedMatch?.match_id === match.match_id ? '2px solid blue' : '1px solid #ccc',
              cursor: 'pointer',
              backgroundColor:
                selectedMatch?.match_id === match.match_id ? '#f0f8ff' : 'white',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {getTeamName(match.home_team_id)} vs {getTeamName(match.away_team_id)}
            </div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>
              Match #{match.match_id} • Turn {match.turn_number}
            </div>
            <div style={{ fontSize: '0.8em', color: '#999' }}>
              {isBettingOpen(match) ? (
                <span style={{ color: 'green' }}>
                  ✅ Betting open • Starts in {formatTimeRemaining(getTimeUntilMatch(match))}
                </span>
              ) : (
                <span style={{ color: 'red' }}>🔒 Betting closed</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedMatch && (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
          <h3>Place Bet</h3>

          <div style={{ marginBottom: '10px' }}>
            <strong>Match:</strong> {getTeamName(selectedMatch.home_team_id)} vs{' '}
            {getTeamName(selectedMatch.away_team_id)}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              <strong>Predict:</strong>
            </label>
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(Number(e.target.value))}
              style={{ padding: '5px', width: '100%' }}
            >
              <option value={MatchResult.HomeWin}>
                {getTeamName(selectedMatch.home_team_id)} Wins (Home)
              </option>
              <option value={MatchResult.Draw}>Draw</option>
              <option value={MatchResult.AwayWin}>
                {getTeamName(selectedMatch.away_team_id)} Wins (Away)
              </option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              <strong>Bet Amount (LEAGUE tokens):</strong>
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="0.01"
              step="0.01"
              style={{ padding: '5px', width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px', fontSize: '1.1em' }}>
            <strong>Current Odds:</strong> {odds.toFixed(2)}x
          </div>

          <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>
            <strong>Potential Payout:</strong> {(parseFloat(betAmount) * odds).toFixed(2)} LEAGUE
          </div>

          <button
            onClick={handlePlaceBet}
            disabled={loading || !userPublicKey || !isBettingOpen(selectedMatch)}
            style={{
              padding: '10px 20px',
              backgroundColor:
                loading || !isBettingOpen(selectedMatch) ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor:
                loading || !isBettingOpen(selectedMatch) ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              width: '100%',
            }}
          >
            {loading ? 'Processing...' : 'Place Bet'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p>
          <strong>Note:</strong> This is an example component. Customize the UI/UX as needed for
          your application.
        </p>
        <p>
          <strong>Contract:</strong> {config.plvx_contract_package_hash}
        </p>
      </div>
    </div>
  );
};
