'use client';

import * as React from 'react';
import { ARC_TESTNET_CHAIN_ID } from '@/lib/arc-config';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';

export { ARC_TESTNET_CHAIN_ID } from '@/lib/arc-config';

interface ArcDataState<T> {
  address: string | null;
  chainId: number | null;
  data: T | null;
  error: string | null;
  loading: boolean;
}

function parseChainId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed =
    typeof value === 'string'
      ? Number.parseInt(
          value,
          value.toLowerCase().startsWith('0x') ? 16 : 10
        )
      : value;

  return Number.isFinite(parsed) ? parsed : null;
}

export function useArcData<T>(
  path: string,
  key: string
): ArcDataState<T> {
  const { address, chainId, provider, ready } = useCanonicalWallet();

  const [state, setState] = React.useState<ArcDataState<T>>({
    address: null,
    chainId: null,
    data: null,
    error: null,
    loading: true,
  });

  React.useEffect(() => {
    let cancelled = false;

    if (!ready) {
      const resetTimer = window.setTimeout(() => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          loading: true,
          error: null,
        }));
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(resetTimer);
      };
    }

    async function sync(): Promise<void> {
      try {
        setState((current) => ({
          ...current,
          loading: true,
          error: null,
        }));

        if (!address || !provider) {
          if (!cancelled) {
            setState({
              address: null,
              chainId: null,
              data: null,
              error: 'Connect your wallet to view Arc data.',
              loading: false,
            });
          }

          return;
        }

        const rawChainId = await provider.request({
          method: 'eth_chainId',
        });

        const chainId = parseChainId(rawChainId);

        if (cancelled) return;

        if (chainId !== ARC_TESTNET_CHAIN_ID) {
          setState({
            address,
            chainId,
            data: null,
            error: 'Switch your wallet to Arc Testnet to view this data.',
            loading: false,
          });

          return;
        }

        const response = await fetch(
          `${path}?address=${encodeURIComponent(address)}`,
          {
            cache: 'no-store',
          }
        );

        const payload = (await response.json()) as {
          [key: string]: unknown;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error || 'Unable to load Arc data.'
          );
        }

        if (!cancelled) {
          setState({
            address,
            chainId,
            data: payload[key] as T,
            error: null,
            loading: false,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load Arc data.',
            loading: false,
          }));
        }
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [address, chainId, key, path, provider, ready]);

  return state;
}