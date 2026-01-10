#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;

// V2 Modules - Pool-based parimutuel architecture
pub mod types;
pub mod calculations;
pub mod pool_manager;
pub mod multibet;
pub mod liquidity_pool;
pub mod season_manager;
pub mod betting_manager;
pub mod nft_manager;
pub mod season_prediction_manager;
pub mod premier_league_v2;

// Re-exports
pub use types::*;
pub use calculations::*;
pub use pool_manager::PoolManager;
pub use multibet::MultibetHandler;
pub use liquidity_pool::LiquidityPool;
pub use season_manager::SeasonManager;
pub use betting_manager::BettingManager;
pub use nft_manager::NFTManager;
pub use season_prediction_manager::SeasonPredictionManager;
pub use premier_league_v2::PremierLeagueV2;
