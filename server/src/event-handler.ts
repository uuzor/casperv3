import 'reflect-metadata';

import { config } from './config';
import WebSocket from 'ws';

import { Play } from './entity/play.entity';
import { PlayRepository } from './repository/play';
import { PlayEventPayload, Event } from './events';
import { AppDataSource } from './data-source';

// Premier League imports
import { Season } from './entity/season.entity';
import { Match } from './entity/match.entity';
import { Bet } from './entity/bet.entity';
import { Badge } from './entity/badge.entity';
import { Keeper } from './entity/keeper.entity';

import { SeasonRepository } from './repository/season';
import { MatchRepository } from './repository/match';
import { BetRepository } from './repository/bet';
import { BadgeRepository } from './repository/badge';
import { KeeperRepository } from './repository/keeper';

import { AppDataSource } from './data-source';

async function startListener() {
  let backoff = 1000;
  let lastPingTimestamp = new Date();

  const wsFactory = () => new WebSocket(
    `${config.csprCloudStreamingUrl}/contract-events?contract_package_hash=${config.lotteryContractPackageHash}`,
    {
      headers: {
        authorization: config.csprCloudAccessKey,
      },
    },
  );

  function connect() {
    const ws = wsFactory();

    ws.on('open', () => {
      console.log(`Connected to streaming API: ${config.csprCloudStreamingUrl}`);
      backoff = 1000; // reset
    });

    setInterval(() => {
      const now = new Date();
      if (now.getTime() - lastPingTimestamp.getTime() > config.pingCheckIntervalInMilliseconds) {
        console.log(`No ping events from Streaming API for ${config.pingCheckIntervalInMilliseconds/1000} seconds, closing ws connection...`);
        ws.close();
      }
    }, config.pingCheckIntervalInMilliseconds);

    ws.on('message', async (data: Buffer) => {
      const rawData = data.toString();

      if (rawData === 'Ping') {
        lastPingTimestamp = new Date();
        return;
      }

      try {
        console.log('New event: ', rawData);
        
        const event = JSON.parse(rawData) as Event<PlayEventPayload>;

        const play: Partial<Play> = {
          playId: event.data.data.play_id,
          roundId: event.data.data.round_id.toString(),
          playerAccountHash: event.data.data.player.replace(/^account-hash-/, ''),
          prizeAmount: event.data.data.prize_amount,
          jackpotAmount: event.data.data.jackpot_amount,
          isJackpot: event.data.data.is_jackpot,
          deployHash: event.extra.deploy_hash,
          timestamp: new Date(event.data.data.timestamp),
        };
        await new PlayRepository(AppDataSource).save(play);
      } catch (err) {
        console.log('Error parsing message:', err);
      }
    });

    ws.on('error', (err) => {
      console.log(`Received a WS error: ${err.message}`);
      ws.close();
    })

    ws.on('close', () => {
      console.log('Disconnected from Streaming API, retrying...');
      setTimeout(() => {
        backoff = Math.min(backoff * 2, 60_000);
        connect();
      }, backoff);
    });
  }

  connect();
  console.log('Handler started running for lottery...')
}

