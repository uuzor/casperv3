/**
 * PLVX Scene
 * Premier League Virtual Betting main page
 */

import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { FlexColumn, FlexRow } from '@make-software/cspr-design';
import { ActiveAccountContext } from '../../../App';
import { MatchCardLive } from './components/MatchCardLive';
import { LiveEventsFeed } from './components/LiveEventsFeed';
import { LeagueTable } from './components/LeagueTable';
import { UserBets } from './components/UserBets';

// Styled components following the existing app pattern
const Container = styled(FlexColumn)(({ theme }) => ({
  width: '100%',
  maxWidth: '1400px',
  padding: '2rem',
  gap: '2rem',
}));

const Header = styled(FlexRow)(({ theme }) => ({
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.5rem',
  background: theme.styleguideColors.backgroundSecondary,
  borderRadius: '16px',
  border: `1px solid ${theme.styleguideColors.borderPrimary}`,
}));

const Title = styled.h1(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 700,
  color: theme.styleguideColors.contentPrimary,
  margin: 0,
}));

const TabsContainer = styled(FlexRow)(({ theme }) => ({
  gap: '1rem',
  padding: '0.5rem',
  background: theme.styleguideColors.backgroundPrimary,
  borderRadius: '12px',
}));

const Tab = styled.button<{ $active: boolean }>(({ theme, $active }) => ({
  padding: '0.75rem 1.5rem',
  background: $active ? theme.styleguideColors.backgroundSecondary : 'transparent',
  border: 'none',
  borderRadius: '8px',
  color: theme.styleguideColors.contentPrimary,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: theme.styleguideColors.backgroundSecondary,
  },
}));

const ContentGrid = styled.div({
  display: 'grid',
  gridTemplateColumns: '1fr 350px',
  gap: '2rem',
  '@media (max-width: 1200px)': {
    gridTemplateColumns: '1fr',
  },
});

const MainContent = styled(FlexColumn)({
  gap: '1.5rem',
});

const MatchesGrid = styled.div({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: '1.5rem',
  '@media (max-width: 768px)': {
    gridTemplateColumns: '1fr',
  },
});

const PLVXScene: React.FC = () => {
  const activeAccount = useContext(ActiveAccountContext);
  const [activeTab, setActiveTab] = useState<'matches' | 'league' | 'bets'>('matches');
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load match data
    // TODO: Implement actual contract data loading
    setIsLoading(false);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'matches':
        return (
          <MatchesGrid>
            {/* Match cards will go here */}
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              Matches will appear here when contract is deployed
            </div>
          </MatchesGrid>
        );

      case 'league':
        return <LeagueTable />;

      case 'bets':
        return <UserBets publicKey={activeAccount?.public_key_hex || null} />;

      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <FlexColumn style={{ gap: '0.5rem' }}>
          <Title>⚽ PLVX - Premier League Virtual Betting</Title>
          <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
            Decentralized betting on virtual Premier League matches
          </div>
        </FlexColumn>

        <TabsContainer>
          <Tab $active={activeTab === 'matches'} onClick={() => setActiveTab('matches')}>
            Matches
          </Tab>
          <Tab $active={activeTab === 'league'} onClick={() => setActiveTab('league')}>
            League Table
          </Tab>
          <Tab $active={activeTab === 'bets'} onClick={() => setActiveTab('bets')}>
            My Bets
          </Tab>
        </TabsContainer>
      </Header>

      <ContentGrid>
        <MainContent>
          {renderContent()}
        </MainContent>

        <FlexColumn style={{ gap: '1.5rem' }}>
          <LiveEventsFeed events={[]} />
        </FlexColumn>
      </ContentGrid>
    </Container>
  );
};

export default PLVXScene;
