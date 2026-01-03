import { DataSource, Repository } from 'typeorm';
import { Season } from '../entity/season.entity';

export class SeasonRepository {
  private repo: Repository<Season>;
  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Season);
  }

  save(season: Partial<Season>) {
    return this.repo.save(season as Season);
  }

  findById(seasonId: number) {
    return this.repo.findOneBy({ seasonId });
  }

  findAll() {
    return this.repo.find({ order: { seasonId: 'DESC' } });
  }
}