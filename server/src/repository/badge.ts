import { DataSource, Repository } from 'typeorm';
import { Badge } from '../entity/badge.entity';

export class BadgeRepository {
  private repo: Repository<Badge>;
  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Badge);
  }

  save(badge: Partial<Badge>) {
    return this.repo.save(badge as Badge);
  }

  findById(tokenId: string) {
    return this.repo.findOneBy({ tokenId });
  }
}