import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'matches' })
export class Match {
  @PrimaryColumn({ name: 'match_id' })
  matchId: number;

  @Column({ name: 'season_id' })
  seasonId: number;

  @Column({ name: 'turn_number' })
  turnNumber: number;

  @Column({ name: 'home_team_id' })
  homeTeamId: number;

  @Column({ name: 'away_team_id' })
  awayTeamId: number;

  @Column({ name: 'home_score', nullable: true })
  homeScore?: number;

  @Column({ name: 'away_score', nullable: true })
  awayScore?: number;

  @Column({ name: 'result', nullable: true })
  result?: string;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'is_finished' })
  isFinished: boolean;
}