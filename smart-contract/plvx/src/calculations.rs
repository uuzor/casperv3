use odra::casper_types::U256;
use crate::types::*;

// ==================== POOL PAYOUT CALCULATIONS ====================

/// Calculate payout for a bet based on pool distribution
/// Formula: (user_stake / winning_pool) * total_pool
pub fn calculate_pool_payout(
    stake_amount: U256,
    winning_pool: U256,
    total_pool: U256,
) -> U256 {
    if winning_pool.is_zero() {
        // No other winners - return original stake
        return stake_amount;
    }

    if total_pool.is_zero() || stake_amount.is_zero() {
        return U256::zero();
    }

    // Payout = (stake / winning_pool) * total_pool
    // Rearranged to avoid overflow: (stake * total_pool) / winning_pool
    (stake_amount * total_pool) / winning_pool
}

/// SECURITY FIX #3: Two-layer multibet payout system
/// Layer 1: Base pool payout (sum of individual match payouts)
/// Layer 2: Parlay multiplier (protocol-funded bonus for risk)

/// Calculate base payout from pools (sum of individual match payouts)
pub fn calculate_multibet_base_payout(
    predictions: &[MultibetPrediction],
    match_pools: &[MatchPool],
    match_results: &[MatchResult],
) -> U256 {
    // Verify all predictions are correct (all-or-nothing)
    for (i, prediction) in predictions.iter().enumerate() {
        if prediction.predicted_result != match_results[i] {
            return U256::zero();  // One loss = entire multibet lost
        }
    }

    let mut total_base_payout = U256::zero();

    // Sum payouts from each match pool
    for i in 0..predictions.len() {
        let pool = &match_pools[i];
        let result = match_results[i];
        let winning_pool = pool.get_pool_for_outcome(result);

        let match_payout = calculate_pool_payout(
            predictions[i].stake_amount,
            winning_pool,
            pool.total_pool,
        );

        total_base_payout += match_payout;
    }

    total_base_payout
}

/// Get parlay multiplier based on number of legs
/// These are SAFE, capped multipliers (not exponential)
/// Format: 1200 = 1.2x (20% bonus)
pub fn get_parlay_multiplier(num_matches: u32) -> U256 {
    match num_matches {
        1 => U256::from(1000),  // 1.0x (no bonus)
        2 => U256::from(1100),  // 1.1x (10% bonus)
        3 => U256::from(1200),  // 1.2x (20% bonus)
        4 => U256::from(1400),  // 1.4x (40% bonus)
        5 => U256::from(1600),  // 1.6x (60% bonus)
        6 => U256::from(1800),  // 1.8x (80% bonus)
        7 => U256::from(2000),  // 2.0x (100% bonus)
        8 => U256::from(2200),  // 2.2x (120% bonus)
        9 => U256::from(2400),  // 2.4x (140% bonus)
        _ => U256::from(2500),  // 2.5x max (150% bonus cap for 10 legs)
    }
}

/// Calculate FINAL multibet payout with parlay bonus
/// This is the main public function that applies both layers
pub fn calculate_multibet_payout(
    predictions: &[MultibetPrediction],
    match_pools: &[MatchPool],
    match_results: &[MatchResult],
) -> U256 {
    // Get base payout from pools
    let base_payout = calculate_multibet_base_payout(predictions, match_pools, match_results);

    if base_payout.is_zero() {
        return U256::zero();
    }

    // Apply parlay multiplier
    let multiplier = get_parlay_multiplier(predictions.len() as u32);

    // Final payout = base × multiplier
    // multiplier is in format 1200 = 1.2x, so divide by 1000
    (base_payout * multiplier) / U256::from(1000)
}

// ==================== MULTIBET BONUS CALCULATIONS ====================

/// Calculate multibet bonus amount
/// Formula: base_amount * (num_matches - 1) * BONUS_RATE
/// Example: 100 LEAGUE bet on 3 matches = 100 * 2 * 10% = 20 LEAGUE bonus
pub fn calculate_multibet_bonus(base_amount: U256, num_matches: u32) -> U256 {
    if num_matches < MIN_MULTIBET_MATCHES {
        return U256::zero();
    }

    let bonus_multiplier = num_matches - 1; // 0 bonus for single bet
    let bonus_rate = U256::from(MULTIBET_BONUS_PER_MATCH); // 1000 = 10%

    // Calculate: base_amount * bonus_multiplier * (bonus_rate / 10000)
    (base_amount * U256::from(bonus_multiplier) * bonus_rate) / U256::from(10000)
}

