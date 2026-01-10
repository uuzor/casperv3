//! Premier League Virtual Betting Game - Command Line Interface
//!
//! V2 VERSION - Pool-based Parimutuel Architecture:
//! - Mathematically guaranteed solvency
//! - Parimutuel pool-based odds (calculated at claim time)
//! - Multibet support with equal stake distribution
//! - Liquidity pool system with safety caps
//! - Pre-reserved winner liabilities

use plvx::premier_league_v2::PremierLeagueV2;
use odra::{
    host::{Deployer, HostEnv, NoArgs},
    prelude::Addressable,
};
use odra_cli::OdraCli;

/// Deploy script for the Premier League betting game (V2 - Parimutuel)
pub struct DeployPremierLeagueScript;

impl odra_cli::deploy::DeployScript for DeployPremierLeagueScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut odra_cli::DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        println!("\n⚽ Deploying Premier League Virtual Betting Game (V2 - PARIMUTUEL)...\n");

        // Deploy PremierLeagueV2 contract
        println!("1️⃣  Deploying PremierLeagueV2 contract...");
        env.set_gas(500_000_000_000);
        let premier_league = PremierLeagueV2::try_deploy(env, NoArgs)?;
        container.add_contract(&premier_league)?;
        println!("   ✅ PremierLeagueV2 deployed at: {:?}\n", premier_league.address());

        println!("💰 Contract Features:");
        println!("   • $LEAGUE Token: 100M supply (30% airdrop pool)");
        println!("   • 20 Premier League Teams");
        println!("   • 10 matches every 15 minutes");
        println!("   • 36 turns per season (9 hours)");
        println!("   • Free season winner predictions (20% prize pool)");
        println!("   • NFT Team Badges with 5% betting bonus");
        println!("   • Multibet support (up to 10 matches, 200% max bonus)");
        println!("   • House edge: 4% (configurable 3-5%)\n");

        println!("🏦 V2 Architecture - Parimutuel Pools:");
        println!("   • Pool-based betting (odds calculated at claim time)");
        println!("   • Mathematically guaranteed solvency");
        println!("   • Pre-reserved winner liabilities");
        println!("   • Multibet stakes distributed equally across matches");
        println!("   • Liquidity pool with 80% utilization cap");
        println!("   • Revenue split: 40% protocol, 40% LP, 20% season pool\n");

        println!("🔒 Security Features:");
        println!("   • Reentrancy protection on critical functions");
        println!("   • Keeper system for automated match execution");
        println!("   • LP withdrawal cooldown (15 minutes)");
        println!("   • Double-claim protection");
        println!("   • Modular architecture with separation of concerns\n");

        println!("✨ Deployment complete!\n");
        Ok(())
    }
}

/// Main CLI entry point
pub fn main() {
    OdraCli::new()
        .about("Premier League Virtual Betting Game - Command Line Interface (V2 - PARIMUTUEL)")
        .deploy(DeployPremierLeagueScript)
        .contract::<PremierLeagueV2>()
        .build()
        .run();
}
