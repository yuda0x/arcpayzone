'use client';

import * as React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { TransactionDetails, type Transaction } from '@/app/dashboard/transactions/page';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useArcData } from '@/hooks/use-arc-data';
import type { ArcTransactionRecord } from '@/lib/arc-transactions';

const RANGE_OPTIONS = ['Last 7 days', 'Last 30 days', 'Last 90 days'] as const;
const METHOD_OPTIONS = ['All', 'Card', 'Bank Transfer', 'Wallet', 'Mobile Money'] as const;
const STATUS_OPTIONS = ['All', 'Succeeded', 'Pending', 'Failed', 'Refunded'] as const;
type RangeFilter = (typeof RANGE_OPTIONS)[number];
type MethodFilter = (typeof METHOD_OPTIONS)[number];
type StatusFilter = (typeof STATUS_OPTIONS)[number];
type PaymentStatus = Exclude<StatusFilter, 'All'>;
type PaymentMethod = Exclude<MethodFilter, 'All'>;

interface AnalyticsRecord {
  date: string;
  volume: number;
  successfulVolume: number;
  failedVolume: number;
  refundVolume: number;
  successful: number;
  pending: number;
  failed: number;
  refunded: number;
  authorizationAttempts: number;
  authorized: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

interface AnalyticsEvent {
  time: string;
  transaction: Transaction;
}

const _legacyRecords: AnalyticsRecord[] = [
  { date: 'Aug 06', volume: 8420, successfulVolume: 8120, failedVolume: 180, refundVolume: 120, successful: 112, pending: 4, failed: 3, refunded: 2, authorizationAttempts: 119, authorized: 116, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 07', volume: 9840, successfulVolume: 9430, failedVolume: 190, refundVolume: 180, successful: 128, pending: 5, failed: 2, refunded: 3, authorizationAttempts: 135, authorized: 132, method: 'Bank Transfer', status: 'Succeeded' },
  { date: 'Aug 08', volume: 7620, successfulVolume: 7240, failedVolume: 240, refundVolume: 95, successful: 96, pending: 7, failed: 4, refunded: 1, authorizationAttempts: 107, authorized: 103, method: 'Wallet', status: 'Succeeded' },
  { date: 'Aug 09', volume: 11280, successfulVolume: 10840, failedVolume: 210, refundVolume: 240, successful: 145, pending: 3, failed: 2, refunded: 4, authorizationAttempts: 150, authorized: 147, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 10', volume: 10640, successfulVolume: 10180, failedVolume: 260, refundVolume: 160, successful: 138, pending: 6, failed: 3, refunded: 2, authorizationAttempts: 147, authorized: 144, method: 'Mobile Money', status: 'Succeeded' },
  { date: 'Aug 11', volume: 12480, successfulVolume: 11960, failedVolume: 280, refundVolume: 280, successful: 161, pending: 4, failed: 2, refunded: 5, authorizationAttempts: 167, authorized: 164, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 12', volume: 11820, successfulVolume: 11420, failedVolume: 200, refundVolume: 180, successful: 153, pending: 5, failed: 4, refunded: 3, authorizationAttempts: 162, authorized: 158, method: 'Bank Transfer', status: 'Succeeded' },
  { date: 'Aug 13', volume: 9360, successfulVolume: 8870, failedVolume: 260, refundVolume: 120, successful: 121, pending: 8, failed: 3, refunded: 2, authorizationAttempts: 132, authorized: 129, method: 'Wallet', status: 'Pending' },
  { date: 'Aug 14', volume: 13140, successfulVolume: 12640, failedVolume: 240, refundVolume: 220, successful: 172, pending: 4, failed: 2, refunded: 4, authorizationAttempts: 178, authorized: 175, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 15', volume: 14680, successfulVolume: 14120, failedVolume: 310, refundVolume: 360, successful: 188, pending: 6, failed: 3, refunded: 5, authorizationAttempts: 197, authorized: 194, method: 'Mobile Money', status: 'Succeeded' },
  { date: 'Aug 16', volume: 10920, successfulVolume: 10340, failedVolume: 360, refundVolume: 180, successful: 141, pending: 5, failed: 4, refunded: 2, authorizationAttempts: 150, authorized: 146, method: 'Bank Transfer', status: 'Failed' },
  { date: 'Aug 17', volume: 15360, successfulVolume: 14820, failedVolume: 260, refundVolume: 420, successful: 197, pending: 3, failed: 2, refunded: 6, authorizationAttempts: 204, authorized: 202, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 18', volume: 13840, successfulVolume: 13320, failedVolume: 280, refundVolume: 290, successful: 179, pending: 7, failed: 3, refunded: 4, authorizationAttempts: 189, authorized: 186, method: 'Wallet', status: 'Succeeded' },
  { date: 'Aug 19', volume: 12840, successfulVolume: 12310, failedVolume: 250, refundVolume: 190, successful: 176, pending: 8, failed: 2, refunded: 3, authorizationAttempts: 186, authorized: 184, method: 'Card', status: 'Succeeded' }
];

const _legacyEvents: AnalyticsEvent[] = [
  { time: '10:42 AM', transaction: { id: 'TXN-8F42A91C', createdAt: 'Aug 19, 2026, 10:42 AM', customer: 'Arcade Supply Co.', email: 'finance@arcadesupply.co', amount: 1240, method: 'Card', methodDetail: 'Visa ending 4242', status: 'Succeeded', settlement: 'Aug 21, 2026', processingFee: 38.16, netAmount: 1201.84, reference: 'order_01J8ARC42', customerId: 'cus_arcade_0248', billingAddress: '14 Market Street, Lagos, NG', currency: 'USD', otherFees: 1.2, riskScore: 12, gateway: 'ARC Pay Card Gateway', ipLocation: '102.89.23.14 · Lagos, NG' } },
  { time: '10:18 AM', transaction: { id: 'TXN-7D19B4EE', createdAt: 'Aug 19, 2026, 10:18 AM', customer: 'Northstar Studio', email: 'billing@northstar.studio', amount: 860.5, method: 'Bank Transfer', methodDetail: 'GTBank ending 2081', status: 'Pending', settlement: 'Aug 20, 2026', processingFee: 8.61, netAmount: 851.89, reference: 'order_01J8NORTHST', customerId: 'cus_northstar_1190', billingAddress: '220 King Street, Toronto, CA', currency: 'USD', otherFees: 0, riskScore: 8, gateway: 'ARC Pay ACH Gateway', ipLocation: '142.44.18.90 · Toronto, CA' } },
  { time: '9:56 AM', transaction: { id: 'TXN-6C27E8A0', createdAt: 'Aug 19, 2026, 9:56 AM', customer: 'Morrow Market', email: 'payables@morrow.market', amount: 320, method: 'Card', methodDetail: 'Mastercard ending 1189', status: 'Failed', settlement: 'Not scheduled', processingFee: 0, netAmount: 0, reference: 'order_01J8MORROW01', failureReason: 'Insufficient funds', customerId: 'cus_morrow_0317', billingAddress: '8 Palm Avenue, Accra, GH', currency: 'USD', otherFees: 0, riskScore: 61, gateway: 'ARC Pay Card Gateway', ipLocation: '41.215.161.12 · Accra, GH' } },
  { time: '9:31 AM', transaction: { id: 'TXN-5A03C7F2', createdAt: 'Aug 19, 2026, 9:31 AM', customer: 'Brightline Goods', email: 'ops@brightlinegoods.com', amount: 145, method: 'Wallet', methodDetail: 'Apple Pay', status: 'Refunded', settlement: 'Aug 18, 2026', processingFee: 4.5, netAmount: -145, reference: 'order_01J8BRIGHT07', customerId: 'cus_brightline_0881', billingAddress: '72 Oxford Road, Nairobi, KE', currency: 'USD', otherFees: 0, riskScore: 16, gateway: 'ARC Pay Wallet Gateway', ipLocation: '197.248.32.71 · Nairobi, KE' } }
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function formatCurrency(value: number): string { return currency.format(value); }
function percent(value: number, total: number): string { return total ? `${((value / total) * 100).toFixed(1)}%` : '0.0%'; }

function buildAnalyticsRecords(transactions: ArcTransactionRecord[]): AnalyticsRecord[] {
  return transactions.map((record) => ({
    date: record.timestamp ? new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'Date unavailable',
    volume: record.amount,
    successfulVolume: record.status === 'Confirmed' ? record.amount : 0,
    failedVolume: record.status === 'Failed' ? record.amount : 0,
    refundVolume: 0,
    successful: record.status === 'Confirmed' ? 1 : 0,
    pending: 0,
    failed: record.status === 'Failed' ? 1 : 0,
    refunded: 0,
    authorizationAttempts: 1,
    authorized: record.status === 'Confirmed' ? 1 : 0,
    method: 'Wallet',
    status: record.status === 'Confirmed' ? 'Succeeded' : 'Failed'
  }));
}
function statusClassName(status: PaymentStatus): string { switch (status) { case 'Succeeded': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'; case 'Pending': return 'border-amber-500/30 bg-amber-500/10 text-amber-400'; case 'Failed': return 'border-red-500/30 bg-red-500/10 text-red-400'; case 'Refunded': return 'border-blue-500/30 bg-blue-500/10 text-blue-400'; } }

const chartConfig = { volume: { label: 'Payment volume', color: 'var(--chart-1)' }, successful: { label: 'Successful volume', color: 'var(--chart-3)' }, failed: { label: 'Failed volume', color: 'var(--chart-4)' }, refunds: { label: 'Refund volume', color: 'var(--chart-2)' } } satisfies ChartConfig;

function KpiCard({ label, value, change, description, negative = false }: { label: string; value: string; change: string; description: string; negative?: boolean }) { return <Card><CardHeader className='pb-2'><CardDescription>{label}</CardDescription><div className='flex items-center justify-between gap-2'><CardTitle className='text-2xl tabular-nums'>{value}</CardTitle><Badge variant='outline' className={negative ? 'text-red-400' : 'text-emerald-400'}>{negative ? <Icons.trendingDown /> : <Icons.trendingUp />}{change}</Badge></div></CardHeader><CardContent><p className='text-muted-foreground text-xs'>{description}</p></CardContent></Card>; }

function PerformanceChart({ data }: { data: AnalyticsRecord[] }) { return <Card><CardHeader><CardTitle>Payment performance</CardTitle><CardDescription>Payment volume and successful payment activity</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className='h-[320px] min-h-[280px] w-full aspect-auto' initialDimension={{ width: 680, height: 320 }}><AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 10, top: 10 }}><defs><linearGradient id='analytics-volume-fill' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor='var(--color-volume)' stopOpacity={0.3} /><stop offset='95%' stopColor='var(--color-volume)' stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray='3 3' /><XAxis dataKey='date' tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(value) => `$${Number(value) / 1000}k`} /><ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [formatCurrency(Number(value)), name]} />} /><Area dataKey='volume' type='monotone' fill='url(#analytics-volume-fill)' stroke='var(--color-volume)' strokeWidth={2} /><Line dataKey='successfulVolume' type='monotone' stroke='var(--color-successful)' strokeWidth={2} dot={false} /><Line dataKey='failedVolume' type='monotone' stroke='var(--color-failed)' strokeWidth={2} dot={false} /><Line dataKey='refundVolume' type='monotone' stroke='var(--color-refunds)' strokeWidth={2} strokeDasharray='5 5' dot={false} /></AreaChart></ChartContainer><div className='mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs'><span className='flex items-center gap-2'><span className='size-2 rounded-full bg-[var(--chart-1)]' />Payment volume</span><span className='flex items-center gap-2'><span className='size-2 rounded-full bg-[var(--chart-3)]' />Successful payment volume</span><span className='flex items-center gap-2'><span className='size-2 rounded-full bg-[var(--chart-4)]' />Failed payment volume</span><span className='flex items-center gap-2'><span className='size-2 rounded-full bg-[var(--chart-2)]' />Refund volume</span></div></CardContent></Card>; }

function ComparisonRow({ label, current, previous, format = 'currency' }: { label: string; current: number; previous?: number; format?: 'currency' | 'number' | 'percent' }) { const formatter = format === 'currency' ? formatCurrency : format === 'percent' ? (value: number) => `${value.toFixed(1)}%` : (value: number) => value.toLocaleString(); const change = previous === undefined ? null : previous ? ((current - previous) / previous) * 100 : 0; return <div className='flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-0'><span className='text-muted-foreground'>{label}</span><div className='flex items-center gap-3'><span className='font-medium tabular-nums'>{formatter(current)}</span><span className='text-muted-foreground text-xs'>{change === null ? 'Unavailable' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}</span></div></div>; }

export default function PaymentAnalyticsPage() {
  const arc = useArcData<ArcTransactionRecord[]>('/api/payment-analytics', 'transactions');
  const [range, setRange] = React.useState<RangeFilter>('Last 30 days');
  const [method, setMethod] = React.useState<MethodFilter>('All');
  const [status, setStatus] = React.useState<StatusFilter>('All');
  const [compare, setCompare] = React.useState(true);
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const realRecords = React.useMemo(() => buildAnalyticsRecords(arc.data ?? []), [arc.data]);

  const filteredData = React.useMemo(() => { const size = range === 'Last 7 days' ? 7 : realRecords.length; return realRecords.slice(-size).filter((record) => (method === 'All' || record.method === method) && (status === 'All' || record.status === status)); }, [method, range, realRecords, status]);
  const totals = React.useMemo(() => filteredData.reduce((total, record) => ({ volume: total.volume + record.volume, successfulVolume: total.successfulVolume + record.successfulVolume, failedVolume: total.failedVolume + record.failedVolume, refunds: total.refunds + record.refundVolume, successful: total.successful + record.successful, pending: total.pending + record.pending, failed: total.failed + record.failed, refunded: total.refunded + record.refunded, attempts: total.attempts + record.authorizationAttempts, authorized: total.authorized + record.authorized }), { volume: 0, successfulVolume: 0, failedVolume: 0, refunds: 0, successful: 0, pending: 0, failed: 0, refunded: 0, attempts: 0, authorized: 0 }), [filteredData]);
  const methods = (['Card', 'Bank Transfer', 'Wallet', 'Mobile Money'] as const).map((item) => { const rows = filteredData.filter((record) => record.method === item); return { method: item, volume: rows.reduce((sum, row) => sum + row.volume, 0), count: rows.reduce((sum, row) => sum + row.successful, 0), successRate: rows.length ? rows.reduce((sum, row) => sum + row.authorized, 0) / rows.reduce((sum, row) => sum + row.authorizationAttempts, 0) * 100 : 0 }; });
  const outcomes = [{ label: 'Successful', count: totals.successful, volume: totals.successfulVolume, tone: 'text-emerald-400' }, { label: 'Pending', count: totals.pending, volume: totals.volume - totals.successfulVolume - totals.failedVolume, tone: 'text-amber-400' }, { label: 'Failed', count: totals.failed, volume: totals.failedVolume, tone: 'text-red-400' }, { label: 'Refunded', count: totals.refunded, volume: totals.refunds, tone: 'text-blue-400' }];
  const visibleEvents: AnalyticsEvent[] = [];
  const chartData = filteredData.length ? filteredData : [{ date: 'No data', volume: 0, successfulVolume: 0, failedVolume: 0, refundVolume: 0 } as AnalyticsRecord];
  const authorizationRate = totals.attempts ? totals.authorized / totals.attempts * 100 : 0;
  const averageTransaction = totals.successful ? totals.volume / totals.successful : 0;
  const refundRate = totals.volume ? totals.refunds / totals.volume * 100 : 0;

  if (arc.loading || arc.error || !arc.address) return <PageContainer pageTitle='Payment Analytics' pageDescription='Understand payment performance, authorization trends, and customer payment behavior.'><Card><CardContent className='py-12 text-center'><p className='font-medium'>{arc.loading ? 'Loading Arc Testnet analytics...' : arc.error}</p><p className='text-muted-foreground mt-2 text-sm'>Connect an injected wallet on Arc Testnet to continue.</p></CardContent></Card></PageContainer>;

  function exportAnalytics(): void { const rows = filteredData.map((record) => [record.date, formatCurrency(record.volume), record.successful, record.failed, record.refunded, formatCurrency(record.volume - record.refundVolume)]); const csv = [['Date', 'Payment volume', 'Successful payments', 'Failed payments', 'Refunded payments', 'Net volume'], ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = 'arc-pay-payment-analytics.csv'; link.click(); URL.revokeObjectURL(url); toast.success('Analytics exported'); }

  return <PageContainer pageTitle='Payment Analytics' pageDescription='Understand payment performance, authorization trends, and customer payment behavior.' pageHeaderAction={<div className='flex flex-wrap items-center justify-end gap-2'><Select value={range} onValueChange={(value) => setRange(value as RangeFilter)}><SelectTrigger className='w-36' aria-label='Analytics date range'><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{RANGE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent></Select><Button variant={compare ? 'default' : 'outline'} aria-pressed={compare} onClick={() => setCompare((value) => !value)}><Icons.trendingUp data-icon='inline-start' />Compare</Button><Button variant='outline' onClick={exportAnalytics}><Icons.upload data-icon='inline-start' />Export</Button></div>}><div className='flex flex-col gap-6'><div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'><KpiCard label='Payment volume' value={formatCurrency(totals.volume)} change='+18.4%' description='Gross volume processed' /><KpiCard label='Successful payments' value={totals.successful.toLocaleString()} change='+12.8%' description='Authorized and captured' /><KpiCard label='Authorization rate' value={`${authorizationRate.toFixed(1)}%`} change='+1.7%' description={`${totals.authorized.toLocaleString()} authorized attempts`} /><KpiCard label='Average transaction' value={formatCurrency(averageTransaction)} change='+5.4%' description='Across successful payments' /><KpiCard label='Refund rate' value={`${refundRate.toFixed(1)}%`} change='-0.6%' description='Refunds as share of volume' negative /></div>

<div className='flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'><div><p className='font-medium'>Analytics filters</p><p className='text-muted-foreground text-xs'>Filters update the visible charts and operational data.</p></div><div className='grid grid-cols-1 gap-2 sm:grid-cols-2'><Select value={method} onValueChange={(value) => setMethod(value as MethodFilter)}><SelectTrigger aria-label='Filter analytics by payment method'><SelectValue placeholder='Payment method' /></SelectTrigger><SelectContent><SelectGroup>{METHOD_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All methods' : option}</SelectItem>)}</SelectGroup></SelectContent></Select><Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}><SelectTrigger aria-label='Filter analytics by payment status'><SelectValue placeholder='Payment status' /></SelectTrigger><SelectContent><SelectGroup>{STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</SelectItem>)}</SelectGroup></SelectContent></Select></div></div>

<PerformanceChart data={chartData} />

<div className='grid grid-cols-1 gap-4 xl:grid-cols-2'><Card><CardHeader><CardTitle>Performance comparison</CardTitle><CardDescription>{compare ? 'Current period compared with the previous period' : 'Comparison hidden'}</CardDescription></CardHeader><CardContent className='grid gap-3'>{compare ? <><ComparisonRow label='Payment volume' current={totals.volume} previous={108600} /><ComparisonRow label='Transaction count' current={totals.successful} previous={1138} format='number' /><ComparisonRow label='Authorization rate' current={authorizationRate} previous={96.6} format='percent' /><ComparisonRow label='Average transaction value' current={averageTransaction} previous={95.2} /><ComparisonRow label='Refund rate' current={refundRate} previous={3.4} format='percent' /><ComparisonRow label='Failed payment rate' current={totals.failed / Math.max(totals.attempts, 1) * 100} previous={2.8} format='percent' /></> : <p className='text-muted-foreground py-8 text-sm'>Enable Compare to see period-over-period changes.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Payment method performance</CardTitle><CardDescription>Volume share, count, success rate, and average value</CardDescription></CardHeader><CardContent className='grid gap-4'>{methods.map((item) => <div key={item.method} className='grid gap-2'><div className='flex justify-between gap-3 text-sm'><span className='font-medium'>{item.method}</span><span className='text-muted-foreground tabular-nums'>{formatCurrency(item.volume)} · {item.count} txns</span></div><div className='bg-muted h-2 rounded-full'><div className='bg-primary h-2 rounded-full' style={{ width: `${Math.max(2, item.volume / Math.max(totals.volume, 1) * 100)}%` }} /></div><div className='text-muted-foreground flex justify-between text-xs'><span>{item.successRate.toFixed(1)}% success</span><span>{formatCurrency(item.count ? item.volume / item.count : 0)} avg</span></div></div>)}</CardContent></Card></div>

<div className='grid grid-cols-1 gap-4 xl:grid-cols-2'><Card><CardHeader><CardTitle>Payment outcomes</CardTitle><CardDescription>Count, percentage, and volume by outcome</CardDescription></CardHeader><CardContent className='grid gap-3'>{outcomes.map((item) => <div key={item.label} className='flex items-center justify-between gap-3 rounded-lg border p-3'><div className='flex items-center gap-2'><span className={`size-2 rounded-full ${item.tone.replace('text-', 'bg-')}`} /><span className='font-medium'>{item.label}</span></div><span className={`${item.tone} text-right text-sm tabular-nums`}>{item.count} · {percent(item.count, totals.successful + totals.pending + totals.failed + totals.refunded)} · {formatCurrency(item.volume)}</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Authorization performance</CardTitle><CardDescription>Attempts and authorization quality</CardDescription></CardHeader><CardContent className='grid gap-3'><ComparisonRow label='Authorization rate' current={authorizationRate} previous={96.6} format='percent' /><ComparisonRow label='Authorization attempts' current={totals.attempts} previous={1460} format='number' /><ComparisonRow label='Authorized payments' current={totals.authorized} previous={1410} format='number' /><ComparisonRow label='Declined payments' current={totals.attempts - totals.authorized} previous={50} format='number' /><ComparisonRow label='Retry success rate' current={78.4} previous={74.2} format='percent' /></CardContent></Card></div>

<div className='grid grid-cols-1 gap-4 xl:grid-cols-2'><Card><CardHeader><CardTitle>Payment failure analysis</CardTitle><CardDescription>Derived failure reasons are not available from Arc transfer logs.</CardDescription></CardHeader><CardContent><p className='text-muted-foreground py-8 text-center text-sm'>No failure reason metadata is available on-chain.</p></CardContent></Card><Card><CardHeader><CardTitle>Customer payment behavior</CardTitle><CardDescription>Derived from real Arc Testnet counterparties</CardDescription></CardHeader><CardContent className='grid gap-3'><ComparisonRow label='Paying counterparties' current={new Set(arc.data?.map((record) => record.direction === 'Sent' ? record.to : record.from)).size} format='number' /><ComparisonRow label='Returning counterparties' current={0} format='number' /><ComparisonRow label='Repeat payment rate' current={0} format='percent' /><ComparisonRow label='Average counterparty volume' current={arc.data?.length ? arc.data.reduce((sum, record) => sum + record.amount, 0) / new Set(arc.data.map((record) => record.direction === 'Sent' ? record.to : record.from)).size : 0} /><div className='mt-2 rounded-lg border bg-muted/20 p-3 text-sm'><span className='text-muted-foreground'>Top counterparty</span><p className='mt-1 font-mono text-xs'>{arc.data?.length ? [...new Set(arc.data.map((record) => record.direction === 'Sent' ? record.to : record.from))][0] : 'Unavailable'}</p></div></CardContent></Card></div>

<div className='grid grid-cols-1 gap-4 xl:grid-cols-2'><Card><CardHeader><CardTitle>Payment activity by time</CardTitle><CardDescription>Peak and lowest activity windows</CardDescription></CardHeader><CardContent><ChartContainer config={{ volume: { label: 'Volume', color: 'var(--chart-1)' } }} className='h-[220px] min-h-[200px] w-full aspect-auto' initialDimension={{ width: 500, height: 220 }}><BarChart accessibilityLayer data={[{ hour: '8 AM', volume: 8200 }, { hour: '10 AM', volume: 14200 }, { hour: '12 PM', volume: 18600 }, { hour: '2 PM', volume: 22400 }, { hour: '4 PM', volume: 19800 }, { hour: '6 PM', volume: 11600 }]}><CartesianGrid vertical={false} strokeDasharray='3 3' /><XAxis dataKey='hour' tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value) => `$${Number(value) / 1000}k`} /><ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} /><Bar dataKey='volume' fill='var(--color-volume)' radius={4} /></BarChart></ChartContainer><p className='text-muted-foreground mt-3 text-xs'>Peak hour: 2 PM · Lowest hour: 8 AM · Highest-volume day: Friday</p></CardContent></Card><Card><CardHeader><CardTitle>Recent payment activity</CardTitle><CardDescription>Click a transaction to inspect the full payment record</CardDescription></CardHeader><CardContent><div className='grid gap-3'>{visibleEvents.map((event) => <button key={event.transaction.id} type='button' className='flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50' onClick={() => setSelectedTransaction(event.transaction)}><span className='text-muted-foreground w-16 shrink-0 text-xs'>{event.time}</span><span className='min-w-0 flex-1'><span className='block truncate font-mono text-xs font-medium'>{event.transaction.id}</span><span className='text-muted-foreground mt-1 block truncate text-xs'>{event.transaction.customer}</span></span><span className='shrink-0 text-right'><span className='block font-medium tabular-nums'>{formatCurrency(event.transaction.amount)}</span><Badge variant='outline' className={statusClassName(event.transaction.status)}>{event.transaction.status}</Badge></span></button>)}</div></CardContent></Card></div>
</div><Sheet open={selectedTransaction !== null} onOpenChange={(open) => !open && setSelectedTransaction(null)}><SheetContent className='z-[100] max-h-[100dvh] min-h-0 w-full overflow-hidden sm:max-w-lg'><SheetHeader className='shrink-0'><SheetTitle>Transaction Details</SheetTitle><SheetDescription>ARC Pay payment record and settlement information</SheetDescription></SheetHeader>{selectedTransaction && <TransactionDetails transaction={selectedTransaction} onCopy={() => void navigator.clipboard.writeText(selectedTransaction.id)} onRefund={() => toast.info('Refund actions are managed from the Refunds page.')} onDownload={() => toast.success('Transaction receipt ready')} onContact={() => toast.info(`Contact ${selectedTransaction.customer} at ${selectedTransaction.email}`)} copied={false} />}</SheetContent></Sheet></PageContainer>;
}
