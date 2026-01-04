const config = {
  donation_contract_package_hash:
    "ca0f4eedc84e03b6bc39ce664ef05dff00a96214194e706d50bfc43d84124035",
  donation_api_url: "http://localhost:4000",
  // PLVX Premier League Betting Contract
  plvx_contract_package_hash:
    "e1b3a8a7d762a94ec02b3eb5562eb4206e8567095752aacc92595280612fa508",
  plvx_api_url: "http://localhost:4000",
  cspr_click_app_name: "app",
  cspr_click_app_id: "2afade1f-e0e4-4d1e-af2a-b7241a98",
  cspr_click_providers: ['casper-wallet', 'ledger', 'metamask-snap'],
  cspr_live_url: "https://testnet.cspr.live",
  cspr_chain_name: "casper-test",
  transaction_payment: "10000000000",
  // Gas limits for different operations
  gas_limit_bet: "5000000000",        // 5 CSPR for placing bets
  gas_limit_simulation: "8000000000",  // 8 CSPR for match simulation
  gas_limit_mint: "3000000000"         // 3 CSPR for badge minting
};
