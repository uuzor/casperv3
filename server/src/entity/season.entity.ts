import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'seasons' })
export class Season {
  @PrimaryColumn({ name: 'season_id' })
  seasonId: number;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'current_turn' })
  currentTurn: number;

  @Column({ name: 'is_active' })
  isActive: boolean;

  @Column({ name: 'winner_team_id', nullable: true })
  winnerTeamId?: number;

  @Column({ name: 'total_pool' })
  totalPool: string; // store as string (U256)

  @Column({ name: 'season_winner_pool' })
  seasonWinnerPool: string;
}