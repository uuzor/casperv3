use odra::{
    casper_types::U256,
    prelude::*,
};

// ==================== CONSTANTS ====================

pub const MATCH_DURATION_SECONDS: u64 = 900; // 15 minutes
pub const MATCHES_PER_TURN: u32 = 10;
pub const TURNS_PER_SEASON: u32 = 36;
pub const TOTAL_TEAMS: u8 = 20;
pub const HOUSE_EDGE_MIN: u32 = 300; // 3% in basis points
pub const HOUSE_EDGE_MAX: u32 = 500; // 5% in basis points
pub const SEASON_WINNER_POOL_PERCENTAGE: u32 = 200; // 2% in basis points
pub const MARKETPLACE_FEE: u32 = 250; // 2.5% in basis points
pub const MIN_BET_AMOUNT: u128 = 1_000_000; // Minimum bet in tokens
pub const MAX_MULTIBET_MATCHES: u32 = 10;
pub const MIN_MULTIBET_MATCHES: u32 = 2;

// Liquidity Pool Constants
pub const MAX_UTILIZATION: u32 = 8000; // 80% max utilization
pub const MIN_POOL_RESERVE: u32 = 2000; // 20% minimum reserve
pub const WITHDRAWAL_COOLDOWN: u64 = 900; // 15 minutes in seconds

// Revenue Split (in basis points)
pub const PROTOCOL_SHARE: u32 = 4000; // 40%
pub const LP_SHARE: u32 = 4000; // 40%
pub const SEASON_POOL_SHARE: u32 = 2000; // 20%

// Multibet Bonus Rates (per additional match)
pub const MULTIBET_BONUS_PER_MATCH: u32 = 1000; // 10% per match

// ==================== ENUMS ====================

#[odra::odra_type]
#[derive(Copy)]
pub enum MatchResult {
    HomeWin,
    Draw,
    AwayWin,
}

impl MatchResult {
    pub fn to_u8(&self) -> u8 {
        match self {
            MatchResult::HomeWin => 0,
            MatchResult::Draw => 1,
            MatchResult::AwayWin => 2,
        }
    }

    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(MatchResult::HomeWin),
            1 => Some(MatchResult::Draw),
            2 => Some(MatchResult::AwayWin),
            _ => None,
        }
    }
}

// ==================== CORE STRUCTURES ====================

#[odra::odra_type]
pub struct Match {
    pub match_id: u32,
    pub season_id: u32,
    pub turn_number: u32,
    pub home_team_id: u8,
    pub away_team_id: u8,
    pub home_score: u8,
    pub away_score: u8,
    pub result: Option<MatchResult>,
    pub start_time: u64,
    pub is_finished: bool,
}

#[odra::odra_type]
pub struct Season {
    pub season_id: u32,
    pub start_time: u64,
    pub current_turn: u32,
    pub is_active: bool,
    pub winner_team_id: Option<u8>,
}

#[odra::odra_type]
pub struct Turn {
    pub turn_id: u32,
    pub season_id: u32,
    pub turn_number: u32,
    pub match_ids: Vec<u32>,
    pub start_time: u64,
    pub is_settled: bool,
    pub vrf_fulfilled: bool,
}

#[odra::odra_type]
pub struct TeamStats {
    pub team_id: u8,
    pub season_id: u32,
    pub wins: u32,
    pub draws: u32,
    pub losses: u32,
    pub goals_for: u32,
    pub goals_against: u32,
    pub points: u32, // 3 for win, 1 for draw
}

// ==================== POOL STRUCTURES ====================

#[odra::odra_type]
pub struct MatchPool {
    pub match_id: u32,
    pub home_win_pool: U256,
    pub draw_pool: U256,
    pub away_win_pool: U256,
    pub total_pool: U256,
}

impl MatchPool {
    pub fn new(match_id: u32) -> Self {
        Self {
            match_id,
            home_win_pool: U256::zero(),
            draw_pool: U256::zero(),
            away_win_pool: U256::zero(),
            total_pool: U256::zero(),
        }
    }

    pub fn get_pool_for_outcome(&self, outcome: MatchResult) -> U256 {
        match outcome {
            MatchResult::HomeWin => self.home_win_pool,
            MatchResult::Draw => self.draw_pool,
            MatchResult::AwayWin => self.away_win_pool,
        }
    }

    pub fn add_to_pool(&mut self, outcome: MatchResult, amount: U256) {
        match outcome {
            MatchResult::HomeWin => self.home_win_pool += amount,
            MatchResult::Draw => self.draw_pool += amount,
            MatchResult::AwayWin => self.away_win_pool += amount,
        }
        self.total_pool += amount;
    }
}

#[odra::odra_type]
pub struct TurnAccounting {
    pub turn_id: u32,
    pub total_bet_volume: U256,
    pub total_reserved_for_winners: U256,
    pub total_losing_pool: U256,
    pub net_revenue: U256,
    pub is_settled: bool,
    pub revenue_distributed: bool,
}

impl TurnAccounting {
    pub fn new(turn_id: u32) -> Self {
        Self {
            turn_id,
            total_bet_volume: U256::zero(),
            total_reserved_for_winners: U256::zero(),
            total_losing_pool: U256::zero(),
            net_revenue: U256::zero(),
            is_settled: false,
            revenue_distributed: false,
        }
    }
}

