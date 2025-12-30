# PLVX Premier League - Deployment Guide

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Rust toolchain installed (stable)
- [ ] Casper CLI tools installed
- [ ] Odra framework v2.4.0 installed
- [ ] WASM target added: `rustup target add wasm32-unknown-unknown`
- [ ] Test account with CSPR for gas fees
- [ ] Casper wallet configured

### Code Review
- [ ] All security improvements reviewed
- [ ] Tests passing (run `cargo test`)
- [ ] Contract compiles: `cargo build --release --target wasm32-unknown-unknown`
- [ ] No compiler warnings
- [ ] Documentation reviewed

---

## 🔧 Build Process

### 1. Update lib.rs to Export Improved Contract

Edit `smart-contract/plvx/src/lib.rs`:

```rust
#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;

// Export the improved contract
pub mod premier_league_improved;
pub use premier_league_improved::*;

// Keep original for reference
pub mod premier_league;
```

### 2. Build the Contract

```bash
cd smart-contract/plvx

# Build for WASM
cargo odra build -c premier_league_improved

# Or using standard cargo
cargo build --release --target wasm32-unknown-unknown
```

The compiled WASM will be at:
```
target/wasm32-unknown-unknown/release/premier_league_improved.wasm
```

### 3. Verify Build

```bash
# Check file size (should be reasonable, < 1MB)
ls -lh target/wasm32-unknown-unknown/release/*.wasm

# Verify it's a valid WASM file
file target/wasm32-unknown-unknown/release/premier_league_improved.wasm
```

---

## 🌐 Testnet Deployment

### Step 1: Prepare Deployment Account

```bash
# Create new keypair (if needed)
casper-client keygen ./deploy-keys

# Check balance
casper-client get-balance \
  --node-address http://NODE_IP:7777 \
  --public-key deploy-keys/public_key.pem
```

Ensure you have at least **100 CSPR** for deployment gas fees.

### Step 2: Deploy Contract

```bash
casper-client put-deploy \
  --node-address http://NODE_IP:7777 \
  --chain-name casper-test \
  --secret-key ./deploy-keys/secret_key.pem \
  --payment-amount 200000000000 \
  --session-path ./target/wasm32-unknown-unknown/release/premier_league_improved.wasm
```

Expected gas cost: **~150-200 CSPR**

### Step 3: Get Deploy Hash

The command will return a deploy hash:
```
{"jsonrpc":"2.0","id":1,"result":{"api_version":"1.5.0","deploy_hash":"abc123..."}}
```

Save this deploy hash!

### Step 4: Wait for Execution

```bash
# Check deploy status (wait ~2 minutes)
casper-client get-deploy \
  --node-address http://NODE_IP:7777 \
  abc123...
```

Look for `"execution_results"` in the response.

### Step 5: Get Contract Hash

From the deploy result, extract the contract hash:

```json
{
  "execution_results": [{
    "result": {
      "Success": {
        "transforms": [
          {
            "key": "hash-abc123def456...",
            "transform": "WriteContract"
          }
        ]
      }
    }
  }]
}
```

The `hash-abc123def456...` is your **contract hash** - save it!

---

## ⚙️ Contract Configuration

### Step 1: Initialize Contract

The `init()` function is called automatically on deployment. It:
- Initializes $LEAGUE token (100M supply)
- Sets house edge to 4%
- Allocates 30% to airdrop pool
- Resets all counters

### Step 2: Add Keepers

Add keeper addresses for automated match execution:

```bash
casper-client put-deploy \
  --node-address http://NODE_IP:7777 \
  --chain-name casper-test \
  --secret-key ./deploy-keys/secret_key.pem \
  --payment-amount 5000000000 \
  --session-hash hash-abc123def456... \
  --session-entry-point "add_keeper" \
  --session-arg "keeper:public_key='KEEPER_PUBLIC_KEY_HEX'"
```

Recommended: Add 2-3 keeper addresses for redundancy.

