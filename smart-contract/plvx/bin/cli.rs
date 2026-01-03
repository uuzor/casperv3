//! Premier League Virtual Betting Game - Command Line Interface
//!
//! IMPROVED VERSION with security enhancements:
//! - Reentrancy protection
//! - Keeper system for automated match execution
//! - Dynamic odds based on betting pools
//! - Double-claim protection
//! - Cryptographically secure randomness

use plvx::premier_league_improved::PremierLeagueImproved;
use odra::{
    host::{Deployer, HostEnv, NoArgs},
    prelude::Addressable,
};
use odra_cli::OdraCli;

/// Deploy script for the Premier League betting game (Improved Version)
pub struct DeployPremierLeagueScript;

impl odra_cli::deploy::DeployScript for DeployPremierLeagueScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut odra_cli::DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        println!("\n⚽ Deploying Premier League Virtual Betting Game (IMPROVED VERSION)...\n");

        // Deploy PremierLeagueImproved contract
        println!("1️⃣  Deploying PremierLeagueImproved contract...");
        env.set_gas(500_000_000_000);
        let premier_league = PremierLeagueImproved::try_deploy(env, NoArgs)?;
        container.add_contract(&premier_league)?;
        println!("   ✅ PremierLeagueImproved deployed at: {:?}\n", premier_league.address());

        println!("💰 Contract Features:");
        println!("   • $LEAGUE Token: 100M supply (30% airdrop pool)");
        println!("   • 20 Premier League Teams");
        println!("   • 10 matches every 15 minutes");
        println!("   • 36 turns per season (9 hours)");
        println!("   • Free season winner predictions (2% prize pool)");
        println!("   • NFT Team Badges with 5% betting bonus");
        println!("   • House edge: 4% (configurable 3-5%)");
        println!("   • Marketplace fee: 2.5%\n");

        println!("🔒 Security Features:");
        println!("   • Reentrancy protection on critical functions");
        println!("   • Keeper system for automated match execution");
        println!("   • Dynamic odds based on betting pool distribution");
        println!("   • Double-claim protection for season prizes");
        println!("   • Improved randomness using pseudorandom_bytes()\n");

        println!("✨ Deployment complete!\n");
        Ok(())
    }
}

/// Main CLI entry point
pub fn main() {
    OdraCli::new()
        .about("Premier League Virtual Betting Game - Command Line Interface (IMPROVED)")
        .deploy(DeployPremierLeagueScript)
        .contract::<PremierLeagueImproved>()
        .build()
        .run();
}
