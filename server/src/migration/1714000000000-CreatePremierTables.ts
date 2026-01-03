import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePremierTables1714000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table if not exists seasons (
        season_id int unsigned NOT NULL,
        start_time datetime NOT NULL,
        current_turn int NOT NULL,
        is_active bool NOT NULL,
        winner_team_id tinyint unsigned NULL,
        total_pool varchar(128) NOT NULL,
        season_winner_pool varchar(128) NOT NULL,
        PRIMARY KEY (season_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
    `);

    await queryRunner.query(`
      create table if not exists matches (
        match_id int unsigned NOT NULL,
        season_id int unsigned NOT NULL,
        turn_number int NOT NULL,
        home_team_id tinyint unsigned NOT NULL,
        away_team_id tinyint unsigned NOT NULL,
        home_score tinyint unsigned NULL,
        away_score tinyint unsigned NULL,
        result varchar(16) NULL,
        start_time datetime NOT NULL,
        is_finished bool NOT NULL,
        PRIMARY KEY (match_id),
        KEY season_id_idx (season_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
    `);

    await queryRunner.query(`
      create table if not exists bets (
        bet_id varchar(128) NOT NULL,
        \`user\` varchar(64) NOT NULL,
        match_id int unsigned NOT NULL,
        predicted_result varchar(16) NOT NULL,
        amount varchar(128) NOT NULL,
        odds varchar(128) NOT NULL,
        is_settled bool NOT NULL,
        is_won bool NOT NULL,
        payout varchar(128) NOT NULL,
        deploy_hash varchar(64) NULL,
        timestamp datetime NULL,
        PRIMARY KEY (bet_id),
        KEY match_id_idx (match_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
    `);

    await queryRunner.query(`
      create table if not exists badges (
        token_id varchar(128) NOT NULL,
        team_id tinyint unsigned NOT NULL,
        owner varchar(64) NOT NULL,
        betting_bonus int NOT NULL,
        listed_price varchar(128) NULL,
        PRIMARY KEY (token_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
    `);

    await queryRunner.query(`
      create table if not exists keepers (
        address varchar(64) NOT NULL,
        is_active bool NOT NULL,
        PRIMARY KEY (address)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists bets;`);
    await queryRunner.query(`drop table if exists matches;`);
    await queryRunner.query(`drop table if exists seasons;`);
    await queryRunner.query(`drop table if exists badges;`);
    await queryRunner.query(`drop table if exists keepers;`);
  }
}
