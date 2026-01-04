# PLVX Frontend Integration Guide

## Overview

This document explains how to integrate the PLVX Premier League Betting contract with your frontend application. The contract is deployed on Casper testnet.

**Contract Package Hash:** `e1b3a8a7d762a94ec02b3eb5562eb4206e8567095752aacc92595280612fa508`

**Transaction Explorer:** https://testnet.cspr.live/transaction/466c31ff1315c3f21e74deef0d5de8365bd9ccceeeed0c3ac912a4332796a766

## Architecture

Since Casper doesn't support view functions like Solidity, all data must come from **events emitted by the smart contract**. The architecture consists of:

1. **Smart Contract** - Emits events when state changes
2. **Event Handler** (server) - Listens to blockchain events and stores in database
3. **API Server** - Provides REST endpoints for querying data
4. **Frontend** - Calls API for data, builds transactions for writes

```
┌─────────────┐         ┌──────────────┐         ┌──────────┐
│   Frontend  │────────▶│  API Server  │────────▶│ Database │
│             │◀────────│              │◀────────│          │
└─────────────┘         └──────────────┘         └──────────┘
       │                                                ▲
       │ (Sign & Send)                                 │
       ▼                                               │
┌─────────────┐         ┌──────────────┐              │
│   Wallet    │────────▶│  Blockchain  │──────────────┘
│ (CsprClick) │         │   (Casper)   │  (Events)
└─────────────┘         └──────────────┘
```

## Files Created

### 1. Configuration
- **`client/public/config.js`** - Contract hash and API URLs

### 2. Transaction Builders
- **`client/src/utils/plvx-transaction.ts`** - Functions to build transactions for contract calls

### 3. API Utilities
- **`client/src/api/plvx-requests.ts`** - Functions to fetch data from backend

### 4. Example Component
- **`client/src/components/plvx/BettingInterface.tsx`** - Reference implementation

### 5. Server Endpoints
- **`server/src/api.ts`** - Added `/plvx-wasm` endpoint

## Quick Start

### 1. Build the Contract WASM

```bash
cd smart-contract/plvx
cargo odra build -c PremierLeagueImproved
```

This creates `smart-contract/plvx/wasm/PremierLeagueImproved.wasm`

### 2. Start the Server

The server will serve the WASM file:

```bash
cd server
npm install
npm run dev
```

Server will run on `http://localhost:4000`

### 3. Use in Your Frontend

```typescript
import {
  buildPlaceBetTransaction,
  MatchResult,
  csprToMotes,
} from '@/utils';
import { getCurrentSeason, getUpcomingMatches } from '@/api';

// Example: Place a bet
const placeBet = async (userAddress: string, matchId: number) => {
  // Build transaction
  const tx = await buildPlaceBetTransaction(
    { sender: userAddress, gasLimit: config.gas_limit_bet },
    matchId,
    MatchResult.HomeWin,
    csprToMotes(5) // 5 CSPR
  );

  // Sign and send via CsprClick wallet
  const result = await window.csprclick.signTransaction(tx.transaction.Version1);

  console.log('Bet placed:', result.transactionHash);
};
```

## Available Functions

### Transaction Builders

All functions in `plvx-transaction.ts` return a transaction object that can be signed by the wallet:

#### Betting
```typescript
// Place a bet on a match
buildPlaceBetTransaction(
  params: TransactionParams,
  matchId: number,
  predictedResult: MatchResult,
  amount: string // in motes
)

// Settle a bet after match finishes
buildSettleBetTransaction(
  params: TransactionParams,
  betId: string
)
```

#### Season Predictions
```typescript
// Predict season winner (FREE)
buildPredictSeasonWinnerTransaction(
  params: TransactionParams,
  seasonId: number,
  teamId: number
)

// Claim season prize after season ends
buildClaimSeasonPrizeTransaction(
  params: TransactionParams,
  seasonId: number
)
```

#### NFT Badges
```typescript
// Mint a team badge
buildMintBadgeTransaction(
  params: TransactionParams,
  teamId: number
)

// List badge for sale
buildListBadgeTransaction(
  params: TransactionParams,
  tokenId: string,
  price: string
)

// Buy a listed badge
buildBuyBadgeTransaction(
  params: TransactionParams,
  tokenId: string,
  price: string
)
```

#### Admin Functions (Owner/Keeper only)
```typescript
// Start a new season
buildStartSeasonTransaction(params: TransactionParams)

// End season and declare winner
buildEndSeasonTransaction(params: TransactionParams, seasonId: number)

// Simulate a match
buildSimulateMatchTransaction(params: TransactionParams, matchId: number)

// Settle bets in batch
buildSettleMatchBetsBatchTransaction(
  params: TransactionParams,
  matchId: number,
  start: number,
  count: number
)
```

### API Requests

All functions in `plvx-requests.ts` fetch data from the backend:

#### Seasons
```typescript
getSeasons() // Get all seasons
getSeason(seasonId: number) // Get specific season
getCurrentSeason() // Get active season
```

#### Matches
```typescript
getMatches(params?: { seasonId?, turnNumber? })
getMatch(matchId: number)
getCurrentTurnMatches(seasonId: number)
getUpcomingMatches(seasonId?: number)
getFinishedMatches(seasonId?: number)
```

#### Bets
```typescript
getMatchBets(matchId: number)
getBet(betId: string)
getUserBets(userAddress: string, matchId?: number)
```

#### Analytics
```typescript
getMatchBettingPool(matchId: number) // Get betting distribution
calculateOdds(matchId: number, result: string) // Calculate current odds
isBettingOpen(match: Match) // Check if betting is open
```

## Example: Complete Betting Flow

