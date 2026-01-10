use odra::prelude::*;
use crate::types::*;

#[odra::module]
pub struct SeasonManager {
    pub current_season_id: Var<u32>,
    pub seasons: Mapping<u32, Season>,
    pub next_match_id: Var<u32>,
    pub matches: Mapping<u32, Match>,
    pub next_turn_id: Var<u32>,
    pub turns: Mapping<u32, Turn>,
    pub turn_matches: Mapping<u32, Vec<u32>>,
    pub team_stats: Mapping<(u32, u8), TeamStats>,
}

#[odra::module]
impl SeasonManager {
    pub fn init(&mut self) {
        self.current_season_id.set(0);
        self.next_match_id.set(1);
        self.next_turn_id.set(1);
    }
}