// ==================== BET STRUCTURES ====================

#[odra::odra_type]

pub struct SingleBetPrediction {
    pub match_id: u32,
    pub predicted_result: MatchResult,
    pub stake_amount: U256,
}

#[odra::odra_type]

pub struct MultibetPrediction {
    pub match_id: u32,
    pub predicted_result: MatchResult,
    pub stake_amount: U256, // Distributed amount for this match
}

#[odra::odra_type]

pub struct Bet {
    pub bet_id: U256,
    pub user: Address,
    pub turn_id: u32,
    pub is_multibet: bool,
    // For single bets
    pub single_prediction: Option<SingleBetPrediction>,
    // For multibets
    pub multibet_predictions: Vec<MultibetPrediction>,
    pub total_stake: U256, // Including bonus for multibets
    pub base_amount: U256, // User's actual deposit
    pub bonus_amount: U256, // Protocol bonus for multibets
    pub is_settled: bool,
    pub is_claimed: bool,
    pub payout: U256,
}

impl Bet {
    pub fn new_single(
        bet_id: U256,
        user: Address,
        turn_id: u32,
        match_id: u32,
        predicted_result: MatchResult,
        amount: U256,
    ) -> Self {
        Self {
            bet_id,
            user,
            turn_id,
            is_multibet: false,
            single_prediction: Some(SingleBetPrediction {
                match_id,
                predicted_result,
                stake_amount: amount,
            }),
            multibet_predictions: Vec::new(),
            total_stake: amount,
            base_amount: amount,
            bonus_amount: U256::zero(),
            is_settled: false,
            is_claimed: false,
            payout: U256::zero(),
        }
    }

    pub fn new_multibet(
        bet_id: U256,
        user: Address,
        turn_id: u32,
        predictions: Vec<MultibetPrediction>,
        base_amount: U256,
        bonus_amount: U256,
    ) -> Self {
        let total_stake = base_amount + bonus_amount;
        Self {
            bet_id,
            user,
            turn_id,
            is_multibet: true,
            single_prediction: None,
            multibet_predictions: predictions,
            total_stake,
            base_amount,
            bonus_amount,
            is_settled: false,
            is_claimed: false,
            payout: U256::zero(),
        }
    }
}

// ==================== NFT BADGE ====================

#[odra::odra_type]
pub struct TeamBadge {
    pub token_id: U256,
    pub team_id: u8,
    pub owner: Address,
    pub betting_bonus: u32, // Bonus percentage in basis points
}

// ==================== LIQUIDITY POOL ====================

#[odra::odra_type]
pub struct LPPosition {
    pub provider: Address,
    pub shares: U256,
    pub deposited_at: u64,
}

// ==================== EVENTS ====================

#[odra::event]
pub struct SeasonStarted {
    pub season_id: u32,
    pub start_time: u64,
}

#[odra::event]
pub struct TurnStarted {
    pub turn_id: u32,
    pub season_id: u32,
    pub turn_number: u32,
    pub start_time: u64,
}

#[odra::event]
pub struct MatchScheduled {
    pub match_id: u32,
    pub turn_id: u32,
    pub home_team_id: u8,
    pub away_team_id: u8,
    pub start_time: u64,
}

#[odra::event]
pub struct MatchFinished {
    pub match_id: u32,
    pub home_score: u8,
    pub away_score: u8,
    pub result: MatchResult,
}

#[odra::event]
pub struct SingleBetPlaced {
    pub bet_id: U256,
    pub user: Address,
    pub match_id: u32,
    pub amount: U256,
    pub predicted_result: MatchResult,
}

#[odra::event]
pub struct MultibetPlaced {
    pub bet_id: U256,
    pub user: Address,
    pub num_matches: u32,
    pub base_amount: U256,
    pub bonus_amount: U256,
    pub total_stake: U256,
}

#[odra::event]
pub struct BetSettled {
    pub bet_id: U256,
    pub is_won: bool,
}

#[odra::event]
pub struct WinningsClaimed {
    pub bet_id: U256,
    pub user: Address,
    pub payout: U256,
}

#[odra::event]
pub struct TurnSettled {
    pub turn_id: u32,
    pub total_reserved_for_winners: U256,
    pub total_losing_pool: U256,
    pub net_revenue: U256,
}

#[odra::event]
pub struct RevenueDistributed {
    pub turn_id: u32,
    pub protocol_share: U256,
    pub lp_share: U256,
    pub season_share: U256,
}

#[odra::event]
pub struct LiquidityAdded {
    pub provider: Address,
    pub amount: U256,
    pub shares: U256,
}

#[odra::event]
pub struct LiquidityRemoved {
    pub provider: Address,
    pub amount: U256,
    pub shares: U256,
}

#[odra::event]
pub struct BadgeMinted {
    pub token_id: U256,
    pub team_id: u8,
    pub owner: Address,
}

#[odra::event]
pub struct SeasonWinnerDeclared {
    pub season_id: u32,
    pub team_id: u8,
}

#[odra::event]
pub struct KeeperAdded {
    pub keeper: Address,
}

#[odra::event]
pub struct KeeperRemoved {
    pub keeper: Address,
}