/// Calculate stake per match for multibet distribution
/// Formula: (base_amount + bonus) / num_matches
pub fn calculate_per_match_stake(base_amount: U256, bonus_amount: U256, num_matches: u32) -> U256 {
    let total_stake = base_amount + bonus_amount;
    total_stake / U256::from(num_matches)
}

// ==================== HOUSE EDGE CALCULATIONS ====================

/// Calculate house edge amount to deduct from bet
pub fn calculate_house_edge(amount: U256, house_edge_bps: u32) -> U256 {
    (amount * U256::from(house_edge_bps)) / U256::from(10000)
}

/// Calculate effective bet amount after house edge
pub fn calculate_effective_amount(amount: U256, house_edge_bps: u32) -> U256 {
    let house_edge = calculate_house_edge(amount, house_edge_bps);
    amount - house_edge
}

// ==================== TURN SETTLEMENT CALCULATIONS ====================

/// Calculate total amount reserved for winners in a turn
/// This pre-calculates worst-case payout liability
pub fn calculate_turn_reserved_for_winners(match_pools: &[MatchPool], results: &[MatchResult]) -> U256 {
    let mut total_reserved = U256::zero();

    for (pool, result) in match_pools.iter().zip(results.iter()) {
        let winning_pool = pool.get_pool_for_outcome(*result);

        if winning_pool.is_zero() {
            // No winners for this outcome - entire pool is losing
            continue;
        }

        // Worst case: all winners claim, they get entire pool
        // This is exact in pool-based system: sum of payouts = total_pool
        total_reserved += pool.total_pool;
    }

    total_reserved
}

/// Calculate total losing pool for a turn
pub fn calculate_turn_losing_pool(match_pools: &[MatchPool], results: &[MatchResult]) -> U256 {
    let mut total_losing = U256::zero();

    for (pool, result) in match_pools.iter().zip(results.iter()) {
        let winning_pool = pool.get_pool_for_outcome(*result);
        let total_pool = pool.total_pool;

        // Losing pool = total pool - winning pool
        let losing_pool = total_pool - winning_pool;
        total_losing += losing_pool;
    }

    total_losing
}

/// Calculate net revenue for a turn (after reserving for winners)
/// Returns None if insolvent (losing pool < reserved for winners)
pub fn calculate_net_revenue(total_losing_pool: U256, total_reserved: U256) -> Option<U256> {
    if total_losing_pool < total_reserved {
        // Insolvency - this should never happen in pool-based system
        return None;
    }

    Some(total_losing_pool - total_reserved)
}

/// Split revenue according to protocol rules
pub fn split_revenue(net_revenue: U256) -> (U256, U256, U256) {
    let protocol_share = (net_revenue * U256::from(PROTOCOL_SHARE)) / U256::from(10000);
    let lp_share = (net_revenue * U256::from(LP_SHARE)) / U256::from(10000);
    let season_share = (net_revenue * U256::from(SEASON_POOL_SHARE)) / U256::from(10000);

    (protocol_share, lp_share, season_share)
}

// ==================== LIQUIDITY POOL CALCULATIONS ====================

/// Calculate LP shares to mint for a deposit
/// Formula: shares = (amount * total_shares) / total_liquidity
/// First depositor: shares = amount
pub fn calculate_lp_shares(deposit_amount: U256, total_liquidity: U256, total_shares: U256) -> U256 {
    if total_shares.is_zero() || total_liquidity.is_zero() {
        // First deposit - 1:1 shares
        return deposit_amount;
    }

    // shares = (deposit * total_shares) / total_liquidity
    (deposit_amount * total_shares) / total_liquidity
}

/// Calculate withdrawal amount for LP shares
/// Formula: amount = (shares * total_liquidity) / total_shares
pub fn calculate_lp_withdrawal(shares: U256, total_liquidity: U256, total_shares: U256) -> U256 {
    if total_shares.is_zero() {
        return U256::zero();
    }

    // amount = (shares * total_liquidity) / total_shares
    (shares * total_liquidity) / total_shares
}

