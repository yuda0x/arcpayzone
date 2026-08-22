'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER_URL } from '@/lib/arc-config';
import type { ArcTransactionRecord } from '@/lib/arc-transactions';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';

type ArcOverviewTransaction = Omit<ArcTransactionRecord, 'status'> & {
  status: ArcTransactionRecord['status'] | 'Pending';
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function statusClass(status: ArcOverviewTransaction['status']): string {
  if (status === 'Confirmed') return 'text-emerald-400';
  if (status === 'Pending') return 'text-amber-400';
  return 'text-red-400';
}

export function ArcOverview() {
  const { address, chainId, ready } = useCanonicalWallet();
  const [transactions, setTransactions] = React.useState<ArcOverviewTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    if (!address || !ready) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    try {
      if (chainId !== ARC_TESTNET_CHAIN_ID) {
        setTransactions([]);
        setLoading(false);
        return;
      }
      const response = await fetch(`/api/transactions?address=${encodeURIComponent(address)}`, { cache: 'no-store' });
      const payload = (await response.json()) as { transactions?: ArcOverviewTransaction[]; error?: string; detail?: string };
      if (!response.ok) throw new Error(payload.detail || payload.error || 'Unable to load Arc Testnet activity');
      setTransactions(payload.transactions ?? []);
    } catch {
      setTransactions([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [address, chainId, ready]);

  React.useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void refresh();
  }, [refresh]);

  const connectedAddress = address?.toLowerCase();
  const sentVolume = transactions.filter((transaction) => transaction.status === 'Confirmed' && transaction.direction === 'Sent' && transaction.from.toLowerCase() === connectedAddress).reduce((sum, transaction) => sum + transaction.amount, 0);
  const successful = transactions.filter((transaction) => transaction.status === 'Confirmed').length;
  const pending = transactions.filter((transaction) => transaction.status === 'Pending').length;
  const failed = transactions.filter((transaction) => transaction.status === 'Failed').length;
  const recent = transactions.slice(0, 5);

  if (!address) return <Card><CardContent className='flex flex-col items-center gap-3 py-12 text-center'><p className='font-medium'>Connect your wallet to view Arc Testnet activity.</p><p className='text-muted-foreground text-sm'>No mock transaction statistics are shown.</p></CardContent></Card>;
  if (chainId !== ARC_TESTNET_CHAIN_ID) return <Card><CardContent className='flex flex-col items-center gap-3 py-12 text-center'><p className='font-medium'>Wrong Network</p><p className='text-muted-foreground text-sm'>Switch to Arc Testnet to view activity.</p></CardContent></Card>;
  if (error) return <Card><CardContent className='flex flex-col items-center gap-3 py-12 text-center'><p className='font-medium'>Unable to load Arc Testnet activity</p><Button type='button' variant='outline' onClick={() => void refresh()}>Retry</Button></CardContent></Card>;

  return <div className='flex flex-col gap-6'><div className='flex justify-end'><Button type='button' variant='outline' size='sm' onClick={() => void refresh()} disabled={loading}><Icons.trendingUp data-icon='inline-start' />{loading ? 'Loading activity...' : 'Refresh activity'}</Button></div><div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'><Card><CardHeader><CardDescription>Real Arc volume sent</CardDescription><CardTitle className='text-2xl tabular-nums'>{formatCurrency(sentVolume)}</CardTitle></CardHeader><CardFooter className='text-muted-foreground text-xs'>Confirmed wallet transfers</CardFooter></Card><Card><CardHeader><CardDescription>Successful transactions</CardDescription><CardTitle className='text-2xl tabular-nums'>{successful}</CardTitle></CardHeader><CardFooter className='text-muted-foreground text-xs'>Confirmed on Arc Testnet</CardFooter></Card><Card><CardHeader><CardDescription>Pending transactions</CardDescription><CardTitle className='text-2xl tabular-nums'>{pending}</CardTitle></CardHeader><CardFooter className='text-muted-foreground text-xs'>Pending activity is shown after submission</CardFooter></Card><Card><CardHeader><CardDescription>Failed transactions</CardDescription><CardTitle className='text-2xl tabular-nums'>{failed}</CardTitle></CardHeader><CardFooter className='text-muted-foreground text-xs'>Failed receipts from chain</CardFooter></Card></div><Card><CardHeader><CardTitle>Recent Arc Testnet activity</CardTitle><CardDescription>Real USDC transfers for {address.slice(0, 6)}...{address.slice(-4)}</CardDescription></CardHeader><CardContent>{loading ? <p className='text-muted-foreground py-8 text-center'>Loading transactions...</p> : recent.length === 0 ? <p className='text-muted-foreground py-8 text-center'>No Arc Testnet transactions yet.</p> : <div className='grid gap-4'>{recent.map((transaction) => <a key={transaction.hash} href={`${ARC_TESTNET_EXPLORER_URL}/tx/${transaction.hash}`} target='_blank' rel='noreferrer' className='flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50'><div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full'><Icons.creditCard /></div><div className='min-w-0 flex-1'><p className='truncate font-mono text-xs font-medium'>{transaction.hash}</p><p className='text-muted-foreground mt-1 truncate text-xs'>{transaction.direction} · {transaction.timestamp ?? 'Unknown time'}</p></div><div className='text-right'><p className='font-medium tabular-nums'>{transaction.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC</p><p className={`text-xs ${statusClass(transaction.status)}`}>{transaction.status}</p></div></a>)}</div>}</CardContent></Card></div>;
}
