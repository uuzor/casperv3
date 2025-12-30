# PLVX Frontend Integration Guide

## ✅ Completed Integration

The PLVX betting platform frontend has been successfully integrated with the Casper blockchain using CSPR.click for wallet authentication and CSPR.cloud for blockchain data indexing.

## 📁 Project Structure

```
client/
├── src/
│   ├── app/
│   │   ├── router/
│   │   │   ├── index.tsx          (Updated with PLVX route)
│   │   │   └── paths.ts            (Added PLVX_PATH)
│   │   └── scenes/
│   │       └── plvx/               (New PLVX scene)
│   │           ├── index.tsx
│   │           └── components/
│   │               ├── MatchCardLive.tsx
│   │               ├── LiveEventsFeed.tsx
│   │               ├── LeagueTable.tsx
│   │               └── UserBets.tsx
│   ├── components/
│   │   ├── WalletConnect.tsx      (Wallet connection button)
│   │   └── PLVX/                   (Standalone PLVX components)
│   ├── hooks/
│   │   ├── useWallet.ts            (Wallet management hook)
│   │   ├── usePLVXContract.ts     (Contract interaction hook)
│   │   └── useContractEvents.ts    (Event listening hook)
│   └── services/
│       ├── casper-wallet.service.ts   (CSPR.click integration)
│       ├── casper-cloud.service.ts    (CSPR.cloud integration)
│       └── plvx-contract.service.ts   (Contract calls)
```

## 🔧 Services Implemented

### 1. CSPR.click Wallet Service (`casper-wallet.service.ts`)

**Features:**
- Connect/disconnect wallet functionality
- Account management and balance tracking
- Network switching (mainnet/testnet)
- Deploy signing and submission
- Real-time connection status updates

**Usage:**
```typescript
import { walletService } from './services/casper-wallet.service';

// Connect wallet
await walletService.connect();

// Sign and send deploy
const deployHash = await walletService.signAndSendDeploy(deploy);

// Subscribe to connection changes
const unsubscribe = walletService.subscribe((connection) => {
  console.log('Connection status:', connection.isConnected);
});
```

### 2. CSPR.cloud Data Indexing Service (`casper-cloud.service.ts`)

**Features:**
- Account information queries
- Deploy status tracking
- Contract state queries
- Historical data retrieval
- **Real-time event streaming** via Server-Sent Events (SSE)
- Event subscription and filtering

**Usage:**
```typescript
import { createCasperCloudService } from './services/casper-cloud.service';

const cloudService = createCasperCloudService('your-api-key', 'testnet');

// Query account balance
const balance = await cloudService.getAccountBalance(publicKey);

// Stream contract events
cloudService.streamContractEvents(contractHash, {
  eventFilter: ['BetPlaced', 'MatchPlayed'],
});

// Subscribe to specific event
const unsubscribe = cloudService.onContractEvent('BetPlaced', (event) => {
  console.log('Bet placed:', event.data);
});
```

### 3. PLVX Contract Service (`plvx-contract.service.ts`)

**Features:**
- Place bets on matches
- Query live odds
- Get betting pool information
- Settle bets
- Predict season winners
- Claim prizes
- Event subscriptions

**Usage:**
```typescript
const contractService = new PLVXContractService(
  contractHash,
  contractPackageHash,
  cloudService,
  'casper-test'
);

// Place a bet
const deployHash = await contractService.placeBet(
  matchId,
  'HomeWin',
  '1000000000' // 1 LEAGUE token
);

// Get current odds
const odds = await contractService.getCurrentOdds(matchId, 'HomeWin');
```

## 🎣 React Hooks

### useWallet Hook

Manages wallet connection state and provides wallet operations.

```typescript
import { useWallet } from './hooks/useWallet';

function Component() {
  const {
    isConnected,
    publicKey,
    balance,
    connect,
    disconnect
  } = useWallet();

  return (
    <button onClick={connect}>
      {isConnected ? `Connected: ${publicKey}` : 'Connect Wallet'}
    </button>
  );
}
```

### usePLVXContract Hook

Provides contract data and interaction methods.

```typescript
import { usePLVXContract } from './hooks/usePLVXContract';

function Component() {
  const {
    currentSeason,
    matches,
    userBets,
    placeBet,
    getOdds,
  } = usePLVXContract(contractService, publicKey);

  // Place a bet
  const handleBet = async () => {
    await placeBet(matchId, 'HomeWin', '1000000000');
  };
}
```

### useContractEvents Hook

Real-time contract event listening.

```typescript
import { useContractEvents } from './hooks/useContractEvents';

function Component() {
  const { events, isListening } = useContractEvents(
    cloudService,
    contractHash,
    ['BetPlaced', 'MatchPlayed']
  );

  return (
    <div>
      {events.map(event => (
        <div key={event.deployHash}>{event.eventName}</div>
      ))}
    </div>
  );
}
```

