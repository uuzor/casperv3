/**
 * LiveEventsFeed Component
 */

import React from 'react';
import styled from 'styled-components';
import { FlexColumn } from '@make-software/cspr-design';

const FeedContainer = styled(FlexColumn)(({ theme }) => ({
  background: theme.styleguideColors.backgroundSecondary,
  borderRadius: '16px',
  padding: '1.5rem',
  border: `1px solid ${theme.styleguideColors.borderPrimary}`,
  minHeight: '400px',
}));

const FeedHeader = styled.div(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 700,
  marginBottom: '1rem',
  color: theme.styleguideColors.contentPrimary,
}));

interface LiveEventsFeedProps {
  events: any[];
}

export const LiveEventsFeed: React.FC<LiveEventsFeedProps> = ({ events }) => {
  return (
    <FeedContainer>
      <FeedHeader>📡 Live Activity</FeedHeader>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        Waiting for events...
      </div>
    </FeedContainer>
  );
};
