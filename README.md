# 🏆 PLVX - Premier League Virtual Betting Platform

A decentralized sports betting platform built on the [Casper Network](https://casper.network), featuring virtual Premier League matches with dynamic odds, NFT team badges, and a native $LEAGUE token.

![Casper Network](https://img.shields.io/badge/Casper-Network-red)
![Odra Framework](https://img.shields.io/badge/Odra-v2.4.0-blue)
![License](https://img.shields.io/badge/license-Apache%202.0-green)

---

## 🎯 Overview

PLVX (Premier League Virtual Exchange) is a blockchain-based virtual sports betting platform that simulates Premier League football matches. Users can bet on match outcomes, predict season winners, collect NFT team badges, and participate in a fully decentralized betting ecosystem.

### Key Features

- ⚽ **Virtual Matches**: 10 matches every 15 minutes, 36 turns per season
- 📊 **Dynamic Odds**: Market-driven odds that adjust based on betting pools
- 🎟️ **Dual Betting**: Match outcome bets + free season winner predictions
- 🖼️ **NFT Badges**: Collectible team badges with betting bonuses
- 💰 **$LEAGUE Token**: Platform token with 30% airdrop to early users
- 🤖 **Automated Execution**: Keeper system for decentralized match simulation
- 🔐 **Security**: Cryptographically secure randomness, reentrancy protection, claim tracking

---

## 🏗️ Architecture

The platform consists of four primary components:

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (React + TypeScript + PLVX Integration Components)     │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                   API Server                             │
│  (Event Listener + REST API + WebSocket)                │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              Casper Blockchain                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │   PLVX Smart Contract (Rust + Odra)             │   │
│  │   - Season/Match Management                      │   │
│  │   - Betting System                               │   │
│  │   - Dynamic Odds Calculation                     │   │
│  │   - NFT Badge Marketplace                        │   │
│  │   - $LEAGUE Token                                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              Keeper Bots                                 │
│  (Automated match execution & result generation)         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ and npm
- Rust 1.70+ with `wasm32-unknown-unknown` target
- Casper CLI tools
- Docker & Docker Compose (optional)

### 1. Clone Repository

```bash
git clone https://github.com/uzochukwuV/casperv3.git
cd casperv3
```

### 2. Install Dependencies

```bash
# Install Rust and WASM target
rustup target add wasm32-unknown-unknown

# Install Node dependencies
cd client && npm install
cd ../server && npm install
```

### 3. Build Smart Contract

```bash
cd smart-contract/plvx
cargo odra build -c premier_league_improved
```

### 4. Deploy to Testnet

See [Deployment Guide](smart-contract/plvx/DEPLOYMENT_GUIDE.md) for detailed instructions.

### 5. Run Development Environment

```bash
# Start API server
cd server && npm run dev

# Start frontend (new terminal)
cd client && npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## 📦 Project Structure

```
casperv3/
├── smart-contract/
│   └── plvx/                      # Premier League smart contract
│       ├── src/
│       │   ├── premier_league_improved.rs  # Main contract (IMPROVED)
│       │   └── premier_league.rs           # Original (reference)
│       ├── tests/
│       │   └── improved_tests.rs           # Comprehensive tests
│       ├── IMPROVEMENTS.md                 # Security improvements doc
│       ├── DEPLOYMENT_GUIDE.md            # Deployment instructions
│       └── Cargo.toml
├── client/                        # React frontend
│   └── src/
│       ├── components/PLVX/      # UI components
│       │   ├── MatchCard.tsx
│       │   ├── LeagueTable.tsx
│       │   └── UserBets.tsx
│       └── plvx-integration.ts   # Contract integration utilities
├── server/                        # Node.js backend
│   └── src/
│       ├── event-handler.ts      # Blockchain event listener
│       └── api.ts                # REST API endpoints
├── docs/                          # Documentation
└── README.md                      # This file
```

---

## ✅ Security Improvements

The improved contract (`premier_league_improved.rs`) addresses critical security issues:

### 1. ✅ Cryptographically Secure Randomness
- **Before**: Predictable pseudo-random using block time
- **After**: `pseudorandom_bytes()` for unpredictable team pairings and match scores

### 2. ✅ Double-Claim Protection
- **Before**: No tracking - users could claim prizes multiple times
- **After**: Claim tracking mapping + reentrancy guards

### 3. ✅ Dynamic Odds System
- **Before**: Fixed 2.0x odds for all bets
- **After**: Market-driven odds (1.1x - 50x) based on betting pool distribution

### 4. ✅ Automated Keeper System
- **Before**: Owner-only match execution
- **After**: Multi-keeper system for decentralized automation

### 5. ✅ Reentrancy Protection
- **Before**: No guards on token transfers
- **After**: Lock-based protection on all critical functions

See [IMPROVEMENTS.md](smart-contract/plvx/IMPROVEMENTS.md) for detailed analysis.

---

## 🎮 How It Works

### Season Structure

1. **Season Starts**: 20 Premier League teams, 36 turns total
2. **Matches Scheduled**: 10 matches per turn, every 15 minutes
3. **Betting Opens**: Users place bets with dynamic odds
4. **Match Execution**: Keeper bots simulate matches with secure randomness
5. **Bet Settlement**: Automatic payout based on match results
6. **Season End**: Champion declared, winner pool distributed

### Betting Flow

```
1. User selects match & outcome (Home/Draw/Away)
2. Contract calculates dynamic odds based on current betting pool
3. User confirms bet with $LEAGUE tokens
4. 3-5% house edge deducted
5. Bet added to pool, odds recalculated for next user
6. Match executes at scheduled time
7. User settles bet and receives payout if won
```

### Dynamic Odds Example

```
Initial odds: 2.0x (default)

After 70% bet on Home Win:
- Home Win: 1.4x (popular outcome)
- Draw: 3.3x (unpopular)
- Away Win: 3.3x (unpopular)

System ensures: 1.1x ≤ odds ≤ 50x
```

---

## 🛠️ Technology Stack

### Smart Contract
- **Language**: Rust
- **Framework**: [Odra v2.4.0](https://odra.dev)
- **Blockchain**: Casper Network
- **Token Standard**: Custom ERC20-like ($LEAGUE)

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Web3**: Casper-JS-SDK
- **State**: React Hooks + Context

### Backend
- **Runtime**: Node.js
- **API**: Express.js
- **WebSocket**: Socket.io
- **Database**: PostgreSQL (recommended)

---

## 📊 Smart Contract API

### Main Functions

#### Season Management
```rust
pub fn start_season(&mut self)
pub fn end_season(&mut self, season_id: u32)
```

#### Betting
```rust
pub fn place_bet(&mut self, match_id: u32, predicted_result: MatchResult, amount: U256)
pub fn settle_bet(&mut self, bet_id: U256)
pub fn get_current_odds(&self, match_id: u32, predicted_result: MatchResult) -> U256
```

#### Season Predictions (Free)
```rust
pub fn predict_season_winner(&mut self, season_id: u32, team_id: u8)
pub fn claim_season_prize(&mut self, season_id: u32)
```

#### NFT Badges
```rust
pub fn mint_badge(&mut self, team_id: u8)
pub fn list_badge(&mut self, token_id: U256, price: U256)
pub fn buy_badge(&mut self, token_id: U256)
```

#### Keeper System
```rust
pub fn add_keeper(&mut self, keeper: Address)
pub fn simulate_match(&mut self, match_id: u32)
```

See [API Documentation](smart-contract/plvx/src/premier_league_improved.rs) for complete reference.

---

## 🧪 Testing

### Run Unit Tests

```bash
cd smart-contract/plvx
cargo test
```

### Run Integration Tests

```bash
cargo test --test improved_tests
```

### Test Coverage

- ✅ Keeper authorization
- ✅ Claim tracking
- ✅ Dynamic odds calculation
- ✅ Reentrancy protection
- ✅ Randomness distribution
- ✅ Full betting cycle

---

## 📖 Documentation

- [Smart Contract Improvements](smart-contract/plvx/IMPROVEMENTS.md)
- [Deployment Guide](smart-contract/plvx/DEPLOYMENT_GUIDE.md)
- [Frontend Integration](client/src/plvx-integration.ts)
- [API Reference](server/README.md)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow Rust naming conventions
- Add tests for new features
- Update documentation
- Run `cargo fmt` and `cargo clippy`

---

## 🔐 Security

### Reporting Vulnerabilities

Please report security issues to: [security@example.com]

### Security Audit

- [ ] External audit pending
- [ ] Bug bounty program: TBA

### Best Practices

- Use multi-sig for owner functions
- Rotate keeper keys regularly
- Monitor contract events
- Start with low bet limits

---

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## 🌐 Links

- **Website**: [Coming Soon]
- **Testnet Demo**: [Coming Soon]
- **Documentation**: [docs/](docs/)
- **Casper Network**: https://casper.network
- **Odra Framework**: https://odra.dev

---

## 🙏 Acknowledgments

- Built with [Odra](https://odra.dev/) smart contract framework
- Deployed on [Casper Network](https://casper.network)
- Inspired by decentralized betting platforms
- Community support from [Casper Developers](https://t.me/CSPRDevelopers)

---

## 📞 Support

- **Discord**: [Join Our Server]
- **Telegram**: [Casper Developers](https://t.me/CSPRDevelopers)
- **GitHub Issues**: [Report Issues](https://github.com/uzochukwuV/casperv3/issues)
- **Email**: support@example.com

---

**Created with ❤️ for the Casper ecosystem**

**Last Updated**: December 30, 2025
**Version**: 1.0.0
