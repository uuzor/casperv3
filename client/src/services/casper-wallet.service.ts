/**
 * CSPR.click Wallet Integration Service
 * Handles Web3 authentication and wallet connection for Casper ecosystem
 */

import { CLPublicKey, CLValueBuilder, RuntimeArgs } from 'casper-js-sdk';

export interface WalletAccount {
  publicKey: string;
  balance: string;
  activeKey: CLPublicKey;
}

export interface WalletConnection {
  isConnected: boolean;
  account: WalletAccount | null;
  provider: string | null; // 'casper-signer', 'casper-wallet', 'ledger', etc.
}

export class CasperWalletService {
  private static instance: CasperWalletService;
  private connection: WalletConnection = {
    isConnected: false,
    account: null,
    provider: null,
  };
  private listeners: Set<(connection: WalletConnection) => void> = new Set();

  private constructor() {
    this.initializeWallet();
  }

  static getInstance(): CasperWalletService {
    if (!CasperWalletService.instance) {
      CasperWalletService.instance = new CasperWalletService();
    }
    return CasperWalletService.instance;
  }

  /**
   * Initialize wallet connection detection
   */
  private async initializeWallet() {
    // Check if Casper Signer extension is installed
    if (typeof window !== 'undefined' && (window as any).csprclick) {
      await this.detectCsprClick();
    }

    // Listen for account changes
    if ((window as any).csprclick) {
      (window as any).csprclick.on('activeKeyChanged', this.handleAccountChange.bind(this));
      (window as any).csprclick.on('disconnected', this.handleDisconnect.bind(this));
    }
  }

  /**
   * Detect CSPR.click provider
   */
  private async detectCsprClick() {
    try {
      const csprclick = (window as any).csprclick;
      if (csprclick) {
        const isConnected = await csprclick.isConnected();
        if (isConnected) {
          const activeKey = await csprclick.getActivePublicKey();
          await this.setConnected(activeKey, 'cspr.click');
        }
      }
    } catch (error) {
      console.error('Error detecting CSPR.click:', error);
    }
  }

  /**
   * Connect wallet using CSPR.click
   */
  async connect(): Promise<WalletConnection> {
    try {
      const csprclick = (window as any).csprclick;

      if (!csprclick) {
        throw new Error('CSPR.click not installed. Please install the Casper Wallet extension.');
      }

      // Request connection
      await csprclick.requestConnection();

      // Get active public key
      const activeKey = await csprclick.getActivePublicKey();

      await this.setConnected(activeKey, 'cspr.click');

      return this.connection;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      const csprclick = (window as any).csprclick;
      if (csprclick) {
        await csprclick.disconnectFromSite();
      }

      this.connection = {
        isConnected: false,
        account: null,
        provider: null,
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Wallet disconnection error:', error);
    }
  }

  /**
   * Set connected state
   */
  private async setConnected(publicKeyHex: string, provider: string) {
    try {
      const publicKey = CLPublicKey.fromHex(publicKeyHex);

      // Fetch balance (this will be replaced with CSPR.cloud API call)
      const balance = await this.fetchBalance(publicKeyHex);

      this.connection = {
        isConnected: true,
        account: {
          publicKey: publicKeyHex,
          balance,
          activeKey: publicKey,
        },
        provider,
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Error setting connected state:', error);
    }
  }

  /**
   * Fetch account balance
   */
  private async fetchBalance(publicKey: string): Promise<string> {
    // This will be implemented with CSPR.cloud in the next service
    // For now, return a placeholder
    return '0';
  }

  /**
   * Handle account change
   */
  private async handleAccountChange(publicKey: string) {
    if (this.connection.provider) {
      await this.setConnected(publicKey, this.connection.provider);
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect() {
    this.connection = {
      isConnected: false,
      account: null,
      provider: null,
    };
    this.notifyListeners();
  }

  /**
   * Subscribe to connection changes
   */
  subscribe(listener: (connection: WalletConnection) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.connection);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.connection));
  }

  /**
   * Get current connection
   */
  getConnection(): WalletConnection {
    return this.connection;
  }

  /**
   * Sign and send deploy using connected wallet
   */
  async signAndSendDeploy(deploy: any): Promise<string> {
    try {
      const csprclick = (window as any).csprclick;

      if (!csprclick || !this.connection.isConnected) {
        throw new Error('Wallet not connected');
      }

      // Sign deploy
      const signedDeploy = await csprclick.sign(deploy);

      // Send to network
      const deployHash = await csprclick.send(signedDeploy);

      return deployHash;
    } catch (error) {
      console.error('Error signing and sending deploy:', error);
      throw error;
    }
  }

  /**
   * Switch to a specific Casper network
   */
  async switchNetwork(networkName: 'casper' | 'casper-test'): Promise<void> {
    try {
      const csprclick = (window as any).csprclick;

      if (!csprclick) {
        throw new Error('CSPR.click not installed');
      }

      await csprclick.switchToNetwork(networkName);
    } catch (error) {
      console.error('Error switching network:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const walletService = CasperWalletService.getInstance();
