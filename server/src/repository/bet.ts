import { DataSource, Repository } from 'typeorm';
import { Bet } from '../entity/bet.entity';

export class BetRepository {
  private repo: Repository<Bet>;
  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Bet);
  }

  save(bet: Partial<Bet>) {
    return this.repo.save(bet as Bet);
  }

  findById(betId: string) {
    return this.repo.findOneBy({ betId });
  }

  findByMatch(matchId: number) {
    return this.repo.find({ where: { matchId }, order: { betId: 'ASC' } });
  }
}