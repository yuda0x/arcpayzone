'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { TransactionDetails, type Transaction } from '@/app/dashboard/transactions/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useArcData } from '@/hooks/use-arc-data';
import type { ArcTransactionRecord } from '@/lib/arc-transactions';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

const PAGE_SIZE = 8;
const STATUS_OPTIONS = ['All', 'Succeeded', 'Pending', 'Failed', 'Refunded'] as const;
const METHOD_OPTIONS = ['All', 'Card', 'Bank Transfer', 'Mobile Money', 'Wallet'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];
type MethodFilter = (typeof METHOD_OPTIONS)[number];

type Payment = Transaction;

const _legacyPayments: Payment[] = [
  {
    id: 'PAY-8F42A91C', createdAt: 'Aug 19, 2026, 10:42 AM', customer: 'Arcade Supply Co.', email: 'finance@arcadesupply.co', amount: 1240, method: 'Card', methodDetail: 'Visa ending 4242', status: 'Succeeded', settlement: 'Aug 21, 2026', processingFee: 38.16, netAmount: 1201.84, reference: 'order_01J8ARC42', customerId: 'cus_arcade_0248', billingAddress: '14 Market Street, Lagos, NG', currency: 'USD', otherFees: 1.2, riskScore: 12, gateway: 'ARC Pay Card Gateway', ipLocation: '102.89.23.14 · Lagos, NG'
  },
  {
    id: 'PAY-7D19B4EE', createdAt: 'Aug 19, 2026, 10:18 AM', customer: 'Northstar Studio', email: 'billing@northstar.studio', amount: 860.5, method: 'Bank Transfer', methodDetail: 'GTBank ending 2081', status: 'Pending', settlement: 'Aug 20, 2026', processingFee: 8.61, netAmount: 851.89, reference: 'order_01J8NORTHST', customerId: 'cus_northstar_1190', billingAddress: '220 King Street, Toronto, CA', currency: 'USD', otherFees: 0, riskScore: 8, gateway: 'ARC Pay ACH Gateway', ipLocation: '142.44.18.90 · Toronto, CA'
  },
  {
    id: 'PAY-6C27E8A0', createdAt: 'Aug 19, 2026, 9:56 AM', customer: 'Morrow Market', email: 'payables@morrow.market', amount: 320, method: 'Card', methodDetail: 'Mastercard ending 1189', status: 'Failed', settlement: 'Not scheduled', processingFee: 0, netAmount: 0, reference: 'order_01J8MORROW01', failureReason: 'Insufficient funds', customerId: 'cus_morrow_0317', billingAddress: '8 Palm Avenue, Accra, GH', currency: 'USD', otherFees: 0, riskScore: 61, gateway: 'ARC Pay Card Gateway', ipLocation: '41.215.161.12 · Accra, GH'
  },
  {
    id: 'PAY-5A03C7F2', createdAt: 'Aug 19, 2026, 9:31 AM', customer: 'Brightline Goods', email: 'ops@brightlinegoods.com', amount: 145, method: 'Wallet', methodDetail: 'Apple Pay', status: 'Refunded', settlement: 'Aug 18, 2026', processingFee: 4.5, netAmount: -145, reference: 'order_01J8BRIGHT07', customerId: 'cus_brightline_0881', billingAddress: '72 Oxford Road, Nairobi, KE', currency: 'USD', otherFees: 0, riskScore: 16, gateway: 'ARC Pay Wallet Gateway', ipLocation: '197.248.32.71 · Nairobi, KE'
  },
  {
    id: 'PAY-4B88D2C1', createdAt: 'Aug 19, 2026, 8:47 AM', customer: 'Pine & Parcel', email: 'hello@pineandparcel.com', amount: 78.25, method: 'Mobile Money', methodDetail: 'MTN MoMo ending 7742', status: 'Succeeded', settlement: 'Aug 21, 2026', processingFee: 2.35, netAmount: 75.9, reference: 'order_01J8PINE002', customerId: 'cus_pine_4420', billingAddress: '5 Rose Lane, Kampala, UG', currency: 'USD', otherFees: 0.08, riskScore: 9, gateway: 'ARC Pay Mobile Money Gateway', ipLocation: '154.72.14.88 · Kampala, UG'
  },
  {
    id: 'PAY-3E61A90D', createdAt: 'Aug 18, 2026, 5:22 PM', customer: 'Cedar House', email: 'accounts@cedarhouse.io', amount: 2490, method: 'Bank Transfer', methodDetail: 'Access Bank ending 6230', status: 'Succeeded', settlement: 'Aug 20, 2026', processingFee: 24.9, netAmount: 2465.1, reference: 'order_01J8CEDAR88', customerId: 'cus_cedar_2054', billingAddress: '31 Cedar Lane, Austin, US', currency: 'USD', otherFees: 0, riskScore: 7, gateway: 'ARC Pay ACH Gateway', ipLocation: '172.58.18.21 · Austin, US'
  },
  {
    id: 'PAY-2F74C6B8', createdAt: 'Aug 18, 2026, 3:08 PM', customer: 'Lumen Health', email: 'billing@lumenhealth.africa', amount: 640.75, method: 'Card', methodDetail: 'Visa ending 9012', status: 'Pending', settlement: 'Aug 20, 2026', processingFee: 19.42, netAmount: 621.33, reference: 'order_01J8LUMEN18', customerId: 'cus_lumen_7103', billingAddress: '19 Broad Street, London, GB', currency: 'USD', otherFees: 0.64, riskScore: 23, gateway: 'ARC Pay Card Gateway', ipLocation: '81.129.33.45 · London, GB'
  },
  {
    id: 'PAY-1A52E9F4', createdAt: 'Aug 18, 2026, 1:44 PM', customer: 'Monument Labs', email: 'pay@monumentlabs.dev', amount: 980, method: 'Wallet', methodDetail: 'Google Pay', status: 'Succeeded', settlement: 'Aug 20, 2026', processingFee: 29.4, netAmount: 950.6, reference: 'order_01J8MONUMENT', customerId: 'cus_monument_6002', billingAddress: '400 Howard Street, San Francisco, US', currency: 'USD', otherFees: 0.98, riskScore: 11, gateway: 'ARC Pay Wallet Gateway', ipLocation: '104.28.55.19 · San Francisco, US'
  },
  {
    id: 'PAY-0D31B7AA', createdAt: 'Aug 18, 2026, 11:19 AM', customer: 'Kora Events', email: 'accounts@koraevents.com', amount: 312.4, method: 'Mobile Money', methodDetail: 'Airtel Money ending 4201', status: 'Failed', settlement: 'Not scheduled', processingFee: 0, netAmount: 0, reference: 'order_01J8KORA004', failureReason: 'Payment authorization expired', customerId: 'cus_kora_8034', billingAddress: '6 Ring Road, Accra, GH', currency: 'USD', otherFees: 0, riskScore: 72, gateway: 'ARC Pay Mobile Money Gateway', ipLocation: '41.66.11.25 · Accra, GH'
  },
  {
    id: 'PAY-9C48F0D6', createdAt: 'Aug 17, 2026, 4:36 PM', customer: 'Fieldwork Collective', email: 'finance@fieldwork.co', amount: 1750, method: 'Card', methodDetail: 'Visa ending 7734', status: 'Succeeded', settlement: 'Aug 19, 2026', processingFee: 52.5, netAmount: 1697.5, reference: 'order_01J8FIELD102', customerId: 'cus_fieldwork_2917', billingAddress: '88 King Street, New York, US', currency: 'USD', otherFees: 1.75, riskScore: 14, gateway: 'ARC Pay Card Gateway', ipLocation: '64.12.44.18 · New York, US'
  },
  {
    id: 'PAY-8E20A5BC', createdAt: 'Aug 17, 2026, 2:12 PM', customer: 'Olive & Oak', email: 'hello@oliveandoak.store', amount: 96.99, method: 'Wallet', methodDetail: 'Flutterwave Wallet', status: 'Refunded', settlement: 'Aug 16, 2026', processingFee: 2.91, netAmount: -96.99, reference: 'order_01J8OLIVE55', customerId: 'cus_olive_5108', billingAddress: '12 Park Road, Cape Town, ZA', currency: 'USD', otherFees: 0, riskScore: 19, gateway: 'ARC Pay Wallet Gateway', ipLocation: '102.165.41.8 · Cape Town, ZA'
  },
  {
    id: 'PAY-7B06D3E1', createdAt: 'Aug 16, 2026, 6:51 PM', customer: 'Atlas Learning', email: 'billing@atlaslearning.org', amount: 4200, method: 'Bank Transfer', methodDetail: 'UBA ending 1184', status: 'Succeeded', settlement: 'Aug 18, 2026', processingFee: 42, netAmount: 4158, reference: 'order_01J8ATLAS33', customerId: 'cus_atlas_9011', billingAddress: '3 Learning Way, Nairobi, KE', currency: 'USD', otherFees: 0, riskScore: 6, gateway: 'ARC Pay ACH Gateway', ipLocation: '105.163.77.41 · Nairobi, KE'
  }
];

