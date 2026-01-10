use odra::{
    casper_types::U256,
    prelude::*,
};
use odra_modules::{
    erc20::Erc20,
    access::Ownable,
};

use crate::types::*;
use crate::calculations::*;
use crate::pool_manager::PoolManager;
use crate::multibet::MultibetHandler;
use crate::liquidity_pool::LiquidityPool;
use crate::season_manager::SeasonManager;
use crate::betting_manager::BettingManager;
use crate::nft_manager::NFTManager;
use crate::season_prediction_manager::SeasonPredictionManager;

// ==================== MAIN CONTRACT ====================

/// Premier League V2 - Pool-based betting with multibet support
///
/// Architecture:
/// - Pool-based parimutuel betting (no fixed odds)
/// - Multibet support with stake distribution
/// - Liquidity provider system with safety caps
/// - Pre-reserved winner liabilities
/// - O(10) settlement (not O(users))
#[odra::module]
pub struct PremierLeagueV2 {
    // Access control & token
    ownable: SubModule<Ownable>,
    league_token: SubModule<Erc20>,

    // Core modules
    pool_manager: SubModule<PoolManager>,
    multibet_handler: SubModule<MultibetHandler>,
    liquidity_pool: SubModule<LiquidityPool>,
    season_manager: SubModule<SeasonManager>,
    betting_manager: SubModule<BettingManager>,
    nft_manager: SubModule<NFTManager>,
    season_prediction_manager: SubModule<SeasonPredictionManager>,

    // Config
    house_edge: Var<u32>,
    keepers: Mapping<Address, bool>,
    keeper_count: Var<u32>,
    locked: Var<bool>,
}

#[odra::module]
impl PremierLeagueV2 {
    // ==================== INITIALIZATION ====================

    #[odra(init)]
    pub fn init(&mut self, _initial_lp_reserve: U256) {
        let caller = self.env().caller();
        self.ownable.init(caller);

        // Initialize $LEAGUE token
        self.league_token.init(
            "League Token".to_string(),
            "LEAGUE".to_string(),
            18,
            Some(U256::from(100_000_000) * U256::from(10u128.pow(18))), // 100M supply
        );

        // Initialize modules
        let contract_address = self.env().self_address();
        self.liquidity_pool.init(U256::from(10_000) * U256::from(10u128.pow(18)), contract_address);
        self.multibet_handler.init(U256::zero()); // Will be funded separately
        self.season_manager.init();
        self.betting_manager.init();
        self.nft_manager.init();
        self.season_prediction_manager.init();

        // Set default house edge (4%)
        self.house_edge.set(400);
        self.keeper_count.set(0);
        self.locked.set(false);
    }

    // ==================== KEEPER MANAGEMENT ====================

    pub fn add_keeper(&mut self, keeper: Address) {
        self.ownable.assert_owner(&self.env().caller());

        if !self.keepers.get(&keeper).unwrap_or(false) {
            self.keepers.set(&keeper, true);
            let count = self.keeper_count.get_or_default();
            self.keeper_count.set(count + 1);

            self.env().emit_event(KeeperAdded { keeper });
        }
    }

    pub fn remove_keeper(&mut self, keeper: Address) {
        self.ownable.assert_owner(&self.env().caller());

        if self.keepers.get(&keeper).unwrap_or(false) {
            self.keepers.set(&keeper, false);
            let count = self.keeper_count.get_or_default();
            self.keeper_count.set(count.saturating_sub(1));

            self.env().emit_event(KeeperRemoved { keeper });
        }
    }

    pub fn is_keeper(&self, address: Address) -> bool {
        self.keepers.get(&address).unwrap_or(false)
    }

    fn require_keeper(&self) {
        let caller = self.env().caller();
        assert!(self.is_keeper(caller), "Caller is not a keeper");
    }

    // ==================== SEASON & TURN MANAGEMENT ====================

    pub fn start_season(&mut self) {
        self.ownable.assert_owner(&self.env().caller());

        let season_id = self.season_manager.current_season_id.get_or_default() + 1;
        self.season_manager.current_season_id.set(season_id);

        let season = Season {
            season_id,
            start_time: self.env().get_block_time(),
            current_turn: 1,
            is_active: true,
            winner_team_id: None,
        };

        let start_time = season.start_time;
        self.season_manager.seasons.set(&season_id, season);

        // Start first turn
        self.start_turn_internal(season_id, 1);

        self.env().emit_event(SeasonStarted {
            season_id,
            start_time,
        });
    }

