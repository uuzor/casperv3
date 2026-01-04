type GlobalConfig = {
  donation_contract_package_hash: string;
  donation_api_url: string;
  // PLVX Premier League Betting Contract
  plvx_contract_package_hash: string;
  plvx_api_url: string;
  cspr_click_app_name: string;
  cspr_click_app_id: string;
  cspr_click_providers: string[];
  cspr_live_url: string;
  cspr_chain_name: string;
  transaction_payment: string;
  // Gas limits for different operations
  gas_limit_bet: string;
  gas_limit_simulation: string;
  gas_limit_mint: string;
  // DEX contracts (if needed)
  dex_contract_package_hash?: string;
  position_manager_contract_package_hash?: string;
  // Token contracts (if needed)
  wcspr_token_contract_hash?: string;
  usdt_token_contract_hash?: string;
  cdai_token_contract_hash?: string;
};

declare const config: GlobalConfig;

declare module '*.svg';

declare module '*.png';
declare module 'facepaint';
declare module 'big.js';
