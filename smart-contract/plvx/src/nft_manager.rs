use odra::prelude::*;
use odra::casper_types::U256;
use crate::types::*;

#[odra::module]
pub struct NFTManager {
    pub next_badge_id: Var<U256>,
    pub badges: Mapping<U256, TeamBadge>,
    pub user_badges: Mapping<Address, Vec<U256>>,
}

#[odra::module]
impl NFTManager {
    pub fn init(&mut self) {
        self.next_badge_id.set(U256::from(1));
    }
}
