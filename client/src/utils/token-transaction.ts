import {
	Args,
	CLValue,
	PublicKey,
	ContractCallBuilder,
	Transaction,
	Key,
} from 'casper-js-sdk';
import { CSPRToMotes } from './currency';


export enum TransactionFailed {
	Failed,
}




export const prepareMintTransaction = async (
	playerPublicKey: PublicKey,
	tokenContractHash: string,
	recipient: string,
	amount: string
): Promise<Transaction> => {
	const recipientKey = Key.newKey(`account-hash-${recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(tokenContractHash)
		.entryPoint('mint')
		.runtimeArgs(Args.fromMap({
			recipient: CLValue.newCLKey(recipientKey),
			amount: CLValue.newCLUInt256(amount)
		}))
		.payment(CSPRToMotes(MINT_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Token Transaction Request Functions
 * These functions prepare transactions for CEP-18/ERC-20 token operations
 */

// Gas prices for token operations (in CSPR)
const MINT_GAS = 5;
const TRANSFER_GAS = 3;
const APPROVE_GAS = 3;
const BURN_GAS = 3;



/**
 * Prepare transfer transaction
 * Transfers tokens from caller to recipient
 */
export const prepareTransferTransaction = async (
	playerPublicKey: PublicKey,
	tokenContractHash: string,
	recipient: string,
	amount: string
): Promise<Transaction> => {
	const recipientKey = Key.newKey(`account-hash-${recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(tokenContractHash)
		.entryPoint('transfer')
		.runtimeArgs(Args.fromMap({
			recipient: CLValue.newCLKey(recipientKey),
			amount: CLValue.newCLUInt256(amount)
		}))
		.payment(CSPRToMotes(TRANSFER_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare approve transaction
 * Approves spender to spend tokens on behalf of caller
 */
export const prepareApproveTransaction = async (
	playerPublicKey: PublicKey,
	tokenContractHash: string,
	spender: string,
	amount: string
): Promise<Transaction> => {
	const spenderKey = Key.newKey(`account-hash-${spender}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(tokenContractHash)
		.entryPoint('approve')
		.runtimeArgs(Args.fromMap({
			spender: CLValue.newCLKey(spenderKey),
			amount: CLValue.newCLUInt256(amount)
		}))
		.payment(CSPRToMotes(APPROVE_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare transfer_from transaction
 * Transfers tokens from owner to recipient using approved allowance
 */
export const prepareTransferFromTransaction = async (
	playerPublicKey: PublicKey,
	tokenContractHash: string,
	owner: string,
	recipient: string,
	amount: string
): Promise<Transaction> => {
	const ownerKey = Key.newKey(`account-hash-${owner}`);
	const recipientKey = Key.newKey(`account-hash-${recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(tokenContractHash)
		.entryPoint('transfer_from')
		.runtimeArgs(Args.fromMap({
			owner: CLValue.newCLKey(ownerKey),
			recipient: CLValue.newCLKey(recipientKey),
			amount: CLValue.newCLUInt256(amount)
		}))
		.payment(CSPRToMotes(TRANSFER_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare burn transaction
 * Burns tokens from owner's balance (for testing only)
 */
export const prepareBurnTransaction = async (
	playerPublicKey: PublicKey,
	tokenContractHash: string,
	owner: string,
	amount: string
): Promise<Transaction> => {
	const ownerKey = Key.newKey(`account-hash-${owner}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(tokenContractHash)
		.entryPoint('burn')
		.runtimeArgs(Args.fromMap({
			owner: CLValue.newCLKey(ownerKey),
			amount: CLValue.newCLUInt256(amount)
		}))
		.payment(CSPRToMotes(BURN_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

// ============================================
// MOCK DATA HELPERS (for development/testing)
// ============================================

/**
 * Token metadata interface
 */
export interface TokenInfo {
	symbol: string;
	name: string;
	contractHash: string;
	decimals: number;
	totalSupply: string;
}


/**
 * Mock user balance
 */
export interface UserTokenBalance {
	token: TokenInfo;
	balance: string;
	allowances: {
		[spender: string]: string;
	};
}
