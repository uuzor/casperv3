use odra::{
    casper_types::U256,
    prelude::*,
};
use crate::types::*;
use crate::calculations::*;

// ==================== MULTIBET HANDLER ====================

/// Handles multibet creation and distribution logic
#[odra::module]
pub struct MultibetHandler {
    // Track protocol reserve for bonuses
    protocol_reserve: Var<U256>,

    // Bonus configuration
    bonus_enabled: Var<bool>,
}

#[odra::module]
impl MultibetHandler {
    /// Initialize multibet handler
    pub fn init(&mut self, initial_reserve: U256) {
        self.protocol_reserve.set(initial_reserve);
        self.bonus_enabled.set(true);
    }

    /// Create multibet predictions with distributed stakes
    pub fn create_multibet_predictions(
        &mut self,
        match_ids: Vec<u32>,
        predicted_results: Vec<MatchResult>,
        base_amount: U256,
    ) -> Result<(Vec<MultibetPrediction>, U256), String> {
        // Validate inputs
        let num_matches = match_ids.len() as u32;

        if !validate_multibet_count(num_matches) {
            return Err(format!(
                "Invalid multibet count: {} (must be {}-{})",
                num_matches, MIN_MULTIBET_MATCHES, MAX_MULTIBET_MATCHES
            ));
        }

        if match_ids.len() != predicted_results.len() {
            return Err("Match IDs and predictions length mismatch".to_string());
        }

        if !validate_bet_amount(base_amount) {
            return Err(format!(
                "Bet amount too low: minimum is {}",
                MIN_BET_AMOUNT
            ));
        }

        // Calculate bonus with dual-cap protection
        let bonus_amount = if self.bonus_enabled.get_or_default() {
            let desired_bonus = calculate_multibet_bonus(base_amount, num_matches);
            let current_reserve = self.protocol_reserve.get_or_default();

            // SECURITY FIX #2: Dual-cap bonus protection
            // Protection 1: Absolute threshold (9:1 ratio - reserve must be 9x bonus)
            let max_bonus_from_threshold = current_reserve / U256::from(9);

            // Protection 2: Percentage cap (50% of current reserve)
            let max_bonus_from_percentage = current_reserve / U256::from(2);

            // Use the STRICTER limit (minimum of the two)
            let max_bonus_allowed = if max_bonus_from_threshold < max_bonus_from_percentage {
                max_bonus_from_threshold
            } else {
                max_bonus_from_percentage
            };

            // Apply the cap - take minimum of desired bonus and maximum allowed
            let bonus = if desired_bonus > max_bonus_allowed {
                max_bonus_allowed  // Cap to safe limit
            } else {
                desired_bonus  // Full bonus if safe
            };

            // Only deduct if bonus is actually being paid
            if !bonus.is_zero() {
                self.protocol_reserve.set(current_reserve - bonus);
            }

            bonus
        } else {
            U256::zero()
        };

        // Calculate per-match stake
        let per_match_stake = calculate_per_match_stake(base_amount, bonus_amount, num_matches);

        // Create predictions
        let mut predictions = Vec::new();

        for (match_id, predicted_result) in match_ids.iter().zip(predicted_results.iter()) {
            predictions.push(MultibetPrediction {
                match_id: *match_id,
                predicted_result: *predicted_result,
                stake_amount: per_match_stake,
            });
        }

        Ok((predictions, bonus_amount))
    }

    /// Fund protocol reserve for bonuses
    pub fn fund_protocol_reserve(&mut self, amount: U256) {
        let current = self.protocol_reserve.get_or_default();
        self.protocol_reserve.set(current + amount);
    }

    /// Get protocol reserve balance
    pub fn get_protocol_reserve(&self) -> U256 {
        self.protocol_reserve.get_or_default()
    }

    /// Enable/disable bonus system
    pub fn set_bonus_enabled(&mut self, enabled: bool) {
        self.bonus_enabled.set(enabled);
    }

    /// Get bonus enabled status
    pub fn is_bonus_enabled(&self) -> bool {
        self.bonus_enabled.get_or_default()
    }

