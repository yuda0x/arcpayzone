'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useArcData } from '@/hooks/use-arc-data';
import type { ArcTransactionRecord } from '@/lib/arc-transactions';

const STATUS_OPTIONS = ['All', 'Succeeded', 'Pending', 'Failed', 'Refunded'] as const;
const METHOD_OPTIONS = ['All', 'Card', 'Bank Transfer', 'Wallet', 'Mobile Money'] as const;
const RANGE_OPTIONS = ['Last 7 days', 'Last 30 days', 'Last 90 days'] as const;
const REPORT_TYPES = ['Payments', 'Revenue', 'Settlements'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];
type MethodFilter = (typeof METHOD_OPTIONS)[number];
type RangeFilter = (typeof RANGE_OPTIONS)[number];
type ReportType = (typeof REPORT_TYPES)[number];

interface DailyRecord {
  date: string;
  paymentVolume: number;
  successful: number;
  pending: number;
  failed: number;
  refunded: number;
  refundVolume: number;
  netRevenue: number;
  method: Exclude<MethodFilter, 'All'>;
  status: Exclude<StatusFilter, 'All'>;
}

const _legacyDailyRecords: DailyRecord[] = [
  { date: 'Aug 06', paymentVolume: 8420, successful: 112, pending: 4, failed: 3, refunded: 2, refundVolume: 180, netRevenue: 8158, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 07', paymentVolume: 9840, successful: 128, pending: 5, failed: 2, refunded: 3, refundVolume: 240, netRevenue: 9504, method: 'Bank Transfer', status: 'Succeeded' },
  { date: 'Aug 08', paymentVolume: 7620, successful: 96, pending: 7, failed: 4, refunded: 1, refundVolume: 95, netRevenue: 7364, method: 'Wallet', status: 'Succeeded' },
  { date: 'Aug 09', paymentVolume: 11280, successful: 145, pending: 3, failed: 2, refunded: 4, refundVolume: 360, netRevenue: 10820, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 10', paymentVolume: 10640, successful: 138, pending: 6, failed: 3, refunded: 2, refundVolume: 175, netRevenue: 10290, method: 'Mobile Money', status: 'Succeeded' },
  { date: 'Aug 11', paymentVolume: 12480, successful: 161, pending: 4, failed: 2, refunded: 5, refundVolume: 420, netRevenue: 11940, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 12', paymentVolume: 11820, successful: 153, pending: 5, failed: 4, refunded: 3, refundVolume: 280, netRevenue: 11364, method: 'Bank Transfer', status: 'Succeeded' },
  { date: 'Aug 13', paymentVolume: 9360, successful: 121, pending: 8, failed: 3, refunded: 2, refundVolume: 160, netRevenue: 9038, method: 'Wallet', status: 'Pending' },
  { date: 'Aug 14', paymentVolume: 13140, successful: 172, pending: 4, failed: 2, refunded: 4, refundVolume: 310, netRevenue: 12620, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 15', paymentVolume: 14680, successful: 188, pending: 6, failed: 3, refunded: 5, refundVolume: 460, netRevenue: 13920, method: 'Mobile Money', status: 'Succeeded' },
  { date: 'Aug 16', paymentVolume: 10920, successful: 141, pending: 5, failed: 4, refunded: 2, refundVolume: 190, netRevenue: 10472, method: 'Bank Transfer', status: 'Failed' },
  { date: 'Aug 17', paymentVolume: 15360, successful: 197, pending: 3, failed: 2, refunded: 6, refundVolume: 520, netRevenue: 14680, method: 'Card', status: 'Succeeded' },
  { date: 'Aug 18', paymentVolume: 13840, successful: 179, pending: 7, failed: 3, refunded: 4, refundVolume: 350, netRevenue: 13260, method: 'Wallet', status: 'Succeeded' },
  { date: 'Aug 19', paymentVolume: 12840, successful: 176, pending: 8, failed: 2, refunded: 3, refundVolume: 200, netRevenue: 12310, method: 'Card', status: 'Succeeded' }
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function formatCurrency(value: number): string { return currency.format(value); }
function percentage(value: number, total: number): string { return total ? `${Math.round((value / total) * 100)}%` : '0%'; }

function buildDailyRecords(transactions: ArcTransactionRecord[]): DailyRecord[] {
  const grouped = new Map<string, DailyRecord>();
  transactions.forEach((record) => {
    const date = record.timestamp ? new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'Date unavailable';
    const current = grouped.get(date) ?? { date, paymentVolume: 0, successful: 0, pending: 0, failed: 0, refunded: 0, refundVolume: 0, netRevenue: 0, method: 'Wallet', status: record.status === 'Confirmed' ? 'Succeeded' : 'Failed' };
    current.paymentVolume += record.amount;
    current.netRevenue += record.status === 'Confirmed' ? record.amount : 0;
    if (record.status === 'Confirmed') current.successful += 1;
    else current.failed += 1;
    grouped.set(date, current);
  });
  return [...grouped.values()].toSorted((a, b) => a.date.localeCompare(b.date));
}

const chartConfig = {
  paymentVolume: { label: 'Payment volume', color: 'var(--chart-1)' },
  successful: { label: 'Successful payments', color: 'var(--chart-3)' },
  refundVolume: { label: 'Refund volume', color: 'var(--chart-2)' }
} satisfies ChartConfig;

function MetricCard({ label, value, change, tone = 'positive' }: { label: string; value: string; change: string; tone?: 'positive' | 'negative' }) {
  return <Card><CardHeader className='pb-2'><CardDescription>{label}</CardDescription><div className='flex items-center justify-between gap-2'><CardTitle className='text-2xl tabular-nums'>{value}</CardTitle><Badge variant='outline' className={tone === 'positive' ? 'text-emerald-400' : 'text-red-400'}>{tone === 'positive' ? <Icons.trendingUp /> : <Icons.trendingDown />}{change}</Badge></div></CardHeader><CardContent><p className='text-muted-foreground text-xs'>vs previous period</p></CardContent></Card>;
}

function ReportChart({ data }: { data: DailyRecord[] }) {
  return <Card><CardHeader><CardTitle>Payment performance</CardTitle><CardDescription>Volume, successful payments, and refunds for the selected period</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className='h-[320px] min-h-[280px] w-full aspect-auto' initialDimension={{ width: 640, height: 320 }}><AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 10, top: 10 }}><defs><linearGradient id='report-volume-fill' x1='0' y1='0' x2='0' y2='1'><stop offset='5%' stopColor='var(--color-paymentVolume)' stopOpacity={0.35} /><stop offset='95%' stopColor='var(--color-paymentVolume)' stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray='3 3' /><XAxis dataKey='date' tickLine={false} axisLine={false} tickMargin={8} /><YAxis yAxisId='volume' tickLine={false} axisLine={false} width={52} tickFormatter={(value) => `$${Number(value) / 1000}k`} /><YAxis yAxisId='count' orientation='right' tickLine={false} axisLine={false} width={36} /><ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [name === 'successful' ? `${value} payments` : formatCurrency(Number(value)), name]} />} /><Area yAxisId='volume' dataKey='paymentVolume' type='monotone' fill='url(#report-volume-fill)' stroke='var(--color-paymentVolume)' strokeWidth={2} /><Area yAxisId='volume' dataKey='refundVolume' type='monotone' fill='none' stroke='var(--color-refundVolume)' strokeWidth={2} strokeDasharray='5 5' /><Area yAxisId='count' dataKey='successful' type='monotone' fill='none' stroke='var(--color-successful)' strokeWidth={2} /></AreaChart></ChartContainer><div className='mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs'><span className='flex items-center gap-2'><span className='size-2 rounded-full bg-[var(--chart-1)]' />Payment volume</span><span className='flex items-center gap-2'><span className='size-2 rounded-full bg-[var(--chart-3)]' />Successful payments</span><span className='flex items-center gap-2'><span className='size-2 rounded-full bg-[var(--chart-2)]' />Refund volume</span></div></CardContent></Card>;
}

function BreakdownBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  return <div className='grid gap-2'><div className='flex justify-between gap-3 text-sm'><span>{label}</span><span className='font-medium tabular-nums'>{formatCurrency(value)}</span></div><div className='bg-muted h-2 overflow-hidden rounded-full'><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(4, Math.min(100, (value / total) * 100))}%` }} /></div></div>;
}

export default function ReportsPage() {
  const arc = useArcData<ArcTransactionRecord[]>('/api/reports', 'transactions');
  const [range, setRange] = React.useState<RangeFilter>('Last 30 days');
  const [reportType, setReportType] = React.useState<ReportType>('Payments');
  const [method, setMethod] = React.useState<MethodFilter>('All');
  const [status, setStatus] = React.useState<StatusFilter>('All');
  const [page, setPage] = React.useState(1);
  const realDailyRecords = React.useMemo(() => buildDailyRecords(arc.data ?? []), [arc.data]);

  const filteredData = React.useMemo(() => {
    const rangeSize = range === 'Last 7 days' ? 7 : realDailyRecords.length;
    return realDailyRecords.slice(-rangeSize).filter((record) => (method === 'All' || record.method === method) && (status === 'All' || record.status === status));
  }, [method, range, realDailyRecords, status]);
  const totalVolume = filteredData.reduce((sum, record) => sum + record.paymentVolume, 0);
  const totalRefunds = filteredData.reduce((sum, record) => sum + record.refundVolume, 0);
  const totalSuccessful = filteredData.reduce((sum, record) => sum + record.successful, 0);
  const totalFailed = filteredData.reduce((sum, record) => sum + record.failed, 0);
  const totalPending = filteredData.reduce((sum, record) => sum + record.pending, 0);
  const totalRefunded = filteredData.reduce((sum, record) => sum + record.refunded, 0);
  const processingFees = 0;
  const otherFees = 0;
  const netRevenue = totalVolume - processingFees - otherFees - totalRefunds;
  const pageCount = Math.max(1, Math.ceil(filteredData.length / 7));
  const visibleData = filteredData.slice((page - 1) * 7, page * 7);
  const methodRows = (['Card', 'Bank Transfer', 'Wallet', 'Mobile Money'] as const).map((item) => ({ method: item, volume: filteredData.filter((record) => record.method === item).reduce((sum, record) => sum + record.paymentVolume, 0), count: filteredData.filter((record) => record.method === item).reduce((sum, record) => sum + record.successful, 0) }));
  const statusRows = [{ label: 'Successful', value: totalSuccessful, tone: 'text-emerald-400' }, { label: 'Pending', value: totalPending, tone: 'text-amber-400' }, { label: 'Failed', value: totalFailed, tone: 'text-red-400' }, { label: 'Refunded', value: totalRefunded, tone: 'text-blue-400' }];

  function resetPage(): void { setPage(1); }
  function exportReport(): void { const header = ['Date', 'Payment volume', 'Successful', 'Failed', 'Refunds', 'Net revenue']; const rows = filteredData.map((record) => [record.date, formatCurrency(record.paymentVolume), record.successful, record.failed, record.refunded, formatCurrency(record.netRevenue)]); const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = 'arc-pay-report.csv'; link.click(); URL.revokeObjectURL(url); toast.success('Report exported'); }

  if (arc.loading || arc.error || !arc.address) return <PageContainer pageTitle='Reports' pageDescription='Analyze payment performance, revenue, refunds, and settlement activity.'><Card><CardContent className='py-12 text-center'><p className='font-medium'>{arc.loading ? 'Loading Arc Testnet report data...' : arc.error}</p><p className='text-muted-foreground mt-2 text-sm'>Connect an injected wallet on Arc Testnet to continue.</p></CardContent></Card></PageContainer>;

  return <PageContainer pageTitle='Reports' pageDescription='Analyze payment performance, revenue, refunds, and settlement activity.' pageHeaderAction={<div className='flex items-center gap-2'><Select value={range} onValueChange={(value) => { setRange(value as RangeFilter); resetPage(); }}><SelectTrigger className='hidden w-36 sm:flex' aria-label='Report date range'><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{RANGE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent></Select><Button variant='outline' onClick={exportReport}><Icons.upload data-icon='inline-start' />Export report</Button></div>}><div className='flex flex-col gap-6'><div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'><MetricCard label='Total processed volume' value={formatCurrency(totalVolume)} change='On-chain' /><MetricCard label='Successful transactions' value={totalSuccessful.toLocaleString()} change='On-chain' /><MetricCard label='Refunds' value={formatCurrency(totalRefunds)} change='On-chain' tone='negative' /><MetricCard label='Net revenue' value={formatCurrency(netRevenue)} change='On-chain' /></div>

<div className='flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'><div><p className='font-medium'>Report filters</p><p className='text-muted-foreground text-xs'>Adjust the period and focus of the report.</p></div><div className='grid grid-cols-1 gap-2 sm:grid-cols-4'><Select value={range} onValueChange={(value) => { setRange(value as RangeFilter); resetPage(); }}><SelectTrigger className='w-full sm:hidden' aria-label='Report date range mobile'><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{RANGE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent></Select><Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}><SelectTrigger aria-label='Select report type'><SelectValue placeholder='Report type' /></SelectTrigger><SelectContent><SelectGroup>{REPORT_TYPES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent></Select><Select value={method} onValueChange={(value) => { setMethod(value as MethodFilter); resetPage(); }}><SelectTrigger aria-label='Filter by payment method'><SelectValue placeholder='Payment method' /></SelectTrigger><SelectContent><SelectGroup>{METHOD_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All methods' : option}</SelectItem>)}</SelectGroup></SelectContent></Select><Select value={status} onValueChange={(value) => { setStatus(value as StatusFilter); resetPage(); }}><SelectTrigger aria-label='Filter by transaction status'><SelectValue placeholder='Status' /></SelectTrigger><SelectContent><SelectGroup>{STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</SelectItem>)}</SelectGroup></SelectContent></Select></div></div>

<ReportChart data={filteredData} />

<div className='grid grid-cols-1 gap-4 xl:grid-cols-2'><Card><CardHeader><CardTitle>Payment method performance</CardTitle><CardDescription>Volume, count, and share of filtered activity</CardDescription></CardHeader><CardContent className='grid gap-5'>{methodRows.map((row) => <div key={row.method} className='grid gap-2'><div className='flex items-center justify-between gap-3 text-sm'><span className='font-medium'>{row.method}</span><span className='text-muted-foreground tabular-nums'>{formatCurrency(row.volume)} · {row.count} transactions · {percentage(row.volume, totalVolume)}</span></div><div className='bg-muted h-2 overflow-hidden rounded-full'><div className='bg-primary h-full rounded-full' style={{ width: `${Math.max(2, (row.volume / Math.max(totalVolume, 1)) * 100)}%` }} /></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Transaction status</CardTitle><CardDescription>Count and percentage of filtered activity</CardDescription></CardHeader><CardContent className='grid gap-3'>{statusRows.map((row) => <div key={row.label} className='flex items-center justify-between gap-3 rounded-lg border p-3'><div className='flex items-center gap-2'><span className={`size-2 rounded-full ${row.tone.replace('text-', 'bg-')}`} /><span className='font-medium'>{row.label}</span></div><span className={`tabular-nums ${row.tone}`}>{row.value} · {percentage(row.value, totalSuccessful + totalPending + totalFailed + totalRefunded)}</span></div>)}</CardContent></Card></div>

<Card><CardHeader><CardTitle>Revenue breakdown</CardTitle><CardDescription>How gross payment volume becomes net revenue</CardDescription></CardHeader><CardContent className='grid gap-4 sm:grid-cols-2'><div className='grid gap-4'><BreakdownBar label='Gross payment volume' value={totalVolume} total={totalVolume} tone='bg-primary' /><BreakdownBar label='ARC Pay processing fees' value={processingFees} total={totalVolume} tone='bg-amber-400' /><BreakdownBar label='Other fees' value={otherFees} total={totalVolume} tone='bg-muted-foreground' /><BreakdownBar label='Refunds' value={totalRefunds} total={totalVolume} tone='bg-red-400' /></div><div className='flex flex-col justify-center rounded-lg border bg-muted/20 p-5'><p className='text-muted-foreground text-sm'>Net revenue</p><p className='mt-2 text-3xl font-semibold tabular-nums'>{formatCurrency(netRevenue)}</p><p className='text-muted-foreground mt-2 text-xs'>After fees and refunds for the selected report period</p></div></CardContent></Card>

<Card><CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'><div><CardTitle>Daily performance</CardTitle><CardDescription className='mt-1'>Daily report data for the active filters</CardDescription></div><span className='text-muted-foreground text-sm'>Page {page} of {pageCount}</span></CardHeader><CardContent className='pt-6'><div className='overflow-x-auto rounded-lg border'><Table className='min-w-[760px]'><TableHeader><TableRow className='bg-muted/50 hover:bg-muted/50'><TableHead>Date</TableHead><TableHead>Payment volume</TableHead><TableHead>Successful</TableHead><TableHead>Failed</TableHead><TableHead>Refunds</TableHead><TableHead>Net revenue</TableHead></TableRow></TableHeader><TableBody>{visibleData.length ? visibleData.map((record) => <TableRow key={record.date}><TableCell className='font-medium'>{record.date}</TableCell><TableCell className='tabular-nums'>{formatCurrency(record.paymentVolume)}</TableCell><TableCell className='text-emerald-400 tabular-nums'>{record.successful}</TableCell><TableCell className='text-red-400 tabular-nums'>{record.failed}</TableCell><TableCell className='text-blue-400 tabular-nums'>{record.refunded} · {formatCurrency(record.refundVolume)}</TableCell><TableCell className='font-medium tabular-nums'>{formatCurrency(record.netRevenue)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className='h-24 text-center'>No report data for these filters.</TableCell></TableRow>}</TableBody></Table></div><div className='mt-4 flex items-center justify-between gap-3'><p className='text-muted-foreground text-sm'>{filteredData.length} days in report</p><div className='flex items-center gap-2'><Button variant='outline' size='icon' aria-label='Previous report page' disabled={page === 1} onClick={() => setPage((current) => current - 1)}><Icons.chevronLeft /></Button><Button variant='outline' size='icon' aria-label='Next report page' disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}><Icons.chevronRight /></Button></div></div></CardContent></Card>
</div></PageContainer>;
}
