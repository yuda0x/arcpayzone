'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useArcData } from '@/hooks/use-arc-data';

const PAGE_SIZE = 8;
const STATUS_OPTIONS = ['All', 'Active', 'Inactive', 'Review'] as const;
type CustomerStatus = (typeof STATUS_OPTIONS)[number];
type CustomerRecordStatus = Exclude<CustomerStatus, 'All'>;

const _transactionCustomerIds: Record<string, string> = {
  'CUS-ARC-0248': 'cus_arcade_0248',
  'CUS-NORTH-1190': 'cus_northstar_1190',
  'CUS-MORROW-0317': 'cus_morrow_0317',
  'CUS-BRIGHT-0881': 'cus_brightline_0881',
  'CUS-PINE-4420': 'cus_pine_4420',
  'CUS-CEDAR-2054': 'cus_cedar_2054',
  'CUS-LUMEN-7103': 'cus_lumen_7103',
  'CUS-MONUMENT-6002': 'cus_monument_6002',
  'CUS-KORA-8034': 'cus_kora_8034',
  'CUS-ATLAS-9011': 'cus_atlas_9011'
};

interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: 'Succeeded' | 'Pending' | 'Failed' | 'Refunded';
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
  status: CustomerRecordStatus;
  totalPayments: number;
  totalVolume: number;
  lastPayment: string;
  createdAt: string;
  history: PaymentHistoryItem[];
}

