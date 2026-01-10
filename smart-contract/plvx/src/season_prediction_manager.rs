use odra::prelude::*;
use odra::casper_types::U256;

#[odra::module]
pub struct SeasonPredictionManager {
    pub predictions: Mapping<(u32, Address), u8>,
    pub prediction_counts: Mapping<(u32, u8), u32>,
    pub prize_claimed: Mapping<(u32, Address), bool>,
    pub prize_pool: Var<U256>,
}

#[odra::module]
impl SeasonPredictionManager {
    pub fn init(&mut self) {
        self.prize_pool.set(U256::zero());
    }
}
