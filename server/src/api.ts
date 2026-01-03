import 'reflect-metadata';

import http from 'http';
import path from 'path';

import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppDataSource } from './data-source';

import { config } from './config';
import { PlayRepository } from './repository/play';

import fs from 'fs';
import { RoundRepository } from './repository/round';
import { PaginationParams, pagination } from './middleware/pagination';
import { CSPRCloudAPIClient } from './cspr-cloud/api-client';

// DEX imports
import { PoolDeploymentService } from './dex/pool-deployment.service';
import { DeployPoolRequest, GetPoolRequest } from './dex/types';

const app: Express = express();
app.use(cors<Request>());
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);

interface FindPlaysByPlayerParams {
  player_account_hash: string;
}

interface FindPlaysByRoundParams {
  round_id: string;
}

async function main() {
  await AppDataSource.initialize();

  const playsRepository = new PlayRepository(AppDataSource);
  const roundsRepository = new RoundRepository(AppDataSource);

  const csprCloudClient = new CSPRCloudAPIClient(config.csprCloudApiUrl, config.csprCloudAccessKey);

  // Initialize Premier League repositories
  const seasonRepository = new (await import('./repository/season')).SeasonRepository(AppDataSource);
  const matchRepository = new (await import('./repository/match')).MatchRepository(AppDataSource);
  const betRepository = new (await import('./repository/bet')).BetRepository(AppDataSource);
  const badgeRepository = new (await import('./repository/badge')).BadgeRepository(AppDataSource);
  const keeperRepository = new (await import('./repository/keeper')).KeeperRepository(AppDataSource);

  // Initialize DEX services
  const poolDeploymentService = new PoolDeploymentService();

  const csprCloudAPIProxy = createProxyMiddleware({
    target: config.csprCloudApiUrl,
    changeOrigin: true,
    headers: {
      authorization: config.csprCloudAccessKey,
    },
  });
  app.get('/accounts/:account_hash', csprCloudAPIProxy);

  app.get('/players/:player_account_hash/plays', pagination(), async (req: Request<FindPlaysByPlayerParams, never, never, PaginationParams>, res: Response) => {
    try {
      const [plays, total] = await playsRepository.getPaginatedPlays({
        playerAccountHash: req.params.player_account_hash,
      },{
        limit: req.query.limit,
        offset: req.query.offset,
      });

      await csprCloudClient.withPublicKeys(plays as any);

      res.json({ data: plays, total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/rounds/latest/plays', pagination(), async (req: Request<never, never, never, PaginationParams>, res: Response) => {
    try {
      const [plays, total] = await playsRepository.getLatestRoundPlays({
        limit: req.query.limit,
        offset: req.query.offset,
      });

      await csprCloudClient.withPublicKeys(plays as any);

      res.json({ data: plays, total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/rounds/:round_id/plays', pagination(), async (req: Request<FindPlaysByRoundParams, never, never, PaginationParams>, res: Response) => {
    try {
      const [plays, total] = await playsRepository.getPaginatedPlays({
        roundId: req.params.round_id,
      },{
        limit: req.query.limit,
        offset: req.query.offset,
      });

      await csprCloudClient.withPublicKeys(plays as any);

      res.json({ data: plays, total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/rounds/latest', async (req: Request<never, never, never, { is_finished: string }>, res: Response) => {
    try {
      const isFinished = req.query.is_finished === 'true';

      const round = await roundsRepository.getLatest({ isFinished });

      if (round) {
        await csprCloudClient.withPublicKeys([round as any]);
      }

      res.json({ data: round });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/rounds', pagination(), async (req: Request<never, never, never, PaginationParams & { is_finished: string }>, res: Response) => {
    try {
      const isFinished = req.query.is_finished === 'true';

      const [rounds, total] = await roundsRepository.getPaginatedRounds({
        limit: req.query.limit,
        offset: req.query.offset,
      }, { isFinished });

      await csprCloudClient.withPublicKeys(rounds as any);

      res.json({ data: rounds, total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/proxy-wasm', async (_: Request, res: Response) => {
    fs.createReadStream(path.resolve(__dirname, `./resources/proxy_caller.wasm`)).pipe(res);
  });

  // PLVX Contract WASM endpoint
  app.get('/plvx-wasm', async (_: Request, res: Response) => {
    try {
      const wasmPath = path.resolve(__dirname, '../../smart-contract/plvx/wasm/PremierLeagueImproved.wasm');

      if (!fs.existsSync(wasmPath)) {
        return res.status(404).json({
          error: 'PremierLeagueImproved.wasm not found. Build the contract first.',
        });
      }

      res.setHeader('Content-Type', 'application/wasm');
      res.setHeader('Content-Disposition', 'attachment; filename=PremierLeagueImproved.wasm');
      fs.createReadStream(wasmPath).pipe(res);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  });

  // =================== PREMIER LEAGUE ENDPOINTS ===================

  app.get('/premier/seasons', async (_: Request, res: Response) => {
    try {
      const seasons = await seasonRepository.findAll();
      res.json({ data: seasons });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/premier/seasons/:season_id', async (req: Request, res: Response) => {
    try {
      const season = await seasonRepository.findById(Number(req.params.season_id));
      if (!season) return res.status(404).json({ error: 'Season not found' });
      res.json({ data: season });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/premier/matches', async (req: Request, res: Response) => {
    try {
      const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
      const turnNumber = req.query.turnNumber ? Number(req.query.turnNumber) : undefined;

      const matches = await matchRepository.findByFilters({ seasonId, turnNumber });
      res.json({ data: matches });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/premier/matches/:match_id', async (req: Request, res: Response) => {
    try {
      const match = await matchRepository.findById(Number(req.params.match_id));
      if (!match) return res.status(404).json({ error: 'Match not found' });
      res.json({ data: match });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/premier/matches/:match_id/bets', async (req: Request, res: Response) => {
    try {
      const bets = await betRepository.findByMatch(Number(req.params.match_id));
      res.json({ data: bets });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/premier/bets/:bet_id', async (req: Request, res: Response) => {
    try {
      const bet = await betRepository.findById(String(req.params.bet_id));
      if (!bet) return res.status(404).json({ error: 'Bet not found' });
      res.json({ data: bet });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/premier/badges/:token_id', async (req: Request, res: Response) => {
    try {
      const badge = await badgeRepository.findById(String(req.params.token_id));
      if (!badge) return res.status(404).json({ error: 'Badge not found' });
      res.json({ data: badge });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/premier/keepers', async (_: Request, res: Response) => {
    try {
      const keepers = await keeperRepository.findAll();
      res.json({ data: keepers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // TODO: Add write endpoints (place_bet / simulate_match / settle_batch) when node signing key or keeper workflow is configured


  // ============================================================================
  // DEX API ENDPOINTS
  // ============================================================================

  /**
   * POST /api/dex/deploy-pool
   * Deploy a new liquidity pool
   *
   * Body: { token0: string, token1: string, fee: number, initialPrice?: string }
   * Response: { success, poolAddress?, poolCreationArgs?, deployHash?, error?, steps }
   */
  app.post('/api/dex/deploy-pool', async (req: Request<never, never, DeployPoolRequest>, res: Response) => {
    try {
      const { token0, token1, fee } = req.body;

      if (!token0 || !token1 || !fee) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: token0, token1, fee',
        });
      }

      const result = await poolDeploymentService.deployPool(req.body);

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/dex/pool-args
   * Get pool creation arguments without deploying
   *
   * Body: { token0: string, token1: string, fee: number }
   * Response: { poolCreationArgs, manualDeploymentInstructions }
   */
  app.post('/api/dex/pool-args', async (req: Request<never, never, DeployPoolRequest>, res: Response) => {
    try {
      const { token0, token1, fee } = req.body;

      if (!token0 || !token1 || !fee) {
        return res.status(400).json({
          error: 'Missing required fields: token0, token1, fee',
        });
      }

      // Deploy but only get the args (service will return args if deployer key not configured)
      const result = await poolDeploymentService.deployPool(req.body);

      if (result.poolCreationArgs) {
        const instructions = poolDeploymentService.getManualDeploymentInstructions(result.poolCreationArgs);

        return res.json({
          poolCreationArgs: result.poolCreationArgs,
          manualDeploymentInstructions: instructions,
        });
      } else {
        return res.status(400).json({
          error: result.error || 'Failed to generate pool creation arguments',
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * GET /api/dex/pool-wasm
   * Download Pool.wasm binary
   */
  app.get('/api/dex/pool-wasm', async (_: Request, res: Response) => {
    try {
      const wasmPath = path.resolve(__dirname, '../wasm/Pool.wasm');

      if (!fs.existsSync(wasmPath)) {
        return res.status(404).json({
          error: 'Pool.wasm not found. Ensure it is built and copied to server/wasm/',
        });
      }

      res.setHeader('Content-Type', 'application/wasm');
      res.setHeader('Content-Disposition', 'attachment; filename=Pool.wasm');
      fs.createReadStream(wasmPath).pipe(res);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  });

  app.get('/health', async (_: Request, res: Response) => {
    try {
      await AppDataSource.query('SELECT 1');

      return res.status(200).json({ status: 'UP' });
    } catch (error) {
      return res.status(500).json({ status: 'DOWN', error: error.message });
    }
  });

  server.listen(config.httpPort, () => console.log(`Server running on http://localhost:${config.httpPort}`));
}

main();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  try {
    await AppDataSource.destroy();

    process.exit(0);
  } catch (err) {
    console.log(`received error during graceful shutdown process: ${err.message}`);
    process.exit(1);
  }
}
