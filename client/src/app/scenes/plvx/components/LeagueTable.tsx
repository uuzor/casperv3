/**
 * LeagueTable Component
 */

import React from 'react';
import styled from 'styled-components';
import { FlexColumn } from '@make-software/cspr-design';

const TableContainer = styled(FlexColumn)(({ theme }) => ({
  background: theme.styleguideColors.backgroundSecondary,
  borderRadius: '16px',
  padding: '1.5rem',
  border: `1px solid ${theme.styleguideColors.borderPrimary}`,
}));

export const LeagueTable: React.FC = () => {
  return (
    <TableContainer>
      <h3>League Table</h3>
      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
        League standings will appear here
      </div>
    </TableContainer>
  );
};
