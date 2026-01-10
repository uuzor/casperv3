use odra::{
    casper_types::U256,
    prelude::*,
};
use crate::types::*;
use crate::calculations::*;

// ==================== LIQUIDITY POOL MODULE ====================

/// Manages liquidity providers and pool utilization
#[odra::module]
pub struct LiquidityPool {
    // Total liquidity in the pool
    total_liquidity: Var<U256>,

    // Currently utilized (locked) liquidity
    utilized_liquidity: Var<U256>,

    // Total LP shares issued
    total_shares: Var<U256>,

    // LP positions: provider -> shares
    lp_shares: Mapping<Address, U256>,

    // LP deposit timestamps: provider -> timestamp
    deposit_timestamps: Mapping<Address, u64>,

    // Minimum initial deposit
    min_initial_deposit: Var<U256>,

    // Authorized addresses (contract)
    authorized: Mapping<Address, bool>,
}

#[odra::module]
impl LiquidityPool {
    /// Initialize liquidity pool
    pub fn init(&mut self, min_deposit: U256, contract_address: Address) {
        self.min_initial_deposit.set(min_deposit);
        self.total_liquidity.set(U256::zero());
        self.utilized_liquidity.set(U256::zero());
        self.total_shares.set(U256::zero());

        // Authorize the main contract
        self.authorized.set(&contract_address, true);
    }

    /// Add liquidity to the pool
    pub fn add_liquidity(&mut self, provider: Address, amount: U256) -> U256 {
        let current_time = self.env().get_block_time();

        // Check minimum for first deposit
        let total_liq = self.total_liquidity.get_or_default();
        if total_liq.is_zero() {
            let min_deposit = self.min_initial_deposit.get_or_default();
            assert!(
                amount >= min_deposit,
                "Initial deposit must be at least {}",
                min_deposit
            );
        }

        // Calculate shares
        let total_shares = self.total_shares.get_or_default();
        let shares = calculate_lp_shares(amount, total_liq, total_shares);

        // Update LP position
        let current_shares = self.lp_shares.get(&provider).unwrap_or(U256::zero());
        self.lp_shares.set(&provider, current_shares + shares);

        // Update deposit timestamp
        self.deposit_timestamps.set(&provider, current_time);

        // Update totals
        self.total_liquidity.set(total_liq + amount);
        self.total_shares.set(total_shares + shares);

        shares
    }

    /// Remove liquidity from the pool
    pub fn remove_liquidity(&mut self, provider: Address, shares: U256) -> U256 {
        let current_time = self.env().get_block_time();

        // Check withdrawal cooldown
        let deposit_time = self.deposit_timestamps.get(&provider).unwrap_or(0);
        assert!(
            current_time >= deposit_time + WITHDRAWAL_COOLDOWN,
            "Withdrawal cooldown not elapsed (15 minutes required)"
        );

        // Check LP has enough shares
        let lp_shares = self.lp_shares.get(&provider).unwrap_or(U256::zero());
        assert!(lp_shares >= shares, "Insufficient LP shares");

        // Calculate withdrawal amount
        let total_liq = self.total_liquidity.get_or_default();
        let total_shares = self.total_shares.get_or_default();
        let amount = calculate_lp_withdrawal(shares, total_liq, total_shares);

        // Check we can afford withdrawal (respect utilization)
        let utilized = self.utilized_liquidity.get_or_default();
        let available = total_liq - utilized;
        assert!(
            amount <= available,
            "Insufficient available liquidity (currently utilized)"
        );

        // Update LP position
        self.lp_shares.set(&provider, lp_shares - shares);

        // Update totals
        self.total_liquidity.set(total_liq - amount);
        self.total_shares.set(total_shares - shares);

        amount
    }

    /// Lock liquidity for betting (called by authorized contract)
    pub fn lock_liquidity(&mut self, amount: U256) {
        self.require_authorized();

        let total_liq = self.total_liquidity.get_or_default();
        let utilized = self.utilized_liquidity.get_or_default();

        // Check utilization cap
        assert!(
            can_lock_liquidity(utilized, total_liq, amount),
            "Locking would exceed MAX_UTILIZATION (80%)"
        );

        self.utilized_liquidity.set(utilized + amount);
    }

