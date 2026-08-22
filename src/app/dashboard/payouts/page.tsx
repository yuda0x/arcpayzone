'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useArcData } from '@/hooks/use-arc-data';
import type { ArcTransactionRecord } from '@/lib/arc-transactions';

const PAGE_SIZE = 8;
const STATUS_OPTIONS = ['All', 'Scheduled', 'Processing', 'Paid', 'Failed'] as const;
type PayoutStatus = (typeof STATUS_OPTIONS)[number];
type PayoutRecordStatus = Exclude<PayoutStatus, 'All'>;

interface RelatedTransaction {
  id: string;
  customer: string;
  amount: number;
}

interface Payout {
  id: string;
  destination: string;
  accountDetails: string;
  amount: number;
  status: PayoutRecordStatus;
  method: string;
  createdDate: string;
  arrivalDate: string;
  completedDate?: string;
  fee: number;
  relatedTransactions: RelatedTransaction[];
}

const _legacyPayouts: Payout[] = [
  {
    id: 'PO-8F42A91C', destination: 'ARC Pay Operating Account', accountDetails: 'GTBank ···· 2081', amount: 12840.32, status: 'Scheduled', method: 'Standard payout', createdDate: 'Aug 19, 2026', arrivalDate: 'Aug 21, 2026', fee: 12.84,
    relatedTransactions: [{ id: 'TXN-8F42A91C', customer: 'Arcade Supply Co.', amount: 1240 }, { id: 'TXN-7D19B4EE', customer: 'Northstar Studio', amount: 860.5 }]
  },
  {
    id: 'PO-7D19B4EE', destination: 'ARC Pay Operating Account', accountDetails: 'GTBank ···· 2081', amount: 9620.74, status: 'Processing', method: 'Standard payout', createdDate: 'Aug 18, 2026', arrivalDate: 'Aug 20, 2026', fee: 9.62,
    relatedTransactions: [{ id: 'TXN-3E61A90D', customer: 'Cedar House', amount: 2490 }, { id: 'TXN-2F74C6B8', customer: 'Lumen Health', amount: 640.75 }]
  },
  {
    id: 'PO-6C27E8A0', destination: 'Cedar House Settlement', accountDetails: 'Access Bank ···· 6230', amount: 2465.1, status: 'Paid', method: 'Instant payout', createdDate: 'Aug 17, 2026', arrivalDate: 'Aug 17, 2026', completedDate: 'Aug 17, 2026', fee: 24.9,
    relatedTransactions: [{ id: 'TXN-3E61A90D', customer: 'Cedar House', amount: 2490 }]
  },
  {
    id: 'PO-5A03C7F2', destination: 'Brightline Goods Reserve', accountDetails: 'KCB ···· 4410', amount: 7820.45, status: 'Paid', method: 'Standard payout', createdDate: 'Aug 15, 2026', arrivalDate: 'Aug 18, 2026', completedDate: 'Aug 18, 2026', fee: 7.82,
    relatedTransactions: [{ id: 'TXN-5A03C7F2', customer: 'Brightline Goods', amount: 145 }, { id: 'TXN-4B20D1A6', customer: 'Brightline Goods', amount: 780 }]
  },
  {
    id: 'PO-4B88D2C1', destination: 'Pine & Parcel Wallet', accountDetails: 'ARC Wallet ···· 7742', amount: 4180.9, status: 'Paid', method: 'Wallet payout', createdDate: 'Aug 13, 2026', arrivalDate: 'Aug 13, 2026', completedDate: 'Aug 13, 2026', fee: 4.18,
    relatedTransactions: [{ id: 'TXN-4B88D2C1', customer: 'Pine & Parcel', amount: 78.25 }]
  },
  {
    id: 'PO-3E61A90D', destination: 'Atlas Learning Settlement', accountDetails: 'UBA ···· 1184', amount: 4158, status: 'Paid', method: 'Bank transfer', createdDate: 'Aug 12, 2026', arrivalDate: 'Aug 14, 2026', completedDate: 'Aug 14, 2026', fee: 42,
    relatedTransactions: [{ id: 'TXN-7B06D3E1', customer: 'Atlas Learning', amount: 4200 }]
  },
  {
    id: 'PO-2F74C6B8', destination: 'Lumen Health Settlement', accountDetails: 'Barclays ···· 9012', amount: 621.33, status: 'Processing', method: 'Standard payout', createdDate: 'Aug 11, 2026', arrivalDate: 'Aug 20, 2026', fee: 19.42,
    relatedTransactions: [{ id: 'TXN-2F74C6B8', customer: 'Lumen Health', amount: 640.75 }]
  },
  {
    id: 'PO-1A52E9F4', destination: 'Monument Labs Account', accountDetails: 'Chase ···· 7782', amount: 950.6, status: 'Failed', method: 'Standard payout', createdDate: 'Aug 10, 2026', arrivalDate: 'Not scheduled', fee: 29.4,
    relatedTransactions: [{ id: 'TXN-1A52E9F4', customer: 'Monument Labs', amount: 980 }]
  },
  {
    id: 'PO-0D31B7AA', destination: 'Kora Events Settlement', accountDetails: 'Ecobank ···· 4201', amount: 1780.2, status: 'Paid', method: 'Mobile money payout', createdDate: 'Aug 08, 2026', arrivalDate: 'Aug 08, 2026', completedDate: 'Aug 08, 2026', fee: 18.2,
    relatedTransactions: [{ id: 'TXN-0D31B7AA', customer: 'Kora Events', amount: 312.4 }]
  },
  {
    id: 'PO-9C48F0D6', destination: 'Fieldwork Collective Account', accountDetails: 'Mercury ···· 7734', amount: 1697.5, status: 'Scheduled', method: 'Standard payout', createdDate: 'Aug 07, 2026', arrivalDate: 'Aug 22, 2026', fee: 17.5,
    relatedTransactions: [{ id: 'TXN-9C48F0D6', customer: 'Fieldwork Collective', amount: 1750 }]
  }
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(value: number): string {
  return currency.format(value);
}

function toPayout(record: ArcTransactionRecord): Payout {
  const date = record.timestamp ? new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable';
  return {
    id: record.hash,
    destination: record.to,
    accountDetails: 'Arc Testnet address',
    amount: record.amount,
    status: record.status === 'Confirmed' ? 'Paid' : 'Failed',
    method: 'USDC transfer',
    createdDate: date,
    arrivalDate: record.status === 'Confirmed' ? date : 'Not completed',
    completedDate: record.status === 'Confirmed' ? date : undefined,
    fee: 0,
    relatedTransactions: [{ id: record.hash, customer: record.to, amount: record.amount }]
  };
}

async function copyPayoutId(payoutId: string) {
  await navigator.clipboard.writeText(payoutId);
  toast.success('Payout ID copied');
}

function statusClassName(status: PayoutRecordStatus): string {
  switch (status) {
    case 'Paid': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'Scheduled': return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    case 'Processing': return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'Failed': return 'border-red-500/30 bg-red-500/10 text-red-400';
  }
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <Card><CardHeader className='pb-2'><CardDescription>{label}</CardDescription><CardTitle className='text-2xl tabular-nums'>{value}</CardTitle></CardHeader><CardContent><p className='text-muted-foreground text-xs'>{note}</p></CardContent></Card>;
}

function PayoutDetails({ payout, onCopy, onViewTransactions, onDownload, onContact }: { payout: Payout; onCopy: () => void; onViewTransactions: () => void; onDownload: () => void; onContact: () => void }) {
  const netPayout = payout.amount - payout.fee;
  const detailRows = [
    ['Payout ID', payout.id],
    ['Destination', payout.destination],
    ['Bank/account details', payout.accountDetails],
    ['Payout method', payout.method],
    ['Created date', payout.createdDate],
    ['Expected arrival', payout.arrivalDate],
    ['Completed date', payout.completedDate ?? 'Not completed'],
    ['Fee', formatCurrency(payout.fee)],
    ['Net payout', formatCurrency(netPayout)]
  ] as const;

  return (
    <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(8rem+env(safe-area-inset-bottom))]'>
      <div className='flex flex-col gap-5'>
        <div className='flex flex-col gap-4 rounded-xl border bg-muted/20 p-4'><div className='flex items-start justify-between gap-3'><div><p className='text-muted-foreground text-xs uppercase tracking-wider'>Payout ID</p><div className='mt-1 flex items-center gap-1'><span className='font-mono text-sm font-semibold'>{payout.id}</span><Button variant='ghost' size='icon-xs' aria-label='Copy payout ID' onClick={onCopy}><Icons.fileTypeDoc /></Button></div></div><Badge variant='outline' className={statusClassName(payout.status)}>{payout.status}</Badge></div><div className='border-t pt-3'><p className='text-muted-foreground text-xs'>Payout amount</p><p className='mt-1 text-2xl font-semibold tabular-nums'>{formatCurrency(payout.amount)}</p></div></div>

        <div className='grid gap-3 rounded-xl border p-4'><h3 className='font-semibold'>Payout information</h3>{detailRows.map(([label, value]) => <div key={label} className='flex items-start justify-between gap-4 border-b pb-3 text-sm last:border-0'><span className='text-muted-foreground'>{label}</span><span className='max-w-[65%] text-right font-medium'>{value}</span></div>)}</div>

        <div className='grid gap-3 rounded-xl border p-4'><div className='flex items-center gap-2'><Icons.page className='text-primary' /><h3 className='font-semibold'>Related transactions</h3></div><div className='grid gap-3'>{payout.relatedTransactions.map((transaction) => <div key={transaction.id} className='flex items-center gap-3'><div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full'><Icons.creditCard /></div><div className='min-w-0 flex-1'><p className='truncate font-mono text-xs font-medium'>{transaction.id}</p><p className='text-muted-foreground mt-1 truncate text-xs'>{transaction.customer}</p></div><span className='font-medium tabular-nums'>{formatCurrency(transaction.amount)}</span></div>)}</div></div>

        <div className='grid gap-3 rounded-xl border p-4'><div><h3 className='font-semibold'>Actions</h3><p className='text-muted-foreground mt-1 text-xs'>Manage this payout record.</p></div><div className='grid gap-2 sm:grid-cols-2'><Button variant='outline' className='h-10 justify-start' onClick={onCopy}><Icons.fileTypeDoc data-icon='inline-start' />Copy payout ID</Button><Button variant='outline' className='h-10 justify-start' onClick={onViewTransactions}><Icons.page data-icon='inline-start' />View related transactions</Button><Button variant='outline' className='h-10 justify-start' onClick={onDownload}><Icons.fileTypePdf data-icon='inline-start' />Download receipt</Button><Button variant='outline' className='h-10 justify-start' onClick={onContact}><Icons.send data-icon='inline-start' />Contact support</Button></div></div>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  const arc = useArcData<ArcTransactionRecord[]>('/api/payouts', 'payouts');
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<PayoutStatus>('All');
  const [date, setDate] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedPayout, setSelectedPayout] = React.useState<Payout | null>(null);
  const [supportPayout, setSupportPayout] = React.useState<Payout | null>(null);
  const realPayouts = React.useMemo(() => (arc.data ?? []).map(toPayout), [arc.data]);
  const totalVolume = realPayouts.reduce((sum, payout) => sum + payout.amount, 0);
  const pendingVolume = realPayouts.filter((payout) => payout.status === 'Processing' || payout.status === 'Scheduled').reduce((sum, payout) => sum + payout.amount, 0);

  const filteredPayouts = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const formattedDate = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return realPayouts.filter((payout) => {
      const matchesSearch = !query || [payout.id, payout.destination, payout.accountDetails].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'All' || payout.status === status;
      const matchesDate = !date || payout.createdDate.includes(formattedDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [date, realPayouts, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredPayouts.length / PAGE_SIZE));
  const visiblePayouts = filteredPayouts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Boolean(search || date || status !== 'All');
  if (arc.loading || arc.error || !arc.address) {
    return <PageContainer pageTitle='Payouts' pageDescription='Monitor settlements and manage payouts to your connected accounts.'><Card><CardContent className='py-12 text-center'><p className='font-medium'>{arc.loading ? 'Loading Arc Testnet payouts...' : arc.error}</p><p className='text-muted-foreground mt-2 text-sm'>Connect an injected wallet on Arc Testnet to continue.</p></CardContent></Card></PageContainer>;
  }

  function resetPage() { setPage(1); }
  function clearFilters() { setSearch(''); setStatus('All'); setDate(''); resetPage(); }
  function downloadReceipt(payout: Payout) { const receipt = ['ARC Pay payout receipt', `Payout ID: ${payout.id}`, `Destination: ${payout.destination}`, `Amount: ${formatCurrency(payout.amount)}`, `Status: ${payout.status}`, `Created: ${payout.createdDate}`, `Expected arrival: ${payout.arrivalDate}`].join('\n'); const url = URL.createObjectURL(new Blob([receipt], { type: 'text/plain;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = `${payout.id.toLowerCase()}-receipt.txt`; link.click(); URL.revokeObjectURL(url); toast.success('Payout receipt downloaded'); }

  return (
    <PageContainer pageTitle='Payouts' pageDescription='Monitor settlements and manage payouts to your connected accounts.'>
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'><MetricCard label='Available for payout' value={formatCurrency(realPayouts.filter((payout) => payout.status === 'Paid').reduce((sum, payout) => sum + payout.amount, 0))} note='Confirmed sent volume' /><MetricCard label='Pending payouts' value={formatCurrency(pendingVolume)} note='Pending records reported by Arc' /><MetricCard label='Completed this month' value={formatCurrency(realPayouts.filter((payout) => payout.status === 'Paid').reduce((sum, payout) => sum + payout.amount, 0))} note='Confirmed Arc Testnet payouts' /><MetricCard label='Total payout volume' value={formatCurrency(totalVolume)} note='Sent Arc Testnet volume' /></div>

        <Card><CardHeader><CardTitle>Settlement overview</CardTitle><CardDescription>On-chain outgoing transfers from this wallet</CardDescription></CardHeader><CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'><div className='rounded-lg border bg-muted/20 p-4'><p className='text-muted-foreground text-xs'>Upcoming payout</p><p className='mt-2 text-xl font-semibold tabular-nums'>{formatCurrency(pendingVolume)}</p></div><div className='rounded-lg border bg-muted/20 p-4'><p className='text-muted-foreground text-xs'>Next payout date</p><p className='mt-2 font-semibold'>Unavailable</p></div><div className='rounded-lg border bg-muted/20 p-4'><p className='text-muted-foreground text-xs'>Payout schedule</p><p className='mt-2 font-semibold'>Unavailable</p></div><div className='rounded-lg border bg-muted/20 p-4'><p className='text-muted-foreground text-xs'>Destination</p><p className='mt-2 font-semibold'>On-chain addresses</p></div></CardContent></Card>

        <Card><CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'><div><CardTitle>All payouts</CardTitle><CardDescription className='mt-1'>Track settlement progress and destination accounts.</CardDescription></div><span className='text-muted-foreground text-sm tabular-nums'>{filteredPayouts.length} result{filteredPayouts.length === 1 ? '' : 's'}</span></CardHeader><CardContent className='flex flex-col gap-4 pt-6'>
          <div className='flex flex-col gap-3 xl:flex-row'><div className='relative min-w-0 flex-1'><Icons.search className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2' /><Input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder='Search payout ID, destination, account...' className='pl-9' aria-label='Search payouts' /></div><div className='flex flex-col gap-3 sm:flex-row'><Select value={status} onValueChange={(value) => { setStatus(value as PayoutStatus); resetPage(); }}><SelectTrigger className='w-full sm:w-40'><SelectValue placeholder='Status' /></SelectTrigger><SelectContent><SelectGroup>{STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</SelectItem>)}</SelectGroup></SelectContent></Select><Input type='date' value={date} onChange={(event) => { setDate(event.target.value); resetPage(); }} className='w-full sm:w-40' aria-label='Filter payouts by date' /></div>{hasActiveFilters && <Button variant='ghost' onClick={clearFilters} className='shrink-0'><Icons.close data-icon='inline-start' />Clear filters</Button>}</div>

          <div className='overflow-x-auto rounded-lg border'><Table className='min-w-[950px]'><TableHeader><TableRow className='bg-muted/50 hover:bg-muted/50'><TableHead>Payout ID</TableHead><TableHead>Destination / account</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Payout method</TableHead><TableHead>Created date</TableHead><TableHead>Arrival date</TableHead><TableHead className='w-12'>Actions</TableHead></TableRow></TableHeader><TableBody>{visiblePayouts.length ? visiblePayouts.map((payout) => <TableRow key={payout.id} className='cursor-pointer' tabIndex={0} onClick={() => setSelectedPayout(payout)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedPayout(payout); } }}><TableCell className='font-mono text-sm font-medium'>{payout.id}</TableCell><TableCell><div className='font-medium'>{payout.destination}</div><div className='text-muted-foreground mt-1 text-xs'>{payout.accountDetails}</div></TableCell><TableCell className='font-medium tabular-nums'>{formatCurrency(payout.amount)}</TableCell><TableCell><Badge variant='outline' className={statusClassName(payout.status)}>{payout.status}</Badge></TableCell><TableCell>{payout.method}</TableCell><TableCell className='text-muted-foreground text-sm'>{payout.createdDate}</TableCell><TableCell className='text-muted-foreground text-sm'>{payout.arrivalDate}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label={`Actions for ${payout.id}`} onClick={(event) => event.stopPropagation()} />}><Icons.ellipsis /></DropdownMenuTrigger><DropdownMenuContent align='end'><DropdownMenuItem onClick={() => setSelectedPayout(payout)}><Icons.page />View details</DropdownMenuItem><DropdownMenuItem onClick={() => void copyPayoutId(payout.id)}><Icons.fileTypeDoc />Copy payout ID</DropdownMenuItem><DropdownMenuItem onClick={() => downloadReceipt(payout)}><Icons.fileTypePdf />Download receipt</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>) : <TableRow><TableCell colSpan={8} className='h-32 text-center'><p className='font-medium'>No payouts found</p><p className='text-muted-foreground mt-1 text-sm'>Try adjusting your search or filters.</p></TableCell></TableRow>}</TableBody></Table></div>

          <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'><p className='text-muted-foreground text-sm'>Showing {filteredPayouts.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filteredPayouts.length)} of {filteredPayouts.length}</p><div className='flex items-center gap-2'><Button variant='outline' size='icon' aria-label='Previous page' disabled={page === 1} onClick={() => setPage((current) => current - 1)}><Icons.chevronLeft /></Button><span className='text-muted-foreground min-w-16 text-center text-sm'>Page {page} of {pageCount}</span><Button variant='outline' size='icon' aria-label='Next page' disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}><Icons.chevronRight /></Button></div></div>
        </CardContent></Card>
      </div>

      <Sheet open={selectedPayout !== null} onOpenChange={(open) => !open && setSelectedPayout(null)}><SheetContent className='z-[100] max-h-[100dvh] min-h-0 w-full overflow-hidden sm:max-w-lg'><SheetHeader className='shrink-0'><SheetTitle>Payout Details</SheetTitle><SheetDescription>ARC Pay settlement and destination information</SheetDescription></SheetHeader>{selectedPayout && <PayoutDetails payout={selectedPayout} onCopy={() => void copyPayoutId(selectedPayout.id)} onViewTransactions={() => router.push(`/dashboard/transactions?payout=${encodeURIComponent(selectedPayout.id)}`)} onDownload={() => downloadReceipt(selectedPayout)} onContact={() => setSupportPayout(selectedPayout)} />}</SheetContent></Sheet>

      <Sheet open={supportPayout !== null} onOpenChange={(open) => !open && setSupportPayout(null)}><SheetContent className='sm:max-w-md'><SheetHeader><SheetTitle>Contact ARC Pay Support</SheetTitle><SheetDescription>We can help with payout {supportPayout?.id}.</SheetDescription></SheetHeader><div className='px-4 pb-6'><Button className='w-full' onClick={() => { window.location.href = 'mailto:support@arcpay.com'; }}><Icons.send data-icon='inline-start' />Email support</Button></div></SheetContent></Sheet>
    </PageContainer>
  );
}
