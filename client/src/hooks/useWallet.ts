/**
 * useWallet Hook
 * React hook for Casper wallet connection and management
 */

import { useState, useEffect, useCallback } from 'react';
import { walletService, WalletConnection } from '../services/casper-wallet.service';

export interface UseWalletReturn {
  isConnected: boolean;
  publicKey: string | null;
  balance: string | null;
  provider: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (network: 'casper' | 'casper-test') => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const useWallet = (): UseWalletReturn => {
  const [connection, setConnection] = useState<WalletConnection>(
    walletService.getConnection()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Subscribe to wallet connection changes
    const unsubscribe = walletService.subscribe((newConnection) => {
      setConnection(newConnection);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await walletService.connect();
    } catch (err) {
      setError(err as Error);
      console.error('Wallet connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await walletService.disconnect();
    } catch (err) {
      setError(err as Error);
      console.error('Wallet disconnection failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchNetwork = useCallback(async (network: 'casper' | 'casper-test') => {
    setIsLoading(true);
    setError(null);

    try {
      await walletService.switchNetwork(network);
    } catch (err) {
      setError(err as Error);
      console.error('Network switch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isConnected: connection.isConnected,
    publicKey: connection.account?.publicKey || null,
    balance: connection.account?.balance || null,
    provider: connection.provider,
    connect,
    disconnect,
    switchNetwork,
    isLoading,
    error,
  };
};