### Step 3: Start First Season

```bash
casper-client put-deploy \
  --node-address http://NODE_IP:7777 \
  --chain-name casper-test \
  --secret-key ./deploy-keys/secret_key.pem \
  --payment-amount 10000000000 \
  --session-hash hash-abc123def456... \
  --session-entry-point "start_season"
```

This will:
- Create season ID 1
- Initialize all 20 team stats
- Schedule first 10 matches

---

## 🤖 Keeper Bot Setup

### Create Keeper Bot

```typescript
// keeper-bot.ts
import { CasperClient, CLPublicKey, DeployUtil } from 'casper-js-sdk';

const NODE_URL = 'http://NODE_IP:7777';
const CONTRACT_HASH = 'hash-abc123def456...';
const KEEPER_PRIVATE_KEY = '...'; // Load from secure storage

async function monitorAndExecuteMatches() {
  const client = new CasperClient(NODE_URL);

  while (true) {
    // 1. Query contract for upcoming matches
    const matches = await getUpcomingMatches();

    // 2. Check which matches have started
    const currentTime = Date.now();
    for (const match of matches) {
      if (!match.is_finished && currentTime >= match.start_time) {
        // 3. Execute match
        await simulateMatch(match.match_id);
        await sleep(5000); // Wait between calls
      }
    }

    // Wait 1 minute before next check
    await sleep(60000);
  }
}

async function simulateMatch(matchId: number) {
  // Build deploy to call simulate_match
  const deploy = DeployUtil.makeDeploy(/* ... */);
  const result = await client.putDeploy(deploy);
  console.log(`Simulated match ${matchId}: ${result.deploy_hash}`);
}

monitorAndExecuteMatches();
```

### Deploy Keeper Bot

```bash
# Install dependencies
npm install casper-js-sdk

# Run as systemd service (Linux)
sudo systemctl enable keeper-bot
sudo systemctl start keeper-bot

# Or use PM2 (Node.js process manager)
pm2 start keeper-bot.ts --name plvx-keeper
pm2 save
```

---

## 🎨 Frontend Integration

### Step 1: Install Dependencies

```bash
cd client
npm install casper-js-sdk
```

### Step 2: Configure Environment

Create `.env.local`:

```env
REACT_APP_CONTRACT_HASH=hash-abc123def456...
REACT_APP_NODE_URL=http://NODE_IP:7777
REACT_APP_CHAIN_NAME=casper-test
REACT_APP_API_URL=http://your-api-server:3000
REACT_APP_WS_URL=ws://your-api-server:3000
```

### Step 3: Import Integration

```typescript
// App.tsx
import { initializePLVX } from './plvx-integration';

const contractHash = process.env.REACT_APP_CONTRACT_HASH!;
const apiUrl = process.env.REACT_APP_API_URL!;
const wsUrl = process.env.REACT_APP_WS_URL!;

const plvx = initializePLVX(contractHash, apiUrl, wsUrl);

// Use plvx.contractCalls, plvx.apiClient, etc.
```

### Step 4: Implement UI Components

```typescript
import { MatchCard } from './components/PLVX/MatchCard';
import { LeagueTable } from './components/PLVX/LeagueTable';
import { UserBets } from './components/PLVX/UserBets';

function App() {
  return (
    <div>
      <MatchCard match={match} onPlaceBet={handlePlaceBet} />
      <LeagueTable teamStats={stats} seasonId={1} />
      <UserBets bets={userBets} onSettleBet={handleSettleBet} />
    </div>
  );
}
```

---

## 📊 Monitoring & Maintenance

### Contract Monitoring

Use CSPR.live or custom monitoring:

```bash
# Check contract state
casper-client query-global-state \
  --node-address http://NODE_IP:7777 \
  --state-root-hash STATE_ROOT_HASH \
  --key hash-abc123def456...
```

### Key Metrics to Monitor

