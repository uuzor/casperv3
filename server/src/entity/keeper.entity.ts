import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'keepers' })
export class Keeper {
  @PrimaryColumn({ name: 'address' })
  address: string;

  @Column({ name: 'is_active' })
  isActive: boolean;
}