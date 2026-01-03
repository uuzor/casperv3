import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'bets' })
export class Bet {
  @PrimaryColumn({ name: 'bet_id' })
  betId: string;

  @Column({ name: 'user' })
  user: string;

  @Column({ name: 'match_id' })
  matchId: number;

  @Column({ name: 'predicted_result' })
  predictedResult: string;

  @Column({ name: 'amount' })
  amount: string;

  @Column({ name: 'odds' })
  odds: string;

  @Column({ name: 'is_settled' })
  isSettled: boolean;

  @Column({ name: 'is_won' })
  isWon: boolean;

  @Column({ name: 'payout' })
  payout: string;

  @Column({ name: 'deploy_hash', nullable: true })
  deployHash?: string;

  @Column({ name: 'timestamp', nullable: true })
  timestamp?: Date;
}