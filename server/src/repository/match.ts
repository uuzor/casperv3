import { DataSource, Repository } from 'typeorm';
import { Match } from '../entity/match.entity';

interface FindMatchesFilters {
  seasonId?: number;
  turnNumber?: number;
}

export class MatchRepository {
  private repo: Repository<Match>;
  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Match);
  }

  save(match: Partial<Match>) {
    return this.repo.save(match as Match);
  }

  findById(matchId: number) {
    return this.repo.findOneBy({ matchId });
  }

  findByFilters(filters: FindMatchesFilters) {
    const where: any = {};

    if (filters.seasonId !== undefined) where.seasonId = filters.seasonId;
    if (filters.turnNumber !== undefined) where.turnNumber = filters.turnNumber;

    return this.repo.find({ where, order: { matchId: 'ASC' } });
  }
}