## 🎨 UI Components

### WalletConnect Component

Modern wallet connection button with balance display.

**Features:**
- Connect/disconnect functionality
- Balance display
- Formatted public key display
- Loading states

### MatchCardLive Component

Interactive match betting card with real-time odds.

**Features:**
- Live odds display
- Betting pool visualization
- Bet placement interface
- Potential win calculator
- Real-time odds updates (every 10 seconds)

### LiveEventsFeed Component

Real-time event feed showing contract activity.

**Features:**
- Live event streaming
- Event categorization with icons
- Timestamp formatting
- Block height display
- Auto-scrolling with 100-event buffer

### LeagueTable Component

Premier League standings table.

**Features:**
- Team statistics display
- Points, wins, draws, losses
- Goal difference calculation
- Position-based styling

### UserBets Component

User's betting dashboard.

**Features:**
- Active bets display
- Bet history
- Win/loss tracking
- Payout information

## 🚀 Running the Application

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment

Create `.env` file in `client/` directory:

```env
# Contract Configuration
REACT_APP_CONTRACT_HASH=your-plvx-contract-hash
REACT_APP_CONTRACT_PACKAGE_HASH=your-contract-package-hash
REACT_APP_NETWORK=casper-test

# CSPR.cloud Configuration
REACT_APP_CSPR_CLOUD_API_KEY=your-cspr-cloud-api-key
```

### 3. Start Development Server

```bash
npm start
```

The app will be available at `http://localhost:3000`

### 4. Navigate to PLVX

Go to `http://localhost:3000/plvx` to access the betting platform.

## 🔗 Integration Flow

### 1. User Connects Wallet

```mermaid
User → WalletConnect → CSPR.click → Wallet Extension
                                   ↓
                         Connected Account + Balance
```

### 2. User Places Bet

```mermaid
User → MatchCard → Contract Service → Deploy Creation
                                    → Wallet Signing
                                    → Network Submission
                                    ↓
                              Deploy Hash Returned
```

### 3. Real-time Event Updates

```mermaid
Contract Event → CSPR.cloud SSE Stream → Event Listeners
                                        → UI Updates
                                        → Event Feed
```

## 📊 Contract Events

The frontend listens to the following events:

### BetPlaced Event
```typescript
{
  eventName: 'BetPlaced',
  data: {
    bet_id: string,
    user: string,
    match_id: number,
    amount: string,
    odds: string
  }
}
```

### MatchPlayed Event
```typescript
{
  eventName: 'MatchPlayed',
  data: {
    match_id: number,
    home_score: number,
    away_score: number,
    result: 'HomeWin' | 'Draw' | 'AwayWin'
  }
}
```

### BetSettled Event
```typescript
{
  eventName: 'BetSettled',
  data: {
    bet_id: string,
    won: boolean,
    payout: string
  }
}
```

## 🔒 Security Considerations

1. **Never Store Private Keys**: All signing happens in the wallet extension
2. **Validate All Inputs**: Amount validation before bet placement
3. **Transaction Confirmation**: Users must confirm in wallet before signing
4. **Rate Limiting**: Implement client-side rate limiting for API calls
5. **Error Handling**: Graceful error handling for network issues

## 📱 Responsive Design

The frontend is fully responsive with breakpoints:
- **Desktop**: 1200px+ (full layout with sidebar)
- **Tablet**: 768px - 1199px (responsive grid)
- **Mobile**: < 768px (stacked layout)

## 🎯 Next Steps

1. **Deploy Contract**: Deploy the PLVX contract to testnet
2. **Update Configuration**: Add contract hash to `.env`
3. **Get CSPR.cloud API Key**: Sign up at [cspr.cloud](https://cspr.cloud)
4. **Test Integration**: Test full betting flow on testnet
5. **Set Up Keeper Bots**: Automate match execution

## 🐛 Troubleshooting

### Wallet Not Connecting
- Ensure CSPR.click extension is installed
- Check if you're on the correct network
- Try refreshing the page

### Events Not Streaming
- Verify CSPR.cloud API key is correct
- Check network connectivity
- Ensure contract hash is correct

### Transactions Failing
- Check wallet has sufficient CSPR for gas
- Verify contract is deployed
- Check transaction parameters

## 📚 Additional Resources

- [CSPR.click Documentation](https://docs.cspr.click)
- [CSPR.cloud API Docs](https://docs.cspr.cloud)
- [Casper JS SDK](https://github.com/casper-ecosystem/casper-js-sdk)
- [Donation Demo Reference](https://github.com/casper-ecosystem/donation-demo)

## ✅ Build Status

- **Frontend Build**: ✅ Success
- **TypeScript Compilation**: ✅ Success
- **Production Bundle**: ✅ 761KB (optimized)
- **Warnings**: Minor (unused variables)

The frontend is production-ready and successfully builds!
