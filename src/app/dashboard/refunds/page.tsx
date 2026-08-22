'use client';

import * as React from 'react';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useArcData } from '@/hooks/use-arc-data';
import { getRefunds, markRefundConfirmed } from '@/features/refunds/storage';
import type { ApplicationRefund } from '@/features/refunds/types';
import type { ArcTransactionRecord } from '@/lib/arc-transactions';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(value: string): string {
  return currency.format(Number(value));
}
function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}
function shortenHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
function statusClassName(status: ApplicationRefund['status']): string {
  return status === 'Confirmed'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-400';
}

export default function RefundsPage() {
  const arc = useArcData<ArcTransactionRecord[]>('/api/transactions', 'transactions');
  const [refunds, setRefunds] = React.useState<ApplicationRefund[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (arc.address) {
      // Wallet-scoped localStorage is an external source synchronized into the page state.
      // eslint-disable-next-line react/set-state-in-effect
      setRefunds(getRefunds(arc.address));
    }
  }, [arc.address]);
  React.useEffect(() => {
    if (!arc.address || !arc.data?.length) return;
    // Reconcile pending records against the authoritative Arc transaction API after refresh.
    // eslint-disable-next-line react/set-state-in-effect
    setRefunds((current) =>
      current.map((refund) => {
        if (refund.status === 'Confirmed') return refund;
        const transaction = arc.data?.find(
          (record) =>
            record.hash.toLowerCase() === refund.refundTransactionHash.toLowerCase() &&
            record.status === 'Confirmed'
        );
        return transaction
          ? (markRefundConfirmed(arc.address as string, refund.id, transaction.hash) ?? refund)
          : refund;
      })
    );
  }, [arc.address, arc.data]);

  const filtered = refunds.filter((refund) =>
    [
      refund.id,
      refund.invoiceId,
      refund.originalTransactionHash,
      refund.refundTransactionHash,
      refund.customer,
      refund.recipient
    ].some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const confirmed = refunds.filter((refund) => refund.status === 'Confirmed');
  const total = confirmed.reduce((sum, refund) => sum + Number(refund.amount), 0);

  if (arc.loading || arc.error || !arc.address)
    return (
      <PageContainer pageTitle='Refunds' pageDescription='Review confirmed ARC Pay refunds.'>
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='font-medium'>
              {arc.loading ? 'Loading Arc Testnet refunds...' : arc.error}
            </p>
            <p className='text-muted-foreground mt-2 text-sm'>
              Connect an injected wallet on Arc Testnet to continue.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );

  return (
    <PageContainer pageTitle='Refunds' pageDescription='Review confirmed ARC Pay refunds.'>
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Confirmed refunds</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>{confirmed.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-emerald-400 text-xs'>Confirmed on Arc Testnet</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Refund volume</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {formatCurrency(String(total))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-xs'>Confirmed USDC returned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Records</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>{refunds.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-amber-400 text-xs'>
                {refunds.filter((refund) => refund.status === 'Pending').length} awaiting
                confirmation
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle>Real refund records</CardTitle>
              <CardDescription className='mt-1'>
                Each record links an original payment to a real Arc Testnet refund transaction.
              </CardDescription>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search refunds...'
              className='sm:w-72'
              aria-label='Search refunds'
            />
          </CardHeader>
          <CardContent className='pt-6'>
            <div className='overflow-x-auto rounded-lg border'>
              <Table className='min-w-[1100px]'>
                <TableHeader>
                  <TableRow className='bg-muted/50 hover:bg-muted/50'>
                    <TableHead>Original transaction</TableHead>
                    <TableHead>Refund transaction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Customer / recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Explorer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? (
                    filtered.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>
                          <a
                            href={`https://testnet.arcscan.app/tx/${refund.originalTransactionHash}`}
                            target='_blank'
                            rel='noreferrer'
                            className='font-mono text-xs text-primary hover:underline'
                          >
                            {shortenHash(refund.originalTransactionHash)}
                          </a>
                          <div className='text-muted-foreground mt-1 text-xs'>
                            {refund.invoiceId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://testnet.arcscan.app/tx/${refund.refundTransactionHash}`}
                            target='_blank'
                            rel='noreferrer'
                            className='font-mono text-xs text-primary hover:underline'
                          >
                            {shortenHash(refund.refundTransactionHash)}
                          </a>
                        </TableCell>
                        <TableCell className='font-medium tabular-nums'>
                          {formatCurrency(refund.amount)} USDC
                        </TableCell>
                        <TableCell>
                          <div className='font-medium'>{refund.customer}</div>
                          <div className='text-muted-foreground mt-1 font-mono text-xs'>
                            {refund.recipient.slice(0, 6)}...{refund.recipient.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline' className={statusClassName(refund.status)}>
                            {refund.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {formatDate(refund.confirmedAt ?? refund.createdAt)}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://testnet.arcscan.app/tx/${refund.refundTransactionHash}`}
                            target='_blank'
                            rel='noreferrer'
                            className='text-sm text-primary hover:underline'
                          >
                            View on ArcScan
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className='py-14 text-center'>
                        <p className='font-medium'>
                          {search
                            ? 'No refunds match your search.'
                            : 'No real Arc Testnet refunds yet.'}
                        </p>
                        <p className='text-muted-foreground mt-2 text-sm'>
                          Refunds appear here after a paid invoice submits a real USDC transaction.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
