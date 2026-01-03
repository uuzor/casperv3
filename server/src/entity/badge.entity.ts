import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'badges' })
export class Badge {
  @PrimaryColumn({ name: 'token_id' })
  tokenId: string;

  @Column({ name: 'team_id' })
  teamId: number;

  @Column({ name: 'owner' })
  owner: string;

  @Column({ name: 'betting_bonus' })
  bettingBonus: number;

  @Column({ name: 'listed_price', nullable: true })
  listedPrice?: string;
}