/**
 * UserBets Component
 */

import React from 'react';
import styled from 'styled-components';
import { FlexColumn } from '@make-software/cspr-design';

const BetsContainer = styled(FlexColumn)(({ theme }) => ({
  background: theme.styleguideColors.backgroundSecondary,
  borderRadius: '16px',
  padding: '1.5rem',
  border: `1px solid ${theme.styleguideColors.borderPrimary}`,
}));

interface UserBetsProps {
  publicKey: string | null;
}

export const UserBets: React.FC<UserBetsProps> = ({ publicKey }) => {
  if (!publicKey) {
    return (
      <BetsContainer>
        <h3>My Bets</h3>
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
          Connect wallet to view your bets
        </div>
      </BetsContainer>
    );
  }

  return (
    <BetsContainer>
      <h3>My Bets</h3>
      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
        No bets yet
      </div>
    </BetsContainer>
  );
};