```typescript
import {
  buildPlaceBetTransaction,
  MatchResult,
  csprToMotes,
  getTeamName,
} from '@/utils';
import {
  getCurrentSeason,
  getUpcomingMatches,
  calculateOdds,
  isBettingOpen,
} from '@/api';

async function placeBetExample(userAddress: string) {
  try {
    // 1. Get current season
    const season = await getCurrentSeason();
    if (!season) throw new Error('No active season');

    // 2. Get upcoming matches
    const matches = await getUpcomingMatches(season.season_id);
    const match = matches[0];

    if (!isBettingOpen(match)) {
      throw new Error('Betting is closed');
    }

    // 3. Calculate odds
    const odds = await calculateOdds(match.match_id, 'HomeWin');
    console.log(`Odds for ${getTeamName(match.home_team_id)}: ${odds}x`);

    // 4. Build transaction
    const tx = await buildPlaceBetTransaction(
      { sender: userAddress, gasLimit: config.gas_limit_bet },
      match.match_id,
      MatchResult.HomeWin,
      csprToMotes(10) // 10 CSPR bet
    );

    // 5. Sign and send
    const result = await window.csprclick.signTransaction(tx.transaction.Version1);

    console.log('✅ Bet placed!', result.transactionHash);
    console.log(`View on explorer: https://testnet.cspr.live/transaction/${result.transactionHash}`);

    return result;
  } catch (error) {
    console.error('❌ Failed to place bet:', error);
    throw error;
  }
}
```

## TypeScript Types

All types are exported from the API module:

```typescript
interface Season {
  season_id: number;
  start_time: string;
  current_turn: number;
  is_active: boolean;
  winner_team_id?: number;
  total_pool: string;
  season_winner_pool: string;
}

interface Match {
  match_id: number;
  season_id: number;
  turn_number: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  result?: 'HomeWin' | 'Draw' | 'AwayWin';
  start_time: string;
  is_finished: boolean;
}

interface Bet {
  bet_id: string;
  user: string;
  match_id: number;
  predicted_result: 'HomeWin' | 'Draw' | 'AwayWin';
  amount: string;
  odds: string;
  is_settled: boolean;
  is_won: boolean;
  payout: string;
}

enum MatchResult {
  HomeWin = 0,
  Draw = 1,
  AwayWin = 2,
}
```

## Gas Limits

Recommended gas limits are configured in `config.js`:

- **Place Bet:** 5 CSPR (`gas_limit_bet`)
- **Simulate Match:** 8 CSPR (`gas_limit_simulation`)
- **Mint Badge:** 3 CSPR (`gas_limit_mint`)
- **Default:** 10 CSPR (`transaction_payment`)

## Utility Functions

### Currency Conversion
```typescript
csprToMotes(cspr: number | string): string
motesToCspr(motes: string): number
formatCsprAmount(motes: string): string // Returns formatted "10.50 CSPR"
```

### Match Results
```typescript
matchResultToString(result: MatchResult): string
getMatchResultEmoji(result: string): string // Returns 🏠, 🤝, or ✈️
```

### Team Names
```typescript
getTeamName(teamId: number): string // Returns "Arsenal", "Chelsea", etc.
```

### Time Formatting
```typescript
getTimeUntilMatch(match: Match): number // Milliseconds until match
formatTimeRemaining(ms: number): string // "2h 30m" or "45m 30s"
```

## Event Handling

The contract emits these events (handled by server `event-handler.ts`):

- **SeasonStarted** - New season created
- **MatchScheduled** - Match scheduled
- **MatchFinished** - Match completed with scores
- **BetPlaced** - User placed a bet
- **BetSettled** - Bet resolved
- **SeasonWinnerDeclared** - Season ended
- **BadgeMinted** - NFT badge created
- **KeeperAdded/KeeperRemoved** - Keeper management

## Testing

Use the example component to test:

```typescript
import { BettingInterface } from '@/components/plvx/BettingInterface';

function App() {
  const [userAddress, setUserAddress] = useState<string>();

  return (
    <div>
      <button onClick={async () => {
        const account = await window.csprclick.getActivePublicKey();
        setUserAddress(account);
      }}>
        Connect Wallet
      </button>

      <BettingInterface userAddress={userAddress} />
    </div>
  );
}
```

## Troubleshooting

### Transaction Fails

1. **Check gas limit** - Increase if needed
2. **Verify contract hash** - Ensure `config.plvx_contract_package_hash` is correct
3. **Check wallet connection** - Ensure CsprClick is connected
4. **View transaction** - Check on cspr.live for error details

### WASM Not Found

```bash
# Build the contract
cd smart-contract/plvx
cargo odra build -c PremierLeagueImproved

# Verify WASM exists
ls -lh wasm/PremierLeagueImproved.wasm
```

### API Errors

1. **Ensure server is running** - `npm run dev` in `server/`
2. **Check database** - Event handler must be running to populate data
3. **Verify API URL** - Check `config.plvx_api_url` in `config.js`

## Next Steps

1. **Event Handler** - Set up server to listen for contract events
2. **Database Schema** - Ensure premier tables exist (migration already created)
3. **UI/UX** - Customize the `BettingInterface` component for your design
4. **Real-time Updates** - Add WebSocket for live match updates
5. **User Dashboard** - Show user's bets, badges, and winnings

## Resources

- **Contract Source:** `smart-contract/plvx/src/premier_league_improved.rs`
- **Deployment Script:** `smart-contract/plvx/bin/cli.rs`
- **Server API:** `server/src/api.ts` (lines 152-230)
- **Database Entities:** `server/src/entity/*.entity.ts`
- **Casper SDK Docs:** https://docs.casper.network/

## Support

For issues or questions:
1. Check transaction on testnet.cspr.live
2. Review contract events
3. Check server logs for API errors
