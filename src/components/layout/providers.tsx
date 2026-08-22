'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import React from 'react';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

  if (!privyAppId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not configured; Privy is disabled.');
  }

  const content = <QueryProvider>{children}</QueryProvider>;

  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        {privyAppId ? (
          <PrivyProvider
            appId={privyAppId}
            config={{
              loginMethods: ['wallet'],
              appearance: {
                walletChainType: 'ethereum-only'
              },
              embeddedWallets: {
                ethereum: {
                  createOnLogin: 'users-without-wallets'
                }
              }
            }}
          >
            {content}
          </PrivyProvider>
        ) : (
          content
        )}
      </ActiveThemeProvider>
    </>
  );
}