    fn start_turn_internal(&mut self, season_id: u32, turn_number: u32) {
        let turn_id = self.season_manager.next_turn_id.get_or_default();
        self.season_manager.next_turn_id.set(turn_id + 1);

        let start_time = self.env().get_block_time();

        // Create turn
        let turn = Turn {
            turn_id,
            season_id,
            turn_number,
            match_ids: Vec::new(),
            start_time,
            is_settled: false,
            vrf_fulfilled: false,
        };

        self.season_manager.turns.set(&turn_id, turn.clone());

        // Schedule 10 matches
        let mut match_ids = Vec::new();
        for _ in 0..MATCHES_PER_TURN {
            let match_id = self.schedule_match(season_id, turn_id, turn_number, start_time);
            match_ids.push(match_id);
        }

        // Update turn with match IDs
        let mut turn_updated = turn;
        turn_updated.match_ids = match_ids.clone();
        self.season_manager.turns.set(&turn_id, turn_updated);

        // Store turn matches mapping
        self.season_manager.turn_matches.set(&turn_id, match_ids);

        // Initialize turn accounting
        self.pool_manager.init_turn_accounting(turn_id);

        self.env().emit_event(TurnStarted {
            turn_id,
            season_id,
            turn_number,
            start_time,
        });
    }

    fn schedule_match(
        &mut self,
        season_id: u32,
        turn_id: u32,
        turn_number: u32,
        start_time: u64,
    ) -> u32 {
        let match_id = self.season_manager.next_match_id.get_or_default();
        self.season_manager.next_match_id.set(match_id + 1);

        // Generate teams (simplified - should use better logic)
        let home_team = ((match_id * 7) % TOTAL_TEAMS as u32) as u8;
        let away_team = ((match_id * 11) % TOTAL_TEAMS as u32) as u8;

        let match_data = Match {
            match_id,
            season_id,
            turn_number,
            home_team_id: home_team,
            away_team_id: away_team,
            home_score: 0,
            away_score: 0,
            result: None,
            start_time: start_time + MATCH_DURATION_SECONDS,
            is_finished: false,
        };

        let match_start_time = match_data.start_time;
        self.season_manager.matches.set(&match_id, match_data);

        // Initialize match pool
        self.pool_manager.init_match_pool(match_id);

        self.env().emit_event(MatchScheduled {
            match_id,
            turn_id,
            home_team_id: home_team,
            away_team_id: away_team,
            start_time: match_start_time,
        });

        match_id
    }

    // ==================== SINGLE BET PLACEMENT ====================

    pub fn place_bet(
        &mut self,
        match_id: u32,
        predicted_result: MatchResult,
        amount: U256,
    ) {
        self.acquire_lock();

        let caller = self.env().caller();
        let match_data = self.season_manager.matches.get(&match_id).expect("Match not found");

        // Validations
        assert!(!match_data.is_finished, "Match already finished");
        assert!(
            self.env().get_block_time() < match_data.start_time,
            "Betting closed"
        );
        assert!(validate_bet_amount(amount), "Bet amount too low");

        // Get turn info
        let turn = self.get_turn_for_match(match_id);

        // Transfer tokens from user
        let contract_address = self.env().self_address();
        self.league_token.transfer_from(&caller, &contract_address, &amount);

        // Calculate house edge
        let house_edge_bps = self.house_edge.get_or_default();
        let house_edge_amount = calculate_house_edge(amount, house_edge_bps);
        let effective_amount = amount - house_edge_amount;

        // House edge goes to protocol reserve (for multibets)
        self.multibet_handler.fund_protocol_reserve(house_edge_amount);

        // Add to pool
        self.pool_manager.add_to_pool(match_id, predicted_result, effective_amount);

        // SECURITY FIX #1: Lock liquidity to prevent LP withdrawal during active bets
        self.liquidity_pool.lock_liquidity(effective_amount);

        // Create bet
        let bet_id = self.betting_manager.next_bet_id.get_or_default();
        self.betting_manager.next_bet_id.set(bet_id + U256::one());

        let bet = Bet::new_single(
            bet_id,
            caller,
            turn.turn_id,
            match_id,
            predicted_result,
            effective_amount,
        );

        self.betting_manager.bets.set(&bet_id, bet);

        // Index bet
        let mut user_bets = self.betting_manager.user_bets.get(&caller).unwrap_or_default();
        user_bets.push(bet_id);
        self.betting_manager.user_bets.set(&caller, user_bets);

        let mut turn_bets = self.betting_manager.turn_bets.get(&turn.turn_id).unwrap_or_default();
        turn_bets.push(bet_id);
        self.betting_manager.turn_bets.set(&turn.turn_id, turn_bets);

        self.env().emit_event(SingleBetPlaced {
            bet_id,
            user: caller,
            match_id,
            amount,
            predicted_result,
        });

        self.release_lock();
    }

