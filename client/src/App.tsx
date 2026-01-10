import { useEffect, useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useClickRef, ThemeModeType } from '@make-software/csprclick-ui';
import { AccountType } from '@make-software/csprclick-core-types';

import { AppTheme } from './utils';
import { ClickTopBar } from './components';
import { PremierLeague } from './pages/PremierLeague';

const AppContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => '#555'};
`;

const App = () => {
  const clickRef = useClickRef();
  const [themeMode, setThemeMode] = useState<ThemeModeType>(ThemeModeType.light);
  const [activeAccount, setActiveAccount] = useState<AccountType | null>(null);

  useEffect(() => {
    clickRef?.on('csprclick:signed_in', (evt: any) => setActiveAccount(evt.account));
    clickRef?.on('csprclick:switched_account', (evt: any) => setActiveAccount(evt.account));
    clickRef?.on('csprclick:signed_out', () => setActiveAccount(null));
  }, [clickRef?.on]);

  return (
    <ThemeProvider theme={AppTheme[themeMode]}>
      <AppContainer>
        <ClickTopBar
          themeMode={themeMode}
          onThemeSwitch={() =>
            setThemeMode(themeMode === ThemeModeType.light ? ThemeModeType.dark : ThemeModeType.light)
          }
        />
        <PremierLeague
          isConnected={!!activeAccount}
          userPublicKey={activeAccount?.public_key}
        />
      </AppContainer>
    </ThemeProvider>
  );
};

export default App;



// 1️⃣  Deploying PremierLeagueImproved contract...
// 💁  INFO : Found wasm under "/mnt/d/gameover/smart-contract/plvx/wasm/PremierLeagueImproved.wasm".
// 💁  INFO : Deploying "PremierLeagueImproved".
// 🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(466c31ff1315c3f21e74deef0d5de8365bd9ccceeeed0c3ac912a4332796a766)).
// 💁  INFO : Transaction "466c31ff1315c3f21e74deef0d5de8365bd9ccceeeed0c3ac912a4332796a766" successfully executed.
// 🔗  LINK : https://testnet.cspr.live/transaction/466c31ff1315c3f21e74deef0d5de8365bd9ccceeeed0c3ac912a4332796a766
// 💁  INFO : Contract "contract-package-e1b3a8a7d762a94ec02b3eb5562eb4206e8567095752aacc92595280612fa508" deployed.
//    ✅ PremierLeagueImproved deployed at: Contract(ContractPackageHash(e1b3a8a7d762a94ec02b3eb5562eb4206e8567095752aacc92595280612fa508))