const _legacyCustomers: Customer[] = [
  {
    id: 'CUS-ARC-0248',
    name: 'Arcade Supply Co.',
    email: 'finance@arcadesupply.co',
    phone: '+234 803 440 2188',
    billingAddress: '14 Market Street, Lagos, NG',
    status: 'Active',
    totalPayments: 48,
    totalVolume: 18420.62,
    lastPayment: 'Aug 19, 2026',
    createdAt: 'Jan 12, 2026',
    history: [
      { id: 'PAY-8F42A91C', date: 'Aug 19, 2026', amount: 1240, method: 'Visa ending 4242', status: 'Succeeded' },
      { id: 'PAY-7C18E20A', date: 'Aug 12, 2026', amount: 890.5, method: 'Bank Transfer', status: 'Succeeded' },
      { id: 'PAY-5B29A11D', date: 'Jul 28, 2026', amount: 420, method: 'Apple Pay', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-NORTH-1190',
    name: 'Northstar Studio',
    email: 'billing@northstar.studio',
    phone: '+1 416 555 0190',
    billingAddress: '220 King Street, Toronto, CA',
    status: 'Active',
    totalPayments: 31,
    totalVolume: 12680.4,
    lastPayment: 'Aug 19, 2026',
    createdAt: 'Feb 03, 2026',
    history: [
      { id: 'PAY-7D19B4EE', date: 'Aug 19, 2026', amount: 860.5, method: 'GTBank ending 2081', status: 'Pending' },
      { id: 'PAY-6D02A4CC', date: 'Aug 04, 2026', amount: 1260, method: 'Visa ending 7181', status: 'Succeeded' },
      { id: 'PAY-4A18C9F1', date: 'Jul 11, 2026', amount: 520, method: 'Wallet', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-MORROW-0317',
    name: 'Morrow Market',
    email: 'payables@morrow.market',
    phone: '+233 244 810 932',
    billingAddress: '8 Palm Avenue, Accra, GH',
    status: 'Review',
    totalPayments: 16,
    totalVolume: 4840.75,
    lastPayment: 'Aug 19, 2026',
    createdAt: 'Mar 18, 2026',
    history: [
      { id: 'PAY-6C27E8A0', date: 'Aug 19, 2026', amount: 320, method: 'Mastercard ending 1189', status: 'Failed' },
      { id: 'PAY-3E19B2D8', date: 'Aug 01, 2026', amount: 645, method: 'Mobile Money', status: 'Succeeded' },
      { id: 'PAY-1B20D7A1', date: 'Jul 17, 2026', amount: 220, method: 'Visa ending 2288', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-BRIGHT-0881',
    name: 'Brightline Goods',
    email: 'ops@brightlinegoods.com',
    phone: '+254 711 882 104',
    billingAddress: '72 Oxford Road, Nairobi, KE',
    status: 'Active',
    totalPayments: 72,
    totalVolume: 29340.12,
    lastPayment: 'Aug 19, 2026',
    createdAt: 'Nov 21, 2025',
    history: [
      { id: 'PAY-5A03C7F2', date: 'Aug 19, 2026', amount: 145, method: 'Apple Pay', status: 'Refunded' },
      { id: 'PAY-4B20D1A6', date: 'Aug 15, 2026', amount: 780, method: 'Visa ending 9012', status: 'Succeeded' },
      { id: 'PAY-2F80C4E2', date: 'Aug 02, 2026', amount: 1120, method: 'Wallet', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-PINE-4420',
    name: 'Pine & Parcel',
    email: 'hello@pineandparcel.com',
    phone: '+256 772 114 620',
    billingAddress: '5 Rose Lane, Kampala, UG',
    status: 'Active',
    totalPayments: 22,
    totalVolume: 6420.9,
    lastPayment: 'Aug 19, 2026',
    createdAt: 'Apr 09, 2026',
    history: [
      { id: 'PAY-4B88D2C1', date: 'Aug 19, 2026', amount: 78.25, method: 'MTN MoMo ending 7742', status: 'Succeeded' },
      { id: 'PAY-2B91C8D3', date: 'Aug 10, 2026', amount: 325, method: 'Wallet', status: 'Succeeded' },
      { id: 'PAY-1D44E2A0', date: 'Jul 29, 2026', amount: 185, method: 'Visa ending 7742', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-CEDAR-2054',
    name: 'Cedar House',
    email: 'accounts@cedarhouse.io',
    phone: '+1 512 555 0118',
    billingAddress: '31 Cedar Lane, Austin, US',
    status: 'Active',
    totalPayments: 39,
    totalVolume: 38460.2,
    lastPayment: 'Aug 18, 2026',
    createdAt: 'Dec 14, 2025',
    history: [
      { id: 'PAY-3E61A90D', date: 'Aug 18, 2026', amount: 2490, method: 'Access Bank ending 6230', status: 'Succeeded' },
      { id: 'PAY-2C77A119', date: 'Aug 05, 2026', amount: 1980, method: 'Bank Transfer', status: 'Succeeded' },
      { id: 'PAY-9D14B8E0', date: 'Jul 21, 2026', amount: 940, method: 'Mastercard ending 3301', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-LUMEN-7103',
    name: 'Lumen Health',
    email: 'billing@lumenhealth.africa',
    phone: '+44 20 7946 0182',
    billingAddress: '19 Broad Street, London, GB',
    status: 'Review',
    totalPayments: 12,
    totalVolume: 3160.35,
    lastPayment: 'Aug 18, 2026',
    createdAt: 'Aug 18, 2026',
    history: [
      { id: 'PAY-2F74C6B8', date: 'Aug 18, 2026', amount: 640.75, method: 'Visa ending 9012', status: 'Pending' },
      { id: 'PAY-1E42B7D0', date: 'Aug 18, 2026', amount: 210, method: 'Visa ending 9012', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-MONUMENT-6002',
    name: 'Monument Labs',
    email: 'pay@monumentlabs.dev',
    phone: '+1 415 555 0174',
    billingAddress: '400 Howard Street, San Francisco, US',
    status: 'Inactive',
    totalPayments: 9,
    totalVolume: 2980,
    lastPayment: 'Jul 12, 2026',
    createdAt: 'May 02, 2026',
    history: [
      { id: 'PAY-1A52E9F4', date: 'Jul 12, 2026', amount: 980, method: 'Google Pay', status: 'Succeeded' },
      { id: 'PAY-8C11B2A9', date: 'Jun 28, 2026', amount: 420, method: 'Visa ending 5510', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-KORA-8034',
    name: 'Kora Events',
    email: 'accounts@koraevents.com',
    phone: '+233 302 440 892',
    billingAddress: '6 Ring Road, Accra, GH',
    status: 'Review',
    totalPayments: 7,
    totalVolume: 1980.2,
    lastPayment: 'Aug 18, 2026',
    createdAt: 'Jun 19, 2026',
    history: [
      { id: 'PAY-0D31B7AA', date: 'Aug 18, 2026', amount: 312.4, method: 'Airtel Money ending 4201', status: 'Failed' },
      { id: 'PAY-7D12A0E1', date: 'Aug 03, 2026', amount: 510, method: 'Mobile Money', status: 'Succeeded' }
    ]
  },
  {
    id: 'CUS-ATLAS-9011',
    name: 'Atlas Learning',
    email: 'billing@atlaslearning.org',
    phone: '+254 700 331 406',
    billingAddress: '3 Learning Way, Nairobi, KE',
    status: 'Active',
    totalPayments: 54,
    totalVolume: 49220.65,
    lastPayment: 'Aug 16, 2026',
    createdAt: 'Oct 25, 2025',
    history: [
      { id: 'PAY-7B06D3E1', date: 'Aug 16, 2026', amount: 4200, method: 'UBA ending 1184', status: 'Succeeded' },
      { id: 'PAY-6A10E3B2', date: 'Aug 02, 2026', amount: 2100, method: 'Bank Transfer', status: 'Succeeded' },
      { id: 'PAY-3C18A2F4', date: 'Jul 14, 2026', amount: 880, method: 'Wallet', status: 'Succeeded' }
    ]
  }
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(value: number): string {
  return currency.format(value);
}

async function copyCustomerId(customerId: string) {
  await navigator.clipboard.writeText(customerId);
  toast.success('Customer ID copied');
}

function statusClassName(status: CustomerRecordStatus | PaymentHistoryItem['status']): string {
  switch (status) {
    case 'Active':
    case 'Succeeded': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'Review':
    case 'Pending': return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'Inactive':
    case 'Refunded': return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    case 'Failed': return 'border-red-500/30 bg-red-500/10 text-red-400';
  }
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <Card><CardHeader className='pb-2'><CardDescription>{label}</CardDescription><CardTitle className='text-2xl tabular-nums'>{value}</CardTitle></CardHeader><CardContent><p className='text-muted-foreground text-xs'>{note}</p></CardContent></Card>;
}

function CustomerDetails({
  customer,
  onCopy,
  onViewTransactions,
  onContact
}: {
  customer: Customer;
  onCopy: () => void;
  onViewTransactions: () => void;
  onContact: () => void;
}) {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(8rem+env(safe-area-inset-bottom))]'>
      <div className='flex flex-col gap-5'>
        <div className='rounded-xl border bg-muted/20 p-4'>
          <div className='flex items-start justify-between gap-3'>
            <div><p className='text-muted-foreground text-xs uppercase tracking-wider'>Customer</p><h3 className='mt-1 text-lg font-semibold'>{customer.name}</h3><p className='text-muted-foreground mt-1 text-sm'>{customer.email}</p></div>
            <Badge variant='outline' className={statusClassName(customer.status)}>{customer.status}</Badge>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-3 border-t pt-3'><div><p className='text-muted-foreground text-xs'>Total volume</p><p className='mt-1 font-semibold tabular-nums'>{formatCurrency(customer.totalVolume)}</p></div><div><p className='text-muted-foreground text-xs'>Payments</p><p className='mt-1 font-semibold tabular-nums'>{customer.totalPayments}</p></div></div>
        </div>

        <div className='grid gap-3 rounded-xl border p-4'>
          <div className='flex items-center gap-2'><Icons.account className='text-primary' /><h3 className='font-semibold'>Customer profile</h3></div>
          <div className='grid gap-3 text-sm'><div className='flex justify-between gap-4 border-b pb-3'><span className='text-muted-foreground'>Customer ID</span><span className='font-mono text-xs'>{customer.id}</span></div><div className='flex justify-between gap-4 border-b pb-3'><span className='text-muted-foreground'>Email</span><span className='max-w-[65%] text-right font-medium'>{customer.email}</span></div><div className='flex justify-between gap-4 border-b pb-3'><span className='text-muted-foreground'>Phone</span><span className='font-medium'>{customer.phone}</span></div><div className='flex justify-between gap-4'><span className='text-muted-foreground'>Billing address</span><span className='max-w-[65%] text-right font-medium'>{customer.billingAddress}</span></div></div>
        </div>

        <div className='grid gap-3 rounded-xl border p-4'>
          <h3 className='font-semibold'>Payment activity</h3>
          <div className='grid gap-3 text-sm'><div className='flex justify-between gap-4 border-b pb-3'><span className='text-muted-foreground'>Account status</span><Badge variant='outline' className={statusClassName(customer.status)}>{customer.status}</Badge></div><div className='flex justify-between gap-4 border-b pb-3'><span className='text-muted-foreground'>Total volume</span><span className='font-medium tabular-nums'>{formatCurrency(customer.totalVolume)}</span></div><div className='flex justify-between gap-4 border-b pb-3'><span className='text-muted-foreground'>Number of payments</span><span className='font-medium tabular-nums'>{customer.totalPayments}</span></div><div className='flex justify-between gap-4'><span className='text-muted-foreground'>Last payment</span><span className='font-medium'>{customer.lastPayment}</span></div></div>
        </div>

        <div className='grid gap-3 rounded-xl border p-4'><h3 className='font-semibold'>Recent payment history</h3><div className='grid gap-4'>{customer.history.map((payment) => <div key={payment.id} className='flex items-center gap-3'><div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full'><Icons.creditCard /></div><div className='min-w-0 flex-1'><p className='truncate font-mono text-xs font-medium'>{payment.id}</p><p className='text-muted-foreground mt-1 truncate text-xs'>{payment.date} · {payment.method}</p></div><div className='flex shrink-0 flex-col items-end gap-1'><span className='font-medium tabular-nums'>{formatCurrency(payment.amount)}</span><Badge variant='outline' className={statusClassName(payment.status)}>{payment.status}</Badge></div></div>)}</div></div>

        <div className='grid gap-3 rounded-xl border p-4'><div><h3 className='font-semibold'>Actions</h3><p className='text-muted-foreground mt-1 text-xs'>Manage this customer relationship.</p></div><div className='grid gap-2 sm:grid-cols-2'><Button variant='outline' className='h-10 justify-start' onClick={onCopy}><Icons.fileTypeDoc data-icon='inline-start' />Copy customer ID</Button><Button variant='outline' className='h-10 justify-start' onClick={onViewTransactions}><Icons.page data-icon='inline-start' />View transactions</Button><Button variant='outline' className='h-10 justify-start sm:col-span-2' onClick={onContact}><Icons.send data-icon='inline-start' />Contact customer</Button></div></div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const arc = useArcData<Array<{ address: string; count: number; volume: number; lastActivity: string | null }>>('/api/customers', 'customers');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<CustomerStatus>('All');
  const [date, setDate] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [contactCustomer, setContactCustomer] = React.useState<Customer | null>(null);
  const realCustomers = React.useMemo(() => (arc.data ?? []).map((record): Customer => ({
    id: record.address,
    name: record.address,
    email: 'On-chain address',
    phone: 'Not available on-chain',
    billingAddress: 'Not available on-chain',
    status: 'Active',
    totalPayments: record.count,
    totalVolume: record.volume,
    lastPayment: record.lastActivity ? new Date(record.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unavailable',
    createdAt: record.lastActivity ? new Date(record.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unavailable',
    history: []
  })), [arc.data]);
  const totalVolume = realCustomers.reduce((sum, customer) => sum + customer.totalVolume, 0);

  const customerFilter = searchParams.get('customer')?.trim() ?? '';
  const customerFilterRecord = realCustomers.find((customer) => customer.id.toLowerCase() === customerFilter.toLowerCase());

  const filteredCustomers = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const formattedDate = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return realCustomers.filter((customer) => {
      const matchesSearch = !query || [customer.name, customer.email, customer.id].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'All' || customer.status === status;
      const matchesDate = !date || customer.createdAt.includes(formattedDate);
      const matchesCustomer = !customerFilter || customer.id.toLowerCase() === customerFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesDate && matchesCustomer;
    });
  }, [customerFilter, date, realCustomers, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const visibleCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Boolean(search || date || status !== 'All');

  if (arc.loading || arc.error || !arc.address) {
    return <PageContainer pageTitle='Customers' pageDescription='Manage customers and review their payment activity.'><Card><CardContent className='py-12 text-center'><p className='font-medium'>{arc.loading ? 'Loading Arc Testnet customers...' : arc.error}</p><p className='text-muted-foreground mt-2 text-sm'>Connect an injected wallet on Arc Testnet to continue.</p></CardContent></Card></PageContainer>;
  }

  function resetPage() { setPage(1); }
  function clearFilters() { setSearch(''); setStatus('All'); setDate(''); resetPage(); }

  function clearCustomerFilter() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('customer');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    resetPage();
  }

  return (
    <PageContainer pageTitle='Customers' pageDescription='Manage customers and review their payment activity.'>
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <MetricCard label='Total Customers' value={realCustomers.length.toLocaleString()} note='Unique Arc Testnet counterparties' />
          <MetricCard label='Active Customers' value={realCustomers.length.toLocaleString()} note='Counterparties with confirmed activity' />
          <MetricCard label='New Customers' value='Unavailable' note='Customer creation is not available on-chain' />
          <MetricCard label='Total Customer Volume' value={formatCurrency(totalVolume)} note='Confirmed Arc Testnet volume' />
        </div>

        <Card>
          <CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'><div><CardTitle>All customers</CardTitle><CardDescription className='mt-1'>Customers connected to your ARC Pay account.</CardDescription></div><span className='text-muted-foreground text-sm tabular-nums'>{filteredCustomers.length} result{filteredCustomers.length === 1 ? '' : 's'}</span></CardHeader>
          <CardContent className='flex flex-col gap-4 pt-6'>
            <div className='flex flex-col gap-3 xl:flex-row'><div className='relative min-w-0 flex-1'><Icons.search className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2' /><Input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder='Search name, email, or customer ID...' className='pl-9' aria-label='Search customers' /></div><div className='flex flex-col gap-3 sm:flex-row'><Select value={status} onValueChange={(value) => { setStatus(value as CustomerStatus); resetPage(); }}><SelectTrigger className='w-full sm:w-40'><SelectValue placeholder='Status' /></SelectTrigger><SelectContent><SelectGroup>{STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</SelectItem>)}</SelectGroup></SelectContent></Select><Input type='date' value={date} onChange={(event) => { setDate(event.target.value); resetPage(); }} className='w-full sm:w-40' aria-label='Filter customers by date' /></div>{hasActiveFilters && <Button variant='ghost' onClick={clearFilters} className='shrink-0'><Icons.close data-icon='inline-start' />Clear filters</Button>}</div>
            {customerFilter && <div className='flex items-center gap-2'><Badge variant='outline' className='gap-1.5 py-1 pl-2.5 pr-1.5'><span>Customer: {customerFilterRecord?.name ?? customerFilter}</span><Button variant='ghost' size='icon-xs' aria-label='Clear customer filter' onClick={clearCustomerFilter}><Icons.close /></Button></Badge></div>}

            <div className='overflow-x-auto rounded-lg border'><Table className='min-w-[950px]'><TableHeader><TableRow className='bg-muted/50 hover:bg-muted/50'><TableHead>Customer</TableHead><TableHead>Customer ID</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Total Payments</TableHead><TableHead>Total Volume</TableHead><TableHead>Last Payment</TableHead><TableHead className='w-12'>Actions</TableHead></TableRow></TableHeader><TableBody>{visibleCustomers.length ? visibleCustomers.map((customer) => <TableRow key={customer.id} className='cursor-pointer' tabIndex={0} onClick={() => setSelectedCustomer(customer)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedCustomer(customer); } }}><TableCell><div className='font-medium'>{customer.name}</div><div className='text-muted-foreground mt-1 text-xs'>{customer.phone}</div></TableCell><TableCell className='font-mono text-xs'>{customer.id}</TableCell><TableCell className='text-sm'>{customer.email}</TableCell><TableCell><Badge variant='outline' className={statusClassName(customer.status)}>{customer.status}</Badge></TableCell><TableCell className='tabular-nums'>{customer.totalPayments}</TableCell><TableCell className='font-medium tabular-nums'>{formatCurrency(customer.totalVolume)}</TableCell><TableCell className='text-muted-foreground text-sm'>{customer.lastPayment}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label={`Actions for ${customer.name}`} onClick={(event) => event.stopPropagation()} />}><Icons.ellipsis /></DropdownMenuTrigger><DropdownMenuContent align='end'><DropdownMenuItem onClick={() => setSelectedCustomer(customer)}><Icons.page />View details</DropdownMenuItem><DropdownMenuItem onClick={() => void copyCustomerId(customer.id)}><Icons.fileTypeDoc />Copy customer ID</DropdownMenuItem><DropdownMenuItem onClick={() => setContactCustomer(customer)}><Icons.send />Contact customer</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>) : <TableRow><TableCell colSpan={8} className='h-32 text-center'><p className='font-medium'>No customers found</p><p className='text-muted-foreground mt-1 text-sm'>Try adjusting your search or filters.</p></TableCell></TableRow>}</TableBody></Table></div>

            <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'><p className='text-muted-foreground text-sm'>Showing {filteredCustomers.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}</p><div className='flex items-center gap-2'><Button variant='outline' size='icon' aria-label='Previous page' disabled={page === 1} onClick={() => setPage((current) => current - 1)}><Icons.chevronLeft /></Button><span className='text-muted-foreground min-w-16 text-center text-sm'>Page {page} of {pageCount}</span><Button variant='outline' size='icon' aria-label='Next page' disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}><Icons.chevronRight /></Button></div></div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={selectedCustomer !== null} onOpenChange={(open) => !open && setSelectedCustomer(null)}><SheetContent className='z-[100] max-h-[100dvh] min-h-0 w-full overflow-hidden sm:max-w-lg'><SheetHeader className='shrink-0'><SheetTitle>Customer Details</SheetTitle><SheetDescription>ARC Pay customer profile and payment activity</SheetDescription></SheetHeader>{selectedCustomer && <CustomerDetails customer={selectedCustomer} onCopy={() => void copyCustomerId(selectedCustomer.id)} onViewTransactions={() => router.push(`/dashboard/transactions?customer=${encodeURIComponent(selectedCustomer.id)}`)} onContact={() => setContactCustomer(selectedCustomer)} />}</SheetContent></Sheet>

      <Dialog open={contactCustomer !== null} onOpenChange={(open) => !open && setContactCustomer(null)}><DialogContent><DialogHeader><DialogTitle>Contact customer</DialogTitle><DialogDescription>Send a message to this ARC Pay customer.</DialogDescription></DialogHeader><div className='rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium'>{contactCustomer?.email}</div><DialogFooter><Button variant='outline' onClick={() => setContactCustomer(null)}>Cancel</Button><Button onClick={() => { if (contactCustomer) window.location.href = `mailto:${contactCustomer.email}`; }}><Icons.send data-icon='inline-start' />Open mail</Button></DialogFooter></DialogContent></Dialog>
    </PageContainer>
  );
}