    // ==================== MULTIBET PLACEMENT ====================

    pub fn place_multibet(
        &mut self,
        match_ids: Vec<u32>,
        predicted_results: Vec<MatchResult>,
        base_amount: U256,
    ) {
        self.acquire_lock();

        let caller = self.env().caller();

        // Validate all matches are in same turn and betting is open
        let first_match = self.season_manager.matches.get(&match_ids[0]).expect("Match not found");
        let turn = self.get_turn_for_match(match_ids[0]);

        for match_id in &match_ids {
            let match_data = self.season_manager.matches.get(match_id).expect("Match not found");
            assert!(!match_data.is_finished, "Match already finished");
            assert!(
                self.env().get_block_time() < match_data.start_time,
                "Betting closed for one or more matches"
            );
            assert_eq!(
                match_data.season_id, first_match.season_id,
                "All matches must be in same season"
            );
        }

        // Validate multibet
        self.multibet_handler.validate_multibet(match_ids.clone(), predicted_results.clone(), base_amount)
            .expect("Invalid multibet");

        // Transfer user's base amount
        let contract_address = self.env().self_address();
        self.league_token.transfer_from(&caller, &contract_address, &base_amount);

        // Calculate house edge on base amount only
        let house_edge_bps = self.house_edge.get_or_default();
        let house_edge_amount = calculate_house_edge(base_amount, house_edge_bps);
        let effective_base = base_amount - house_edge_amount;

        // House edge to protocol reserve
        self.multibet_handler.fund_protocol_reserve(house_edge_amount);

        // Create multibet predictions (includes bonus calculation and distribution)
        let (predictions, bonus_amount) = self.multibet_handler
            .create_multibet_predictions(match_ids.clone(), predicted_results, effective_base)
            .expect("Failed to create multibet");

        // Add distributed stakes to each match pool
        for prediction in &predictions {
            self.pool_manager.add_to_pool(
                prediction.match_id,
                prediction.predicted_result,
                prediction.stake_amount,
            );
        }

        // SECURITY FIX #1: Lock liquidity for multibet (total effective stake)
        let total_stake = effective_base + bonus_amount;
        self.liquidity_pool.lock_liquidity(total_stake);

        // Create bet
        let bet_id = self.betting_manager.next_bet_id.get_or_default();
        self.betting_manager.next_bet_id.set(bet_id + U256::one());

        let bet = Bet::new_multibet(
            bet_id,
            caller,
            turn.turn_id,
            predictions,
            effective_base,
            bonus_amount,
        );

        self.betting_manager.bets.set(&bet_id, bet);

        // Index bet
        let mut user_bets = self.betting_manager.user_bets.get(&caller).unwrap_or_default();
        user_bets.push(bet_id);
        self.betting_manager.user_bets.set(&caller, user_bets);

        let mut turn_bets = self.betting_manager.turn_bets.get(&turn.turn_id).unwrap_or_default();
        turn_bets.push(bet_id);
        self.betting_manager.turn_bets.set(&turn.turn_id, turn_bets);

        self.env().emit_event(MultibetPlaced {
            bet_id,
            user: caller,
            num_matches: match_ids.len() as u32,
            base_amount,
            bonus_amount,
            total_stake: effective_base + bonus_amount,
        });

        self.release_lock();
    }

    // ==================== MATCH SIMULATION ====================