1. **House Balance**: Ensure it's growing with bet volume
2. **Active Bets**: Number of unsettled bets
3. **Keeper Performance**: Match execution latency
4. **Gas Costs**: Track average gas per operation
5. **Error Rate**: Failed transactions

### Event Monitoring

Subscribe to contract events:

```typescript
plvx.eventListener.on('MatchFinished', (data) => {
  console.log('Match finished:', data);
  // Update database, notify users, etc.
});

plvx.eventListener.on('BetPlaced', (data) => {
  console.log('Bet placed:', data);
  // Track betting volume
});
```

---

## 🔐 Security Best Practices

### Owner Key Management

1. **Multi-Sig**: Use multi-signature wallet for owner functions
2. **Cold Storage**: Keep owner keys in cold storage
3. **Separate Keys**: Use different keys for deployment vs operations

### Keeper Security

1. **Minimal Permissions**: Keepers can only execute matches
2. **Key Rotation**: Rotate keeper keys monthly
3. **Monitor Activity**: Alert on unusual keeper behavior

### Operational Security

1. **Rate Limiting**: Monitor for unusual bet patterns
2. **Circuit Breaker**: Have emergency pause capability
3. **Gradual Rollout**: Start with low bet limits
4. **Bug Bounty**: Run bug bounty program

---

## 🚨 Emergency Procedures

### If Critical Bug Found

1. **Pause Operations**: Remove all keepers
2. **Notify Users**: Communicate via all channels
3. **Deploy Fix**: Test thoroughly on testnet first
4. **Migrate State**: Plan state migration if needed

### If Keeper Compromised

1. **Remove Keeper**: Call `remove_keeper()` immediately
2. **Add New Keeper**: Deploy new keeper bot
3. **Audit Logs**: Review all keeper actions

---

## 📈 Scaling Considerations

### Gas Optimization

- Batch operations where possible
- Optimize storage access patterns
- Consider layer 2 for high-frequency operations

### Infrastructure

- **Multiple Nodes**: Don't rely on single node
- **Load Balancing**: Distribute API requests
- **Caching**: Cache contract state where appropriate
- **CDN**: Use CDN for static frontend assets

---

## ✅ Post-Deployment Verification

### Functional Tests

- [ ] Season starts correctly
- [ ] Matches are scheduled
- [ ] Bets can be placed
- [ ] Keeper can execute matches
- [ ] Odds update dynamically
- [ ] Bets settle correctly
- [ ] Season prizes work
- [ ] Badges can be minted
- [ ] Marketplace functions

### Security Tests

- [ ] Non-owner cannot add keepers
- [ ] Non-keeper cannot execute matches
- [ ] Double-claim protection works
- [ ] Reentrancy protection works
- [ ] Randomness is unpredictable
- [ ] Odds are within bounds

---

## 📝 Documentation

### Record These Values

```
Deployment Date: _________________
Network: Testnet / Mainnet
Contract Hash: ____________________
Owner Account: ____________________
Keeper Accounts:
  1. ____________________
  2. ____________________
  3. ____________________
Deploy Hash: ____________________
Initial Season ID: ____________________
```

### Share With Team

- Contract hash
- ABI/Schema files
- API endpoints
- WebSocket URLs
- Support channels

---

## 🎯 Mainnet Deployment Differences

When deploying to mainnet:

1. **Higher Gas**: Use 250-300 CSPR for deployment
2. **Chain Name**: Use `casper` instead of `casper-test`
3. **Node URL**: Use mainnet node
4. **Audit**: Get professional security audit first
5. **Insurance**: Consider smart contract insurance
6. **Gradual Rollout**: Start with low limits

---

## 📞 Support & Resources

- **Odra Documentation**: https://odra.dev/docs
- **Casper Documentation**: https://docs.casper.network
- **GitHub Issues**: (your repo)/issues
- **Discord/Telegram**: (your community channels)

---

**Last Updated:** 2025-12-30
**Version:** 1.0.0
**Contact:** (your contact info)