const chartConfig = {
  volume: { label: 'Payment volume', color: 'var(--chart-1)' },
  refunds: { label: 'Refund volume', color: 'var(--chart-2)' }
} satisfies ChartConfig;

const methodConfig = {
  card: { label: 'Card', color: 'var(--chart-1)' },
  bank: { label: 'Bank Transfer', color: 'var(--chart-2)' },
  wallet: { label: 'Wallet', color: 'var(--chart-3)' },
  mobile: { label: 'Mobile Money', color: 'var(--chart-4)' }
} satisfies ChartConfig;

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(value: number): string {
  return currency.format(value);
}

function toPayment(record: ArcTransactionRecord): Payment {
  const createdAt = record.timestamp ? new Date(record.timestamp).toLocaleString('en-US') : 'Date unavailable';
  return {
    id: record.hash,
    createdAt,
    customer: record.direction === 'Sent' ? record.to : record.from,
    email: 'On-chain address',
    amount: record.amount,
    method: 'Wallet',
    methodDetail: 'USDC on Arc Testnet',
    status: record.status === 'Confirmed' ? 'Succeeded' : 'Failed',
    settlement: 'On-chain',
    processingFee: 0,
    netAmount: record.status === 'Confirmed' ? record.amount : 0,
    reference: record.hash,
    customerId: record.direction === 'Sent' ? record.to : record.from,
    billingAddress: 'On-chain address',
    currency: record.asset,
    otherFees: 0,
    riskScore: 0,
    gateway: 'Arc Testnet',
    ipLocation: `${record.direction} · block ${record.blockNumber}`
  };
}