/// Check if liquidity pool can support locking additional amount
/// Respects MAX_UTILIZATION cap
pub fn can_lock_liquidity(
    current_utilized: U256,
    total_liquidity: U256,
    additional_lock: U256,
) -> bool {
    if total_liquidity.is_zero() {
        return false;
    }

    let new_utilized = current_utilized + additional_lock;
    let utilization_bps = (new_utilized * U256::from(10000)) / total_liquidity;

    utilization_bps <= U256::from(MAX_UTILIZATION)
}

/// Calculate current utilization percentage (in basis points)
pub fn calculate_utilization(utilized: U256, total_liquidity: U256) -> u32 {
    if total_liquidity.is_zero() {
        return 0;
    }

    let utilization = (utilized * U256::from(10000)) / total_liquidity;
    utilization.as_u32()
}

// ==================== TEAM STATISTICS ====================

/// Update team stats based on match result
pub fn update_team_stats(
    mut stats: TeamStats,
    is_home: bool,
    result: MatchResult,
    goals_for: u32,
    goals_against: u32,
) -> TeamStats {
    stats.goals_for += goals_for;
    stats.goals_against += goals_against;

    match (is_home, result) {
        (true, MatchResult::HomeWin) | (false, MatchResult::AwayWin) => {
            stats.wins += 1;
            stats.points += 3;
        }
        (_, MatchResult::Draw) => {
            stats.draws += 1;
            stats.points += 1;
        }
        _ => {
            stats.losses += 1;
        }
    }

    stats
}

// ==================== VALIDATION HELPERS ====================

/// Validate bet amount meets minimum requirements
pub fn validate_bet_amount(amount: U256) -> bool {
    amount >= U256::from(MIN_BET_AMOUNT)
}

/// Validate multibet match count
pub fn validate_multibet_count(count: u32) -> bool {
    count >= MIN_MULTIBET_MATCHES && count <= MAX_MULTIBET_MATCHES
}

/// Validate house edge is within allowed range
pub fn validate_house_edge(edge_bps: u32) -> bool {
    edge_bps >= HOUSE_EDGE_MIN && edge_bps <= HOUSE_EDGE_MAX
}

// ==================== DISPLAY ODDS (FOR FRONTEND) ====================

/// Calculate display odds for frontend (NOT stored on-chain)
/// This is informational only - actual payout uses pool calculation
/// Formula: total_pool / outcome_pool
pub fn calculate_display_odds(pool: &MatchPool, outcome: MatchResult) -> U256 {
    let outcome_pool = pool.get_pool_for_outcome(outcome);

    if pool.total_pool.is_zero() {
        // No bets yet - return default odds
        return U256::from(2000); // 2.0x
    }

    if outcome_pool.is_zero() {
        // No bets on this outcome - return high odds
        return U256::from(5000); // 5.0x
    }

    // Calculate odds: (total_pool / outcome_pool) * 1000
    // This gives odds in format where 2000 = 2.0x
    (pool.total_pool * U256::from(1000)) / outcome_pool
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_payout_calculation() {
        let stake = U256::from(100);
        let winning_pool = U256::from(200);
        let total_pool = U256::from(1000);

        let payout = calculate_pool_payout(stake, winning_pool, total_pool);
        assert_eq!(payout, U256::from(500)); // (100/200) * 1000 = 500
    }

    #[test]
    fn test_multibet_bonus() {
        let base = U256::from(100);

        // 2 matches: 10% bonus
        let bonus = calculate_multibet_bonus(base, 2);
        assert_eq!(bonus, U256::from(10));

        // 3 matches: 20% bonus
        let bonus = calculate_multibet_bonus(base, 3);
        assert_eq!(bonus, U256::from(20));

        // 5 matches: 40% bonus
        let bonus = calculate_multibet_bonus(base, 5);
        assert_eq!(bonus, U256::from(40));
    }

    #[test]
    fn test_house_edge() {
        let amount = U256::from(1000);
        let edge_bps = 400; // 4%

        let house_edge = calculate_house_edge(amount, edge_bps);
        assert_eq!(house_edge, U256::from(40));

        let effective = calculate_effective_amount(amount, edge_bps);
        assert_eq!(effective, U256::from(960));
    }

    #[test]
    fn test_revenue_split() {
        let revenue = U256::from(10000);
        let (protocol, lp, season) = split_revenue(revenue);

        assert_eq!(protocol, U256::from(4000)); // 40%
        assert_eq!(lp, U256::from(4000)); // 40%
        assert_eq!(season, U256::from(2000)); // 20%
    }
}
