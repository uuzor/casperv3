import React from 'react';
import { TeamStats, PLVXUtils } from '../plvx-integration';

interface LeagueTableProps {
  teamStats: TeamStats[];
  seasonId: number;
}

export const LeagueTable: React.FC<LeagueTableProps> = ({ teamStats, seasonId }) => {
  // Sort by points (desc), then goal difference, then goals for
  const sortedStats = [...teamStats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const gdA = PLVXUtils.calculateGoalDifference(a);
    const gdB = PLVXUtils.calculateGoalDifference(b);
    if (gdB !== gdA) return gdB - gdA;

    return b.goals_for - a.goals_for;
  });

  const getPositionColor = (position: number): string => {
    if (position === 1) return 'bg-yellow-100 border-l-4 border-yellow-500';
    if (position <= 4) return 'bg-blue-50 border-l-4 border-blue-500';
    if (position >= 18) return 'bg-red-50 border-l-4 border-red-500';
    return 'bg-white';
  };

  return (
    <div className="league-table bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">
        ⚽ Premier League Table - Season {seasonId}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left">
              <th className="py-3 px-2 text-sm font-semibold text-gray-600">Pos</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600">Team</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">P</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">W</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">D</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">L</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">GF</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">GA</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">GD</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">Pts</th>
              <th className="py-3 px-2 text-sm font-semibold text-gray-600 text-center">Form</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stats, index) => {
              const position = index + 1;
              const totalMatches = stats.wins + stats.draws + stats.losses;
              const goalDifference = PLVXUtils.calculateGoalDifference(stats);
              const winPercentage = PLVXUtils.calculateWinPercentage(stats);

              return (
                <tr
                  key={stats.team_id}
                  className={`border-b transition-colors hover:bg-gray-50 ${getPositionColor(position)}`}
                >
                  <td className="py-3 px-2 font-bold text-gray-700">{position}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mr-3 flex items-center justify-center text-white font-bold text-sm">
                        {PLVXUtils.getTeamName(stats.team_id).charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{PLVXUtils.getTeamName(stats.team_id)}</div>
                        <div className="text-xs text-gray-500">
                          Win Rate: {winPercentage.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600">{totalMatches}</td>
                  <td className="py-3 px-2 text-center text-green-600 font-semibold">{stats.wins}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{stats.draws}</td>
                  <td className="py-3 px-2 text-center text-red-600">{stats.losses}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{stats.goals_for}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{stats.goals_against}</td>
                  <td className={`py-3 px-2 text-center font-semibold ${
                    goalDifference > 0 ? 'text-green-600' :
                    goalDifference < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {goalDifference > 0 ? '+' : ''}{goalDifference}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-bold text-lg text-blue-600">{stats.points}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex justify-center space-x-1">
                      {/* Simplified form indicator - would need last 5 matches data */}
                      {totalMatches > 0 && (
                        <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                          W
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-500 mr-2"></div>
            <span>Champion</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-500 mr-2"></div>
            <span>Champions League</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-50 border-l-4 border-red-500 mr-2"></div>
            <span>Relegation</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          <strong>P</strong>=Played, <strong>W</strong>=Wins, <strong>D</strong>=Draws,
          <strong>L</strong>=Losses, <strong>GF</strong>=Goals For, <strong>GA</strong>=Goals Against,
          <strong>GD</strong>=Goal Difference, <strong>Pts</strong>=Points
        </div>
      </div>
    </div>
  );
};