    pub fn simulate_match(&mut self, match_id: u32) {
        self.require_keeper();
        self.acquire_lock();

        let mut match_data = self.season_manager.matches.get(&match_id).expect("Match not found");
        assert!(!match_data.is_finished, "Match already finished");
        assert!(
            self.env().get_block_time() >= match_data.start_time,
            "Match not started yet"
        );

        // Simple random simulation (in production, use VRF)
        let block_time = self.env().get_block_time();
        let seed = (block_time as u64).wrapping_mul(match_id as u64);

        let home_score = ((seed % 5) as u8).min(4);
        let away_score = (((seed / 7) % 5) as u8).min(4);

        let result = if home_score > away_score {
            MatchResult::HomeWin
        } else if home_score < away_score {
            MatchResult::AwayWin
        } else {
            MatchResult::Draw
        };

        match_data.home_score = home_score;
        match_data.away_score = away_score;
        match_data.result = Some(result);
        match_data.is_finished = true;

        // Update team stats before moving match_data
        self.update_team_stats_for_match(&match_data);

        self.season_manager.matches.set(&match_id, match_data);

        self.env().emit_event(MatchFinished {
            match_id,
            home_score,
            away_score,
            result,
        });

        self.release_lock();
    }

    fn update_team_stats_for_match(&mut self, match_data: &Match) {
        let result = match_data.result.unwrap();

        // Update home team
        let home_key = (match_data.season_id, match_data.home_team_id);
        let mut home_stats = self.season_manager.team_stats.get(&home_key).unwrap_or(TeamStats {
            team_id: match_data.home_team_id,
            season_id: match_data.season_id,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            points: 0,
        });

        home_stats = update_team_stats(
            home_stats,
            true,
            result,
            match_data.home_score as u32,
            match_data.away_score as u32,
        );
        self.season_manager.team_stats.set(&home_key, home_stats);

        // Update away team
        let away_key = (match_data.season_id, match_data.away_team_id);
        let mut away_stats = self.season_manager.team_stats.get(&away_key).unwrap_or(TeamStats {
            team_id: match_data.away_team_id,
            season_id: match_data.season_id,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            points: 0,
        });

        away_stats = update_team_stats(
            away_stats,
            false,
            result,
            match_data.away_score as u32,
            match_data.home_score as u32,
        );
        self.season_manager.team_stats.set(&away_key, away_stats);
    }

    // ==================== TURN SETTLEMENT ====================

    pub fn settle_turn(&mut self, turn_id: u32) {
        self.require_keeper();
        self.acquire_lock();

        let turn = self.season_manager.turns.get(&turn_id).expect("Turn not found");
        assert!(!turn.is_settled, "Turn already settled");

        // Ensure all matches are finished
        let mut results = Vec::new();
        for match_id in &turn.match_ids {
            let match_data = self.season_manager.matches.get(match_id).expect("Match not found");
            assert!(match_data.is_finished, "Not all matches finished");
            results.push(match_data.result.unwrap());
        }

        // Settle turn via pool manager
        let accounting = self.pool_manager
            .settle_turn(turn_id, turn.match_ids.clone(), results)
            .expect("Failed to settle turn");

        // SECURITY FIX #1: Unlock liquidity after settlement
        // All bets for this turn are now settled, LPs can withdraw again
        self.liquidity_pool.unlock_liquidity(accounting.total_bet_volume);

        // Mark all bets as settled
        let bet_ids = self.betting_manager.turn_bets.get(&turn_id).unwrap_or_default();
        for bet_id in bet_ids {
            if let Some(mut bet) = self.betting_manager.bets.get(&bet_id) {
                let is_won = self.check_bet_won(&bet);
                bet.is_settled = true;
                self.betting_manager.bets.set(&bet_id, bet);

                self.env().emit_event(BetSettled {
                    bet_id,
                    is_won,
                });
            }
        }

        // Mark turn as settled
        let mut turn_mut = turn;
        turn_mut.is_settled = true;
        self.season_manager.turns.set(&turn_id, turn_mut);

        self.env().emit_event(TurnSettled {
            turn_id,
            total_reserved_for_winners: accounting.total_reserved_for_winners,
            total_losing_pool: accounting.total_losing_pool,
            net_revenue: accounting.net_revenue,
        });

        self.release_lock();
    }

