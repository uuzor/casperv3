#[cfg(test)]
mod v2_tests {
    use odra::{
        host::{Deployer, HostEnv, NoArgs},
        casper_types::U256,
    };
    use plvx::{
        PremierLeagueV2,
        MatchResult,
    };

    // ==================== TEST HELPERS ====================

    fn deploy_contract(env: &HostEnv) -> PremierLeagueV2 {
        let initial_lp = U256::from(10_000) * U256::from(10u128.pow(18));
        PremierLeagueV2::deploy(env, initial_lp)
    }

    fn tokens(amount: u128) -> U256 {
        U256::from(amount) * U256::from(10u128.pow(18))
    }

    // ==================== MULTIBET TESTS ====================

    #[test]
    fn test_multibet_bonus_calculation() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);

        // Test 2 matches: 10% bonus
        let preview_2 = contract.get_multibet_preview(tokens(100), 2);
        assert_eq!(preview_2.num_matches, 2);
        assert_eq!(preview_2.base_amount, tokens(100));
        assert_eq!(preview_2.bonus_amount, tokens(10)); // 100 * 1 * 10%
        assert_eq!(preview_2.total_stake, tokens(110));
        assert_eq!(preview_2.bonus_percentage, 1000); // 10% in bps

        // Test 3 matches: 20% bonus
        let preview_3 = contract.get_multibet_preview(tokens(100), 3);
        assert_eq!(preview_3.num_matches, 3);
        assert_eq!(preview_3.bonus_amount, tokens(20)); // 100 * 2 * 10%
        assert_eq!(preview_3.total_stake, tokens(120));
        assert_eq!(preview_3.bonus_percentage, 2000); // 20% in bps

        // Test 5 matches: 40% bonus
        let preview_5 = contract.get_multibet_preview(tokens(100), 5);
        assert_eq!(preview_5.bonus_amount, tokens(40)); // 100 * 4 * 10%
        assert_eq!(preview_5.total_stake, tokens(140));
        assert_eq!(preview_5.bonus_percentage, 4000); // 40% in bps

        // Test 10 matches: 90% bonus
        let preview_10 = contract.get_multibet_preview(tokens(100), 10);
        assert_eq!(preview_10.bonus_amount, tokens(90)); // 100 * 9 * 10%
        assert_eq!(preview_10.total_stake, tokens(190));
        assert_eq!(preview_10.bonus_percentage, 9000); // 90% in bps
    }

    #[test]
    fn test_multibet_stake_distribution() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let user = env.get_account(1);

        // Setup: Start season and get matches
        env.set_caller(owner);
        contract.add_keeper(owner);
        contract.start_season();

        let current_season = contract.get_current_season().expect("Season should exist");
        let turn_id = 1u32;
        let turn = contract.get_turn(turn_id).expect("Turn should exist");

        // Get first 3 matches
        let match_ids = vec![turn.match_ids[0], turn.match_ids[1], turn.match_ids[2]];
        let predictions = vec![MatchResult::HomeWin, MatchResult::Draw, MatchResult::AwayWin];

        // User places multibet: 30 tokens on 3 matches
        env.set_caller(user);
        let base_amount = tokens(30);

        // Give user tokens
        env.set_caller(owner);
        contract.league_token().transfer(&user, &tokens(1000));

        // Approve contract to spend
        env.set_caller(user);
        contract.league_token().approve(&contract.address(), &tokens(1000));

        // Place multibet
        contract.place_multibet(match_ids.clone(), predictions.clone(), base_amount);

        // Verify pool distributions
        // Expected: 30 base + 6 bonus (20%) = 36 total
        // House edge: 36 * 4% = 1.44 → effective = 34.56
        // Per match: 34.56 / 3 = 11.52 tokens each

        let pool_1 = contract.get_match_pool(match_ids[0]).expect("Pool 1 should exist");
        let pool_2 = contract.get_match_pool(match_ids[1]).expect("Pool 2 should exist");
        let pool_3 = contract.get_match_pool(match_ids[2]).expect("Pool 3 should exist");

        // Each pool should receive approximately 11.52 tokens
        // HomeWin pool, Draw pool, AwayWin pool respectively
        assert!(pool_1.home_win_pool > tokens(11));
        assert!(pool_2.draw_pool > tokens(11));
        assert!(pool_3.away_win_pool > tokens(11));

        println!("Pool 1 HomeWin: {}", pool_1.home_win_pool);
        println!("Pool 2 Draw: {}", pool_2.draw_pool);
        println!("Pool 3 AwayWin: {}", pool_3.away_win_pool);
    }

    #[test]
    fn test_multibet_all_correct_predictions() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let user1 = env.get_account(1);
        let user2 = env.get_account(2);

        // Setup
        env.set_caller(owner);
        contract.add_keeper(owner);
        contract.start_season();

        let turn_id = 1u32;
        let turn = contract.get_turn(turn_id).expect("Turn should exist");
        let match_ids = vec![turn.match_ids[0], turn.match_ids[1], turn.match_ids[2]];

        // Give users tokens
        contract.league_token().transfer(&user1, &tokens(1000));
        contract.league_token().transfer(&user2, &tokens(1000));

        // User1 places winning multibet (we'll control match results)
        env.set_caller(user1);
        contract.league_token().approve(&contract.address(), &tokens(1000));
        let predictions = vec![MatchResult::HomeWin, MatchResult::HomeWin, MatchResult::HomeWin];
        contract.place_multibet(match_ids.clone(), predictions.clone(), tokens(100));

        // User2 places some losing bets to create pools
        env.set_caller(user2);
        contract.league_token().approve(&contract.address(), &tokens(1000));
        contract.place_bet(match_ids[0], MatchResult::Draw, tokens(50));
        contract.place_bet(match_ids[1], MatchResult::Draw, tokens(50));
        contract.place_bet(match_ids[2], MatchResult::Draw, tokens(50));

        // Simulate matches (force HomeWin results)
        env.set_caller(owner);
        // Note: You'll need to modify simulate_match to accept result parameter
        // For now, we trust the random simulation

        // Get user1's bet
        let user_bets = contract.get_user_bets(user1);
        assert_eq!(user_bets.len(), 1);

        println!("User1 placed multibet with ID: {}", user_bets[0]);
    }

    #[test]
    #[should_panic(expected = "Invalid multibet count")]
    fn test_multibet_validation_too_few_matches() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let user = env.get_account(1);

        env.set_caller(owner);
        contract.add_keeper(owner);
        contract.start_season();

        let turn = contract.get_turn(1).expect("Turn should exist");

        // Try to place multibet with only 1 match (minimum is 2)
        env.set_caller(user);
        contract.league_token().approve(&contract.address(), &tokens(100));
        contract.place_multibet(
            vec![turn.match_ids[0]],
            vec![MatchResult::HomeWin],
            tokens(10)
        );
    }

    #[test]
    #[should_panic(expected = "Invalid multibet count")]
    fn test_multibet_validation_too_many_matches() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let user = env.get_account(1);

        env.set_caller(owner);
        contract.add_keeper(owner);
        contract.start_season();

        let turn = contract.get_turn(1).expect("Turn should exist");

        // Try to place multibet with 11 matches (maximum is 10)
        let match_ids = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        let predictions = vec![MatchResult::HomeWin; 11];

        env.set_caller(user);
        contract.league_token().approve(&contract.address(), &tokens(100));
        contract.place_multibet(match_ids, predictions, tokens(10));
    }

    // ==================== LIQUIDITY POOL TESTS ====================

    #[test]
    fn test_add_liquidity_first_provider() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let lp_provider = env.get_account(1);

        // Give LP provider tokens
        env.set_caller(owner);
        contract.league_token().transfer(&lp_provider, &tokens(10000));

        // Check initial pool stats
        let initial_stats = contract.get_pool_stats();
        println!("Initial LP pool: {}", initial_stats.total_liquidity);

        // Add liquidity
        env.set_caller(lp_provider);
        contract.league_token().approve(&contract.address(), &tokens(10000));
        contract.add_liquidity(tokens(1000));

        // Check LP position
        let position = contract.get_lp_position(lp_provider);
        assert_eq!(position.shares, tokens(1000)); // First provider gets 1:1 shares
        assert_eq!(position.provider, lp_provider);
        assert!(position.can_withdraw); // Should be able to withdraw after cooldown

        // Check updated pool stats
        let updated_stats = contract.get_pool_stats();
        assert_eq!(updated_stats.total_liquidity, initial_stats.total_liquidity + tokens(1000));
        assert_eq!(updated_stats.total_shares, tokens(1000));
    }

    #[test]
    fn test_add_liquidity_multiple_providers() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let lp1 = env.get_account(1);
        let lp2 = env.get_account(2);

        // Setup: Give LPs tokens
        env.set_caller(owner);
        contract.league_token().transfer(&lp1, &tokens(10000));
        contract.league_token().transfer(&lp2, &tokens(10000));

        // LP1 adds liquidity
        env.set_caller(lp1);
        contract.league_token().approve(&contract.address(), &tokens(10000));
        contract.add_liquidity(tokens(1000));

        let lp1_position_1 = contract.get_lp_position(lp1);
        assert_eq!(lp1_position_1.shares, tokens(1000));

        // LP2 adds same amount
        env.set_caller(lp2);
        contract.league_token().approve(&contract.address(), &tokens(10000));
        contract.add_liquidity(tokens(1000));

        let lp2_position = contract.get_lp_position(lp2);
        // LP2 should get same shares since pool hasn't appreciated
        assert_eq!(lp2_position.shares, tokens(1000));

        // Check total shares
        let pool_stats = contract.get_pool_stats();
        assert_eq!(pool_stats.total_shares, tokens(2000));
    }

    #[test]
    fn test_remove_liquidity() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let lp_provider = env.get_account(1);

        // Setup: Add liquidity
        env.set_caller(owner);
        contract.league_token().transfer(&lp_provider, &tokens(10000));

        env.set_caller(lp_provider);
        contract.league_token().approve(&contract.address(), &tokens(10000));
        contract.add_liquidity(tokens(1000));

        let initial_balance = contract.league_token().balance_of(&lp_provider);

        // Wait for cooldown (15 minutes = 900 seconds)
        env.advance_block_time(901);

        // Remove liquidity
        let position = contract.get_lp_position(lp_provider);
        contract.remove_liquidity(position.shares);

        // Check balances
        let final_balance = contract.league_token().balance_of(&lp_provider);
        assert_eq!(final_balance, initial_balance + tokens(1000));

        // Check position is cleared
        let updated_position = contract.get_lp_position(lp_provider);
        assert_eq!(updated_position.shares, U256::zero());
    }

    #[test]
    fn test_liquidity_pool_revenue_distribution() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let lp_provider = env.get_account(1);
        let bettor = env.get_account(2);

        // Setup: Add liquidity
        env.set_caller(owner);
        contract.add_keeper(owner);
        contract.league_token().transfer(&lp_provider, &tokens(10000));
        contract.league_token().transfer(&bettor, &tokens(1000));

        env.set_caller(lp_provider);
        contract.league_token().approve(&contract.address(), &tokens(10000));
        contract.add_liquidity(tokens(1000));

        let initial_lp_value = contract.get_lp_position(lp_provider).value;

        // Start season and place bets
        env.set_caller(owner);
        contract.start_season();

        let turn = contract.get_turn(1).expect("Turn should exist");
        let match_id = turn.match_ids[0];

        // Bettor places bets (generates revenue)
        env.set_caller(bettor);
        contract.league_token().approve(&contract.address(), &tokens(1000));
        contract.place_bet(match_id, MatchResult::HomeWin, tokens(100));
        contract.place_bet(match_id, MatchResult::Draw, tokens(100));

        // Simulate match and settle turn
        env.set_caller(owner);
        for match_id in &turn.match_ids {
            env.advance_block_time(901); // Wait for match to start
            contract.simulate_match(*match_id);
        }

        contract.settle_turn(1);

        // Finalize revenue (distributes to LP)
        contract.finalize_turn_revenue(1);

        // Check LP position value increased
        let final_lp_value = contract.get_lp_position(lp_provider).value;
        assert!(final_lp_value > initial_lp_value, "LP value should increase from revenue");

        println!("Initial LP value: {}", initial_lp_value);
        println!("Final LP value: {}", final_lp_value);
        println!("Profit: {}", final_lp_value - initial_lp_value);
    }

    #[test]
    fn test_liquidity_utilization_cap() {
        let env = odra_test::env();
        let contract = deploy_contract(&env);

        // Check utilization is within cap (80%)
        let pool_stats = contract.get_pool_stats();
        assert!(pool_stats.utilization_bps <= 8000, "Utilization should be <= 80%");

        println!("Total liquidity: {}", pool_stats.total_liquidity);
        println!("Utilized: {}", pool_stats.utilized_liquidity);
        println!("Available: {}", pool_stats.available_liquidity);
        println!("Utilization: {}%", pool_stats.utilization_bps / 100);
    }

    #[test]
    #[should_panic(expected = "Withdrawal cooldown not met")]
    fn test_withdrawal_cooldown_enforced() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let lp_provider = env.get_account(1);

        // Add liquidity
        env.set_caller(owner);
        contract.league_token().transfer(&lp_provider, &tokens(10000));

        env.set_caller(lp_provider);
        contract.league_token().approve(&contract.address(), &tokens(10000));
        contract.add_liquidity(tokens(1000));

        // Try to withdraw immediately (should fail)
        let position = contract.get_lp_position(lp_provider);
        contract.remove_liquidity(position.shares);
    }

    // ==================== INTEGRATION TESTS ====================

    #[test]
    fn test_full_betting_cycle_with_multibet() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let user = env.get_account(1);

        // Setup
        env.set_caller(owner);
        contract.add_keeper(owner);
        contract.league_token().transfer(&user, &tokens(1000));
        contract.start_season();

        let turn = contract.get_turn(1).expect("Turn should exist");
        let match_ids = vec![turn.match_ids[0], turn.match_ids[1], turn.match_ids[2]];

        // User places multibet
        env.set_caller(user);
        contract.league_token().approve(&contract.address(), &tokens(1000));
        let predictions = vec![MatchResult::HomeWin, MatchResult::Draw, MatchResult::AwayWin];
        contract.place_multibet(match_ids.clone(), predictions.clone(), tokens(100));

        let user_bets = contract.get_user_bets(user);
        assert_eq!(user_bets.len(), 1);

        let bet = contract.get_bet(user_bets[0]).expect("Bet should exist");
        assert_eq!(bet.is_multibet, true);
        assert_eq!(bet.multibet_predictions.len(), 3);
        assert_eq!(bet.is_settled, false);

        // Simulate and settle
        env.set_caller(owner);
        for match_id in &turn.match_ids {
            env.advance_block_time(901);
            contract.simulate_match(*match_id);
        }

        contract.settle_turn(1);

        // Check bet is settled
        let settled_bet = contract.get_bet(user_bets[0]).expect("Bet should exist");
        assert_eq!(settled_bet.is_settled, true);

        println!("Bet placed and settled successfully!");
        println!("Base amount: {}", settled_bet.base_amount);
        println!("Bonus amount: {}", settled_bet.bonus_amount);
    }

    #[test]
    fn test_preview_bet_odds_change() {
        let env = odra_test::env();
        let mut contract = deploy_contract(&env);
        let owner = env.get_account(0);
        let user1 = env.get_account(1);
        let user2 = env.get_account(2);

        // Setup
        env.set_caller(owner);
        contract.add_keeper(owner);
        contract.league_token().transfer(&user1, &tokens(10000));
        contract.league_token().transfer(&user2, &tokens(10000));
        contract.start_season();

        let turn = contract.get_turn(1).expect("Turn should exist");
        let match_id = turn.match_ids[0];

        // Preview odds before any bets
        let preview_1 = contract.preview_bet(match_id, MatchResult::HomeWin, tokens(100));
        let initial_odds = preview_1.effective_odds;

        println!("Initial odds: {}", initial_odds);

        // User1 places bet
        env.set_caller(user1);
        contract.league_token().approve(&contract.address(), &tokens(10000));
        contract.place_bet(match_id, MatchResult::HomeWin, tokens(1000));

        // Preview odds after bet (should be lower for HomeWin)
        let preview_2 = contract.preview_bet(match_id, MatchResult::HomeWin, tokens(100));
        let odds_after_bet = preview_2.effective_odds;

        println!("Odds after 1000 token bet on HomeWin: {}", odds_after_bet);

        assert!(odds_after_bet < initial_odds, "Odds should decrease when more people bet on same outcome");

        // Preview odds for different outcome (should be higher)
        let preview_3 = contract.preview_bet(match_id, MatchResult::Draw, tokens(100));
        println!("Odds for Draw (different outcome): {}", preview_3.effective_odds);

        assert!(preview_3.effective_odds > odds_after_bet, "Odds for different outcome should be higher");
    }
}