    /// Calculate potential bonus (without deducting from reserve)
    pub fn preview_bonus(&self, base_amount: U256, num_matches: u32) -> U256 {
        if !self.bonus_enabled.get_or_default() {
            return U256::zero();
        }

        calculate_multibet_bonus(base_amount, num_matches)
    }

    /// Validate multibet can be created
    pub fn validate_multibet(
        &self,
        match_ids: Vec<u32>,
        predicted_results: Vec<MatchResult>,
        base_amount: U256,
    ) -> Result<(), String> {
        let num_matches = match_ids.len() as u32;

        if !validate_multibet_count(num_matches) {
            return Err(format!(
                "Invalid multibet count: {} (must be {}-{})",
                num_matches, MIN_MULTIBET_MATCHES, MAX_MULTIBET_MATCHES
            ));
        }

        if match_ids.len() != predicted_results.len() {
            return Err("Match IDs and predictions length mismatch".to_string());
        }

        if !validate_bet_amount(base_amount) {
            return Err(format!(
                "Bet amount too low: minimum is {}",
                MIN_BET_AMOUNT
            ));
        }

        // Check duplicate match IDs
        for i in 0..match_ids.len() {
            for j in (i + 1)..match_ids.len() {
                if match_ids[i] == match_ids[j] {
                    return Err(format!("Duplicate match ID: {}", match_ids[i]));
                }
            }
        }

        // Check bonus availability
        if self.bonus_enabled.get_or_default() {
            let bonus = calculate_multibet_bonus(base_amount, num_matches);
            let reserve = self.protocol_reserve.get_or_default();

            if reserve < bonus {
                return Err(format!(
                    "Insufficient protocol reserve for bonus: need {} but have {}",
                    bonus, reserve
                ));
            }
        }

        Ok(())
    }
}

// ==================== MULTIBET STATISTICS ====================

impl MultibetHandler {
    /// Calculate multibet statistics for display
    pub fn get_multibet_stats(
        &self,
        base_amount: U256,
        num_matches: u32,
    ) -> MultibetStats {
        let bonus = if self.bonus_enabled.get_or_default() {
            calculate_multibet_bonus(base_amount, num_matches)
        } else {
            U256::zero()
        };

        let total_stake = base_amount + bonus;
        let per_match_stake = calculate_per_match_stake(base_amount, bonus, num_matches);

        MultibetStats {
            num_matches,
            base_amount,
            bonus_amount: bonus,
            total_stake,
            per_match_stake,
            bonus_percentage: MULTIBET_BONUS_PER_MATCH * (num_matches - 1),
        }
    }
}

// ==================== DISPLAY TYPES ====================

#[odra::odra_type]

pub struct MultibetStats {
    pub num_matches: u32,
    pub base_amount: U256,
    pub bonus_amount: U256,
    pub total_stake: U256,
    pub per_match_stake: U256,
    pub bonus_percentage: u32, // In basis points
}

// ==================== HELPER FUNCTIONS ====================

/// Check if all predictions in multibet won
pub fn all_predictions_won(
    predictions: &[MultibetPrediction],
    results: &[(u32, MatchResult)],
) -> bool {
    if predictions.len() != results.len() {
        return false;
    }

    for (prediction, (match_id, result)) in predictions.iter().zip(results.iter()) {
        if prediction.match_id != *match_id {
            return false;
        }

        if prediction.predicted_result != *result {
            return false;
        }
    }

    true
}

/// Get prediction for specific match from multibet
pub fn get_prediction_for_match(
    predictions: &[MultibetPrediction],
    match_id: u32,
) -> Option<&MultibetPrediction> {
    predictions.iter().find(|p| p.match_id == match_id)
}

/// Count winning predictions in multibet
pub fn count_winning_predictions(
    predictions: &[MultibetPrediction],
    results: &[(u32, MatchResult)],
) -> u32 {
    let mut count = 0;

    for (prediction, (match_id, result)) in predictions.iter().zip(results.iter()) {
        if prediction.match_id == *match_id && prediction.predicted_result == *result {
            count += 1;
        }
    }

    count
}