function statusClassName(status: Transaction['status']): string {
  switch (status) {
    case 'Succeeded': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'Pending': return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'Failed': return 'border-red-500/30 bg-red-500/10 text-red-400';
    case 'Refunded': return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  }
}

function MetricCard({ label, value, change, note }: { label: string; value: string; change: string; note: string }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardDescription>{label}</CardDescription>
        <div className='flex items-center justify-between gap-2'>
          <CardTitle className='text-2xl tabular-nums'>{value}</CardTitle>
          <Badge variant='outline' className='text-emerald-400'><Icons.trendingUp />{change}</Badge>
        </div>
      </CardHeader>
      <CardContent><p className='text-muted-foreground text-xs'>{note}</p></CardContent>
    </Card>
  );
}

function PaymentVolumeChart({ data }: { data: { date: string; volume: number; refunds: number }[] }) {
  return (
    <Card className='min-w-0'>
      <CardHeader>
        <CardTitle>Payment volume</CardTitle>
        <CardDescription>Payment and refund volume over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className='h-[280px] w-full aspect-auto'>
          <AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id='payment-volume-fill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-volume)' stopOpacity={0.35} />
                <stop offset='95%' stopColor='var(--color-volume)' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis dataKey='date' tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} width={48} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [formatCurrency(Number(value)), name]} />} />
            <Area dataKey='volume' type='monotone' fill='url(#payment-volume-fill)' fillOpacity={0.5} stroke='var(--color-volume)' strokeWidth={2} />
            <Area dataKey='refunds' type='monotone' fill='none' stroke='var(--color-refunds)' strokeWidth={2} strokeDasharray='5 5' />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function PaymentMethodsCard({ data }: { data: { method: string; amount: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  return (
    <Card className='min-w-0'>
      <CardHeader>
        <CardTitle>Payment methods</CardTitle>
        <CardDescription>Distribution of processed payment volume</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <ChartContainer config={methodConfig} className='mx-auto aspect-square max-h-[190px]'>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(Number(value))} />} />
            <Pie data={data} dataKey='amount' nameKey='method' innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
              {data.map((item) => <Cell key={item.method} fill={item.color} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className='grid gap-3'>
          {data.map((item) => {
            const percentage = Math.round((item.amount / total) * 100);
            return (
                <div key={item.method} className='flex items-center justify-between gap-3 text-sm'>
                <div className='flex min-w-0 items-center gap-2'><span className='size-2 rounded-full' style={{ backgroundColor: item.color }} /><span className='truncate'>{item.method}</span></div>
                <span className='shrink-0 tabular-nums'>{formatCurrency(item.amount)} <span className='text-muted-foreground'>({percentage}%)</span></span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentsPage() {
  const arc = useArcData<ArcTransactionRecord[]>('/api/payments', 'payments');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('All');
  const [method, setMethod] = React.useState<MethodFilter>('All');
  const [date, setDate] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = React.useState<Payment | null>(null);
  const [contactTarget, setContactTarget] = React.useState<Payment | null>(null);
  const [refundedIds, setRefundedIds] = React.useState<Set<string>>(() => new Set());
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const realPayments = React.useMemo(() => (arc.data ?? []).map(toPayment), [arc.data]);
  const totalVolume = realPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const successfulPayments = realPayments.filter((payment) => payment.status === 'Succeeded').length;
  const pendingPayments = realPayments.filter((payment) => payment.status === 'Pending').length;
  const failedPayments = realPayments.filter((payment) => payment.status === 'Failed').length;
  const chartVolumeData = React.useMemo(() => realPayments.map((payment) => ({ date: payment.createdAt, volume: payment.amount, refunds: 0 })), [realPayments]);
  const chartMethodData = React.useMemo(() => [{ method: 'Wallet', amount: totalVolume, color: 'var(--color-wallet)' }], [totalVolume]);

  const getPayment = React.useCallback((payment: Payment): Payment => (
    refundedIds.has(payment.id) ? { ...payment, status: 'Refunded' } : payment
  ), [refundedIds]);

  const filteredPayments = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const formattedDate = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return realPayments.filter((payment) => {
      const current = getPayment(payment);
      const matchesSearch = !normalizedSearch || [current.id, current.customer, current.email].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = status === 'All' || current.status === status;
      const matchesMethod = method === 'All' || current.method === method;
      const matchesDate = !date || current.createdAt.includes(formattedDate);
      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [date, getPayment, method, realPayments, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const visiblePayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(getPayment);
  const hasActiveFilters = Boolean(search || date || status !== 'All' || method !== 'All');
  const displayedPayment = selectedPayment ? getPayment(selectedPayment) : null;

  if (arc.loading || arc.error || !arc.address) {
    return <PageContainer pageTitle='Payments' pageDescription='Monitor, manage, and analyze ARC Pay payment activity.'><Card><CardContent className='py-12 text-center'><p className='font-medium'>{arc.loading ? 'Loading Arc Testnet payments...' : arc.error}</p><p className='text-muted-foreground mt-2 text-sm'>Connect an injected wallet on Arc Testnet to continue.</p></CardContent></Card></PageContainer>;
  }

  function resetPage() { setPage(1); }
  function clearFilters() { setSearch(''); setStatus('All'); setMethod('All'); setDate(''); resetPage(); }

  async function copyPaymentId(paymentId: string) {
    await navigator.clipboard.writeText(paymentId);
    setCopiedId(paymentId);
    toast.success('Payment ID copied');
  }

  function downloadReceipt(payment: Payment) {
    const receipt = ['ARC Pay receipt', `Payment ID: ${payment.id}`, `Customer: ${payment.customer}`, `Amount: ${formatCurrency(payment.amount)}`, `Method: ${payment.methodDetail}`, `Status: ${payment.status}`, `Created: ${payment.createdAt}`].join('\n');
    const url = URL.createObjectURL(new Blob([receipt], { type: 'text/plain;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `${payment.id.toLowerCase()}-receipt.txt`; link.click(); URL.revokeObjectURL(url);
    toast.success('Receipt downloaded');
  }

  function confirmRefund() {
    if (!refundTarget) return;
    setRefundedIds((current) => new Set(current).add(refundTarget.id));
    setRefundTarget(null);
    toast.success(`${refundTarget.id} marked as refunded`);
  }

  return (
    <PageContainer
      pageTitle='Payments'
      pageDescription='Monitor, manage, and analyze ARC Pay payment activity.'
      pageHeaderAction={<Button variant='outline' onClick={() => toast.success('Payments export started')}><Icons.upload data-icon='inline-start' />Export</Button>}
    >
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <MetricCard label='Total payment volume' value={formatCurrency(totalVolume)} change='On-chain' note='Confirmed and failed Arc Testnet records' />
          <MetricCard label='Successful payments' value={successfulPayments.toLocaleString()} change='On-chain' note='Confirmed Arc Testnet records' />
          <MetricCard label='Pending payments' value={pendingPayments.toLocaleString()} change='On-chain' note='Pending records are not reported by Arc RPC' />
          <MetricCard label='Failed payments' value={failedPayments.toLocaleString()} change='On-chain' note='Failed Arc Testnet records' />
        </div>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-7'>
          <div className='xl:col-span-4'><PaymentVolumeChart data={chartVolumeData} /></div>
          <div className='xl:col-span-3'><PaymentMethodsCard data={chartMethodData} /></div>
        </div>

        <Card>
          <CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'>
            <div><CardTitle>Recent payments</CardTitle><CardDescription className='mt-1'>Review the latest payment activity across your channels.</CardDescription></div>
            <span className='text-muted-foreground text-sm tabular-nums'>{filteredPayments.length} result{filteredPayments.length === 1 ? '' : 's'}</span>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 pt-6'>
            <div className='flex flex-col gap-3 xl:flex-row'>
              <div className='relative min-w-0 flex-1'>
                <Icons.search className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2' />
                <Input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder='Search payment ID, customer, email...' className='pl-9' aria-label='Search payments' />
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 xl:flex'>
                <Select value={status} onValueChange={(value) => { setStatus(value as StatusFilter); resetPage(); }}><SelectTrigger className='w-full sm:w-40'><SelectValue placeholder='Status' /></SelectTrigger><SelectContent><SelectGroup>{STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</SelectItem>)}</SelectGroup></SelectContent></Select>
                <Select value={method} onValueChange={(value) => { setMethod(value as MethodFilter); resetPage(); }}><SelectTrigger className='w-full sm:w-40'><SelectValue placeholder='Payment method' /></SelectTrigger><SelectContent><SelectGroup>{METHOD_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All methods' : option}</SelectItem>)}</SelectGroup></SelectContent></Select>
                <Input type='date' value={date} onChange={(event) => { setDate(event.target.value); resetPage(); }} className='w-full sm:w-40' aria-label='Filter payments by date' />
              </div>
              {hasActiveFilters && <Button variant='ghost' onClick={clearFilters} className='shrink-0'><Icons.close data-icon='inline-start' />Clear filters</Button>}
            </div>

            <div className='overflow-x-auto rounded-lg border'>
              <Table className='min-w-[850px]'>
                <TableHeader><TableRow className='bg-muted/50 hover:bg-muted/50'><TableHead>Payment ID</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Payment method</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className='w-12'>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visiblePayments.length ? visiblePayments.map((payment) => (
                    <TableRow key={payment.id} className='cursor-pointer' tabIndex={0} onClick={() => setSelectedPayment(payment)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedPayment(payment); } }}>
                      <TableCell className='font-mono text-sm font-medium'>{payment.id}</TableCell>
                      <TableCell><div className='font-medium'>{payment.customer}</div><div className='text-muted-foreground mt-1 text-xs'>{payment.email}</div></TableCell>
                      <TableCell className='font-medium tabular-nums'>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell><div>{payment.method}</div><div className='text-muted-foreground mt-1 text-xs'>{payment.methodDetail}</div></TableCell>
                      <TableCell><Badge variant='outline' className={statusClassName(payment.status)}>{payment.status}</Badge></TableCell>
                      <TableCell className='text-muted-foreground text-sm'>{payment.createdAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label={`Actions for ${payment.id}`} onClick={(event) => event.stopPropagation()} />}><Icons.ellipsis /></DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem onClick={() => setSelectedPayment(payment)}><Icons.page />View details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void copyPaymentId(payment.id)}><Icons.fileTypeDoc />Copy payment ID</DropdownMenuItem>
                            <DropdownMenuItem disabled={payment.status === 'Failed' || payment.status === 'Refunded'} onClick={() => setRefundTarget(payment)}><Icons.creditCard />Refund payment</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={7} className='h-32 text-center'><p className='font-medium'>No payments found</p><p className='text-muted-foreground mt-1 text-sm'>Try adjusting your search or filters.</p></TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>

            <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-muted-foreground text-sm'>Showing {filteredPayments.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length}</p>
              <div className='flex items-center gap-2'><Button variant='outline' size='icon' aria-label='Previous page' disabled={page === 1} onClick={() => setPage((current) => current - 1)}><Icons.chevronLeft /></Button><span className='text-muted-foreground min-w-16 text-center text-sm'>Page {page} of {pageCount}</span><Button variant='outline' size='icon' aria-label='Next page' disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}><Icons.chevronRight /></Button></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={displayedPayment !== null} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <SheetContent className='z-[100] max-h-[100dvh] min-h-0 w-full overflow-hidden sm:max-w-lg'><SheetHeader className='shrink-0'><SheetTitle>Transaction Details</SheetTitle><SheetDescription>ARC Pay payment record and settlement information</SheetDescription></SheetHeader>{displayedPayment && <TransactionDetails transaction={displayedPayment} onCopy={() => void copyPaymentId(displayedPayment.id)} onRefund={() => setRefundTarget(displayedPayment)} onDownload={() => downloadReceipt(displayedPayment)} onContact={() => setContactTarget(displayedPayment)} copied={copiedId === displayedPayment.id} />}</SheetContent>
      </Sheet>

      <AlertDialog open={refundTarget !== null} onOpenChange={(open) => !open && setRefundTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Refund this payment?</AlertDialogTitle><AlertDialogDescription>This is a mock action for <span className='font-mono'>{refundTarget?.id}</span>. Refund <span className='font-medium'>{refundTarget ? formatCurrency(refundTarget.amount) : ''}</span> for <span className='font-medium'>{refundTarget?.customer}</span> without contacting a payment gateway.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep payment</AlertDialogCancel><AlertDialogAction onClick={confirmRefund}>Confirm refund</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={contactTarget !== null} onOpenChange={(open) => !open && setContactTarget(null)}><DialogContent><DialogHeader><DialogTitle>Contact customer</DialogTitle><DialogDescription>Send a message to the customer associated with this payment.</DialogDescription></DialogHeader><div className='rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium'>{contactTarget?.email}</div><DialogFooter><Button variant='outline' onClick={() => setContactTarget(null)}>Cancel</Button><Button onClick={() => { if (contactTarget) window.location.href = `mailto:${contactTarget.email}`; }}><Icons.send data-icon='inline-start' />Open mail</Button></DialogFooter></DialogContent></Dialog>
    </PageContainer>
  );
}