    /// Unlock liquidity after settlement (called by authorized contract)
    pub fn unlock_liquidity(&mut self, amount: U256) {
        self.require_authorized();

        let utilized = self.utilized_liquidity.get_or_default();
        assert!(utilized >= amount, "Cannot unlock more than utilized");

        self.utilized_liquidity.set(utilized - amount);
    }

    /// Check if liquidity can be locked
    pub fn can_lock(&self, amount: U256) -> bool {
        let total_liq = self.total_liquidity.get_or_default();
        let utilized = self.utilized_liquidity.get_or_default();

        can_lock_liquidity(utilized, total_liq, amount)
    }

    /// Get LP position info
    pub fn get_lp_position(&self, provider: Address) -> LPPositionInfo {
        let shares = self.lp_shares.get(&provider).unwrap_or(U256::zero());
        let total_liq = self.total_liquidity.get_or_default();
        let total_shares = self.total_shares.get_or_default();
        let deposit_time = self.deposit_timestamps.get(&provider).unwrap_or(0);

        let value = if shares.is_zero() {
            U256::zero()
        } else {
            calculate_lp_withdrawal(shares, total_liq, total_shares)
        };

        LPPositionInfo {
            provider,
            shares,
            value,
            deposited_at: deposit_time,
            can_withdraw: self.env().get_block_time() >= deposit_time + WITHDRAWAL_COOLDOWN,
        }
    }

    /// Get pool statistics
    pub fn get_pool_stats(&self) -> LiquidityPoolStats {
        let total_liq = self.total_liquidity.get_or_default();
        let utilized = self.utilized_liquidity.get_or_default();
        let total_shares = self.total_shares.get_or_default();

        let utilization_bps = calculate_utilization(utilized, total_liq);
        let available = if total_liq > utilized {
            total_liq - utilized
        } else {
            U256::zero()
        };

        LiquidityPoolStats {
            total_liquidity: total_liq,
            utilized_liquidity: utilized,
            available_liquidity: available,
            total_shares,
            utilization_bps,
        }
    }

    /// Authorize an address to lock/unlock liquidity
    pub fn authorize(&mut self, address: Address) {
        // Should be restricted to owner in main contract
        self.authorized.set(&address, true);
    }

    /// Revoke authorization
    pub fn revoke_authorization(&mut self, address: Address) {
        self.authorized.set(&address, false);
    }

    /// Check if address is authorized
    pub fn is_authorized(&self, address: Address) -> bool {
        self.authorized.get(&address).unwrap_or(false)
    }

    /// Require caller is authorized
    fn require_authorized(&self) {
        let caller = self.env().caller();
        assert!(
            self.is_authorized(caller),
            "Not authorized to manage liquidity"
        );
    }
}

// ==================== DISPLAY TYPES ====================

#[odra::odra_type]

pub struct LPPositionInfo {
    pub provider: Address,
    pub shares: U256,
    pub value: U256,
    pub deposited_at: u64,
    pub can_withdraw: bool,
}

#[odra::odra_type]

pub struct LiquidityPoolStats {
    pub total_liquidity: U256,
    pub utilized_liquidity: U256,
    pub available_liquidity: U256,
    pub total_shares: U256,
    pub utilization_bps: u32,
}

// ==================== REVENUE DISTRIBUTION ====================

impl LiquidityPool {
    /// Add revenue to LP pool (increases value per share)
    pub fn distribute_lp_revenue(&mut self, amount: U256) {
        self.require_authorized();

        let total_liq = self.total_liquidity.get_or_default();
        self.total_liquidity.set(total_liq + amount);

        // This increases value per share without minting new shares
        // LPs benefit proportionally to their share ownership
    }

    /// Get value per share (for display)
    pub fn get_value_per_share(&self) -> U256 {
        let total_liq = self.total_liquidity.get_or_default();
        let total_shares = self.total_shares.get_or_default();

        if total_shares.is_zero() {
            return U256::from(1_000_000_000_000_000_000u128); // 1.0 in 18 decimals
        }

        // Return value per share in 18 decimals
        (total_liq * U256::from(1_000_000_000_000_000_000u128)) / total_shares
    }
}
