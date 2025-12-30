/**
 * WalletConnect Component
 * Modern wallet connection button with balance display
 */

import React from 'react';
import { useWallet } from '../hooks/useWallet';
import './WalletConnect.css';

export const WalletConnect: React.FC = () => {
  const { isConnected, publicKey, balance, connect, disconnect, isLoading } = useWallet();

  const formatPublicKey = (key: string): string => {
    return `${key.slice(0, 8)}...${key.slice(-6)}`;
  };

  const formatBalance = (bal: string): string => {
    const numBalance = parseFloat(bal);
    return numBalance.toFixed(2);
  };

  if (isConnected && publicKey) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <div className="balance">
            <span className="balance-label">Balance</span>
            <span className="balance-value">{formatBalance(balance || '0')} CSPR</span>
          </div>
          <div className="address">
            <span className="address-icon">🔑</span>
            <span className="address-value">{formatPublicKey(publicKey)}</span>
          </div>
        </div>
        <button
          className="btn btn-disconnect"
          onClick={disconnect}
          disabled={isLoading}
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-connect"
      onClick={connect}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="loading-spinner"></span>
      ) : (
        <>
          <span className="wallet-icon">👛</span>
          Connect Wallet
        </>
      )}
    </button>
  );
};
