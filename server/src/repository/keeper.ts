import { DataSource, Repository } from 'typeorm';
import { Keeper } from '../entity/keeper.entity';

export class KeeperRepository {
  private repo: Repository<Keeper>;
  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Keeper);
  }

  save(keeper: Partial<Keeper>) {
    return this.repo.save(keeper as Keeper);
  }

  findById(address: string) {
    return this.repo.findOneBy({ address });
  }

  findAll() {
    return this.repo.find({ order: { address: 'ASC' } });
  }
}