    // ==================== CLAIM WINNINGS (PULL PATTERN) ====================

    pub fn claim_winnings(&mut self, bet_id: U256) {
        self.acquire_lock();

        let bet = self.betting_manager.bets.get(&bet_id).expect("Bet not found");
        assert!(bet.is_settled, "Bet not settled yet");
        assert!(!bet.is_claimed, "Already claimed");
        assert_eq!(bet.user, self.env().caller(), "Not bet owner");

        let payout = if bet.is_multibet {
            self.calculate_multibet_payout(&bet)
        } else {
            self.calculate_single_payout(&bet)
        };

        let user = bet.user;

        // Update bet
        let mut bet_mut = bet;
        bet_mut.is_claimed = true;
        bet_mut.payout = payout;
        self.betting_manager.bets.set(&bet_id, bet_mut);

        // Transfer winnings if any
        if !payout.is_zero() {
            self.league_token.transfer(&user, &payout);
        }

        self.env().emit_event(WinningsClaimed {
            bet_id,
            user,
            payout,
        });

        self.release_lock();
    }

    fn calculate_single_payout(&self, bet: &Bet) -> U256 {
        let prediction = bet.single_prediction.as_ref().expect("Not a single bet");

        let match_data = self.season_manager.matches.get(&prediction.match_id).expect("Match not found");
        let result = match_data.result.expect("Match not finished");

        self.pool_manager.calculate_single_payout(
            prediction.match_id,
            prediction.stake_amount,
            prediction.predicted_result,
            result,
        )
    }

    fn calculate_multibet_payout(&self, bet: &Bet) -> U256 {
        let predictions = &bet.multibet_predictions;

        // Collect results
        let mut results = Vec::new();
        for prediction in predictions {
            let match_data = self.season_manager.matches.get(&prediction.match_id).expect("Match not found");
            let result = match_data.result.expect("Match not finished");
            results.push((prediction.match_id, result));
        }

        self.pool_manager.calculate_multibet_payout_full(predictions.clone(), results)
    }

    fn check_bet_won(&self, bet: &Bet) -> bool {
        if bet.is_multibet {
            let mut results = Vec::new();
            for prediction in &bet.multibet_predictions {
                let match_data = self.season_manager.matches.get(&prediction.match_id).expect("Match not found");
                let result = match_data.result.expect("Match not finished");
                results.push((prediction.match_id, result));
            }
            self.pool_manager.did_bet_win(bet.multibet_predictions.clone(), results)
        } else {
            let prediction = bet.single_prediction.as_ref().expect("Not a single bet");
            let match_data = self.season_manager.matches.get(&prediction.match_id).expect("Match not found");
            let result = match_data.result.expect("Match not finished");
            prediction.predicted_result == result
        }
    }

    // ==================== REVENUE DISTRIBUTION ====================

    pub fn finalize_turn_revenue(&mut self, turn_id: u32) {
        self.ownable.assert_owner(&self.env().caller());
        self.acquire_lock();

        let accounting = self.pool_manager.get_turn_accounting(turn_id)
            .expect("Turn accounting not found");

        assert!(accounting.is_settled, "Turn not settled");
        assert!(!accounting.revenue_distributed, "Revenue already distributed");

        // Split revenue
        let (protocol_share, lp_share, season_share) = split_revenue(accounting.net_revenue);

        // Distribute to LP pool (increases value per share)
        self.liquidity_pool.distribute_lp_revenue(lp_share);

        // Add to season pool
        let current_season_pool = self.season_prediction_manager.prize_pool.get_or_default();
        self.season_prediction_manager.prize_pool.set(current_season_pool + season_share);

        // Protocol share stays in contract as reserve
        self.multibet_handler.fund_protocol_reserve(protocol_share);

        // Mark as distributed
        self.pool_manager.mark_revenue_distributed(turn_id);

        self.env().emit_event(RevenueDistributed {
            turn_id,
            protocol_share,
            lp_share,
            season_share,
        });

        self.release_lock();
    }

    // ==================== LIQUIDITY PROVIDER FUNCTIONS ====================

