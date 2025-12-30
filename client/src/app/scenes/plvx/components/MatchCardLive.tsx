/**
 * MatchCardLive Component - Simplified for integration
 */

import React from 'react';
import styled from 'styled-components';

const Card = styled.div(({ theme }) => ({
  background: theme.styleguideColors.backgroundSecondary,
  borderRadius: '16px',
  padding: '1.5rem',
  border: `1px solid ${theme.styleguideColors.borderPrimary}`,
}));

export const MatchCardLive: React.FC = () => {
  return (
    <Card>
      <div>Match Card - To be implemented</div>
    </Card>
  );
};
