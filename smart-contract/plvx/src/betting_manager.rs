use odra::prelude::*;
use odra::casper_types::U256;
use crate::types::*;

#[odra::module]
pub struct BettingManager {
    pub next_bet_id: Var<U256>,
    pub bets: Mapping<U256, Bet>,
    pub user_bets: Mapping<Address, Vec<U256>>,
    pub turn_bets: Mapping<u32, Vec<U256>>,
}

#[odra::module]
impl BettingManager {
    pub fn init(&mut self) {
        self.next_bet_id.set(U256::from(1));
    }
}
