use odra::{
    casper_types::U256,
    prelude::*,
};
use crate::types::*;
use crate::calculations::*;

// ==================== POOL MANAGER MODULE ====================

/// Manages betting pools for matches and turns
#[odra::module]
pub struct PoolManager {
    // Match pools: match_id -> MatchPool
    match_pools: Mapping<u32, MatchPool>,

    // Turn accounting: turn_id -> TurnAccounting
    turn_accounting: Mapping<u32, TurnAccounting>,

    // Total bet volume tracker
    total_volume: Var<U256>,
}

#[odra::module]
impl PoolManager {
    /// Initialize a new match pool
    pub fn init_match_pool(&mut self, match_id: u32) {
        let pool = MatchPool::new(match_id);
        self.match_pools.set(&match_id, pool);
    }

    /// Add stake to a match pool for a specific outcome
    pub fn add_to_pool(&mut self, match_id: u32, outcome: MatchResult, amount: U256) {
        let mut pool = self.match_pools.get(&match_id)
            .unwrap_or_else(|| MatchPool::new(match_id));

        pool.add_to_pool(outcome, amount);
        self.match_pools.set(&match_id, pool);

        // Update total volume
        let current_volume = self.total_volume.get_or_default();
        self.total_volume.set(current_volume + amount);
    }

    /// Get match pool data
    pub fn get_pool(&self, match_id: u32) -> Option<MatchPool> {
        self.match_pools.get(&match_id)
    }

    /// Get pool for specific outcome
    pub fn get_pool_for_outcome(&self, match_id: u32, outcome: MatchResult) -> U256 {
        self.match_pools.get(&match_id)
            .map(|pool| pool.get_pool_for_outcome(outcome))
            .unwrap_or(U256::zero())
    }

    /// Calculate display odds for frontend (informational only)
    pub fn get_display_odds(&self, match_id: u32, outcome: MatchResult) -> U256 {
        match self.match_pools.get(&match_id) {
            Some(pool) => calculate_display_odds(&pool, outcome),
            None => U256::from(2000), // Default 2.0x
        }
    }

    /// Initialize turn accounting
    pub fn init_turn_accounting(&mut self, turn_id: u32) {
        let accounting = TurnAccounting::new(turn_id);
        self.turn_accounting.set(&turn_id, accounting);
    }

    /// Settle a turn - calculate liabilities and revenue
    pub fn settle_turn(
        &mut self,
        turn_id: u32,
        match_ids: Vec<u32>,
        results: Vec<MatchResult>,
    ) -> Result<TurnAccounting, String> {
        assert_eq!(match_ids.len(), results.len(), "Match IDs and results length mismatch");

        // Collect all match pools
        let mut match_pools = Vec::new();
        let mut total_bet_volume = U256::zero();

        for match_id in &match_ids {
            match self.match_pools.get(match_id) {
                Some(pool) => {
                    total_bet_volume += pool.total_pool;
                    match_pools.push(pool);
                }
                None => return Err(format!("Pool not found for match {}", match_id)),
            }
        }

        // Calculate total reserved for winners
        let total_reserved = calculate_turn_reserved_for_winners(&match_pools, &results);

        // Calculate total losing pool
        let total_losing = calculate_turn_losing_pool(&match_pools, &results);

        // Calculate net revenue
        let net_revenue = match calculate_net_revenue(total_losing, total_reserved) {
            Some(revenue) => revenue,
            None => return Err("Insolvency detected: losing pool < reserved for winners".to_string()),
        };

        // Create accounting record
        let accounting = TurnAccounting {
            turn_id,
            total_bet_volume,
            total_reserved_for_winners: total_reserved,
            total_losing_pool: total_losing,
            net_revenue,
            is_settled: true,
            revenue_distributed: false,
        };

        self.turn_accounting.set(&turn_id, accounting.clone());

        Ok(accounting)
    }

    /// Get turn accounting
    pub fn get_turn_accounting(&self, turn_id: u32) -> Option<TurnAccounting> {
        self.turn_accounting.get(&turn_id)
    }

    /// Mark revenue as distributed
    pub fn mark_revenue_distributed(&mut self, turn_id: u32) {
        if let Some(mut accounting) = self.turn_accounting.get(&turn_id) {
            accounting.revenue_distributed = true;
            self.turn_accounting.set(&turn_id, accounting);
        }
    }

    /// Get total platform volume
    pub fn get_total_volume(&self) -> U256 {
        self.total_volume.get_or_default()
    }

    /// Calculate payout for a single bet prediction
    pub fn calculate_single_payout(
        &self,
        match_id: u32,
        stake: U256,
        predicted_result: MatchResult,
        actual_result: MatchResult,
    ) -> U256 {
        // Check if prediction was correct
        if predicted_result != actual_result {
            return U256::zero();
        }

        // Get pool data
        let pool = match self.match_pools.get(&match_id) {
            Some(p) => p,
            None => return stake, // Return original stake if pool not found
        };

        let winning_pool = pool.get_pool_for_outcome(actual_result);

        calculate_pool_payout(stake, winning_pool, pool.total_pool)
    }

