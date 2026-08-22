'use client';

import { useLogin, usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { parseArcChainId } from '@/lib/arc-config';

export interface CanonicalEip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export function useCanonicalWallet() {
  const { authenticated, logout, ready } = usePrivy();
  const { wallets } = useWallets();
  const { login } = useLogin();
  const [provider, setProvider] = useState<CanonicalEip1193Provider | null>(null);
  const wallet = wallets.find((candidate) => candidate.type === 'ethereum') ?? wallets[0] ?? null;
  const address = authenticated && wallet ? wallet.address : null;
  const chainId = wallet ? parseArcChainId(wallet.chainId) : null;

  useEffect(() => {
    let cancelled = false;
    if (!wallet || !authenticated) {
      // eslint-disable-next-line react/set-state-in-effect
      setProvider(null);
      return;
    }

    void wallet.getEthereumProvider().then((nextProvider) => {
      if (!cancelled) {
        // eslint-disable-next-line react/set-state-in-effect
        setProvider(nextProvider as CanonicalEip1193Provider);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authenticated, wallet]);

  function connect(): void {
    login({ loginMethods: ['wallet'], walletChainType: 'ethereum-only' });
  }

  async function disconnect(): Promise<void> {
    await logout();
  }

  return { address, authenticated, chainId, connect, disconnect, provider, ready, wallet };
}