async function startPremierListener() {
  let backoff = 1000;
  let lastPingTimestamp = new Date();

  const seasonRepo = new SeasonRepository(AppDataSource);
  const matchRepo = new MatchRepository(AppDataSource);
  const betRepo = new BetRepository(AppDataSource);
  const badgeRepo = new BadgeRepository(AppDataSource);
  const keeperRepo = new KeeperRepository(AppDataSource);

  const wsFactory = () => new WebSocket(
    `${config.csprCloudStreamingUrl}/contract-events?contract_package_hash=${config.premierContractPackageHash}`,
    {
      headers: {
        authorization: config.csprCloudAccessKey,
      },
    },
  );

  function connect() {
    const ws = wsFactory();

    ws.on('open', () => {
      console.log(`Connected to Premier streaming API: ${config.csprCloudStreamingUrl}`);
      backoff = 1000; // reset
    });

    setInterval(() => {
      const now = new Date();
      if (now.getTime() - lastPingTimestamp.getTime() > config.pingCheckIntervalInMilliseconds) {
        console.log(`No ping events from Premier Streaming API for ${config.pingCheckIntervalInMilliseconds/1000} seconds, closing ws connection...`);
        ws.close();
      }
    }, config.pingCheckIntervalInMilliseconds);

    ws.on('message', async (data: Buffer) => {
      const rawData = data.toString();

      if (rawData === 'Ping') {
        lastPingTimestamp = new Date();
        return;
      }

      try {
        console.log('Premier event: ', rawData);

        const event = JSON.parse(rawData) as Event<any>;
        const name = event.data.name;
        const payload = event.data.data;
        const deployHash = event.extra.deploy_hash;

        switch (name) {
          case 'SeasonStarted': {
            const s: Partial<Season> = {
              seasonId: Number(payload.season_id),
              startTime: new Date(Number(payload.start_time)),
              currentTurn: 0,
              isActive: true,
              winnerTeamId: null,
              totalPool: '0',
              seasonWinnerPool: '0',
            };
            await seasonRepo.save(s);
            break;
          }
          case 'MatchScheduled': {
            const m: Partial<Match> = {
              matchId: Number(payload.match_id),
              seasonId: Number(payload.season_id),
              turnNumber: Number(payload.turn_number),
              homeTeamId: Number(payload.home_team_id),
              awayTeamId: Number(payload.away_team_id),
              startTime: new Date(Number(payload.start_time)),
              isFinished: false,
            };
            await matchRepo.save(m);
            break;
          }
          case 'MatchFinished': {
            const matchId = Number(payload.match_id);
            const updated: Partial<Match> = {
              matchId,
              homeScore: Number(payload.home_score),
              awayScore: Number(payload.away_score),
              result: payload.result ? String(payload.result) : undefined,
              isFinished: true,
            };
            await matchRepo.save(updated);
            break;
          }
          case 'BetPlaced': {
            const b: Partial<Bet> = {
              betId: String(payload.bet_id),
              user: String((payload.user || '').replace(/^account-hash-/, '')),
              matchId: Number(payload.match_id),
              predictedResult: String(payload.predicted_result),
              amount: String(payload.amount || '0'),
              odds: String(payload.odds || '0'),
              isSettled: false,
              isWon: false,
              payout: '0',
              deployHash,
              timestamp: new Date(),
            };
            await betRepo.save(b);
            break;
          }
          case 'BetSettled': {
            const betId = String(payload.bet_id);
            const existing = await betRepo.findById(betId);
            const updated: Partial<Bet> = {
              betId,
              isSettled: true,
              isWon: !!payload.is_won,
              payout: String(payload.payout || '0'),
            };
            await betRepo.save({ ...(existing || {}), ...updated });
            break;
          }
          case 'SeasonWinnerDeclared': {
            const seasonId = Number(payload.season_id);
            const updated: Partial<Season> = {
              seasonId,
              winnerTeamId: Number(payload.team_id),
              seasonWinnerPool: String(payload.prize_pool || '0'),
            };
            await seasonRepo.save(updated);
            break;
          }
          case 'BadgeMinted': {
            const b: Partial<Badge> = {
              tokenId: String(payload.token_id),
              teamId: Number(payload.team_id),
              owner: String((payload.owner || '').replace(/^account-hash-/, '')),
              bettingBonus: Number(payload.betting_bonus || 0),
            };
            await badgeRepo.save(b);
            break;
          }
          case 'KeeperAdded': {
            const k: Partial<Keeper> = {
              address: String((payload.keeper || '').replace(/^account-hash-/, '')),
              isActive: true,
            };
            await keeperRepo.save(k);
            break;
          }
          case 'KeeperRemoved': {
            const addr = String((payload.keeper || '').replace(/^account-hash-/, ''));
            await keeperRepo.save({ address: addr, isActive: false });
            break;
          }
          case 'SeasonPrizeClaimed': {
            // For now, we just log claims — could extend with claims table
            console.log('SeasonPrizeClaimed by', payload.user, 'amount', payload.amount);
            break;
          }
          default:
            console.log('Unhandled premier event:', name);
        }
      } catch (err) {
        console.log('Error parsing premier message:', err);
      }
    });

    ws.on('error', (err) => {
      console.log(`Received a Premier WS error: ${err.message}`);
      ws.close();
    })

    ws.on('close', () => {
      console.log('Disconnected from Premier Streaming API, retrying...');
      setTimeout(() => {
        backoff = Math.min(backoff * 2, 60_000);
        connect();
      }, backoff);
    });
  }

  connect();
  console.log('Premier handler started running...')
}

async function main() {
  await AppDataSource.initialize();
  await Promise.all([startListener(), startPremierListener()]);
}

main().catch((err) => {
  console.error('Fatal error in event listener:', err);
  process.exit(1);
});