    /// Calculate payout for multibet
    pub fn calculate_multibet_payout_full(
        &self,
        predictions: Vec<MultibetPrediction>,
        results: Vec<(u32, MatchResult)>, // (match_id, result)
    ) -> U256 {
        // Collect match pools and results in order
        let mut match_pools = Vec::new();
        let mut match_results = Vec::new();

        for (i, prediction) in predictions.iter().enumerate() {
            let (match_id, result) = results[i];
            assert_eq!(prediction.match_id, match_id, "Match ID mismatch");

            match self.match_pools.get(&match_id) {
                Some(pool) => match_pools.push(pool),
                None => return U256::zero(), // Pool not found
            }

            match_results.push(result);
        }

        calculate_multibet_payout(&predictions, &match_pools, &match_results)
    }

    /// Check if a bet won (for single or multibet)
    pub fn did_bet_win(
        &self,
        predictions: Vec<MultibetPrediction>,
        results: Vec<(u32, MatchResult)>,
    ) -> bool {
        for (prediction, (match_id, result)) in predictions.iter().zip(results.iter()) {
            assert_eq!(prediction.match_id, *match_id, "Match ID mismatch");

            if prediction.predicted_result != *result {
                return false; // One wrong prediction = lost
            }
        }

        true // All predictions correct
    }
}

// ==================== HELPER FUNCTIONS ====================

impl PoolManager {
    /// Validate that a bet can be placed (pool state check)
    pub fn can_accept_bet(&self, _match_id: u32, _amount: U256) -> bool {
        // For pool-based system, we can always accept bets
        // Liquidity checks happen at LP level
        true
    }

    /// Get pool statistics for display
    pub fn get_pool_stats(&self, match_id: u32) -> Option<PoolStats> {
        self.match_pools.get(&match_id).map(|pool| {
            PoolStats {
                match_id,
                home_win_pool: pool.home_win_pool,
                draw_pool: pool.draw_pool,
                away_win_pool: pool.away_win_pool,
                total_pool: pool.total_pool,
                home_win_odds: calculate_display_odds(&pool, MatchResult::HomeWin),
                draw_odds: calculate_display_odds(&pool, MatchResult::Draw),
                away_win_odds: calculate_display_odds(&pool, MatchResult::AwayWin),
            }
        })
    }

    /// Preview potential payout BEFORE placing bet
    /// Shows what user would get if they bet now and win
    pub fn preview_bet_outcome(
        &self,
        match_id: u32,
        outcome: MatchResult,
        stake_amount: U256,
    ) -> BetPreview {
        match self.match_pools.get(&match_id) {
            Some(pool) => {
                // Simulate pool state AFTER bet is added
                let current_outcome_pool = pool.get_pool_for_outcome(outcome);
                let new_outcome_pool = current_outcome_pool + stake_amount;
                let new_total_pool = pool.total_pool + stake_amount;

                // Calculate user's share of losing pools if they win
                let losing_pool = new_total_pool - new_outcome_pool;

                // User's share = stake / new_outcome_pool
                // User's payout from losing pool = (stake / new_outcome_pool) * losing_pool
                let potential_profit = if !new_outcome_pool.is_zero() {
                    (stake_amount * losing_pool) / new_outcome_pool
                } else {
                    U256::zero()
                };

                let total_return = stake_amount + potential_profit;

                // Calculate effective odds (multiplied by 1000)
                let effective_odds = if !stake_amount.is_zero() {
                    (total_return * U256::from(1000)) / stake_amount
                } else {
                    U256::zero()
                };

                BetPreview {
                    match_id,
                    outcome,
                    stake_amount,
                    potential_profit,
                    total_return,
                    effective_odds, // e.g., 1850 = 1.85x
                    current_pool_size: current_outcome_pool,
                    your_pool_share_bps: if !new_outcome_pool.is_zero() {
                        ((stake_amount * U256::from(10000)) / new_outcome_pool).as_u32()
                    } else {
                        0
                    },
                }
            }
            None => BetPreview::default_for(match_id, outcome, stake_amount),
        }
    }
}

// ==================== DISPLAY TYPES ====================

#[odra::odra_type]

pub struct PoolStats {
    pub match_id: u32,
    pub home_win_pool: U256,
    pub draw_pool: U256,
    pub away_win_pool: U256,
    pub total_pool: U256,
    pub home_win_odds: U256,
    pub draw_odds: U256,
    pub away_win_odds: U256,
}

#[odra::odra_type]

pub struct BetPreview {
    pub match_id: u32,
    pub outcome: MatchResult,
    pub stake_amount: U256,
    pub potential_profit: U256,      // How much you'd win (excluding stake)
    pub total_return: U256,           // stake + profit
    pub effective_odds: U256,         // In format 1850 = 1.85x
    pub current_pool_size: U256,      // Current size of your chosen outcome pool
    pub your_pool_share_bps: u32,     // Your % of outcome pool (basis points)
}

impl BetPreview {
    pub fn default_for(match_id: u32, outcome: MatchResult, stake_amount: U256) -> Self {
        BetPreview {
            match_id,
            outcome,
            stake_amount,
            potential_profit: stake_amount, // 2x as default
            total_return: stake_amount * U256::from(2),
            effective_odds: U256::from(2000), // 2.0x
            current_pool_size: U256::zero(),
            your_pool_share_bps: 10000, // 100% if you're first
        }
    }
}