    pub fn add_liquidity(&mut self, amount: U256) {
        let caller = self.env().caller();
        let contract_address = self.env().self_address();

        // Transfer tokens
        self.league_token.transfer_from(&caller, &contract_address, &amount);

        // Add to LP pool
        let shares = self.liquidity_pool.add_liquidity(caller, amount);

        self.env().emit_event(LiquidityAdded {
            provider: caller,
            amount,
            shares,
        });
    }

    pub fn remove_liquidity(&mut self, shares: U256) {
        let caller = self.env().caller();

        // Remove from LP pool
        let amount = self.liquidity_pool.remove_liquidity(caller, shares);

        // Transfer tokens back
        self.league_token.transfer(&caller, &amount);

        self.env().emit_event(LiquidityRemoved {
            provider: caller,
            amount,
            shares,
        });
    }

    // ==================== VIEW FUNCTIONS ====================

    pub fn get_season(&self, season_id: u32) -> Option<Season> {
        self.season_manager.seasons.get(&season_id)
    }

    pub fn get_current_season(&self) -> Option<Season> {
        let season_id = self.season_manager.current_season_id.get_or_default();
        self.season_manager.seasons.get(&season_id)
    }

    pub fn get_match(&self, match_id: u32) -> Option<Match> {
        self.season_manager.matches.get(&match_id)
    }

    pub fn get_turn(&self, turn_id: u32) -> Option<Turn> {
        self.season_manager.turns.get(&turn_id)
    }

    pub fn get_bet(&self, bet_id: U256) -> Option<Bet> {
        self.betting_manager.bets.get(&bet_id)
    }

    pub fn get_user_bets(&self, user: Address) -> Vec<U256> {
        self.betting_manager.user_bets.get(&user).unwrap_or_default()
    }

    pub fn get_match_pool(&self, match_id: u32) -> Option<crate::pool_manager::PoolStats> {
        self.pool_manager.get_pool_stats(match_id)
    }

    pub fn get_display_odds(&self, match_id: u32, outcome: MatchResult) -> U256 {
        self.pool_manager.get_display_odds(match_id, outcome)
    }

    pub fn get_lp_position(&self, provider: Address) -> crate::liquidity_pool::LPPositionInfo {
        self.liquidity_pool.get_lp_position(provider)
    }

    pub fn get_pool_stats(&self) -> crate::liquidity_pool::LiquidityPoolStats {
        self.liquidity_pool.get_pool_stats()
    }

    pub fn get_protocol_reserve(&self) -> U256 {
        self.multibet_handler.get_protocol_reserve()
    }

    pub fn get_season_pool(&self) -> U256 {
        self.season_prediction_manager.prize_pool.get_or_default()
    }

    pub fn get_team_stats(&self, season_id: u32, team_id: u8) -> Option<TeamStats> {
        self.season_manager.team_stats.get(&(season_id, team_id))
    }

    pub fn get_multibet_preview(&self, base_amount: U256, num_matches: u32) -> crate::multibet::MultibetStats {
        self.multibet_handler.get_multibet_stats(base_amount, num_matches)
    }

    pub fn get_turn_accounting(&self, turn_id: u32) -> Option<TurnAccounting> {
        self.pool_manager.get_turn_accounting(turn_id)
    }

    /// Preview what a bet would return BEFORE placing it
    /// This shows potential winnings based on current pool state
    pub fn preview_bet(
        &self,
        match_id: u32,
        outcome: MatchResult,
        stake_amount: U256,
    ) -> crate::pool_manager::BetPreview {
        self.pool_manager.preview_bet_outcome(match_id, outcome, stake_amount)
    }

    // ==================== REENTRANCY GUARD ====================

    fn acquire_lock(&mut self) {
        assert!(!self.locked.get_or_default(), "Reentrancy detected");
        self.locked.set(true);
    }

    fn release_lock(&mut self) {
        self.locked.set(false);
    }

    // ==================== HELPER FUNCTIONS ====================

    fn get_turn_for_match(&self, match_id: u32) -> Turn {
        let _match_data = self.season_manager.matches.get(&match_id).expect("Match not found");

        // Find turn containing this match
        let mut turn_id = 1u32;
        loop {
            if let Some(turn) = self.season_manager.turns.get(&turn_id) {
                if turn.match_ids.contains(&match_id) {
                    return turn;
                }
                turn_id += 1;
            } else {
                panic!("Turn not found for match");
            }
        }
    }
}
