'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useCanonicalWallet } from '@/hooks/use-canonical-wallet';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = ['All', 'Succeeded', 'Pending', 'Failed', 'Refunded'] as const;
const METHOD_OPTIONS = ['All', 'Card', 'Bank Transfer', 'Mobile Money', 'Wallet'] as const;

const payoutTransactionIds: Record<string, string[]> = {
  'PO-8F42A91C': ['TXN-8F42A91C', 'TXN-7D19B4EE'],
  'PO-7D19B4EE': ['TXN-3E61A90D', 'TXN-2F74C6B8'],
  'PO-6C27E8A0': ['TXN-3E61A90D'],
  'PO-5A03C7F2': ['TXN-5A03C7F2'],
  'PO-4B88D2C1': ['TXN-4B88D2C1'],
  'PO-3E61A90D': ['TXN-7B06D3E1'],
  'PO-2F74C6B8': ['TXN-2F74C6B8'],
  'PO-1A52E9F4': ['TXN-1A52E9F4'],
  'PO-0D31B7AA': ['TXN-0D31B7AA'],
  'PO-9C48F0D6': ['TXN-9C48F0D6']
};

type TransactionStatus = (typeof STATUS_OPTIONS)[number];
type PaymentMethod = (typeof METHOD_OPTIONS)[number];

export interface Transaction {
  id: string;
  createdAt: string;
  customer: string;
  email: string;
  amount: number;
  method: PaymentMethod;
  methodDetail: string;
  status: Exclude<TransactionStatus, 'All'>;
  settlement: string;
  processingFee: number;
  netAmount: number;
  reference: string;
  failureReason?: string;
  customerId: string;
  billingAddress: string;
  currency: string;
  otherFees: number;
  riskScore: number;
  gateway: string;
  ipLocation: string;
}

const transactions: Transaction[] = [
  {
    id: 'TXN-8F42A91C',
    createdAt: 'Aug 19, 2026, 10:42 AM',
    customer: 'Arcade Supply Co.',
    email: 'finance@arcadesupply.co',
    amount: 1240,
    method: 'Card',
    methodDetail: 'Visa ending 4242',
    status: 'Succeeded',
    settlement: 'Aug 21, 2026',
    processingFee: 38.16,
    netAmount: 1201.84,
    reference: 'order_01J8ARC42',
    customerId: 'cus_arcade_0248',
    billingAddress: '14 Market Street, Lagos, NG',
    currency: 'USD',
    otherFees: 1.2,
    riskScore: 12,
    gateway: 'ARC Pay Card Gateway',
    ipLocation: '102.89.23.14 · Lagos, NG'
  },
  {
    id: 'TXN-7D19B4EE',
    createdAt: 'Aug 19, 2026, 10:18 AM',
    customer: 'Northstar Studio',
    email: 'billing@northstar.studio',
    amount: 860.5,
    method: 'Bank Transfer',
    methodDetail: 'GTBank ending 2081',
    status: 'Pending',
    settlement: 'Aug 20, 2026',
    processingFee: 8.61,
    netAmount: 851.89,
    reference: 'order_01J8NORTHST',
    customerId: 'cus_northstar_1190',
    billingAddress: '220 King Street, Toronto, CA',
    currency: 'USD',
    otherFees: 0,
    riskScore: 8,
    gateway: 'ARC Pay ACH Gateway',
    ipLocation: '142.44.18.90 · Toronto, CA'
  },
  {
    id: 'TXN-6C27E8A0',
    createdAt: 'Aug 19, 2026, 9:56 AM',
    customer: 'Morrow Market',
    email: 'payables@morrow.market',
    amount: 320,
    method: 'Card',
    methodDetail: 'Mastercard ending 1189',
    status: 'Failed',
    settlement: 'Not scheduled',
    processingFee: 0,
    netAmount: 0,
    reference: 'order_01J8MORROW01',
    failureReason: 'Insufficient funds',
    customerId: 'cus_morrow_0317',
    billingAddress: '8 Palm Avenue, Accra, GH',
    currency: 'USD',
    otherFees: 0,
    riskScore: 61,
    gateway: 'ARC Pay Card Gateway',
    ipLocation: '41.215.161.12 · Accra, GH'
  },
  {
    id: 'TXN-5A03C7F2',
    createdAt: 'Aug 19, 2026, 9:31 AM',
    customer: 'Brightline Goods',
    email: 'ops@brightlinegoods.com',
    amount: 145,
    method: 'Wallet',
    methodDetail: 'Apple Pay',
    status: 'Refunded',
    settlement: 'Aug 18, 2026',
    processingFee: 4.5,
    netAmount: -145,
    reference: 'order_01J8BRIGHT07',
    customerId: 'cus_brightline_0881',
    billingAddress: '72 Oxford Road, Nairobi, KE',
    currency: 'USD',
    otherFees: 0,
    riskScore: 16,
    gateway: 'ARC Pay Wallet Gateway',
    ipLocation: '197.248.32.71 · Nairobi, KE'
  },
  {
    id: 'TXN-4B88D2C1',
    createdAt: 'Aug 19, 2026, 8:47 AM',
    customer: 'Pine & Parcel',
    email: 'hello@pineandparcel.com',
    amount: 78.25,
    method: 'Mobile Money',
    methodDetail: 'MTN MoMo ending 7742',
    status: 'Succeeded',
    settlement: 'Aug 21, 2026',
    processingFee: 2.35,
    netAmount: 75.9,
    reference: 'order_01J8PINE002',
    customerId: 'cus_pine_4420',
    billingAddress: '5 Rose Lane, Kampala, UG',
    currency: 'USD',
    otherFees: 0.08,
    riskScore: 9,
    gateway: 'ARC Pay Mobile Money Gateway',
    ipLocation: '154.72.14.88 · Kampala, UG'
  },
  {
    id: 'TXN-3E61A90D',
    createdAt: 'Aug 18, 2026, 5:22 PM',
    customer: 'Cedar House',
    email: 'accounts@cedarhouse.io',
    amount: 2490,
    method: 'Bank Transfer',
    methodDetail: 'Access Bank ending 6230',
    status: 'Succeeded',
    settlement: 'Aug 20, 2026',
    processingFee: 24.9,
    netAmount: 2465.1,
    reference: 'order_01J8CEDAR88',
    customerId: 'cus_cedar_2054',
    billingAddress: '31 Cedar Lane, Austin, US',
    currency: 'USD',
    otherFees: 0,
    riskScore: 7,
    gateway: 'ARC Pay ACH Gateway',
    ipLocation: '172.58.18.21 · Austin, US'
  },
  {
    id: 'TXN-2F74C6B8',
    createdAt: 'Aug 18, 2026, 3:08 PM',
    customer: 'Lumen Health',
    email: 'billing@lumenhealth.africa',
    amount: 640.75,
    method: 'Card',
    methodDetail: 'Visa ending 9012',
    status: 'Pending',
    settlement: 'Aug 20, 2026',
    processingFee: 19.42,
    netAmount: 621.33,
    reference: 'order_01J8LUMEN18',
    customerId: 'cus_lumen_7103',
    billingAddress: '19 Broad Street, London, GB',
    currency: 'USD',
    otherFees: 0.64,
    riskScore: 23,
    gateway: 'ARC Pay Card Gateway',
    ipLocation: '81.129.33.45 · London, GB'
  },
  {
    id: 'TXN-1A52E9F4',
    createdAt: 'Aug 18, 2026, 1:44 PM',
    customer: 'Monument Labs',
    email: 'pay@monumentlabs.dev',
    amount: 980,
    method: 'Wallet',
    methodDetail: 'Google Pay',
    status: 'Succeeded',
    settlement: 'Aug 20, 2026',
    processingFee: 29.4,
    netAmount: 950.6,
    reference: 'order_01J8MONUMENT',
    customerId: 'cus_monument_6002',
    billingAddress: '400 Howard Street, San Francisco, US',
    currency: 'USD',
    otherFees: 0.98,
    riskScore: 11,
    gateway: 'ARC Pay Wallet Gateway',
    ipLocation: '104.28.55.19 · San Francisco, US'
  },
  {
    id: 'TXN-0D31B7AA',
    createdAt: 'Aug 18, 2026, 11:19 AM',
    customer: 'Kora Events',
    email: 'accounts@koraevents.com',
    amount: 312.4,
    method: 'Mobile Money',
    methodDetail: 'Airtel Money ending 4201',
    status: 'Failed',
    settlement: 'Not scheduled',
    processingFee: 0,
    netAmount: 0,
    reference: 'order_01J8KORA004',
    failureReason: 'Payment authorization expired',
    customerId: 'cus_kora_8034',
    billingAddress: '6 Ring Road, Accra, GH',
    currency: 'USD',
    otherFees: 0,
    riskScore: 72,
    gateway: 'ARC Pay Mobile Money Gateway',
    ipLocation: '41.66.11.25 · Accra, GH'
  },
  {
    id: 'TXN-9C48F0D6',
    createdAt: 'Aug 17, 2026, 4:36 PM',
    customer: 'Fieldwork Collective',
    email: 'finance@fieldwork.co',
    amount: 1750,
    method: 'Card',
    methodDetail: 'Visa ending 7734',
    status: 'Succeeded',
    settlement: 'Aug 19, 2026',
    processingFee: 52.5,
    netAmount: 1697.5,
    reference: 'order_01J8FIELD102',
    customerId: 'cus_fieldwork_2917',
    billingAddress: '88 King Street, New York, US',
    currency: 'USD',
    otherFees: 1.75,
    riskScore: 14,
    gateway: 'ARC Pay Card Gateway',
    ipLocation: '64.12.44.18 · New York, US'
  },
  {
    id: 'TXN-8E20A5BC',
    createdAt: 'Aug 17, 2026, 2:12 PM',
    customer: 'Olive & Oak',
    email: 'hello@oliveandoak.store',
    amount: 96.99,
    method: 'Wallet',
    methodDetail: 'Flutterwave Wallet',
    status: 'Refunded',
    settlement: 'Aug 16, 2026',
    processingFee: 2.91,
    netAmount: -96.99,
    reference: 'order_01J8OLIVE55',
    customerId: 'cus_olive_5108',
    billingAddress: '12 Park Road, Cape Town, ZA',
    currency: 'USD',
    otherFees: 0,
    riskScore: 19,
    gateway: 'ARC Pay Wallet Gateway',
    ipLocation: '102.165.41.8 · Cape Town, ZA'
  },
  {
    id: 'TXN-7B06D3E1',
    createdAt: 'Aug 16, 2026, 6:51 PM',
    customer: 'Atlas Learning',
    email: 'billing@atlaslearning.org',
    amount: 4200,
    method: 'Bank Transfer',
    methodDetail: 'UBA ending 1184',
    status: 'Succeeded',
    settlement: 'Aug 18, 2026',
    processingFee: 42,
    netAmount: 4158,
    reference: 'order_01J8ATLAS33',
    customerId: 'cus_atlas_9011',
    billingAddress: '3 Learning Way, Nairobi, KE',
    currency: 'USD',
    otherFees: 0,
    riskScore: 6,
    gateway: 'ARC Pay ACH Gateway',
    ipLocation: '105.163.77.41 · Nairobi, KE'
  },
  {
    id: 'TXN-6A14C8F9',
    createdAt: 'Aug 16, 2026, 9:24 AM',
    customer: 'Sable Commerce',
    email: 'ops@sablecommerce.com',
    amount: 540.3,
    method: 'Card',
    methodDetail: 'Mastercard ending 6508',
    status: 'Succeeded',
    settlement: 'Aug 18, 2026',
    processingFee: 16.21,
    netAmount: 524.09,
    reference: 'order_01J8SABLE72',
    customerId: 'cus_sable_3680',
    billingAddress: '90 Harbor Drive, Miami, US',
    currency: 'USD',
    otherFees: 0.54,
    riskScore: 10,
    gateway: 'ARC Pay Card Gateway',
    ipLocation: '172.93.14.6 · Miami, US'
  },
  {
    id: 'TXN-5D93E2A7',
    createdAt: 'Aug 15, 2026, 4:07 PM',
    customer: 'Horizon Retail',
    email: 'finance@horizonretail.co',
    amount: 118.6,
    method: 'Mobile Money',
    methodDetail: 'MTN MoMo ending 9104',
    status: 'Failed',
    settlement: 'Not scheduled',
    processingFee: 0,
    netAmount: 0,
    reference: 'order_01J8HORIZON',
    failureReason: 'Customer cancelled the payment',
    customerId: 'cus_horizon_1443',
    billingAddress: '44 Independence Avenue, Kampala, UG',
    currency: 'USD',
    otherFees: 0,
    riskScore: 58,
    gateway: 'ARC Pay Mobile Money Gateway',
    ipLocation: '154.73.21.90 · Kampala, UG'
  }
];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function formatCurrency(value: number): string {
  return currency.format(value);
}

async function copyTransactionId(transactionId: string): Promise<boolean> {
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(transactionId);
      return true;
    } catch {
      return false;
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = transactionId;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function statusClassName(status: Transaction['status']): string {
  switch (status) {
    case 'Succeeded':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'Pending':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'Failed':
      return 'border-red-500/30 bg-red-500/10 text-red-400';
    case 'Refunded':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  }
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardDescription>{label}</CardDescription>
        <CardTitle className='text-2xl tabular-nums'>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground text-xs'>{note}</p>
      </CardContent>
    </Card>
  );
}

export default function TransactionsPage() {
  return <RealTransactionsPage />;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex items-start justify-between gap-4 border-b pb-3 text-sm last:border-0'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='max-w-[65%] text-right font-medium'>{value}</span>
    </div>
  );
}

export function TransactionDetails({
  transaction,
  onCopy,
  onRefund,
  onDownload,
  onContact,
  copyState,
  copied = false
}: {
  transaction: Transaction;
  onCopy: () => void;
  onRefund: () => void;
  onDownload: () => void;
  onContact: () => void;
  copyState?: 'idle' | 'success' | 'error';
  copied?: boolean;
}) {
  const effectiveCopyState = copyState ?? (copied ? 'success' : 'idle');
  const isRefundable = transaction.status !== 'Refunded' && transaction.status !== 'Failed';
  const timeline = [
    { label: 'Payment initiated', time: transaction.createdAt, complete: true },
    {
      label: 'Authorization',
      time: transaction.status === 'Failed' ? 'Authorization declined' : 'A few seconds later',
      complete: transaction.status !== 'Failed'
    },
    {
      label: 'Payment processed',
      time: transaction.status === 'Pending' ? 'Awaiting confirmation' : 'Payment confirmed',
      complete: transaction.status === 'Succeeded' || transaction.status === 'Refunded'
    },
    {
      label: 'Settlement',
      time: transaction.settlement,
      complete: transaction.status === 'Succeeded' || transaction.status === 'Refunded'
    }
  ];
  const settlementAmount = transaction.status === 'Refunded' ? 0 : transaction.netAmount;

  return (
    <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(10rem+env(safe-area-inset-bottom))]'>
      <div className='flex flex-col gap-5'>
      <div className='flex flex-col gap-4 rounded-xl border bg-muted/20 p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-muted-foreground text-xs uppercase tracking-wider'>Transaction ID</p>
            <div className='mt-1 flex items-center gap-1'>
              <span className='font-mono text-sm font-semibold'>{transaction.id}</span>
              <Button variant='ghost' size='icon-xs' aria-label='Copy transaction ID' onClick={onCopy}>
                <Icons.fileTypeDoc />
              </Button>
            </div>
          </div>
          <Badge variant='outline' className={statusClassName(transaction.status)}>
            {transaction.status}
          </Badge>
        </div>
        <div className='flex items-end justify-between gap-3 border-t pt-3'>
          <div>
            <p className='text-muted-foreground text-xs'>Amount</p>
            <p className='mt-1 text-2xl font-semibold tabular-nums'>{formatCurrency(transaction.amount)}</p>
          </div>
          <div className='text-right'>
            <p className='text-muted-foreground text-xs'>{transaction.currency} currency</p>
            <p className='mt-1 text-sm'>{transaction.createdAt}</p>
          </div>
        </div>
      </div>

      <div className='grid gap-4 rounded-xl border p-4'>
        <div className='flex items-center gap-2'>
          <Icons.creditCard className='text-primary' />
          <h3 className='font-semibold'>Payment summary</h3>
        </div>
        <DetailRow label='Payment method' value={transaction.method} />
        <DetailRow label='Network / details' value={transaction.methodDetail} />
        <DetailRow
          label='Authorization'
          value={transaction.status === 'Failed' ? 'Declined' : transaction.status === 'Pending' ? 'Pending' : 'Authorized'}
        />
        <DetailRow label='Settlement' value={transaction.settlement} />
      </div>

      <div className='grid gap-4 rounded-xl border p-4'>
        <div className='flex items-center gap-2'>
          <Icons.account className='text-primary' />
          <h3 className='font-semibold'>Customer</h3>
        </div>
        <DetailRow label='Company' value={transaction.customer} />
        <DetailRow label='Email' value={transaction.email} />
        <DetailRow label='Customer ID' value={<span className='font-mono text-xs'>{transaction.customerId}</span>} />
        <DetailRow label='Billing information' value={transaction.billingAddress} />
      </div>

      <div className='rounded-xl border p-4'>
        <h3 className='mb-4 font-semibold'>Transaction timeline</h3>
        <div className='flex flex-col'>
          {timeline.map((event, index) => (
            <div key={event.label} className='flex gap-3'>
              <div className='flex flex-col items-center'>
                <div className={`flex size-6 items-center justify-center rounded-full border ${event.complete ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400' : 'border-border bg-muted text-muted-foreground'}`}>
                  {event.complete ? <Icons.check /> : <Icons.clock />}
                </div>
                {index < timeline.length - 1 && <div className='bg-border my-1 h-8 w-px' />}
              </div>
              <div className='pb-4'>
                <p className='text-sm font-medium'>{event.label}</p>
                <p className='text-muted-foreground mt-0.5 text-xs'>{event.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='grid gap-4 rounded-xl border p-4'>
        <h3 className='font-semibold'>Financial breakdown</h3>
        <DetailRow label='Gross amount' value={formatCurrency(transaction.amount)} />
        <DetailRow label='ARC Pay processing fee' value={formatCurrency(transaction.processingFee)} />
        <DetailRow label='Other fees' value={formatCurrency(transaction.otherFees)} />
        <DetailRow label='Net amount' value={formatCurrency(transaction.netAmount)} />
        <DetailRow label='Settlement amount' value={formatCurrency(settlementAmount)} />
      </div>

      <div className='grid gap-4 rounded-xl border p-4'>
        <h3 className='font-semibold'>Metadata</h3>
        <DetailRow label='payment_intent' value={<span className='font-mono text-xs'>pi_{transaction.id.toLowerCase().replace('txn-', '')}</span>} />
        <DetailRow label='merchant_reference' value={<span className='font-mono text-xs'>{transaction.reference}</span>} />
        <DetailRow label='gateway' value={transaction.gateway} />
        <DetailRow label='risk_score' value={`${transaction.riskScore} / 100`} />
        <DetailRow label='IP / location' value={transaction.ipLocation} />
        <DetailRow label='created_at' value={transaction.createdAt} />
      </div>

      {transaction.failureReason && (
        <div className='rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm'>
          <p className='font-medium text-red-300'>Failure reason</p>
          <p className='mt-1 text-red-200/80'>{transaction.failureReason}</p>
        </div>
      )}

      <div className='grid gap-3 rounded-xl border p-4'>
        <div>
          <h3 className='font-semibold'>Actions</h3>
          <p className='text-muted-foreground mt-1 text-xs'>Available actions for this payment.</p>
        </div>
        <div className='grid gap-2 sm:grid-cols-2'>
          <Button variant='outline' className='h-10 w-full justify-start whitespace-normal text-left text-xs sm:text-sm' onClick={onCopy}>
            {effectiveCopyState === 'success' ? <Icons.check data-icon='inline-start' /> : effectiveCopyState === 'error' ? <Icons.close data-icon='inline-start' /> : <Icons.fileTypeDoc data-icon='inline-start' />}
            {effectiveCopyState === 'success' ? 'Copied' : effectiveCopyState === 'error' ? 'Copy failed' : 'Copy transaction ID'}
          </Button>
          <Button variant='outline' className='h-10 w-full justify-start whitespace-normal text-left text-xs sm:text-sm' disabled={!isRefundable} onClick={onRefund}>
            <Icons.creditCard data-icon='inline-start' />
            {transaction.status === 'Refunded' ? 'Payment refunded' : 'Refund payment'}
          </Button>
          <Button type='button' variant='outline' className='h-10 w-full justify-start whitespace-normal text-left text-xs sm:text-sm' onClick={onDownload}>
            <Icons.fileTypePdf data-icon='inline-start' />
            Download receipt
          </Button>
          <Button variant='outline' className='h-10 w-full justify-start whitespace-normal text-left text-xs sm:text-sm' onClick={onContact}>
            <Icons.send data-icon='inline-start' />
            Contact customer
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}

const ARC_HISTORY_CHAIN_ID = 5042002;

function RealTransactionsPage() {
  const searchParams = useSearchParams();
  const { address, chainId, ready } = useCanonicalWallet();
  const [rows, setRows] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [selected, setSelected] = React.useState<Transaction | null>(null);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<TransactionStatus>('All');
  const [page, setPage] = React.useState(1);

  const loadRealHistory = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    if (!address || !ready) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      if (chainId !== ARC_HISTORY_CHAIN_ID) {
        setRows([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/transactions?address=${encodeURIComponent(address)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Transaction API unavailable');
      const payload = (await response.json()) as { transactions?: Array<{ hash: string; timestamp: string | null; from: string; to: string; amount: number; status: 'Confirmed' | 'Failed'; direction: 'Sent' | 'Received' }> };
      setRows((payload.transactions ?? []).map((item) => ({
        id: item.hash,
        createdAt: item.timestamp || 'Unknown time',
        customer: item.direction === 'Sent' ? 'Connected wallet' : `Received from ${item.from.slice(0, 6)}...${item.from.slice(-4)}`,
        email: 'On-chain activity',
        amount: item.amount,
        method: 'Wallet',
        methodDetail: 'Arc Testnet USDC',
        status: item.status === 'Failed' ? 'Failed' : 'Succeeded',
        settlement: item.timestamp || 'Unknown time',
        processingFee: 0,
        netAmount: item.direction === 'Sent' ? -item.amount : item.amount,
        reference: item.hash,
        customerId: address.toLowerCase(),
        billingAddress: `From: ${item.from} · To: ${item.to}`,
        currency: 'USDC',
        otherFees: 0,
        riskScore: 0,
        gateway: 'Arc Testnet RPC',
        ipLocation: `Counterparty: ${item.direction === 'Sent' ? item.to : item.from}`
      })));
    } catch {
      setRows([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [address, chainId, ready]);

  // Initial synchronization reads the external wallet and Arc RPC state.
  // eslint-disable-next-line react/set-state-in-effect
  React.useEffect(() => { void loadRealHistory(); }, [loadRealHistory]);

  const filteredRows = rows.filter((row) => (!query || row.id.toLowerCase().includes(query.toLowerCase()) || row.customer.toLowerCase().includes(query.toLowerCase())) && (status === 'All' || row.status === status));
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const transactionFilter = searchParams.get('transaction');
  const displayedRows = transactionFilter ? visibleRows.filter((row) => row.id.toLowerCase() === transactionFilter.toLowerCase()) : visibleRows;

  if (!address) return <PageContainer pageTitle='Transactions' pageDescription='Real Arc Testnet wallet activity'><Card><CardContent className='flex flex-col items-center gap-3 py-16 text-center'><p className='font-medium'>Connect your wallet to view Arc Testnet transactions.</p><p className='text-muted-foreground text-sm'>No mock transactions are shown.</p></CardContent></Card></PageContainer>;
  if (chainId !== ARC_HISTORY_CHAIN_ID) return <PageContainer pageTitle='Transactions' pageDescription='Real Arc Testnet wallet activity'><Card><CardContent className='flex flex-col items-center gap-3 py-16 text-center'><p className='font-medium'>Wrong Network</p><p className='text-muted-foreground text-sm'>Switch to Arc Testnet to view wallet activity.</p></CardContent></Card></PageContainer>;

  return <PageContainer pageTitle='Transactions' pageDescription='Real Arc Testnet wallet activity'><Card><CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'><div><CardTitle>Arc Testnet activity</CardTitle><CardDescription>On-chain USDC transfers for {address.slice(0, 6)}...{address.slice(-4)}</CardDescription></div><Button type='button' variant='outline' onClick={() => void loadRealHistory()} disabled={loading}><Icons.trendingUp data-icon='inline-start' />{loading ? 'Loading transactions...' : 'Refresh'}</Button></CardHeader><CardContent className='flex flex-col gap-4 pt-6'><div className='flex flex-col gap-3 sm:flex-row'><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder='Search transaction hash or counterparty...' aria-label='Search real transactions' /><Select value={status} onValueChange={(value) => { setStatus(value as TransactionStatus); setPage(1); }}><SelectTrigger className='w-full sm:w-40' aria-label='Filter transaction status'><SelectValue placeholder='Status' /></SelectTrigger><SelectContent><SelectGroup>{STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</SelectItem>)}</SelectGroup></SelectContent></Select></div>{error ? <div className='flex flex-col items-center gap-3 py-12 text-center'><p className='font-medium'>Unable to load transaction activity</p><Button type='button' variant='outline' onClick={() => void loadRealHistory()}>Retry</Button></div> : !loading && displayedRows.length === 0 ? <div className='flex flex-col items-center gap-3 py-12 text-center'><p className='font-medium'>No Arc Testnet transactions yet.</p><p className='text-muted-foreground text-sm'>Only real on-chain activity is shown.</p></div> : <div className='overflow-x-auto rounded-lg border'><Table className='min-w-[900px]'><TableHeader><TableRow className='bg-muted/50 hover:bg-muted/50'><TableHead>Transaction hash</TableHead><TableHead>Direction</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date/time</TableHead><TableHead>Counterparty</TableHead><TableHead>Explorer</TableHead></TableRow></TableHeader><TableBody>{displayedRows.map((row) => <TableRow key={row.id} className='cursor-pointer' tabIndex={0} onClick={() => setSelected(row)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(row); } }}><TableCell className='max-w-[190px] truncate font-mono text-xs'>{row.id}</TableCell><TableCell>{row.netAmount < 0 ? 'Sent' : 'Received'}</TableCell><TableCell className='font-medium tabular-nums'>{Math.abs(row.amount).toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC</TableCell><TableCell><Badge variant='outline' className={row.status === 'Succeeded' ? 'text-emerald-400' : 'text-red-400'}>{row.status === 'Succeeded' ? 'Confirmed' : row.status}</Badge></TableCell><TableCell className='text-muted-foreground text-sm'>{row.createdAt}</TableCell><TableCell className='max-w-[180px] truncate font-mono text-xs'>{row.ipLocation.replace('Counterparty: ', '')}</TableCell><TableCell><a className='text-primary text-xs underline underline-offset-2' href={`https://testnet.arcscan.app/tx/${row.id}`} target='_blank' rel='noreferrer' onClick={(event) => event.stopPropagation()}>View</a></TableCell></TableRow>)}</TableBody></Table></div>}<div className='flex items-center justify-between border-t pt-4'><span className='text-muted-foreground text-sm'>{filteredRows.length} real transaction{filteredRows.length === 1 ? '' : 's'}</span><div className='flex items-center gap-2'><Button variant='outline' size='icon' disabled={page === 1} aria-label='Previous page' onClick={() => setPage((value) => value - 1)}><Icons.chevronLeft /></Button><Button variant='outline' size='icon' disabled={page === pageCount} aria-label='Next page' onClick={() => setPage((value) => value + 1)}><Icons.chevronRight /></Button></div></div></CardContent></Card><Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}><SheetContent className='z-[100] max-h-[100dvh] min-h-0 w-full overflow-hidden sm:max-w-lg'><SheetHeader className='shrink-0'><SheetTitle>Transaction Details</SheetTitle><SheetDescription>Real Arc Testnet transaction</SheetDescription></SheetHeader>{selected && <TransactionDetails transaction={selected} onCopy={() => void navigator.clipboard.writeText(selected.id)} onRefund={() => toast.info('Refunds are managed separately.')} onDownload={() => toast.info('Receipt download is available from the transaction record.')} onContact={() => toast.info('On-chain activity has no customer contact record.')} copied={false} />}</SheetContent></Sheet></PageContainer>;
}

// eslint-disable-next-line no-unused-vars
function LegacyTransactionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<TransactionStatus>('All');
  const [method, setMethod] = React.useState<PaymentMethod>('All');
  const [date, setDate] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [refundTarget, setRefundTarget] = React.useState<Transaction | null>(null);
  const [contactTarget, setContactTarget] = React.useState<Transaction | null>(null);
  const [copiedTransactionId, setCopiedTransactionId] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<'idle' | 'success' | 'error'>('idle');
  const copyFeedbackTimeout = React.useRef<number | null>(null);
  const [refundedIds, setRefundedIds] = React.useState<Set<string>>(() => new Set());
  const customerFilter = searchParams.get('customer')?.trim() ?? '';
  const customerFilterRecord = transactions.find(
    (transaction) => transaction.customerId.toLowerCase() === customerFilter.toLowerCase()
  );
  const payoutFilter = searchParams.get('payout')?.trim() ?? '';
  const transactionFilter = searchParams.get('transaction')?.trim() ?? '';

  const filteredTransactions = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const payoutTransactionIdSet = new Set(payoutTransactionIds[payoutFilter] ?? []);
    const formattedDate = date
      ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : '';

    return transactions.filter((transaction) => {
      const matchesSearch = normalizedSearch.length === 0 || [
        transaction.id,
        transaction.customer,
        transaction.email,
        transaction.reference
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesCustomer =
        customerFilter.length === 0 || transaction.customerId.toLowerCase() === customerFilter.toLowerCase();
      const matchesPayout = payoutFilter.length === 0 || payoutTransactionIdSet.has(transaction.id);
      const matchesTransaction = transactionFilter.length === 0 || transaction.id.toLowerCase() === transactionFilter.toLowerCase();
      const matchesStatus = status === 'All' || transaction.status === status;
      const matchesMethod = method === 'All' || transaction.method === method;
      const matchesDate = date.length === 0 || transaction.createdAt.includes(formattedDate);

      return matchesSearch && matchesCustomer && matchesPayout && matchesTransaction && matchesStatus && matchesMethod && matchesDate;
    });
  }, [customerFilter, date, method, payoutFilter, search, status, transactionFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const visibleTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters =
    search.length > 0 || status !== 'All' || method !== 'All' || date.length > 0;
  const displayedTransaction = selectedTransaction
    ? refundedIds.has(selectedTransaction.id)
      ? { ...selectedTransaction, status: 'Refunded' as const }
      : selectedTransaction
    : null;

  function clearFilters() {
    setSearch('');
    setStatus('All');
    setMethod('All');
    setDate('');
    setPage(1);
  }

  function clearCustomerFilter() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('customer');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    setPage(1);
  }

  function clearPayoutFilter() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('payout');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    setPage(1);
  }

  function clearTransactionFilter() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('transaction');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatus(value: TransactionStatus) {
    setStatus(value);
    setPage(1);
  }

  function updateMethod(value: PaymentMethod) {
    setMethod(value);
    setPage(1);
  }

  function updateDate(value: string) {
    setDate(value);
    setPage(1);
  }

  function handleDownloadReceipt(transaction: Transaction) {
    try {
      const receiptContent = [
        'ARC Pay',
        'Transaction Receipt',
        '',
        `Transaction ID: ${transaction.id}`,
        `Status: ${transaction.status}`,
        `Amount: ${formatCurrency(transaction.amount)}`,
        `Currency: ${transaction.currency}`,
        `Customer: ${transaction.customer}`,
        `Customer email: ${transaction.email}`,
        `Customer ID: ${transaction.customerId}`,
        `Payment method: ${transaction.methodDetail}`,
        `Transaction date: ${transaction.createdAt}`,
        `Settlement date: ${transaction.settlement}`,
        `Processing fee: ${formatCurrency(transaction.processingFee)}`,
        `Other fees: ${formatCurrency(transaction.otherFees)}`,
        `Net amount: ${formatCurrency(transaction.netAmount)}`,
        `Payment intent: pi_${transaction.id.toLowerCase().replace('txn-', '')}`,
        `Merchant reference: ${transaction.reference}`
      ].join('\n');
      const blob = new Blob([receiptContent], {
        type: 'text/plain;charset=utf-8'
      });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `ARC-Pay-Receipt-${transaction.id}.txt`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Download failed');
    }
  }

  function confirmRefund() {
    if (!refundTarget) return;
    setRefundedIds((current) => new Set(current).add(refundTarget.id));
    toast.success(`Mock refund recorded for ${refundTarget.id}`);
    setRefundTarget(null);
  }

  async function copySelectedTransactionId(transactionId: string) {
    if (copyFeedbackTimeout.current) {
      window.clearTimeout(copyFeedbackTimeout.current);
    }

    const copied = await copyTransactionId(transactionId);
    setCopiedTransactionId(transactionId);
    setCopyState(copied ? 'success' : 'error');
    if (copied) {
      toast.success('Transaction ID copied');
    } else {
      toast.error('Copy failed');
    }
    copyFeedbackTimeout.current = window.setTimeout(() => {
      setCopyState('idle');
      setCopiedTransactionId(null);
    }, 1800);
  }

  function exportTransactions() {
    const header = ['Transaction ID', 'Customer', 'Email', 'Amount', 'Payment method', 'Status', 'Settlement'];
    const rows = filteredTransactions.map((transaction) => [
      transaction.id,
      transaction.customer,
      transaction.email,
      formatCurrency(transaction.amount),
      transaction.methodDetail,
      transaction.status,
      transaction.settlement
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arc-pay-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer
      pageTitle='Transactions'
      pageDescription='Monitor and manage all ARC Pay payment activity.'
      pageHeaderAction={
        <Button variant='outline' onClick={exportTransactions}>
          <Icons.upload data-icon='inline-start' />
          Export
        </Button>
      }
    >
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <MetricCard label='Total volume' value='$128,430.82' note='Across the last 30 days' />
          <MetricCard label='Successful' value='1,284' note='98.3% authorization rate' />
          <MetricCard label='Pending' value='24' note='Awaiting confirmation' />
          <MetricCard label='Failed' value='18' note='1.4% of total attempts' />
        </div>

        <Card>
          <CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle>All transactions</CardTitle>
              <CardDescription className='mt-1'>Review payment activity, settlement status, and customer details.</CardDescription>
            </div>
            <span className='text-muted-foreground text-sm tabular-nums'>
              {filteredTransactions.length} result{filteredTransactions.length === 1 ? '' : 's'}
            </span>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 pt-6'>
            <div className='flex flex-col gap-3 xl:flex-row'>
              <div className='relative min-w-0 flex-1'>
                <Icons.search className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2' />
                <Input
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                  placeholder='Search transaction ID, customer, email...'
                  className='pl-9'
                  aria-label='Search transactions'
                />
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 xl:flex'>
                <Select value={status} onValueChange={(value) => updateStatus(value as TransactionStatus)}>
                  <SelectTrigger className='w-full sm:w-40'>
                    <SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option === 'All' ? 'All statuses' : option}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select value={method} onValueChange={(value) => updateMethod(value as PaymentMethod)}>
                  <SelectTrigger className='w-full sm:w-40'>
                    <SelectValue placeholder='Payment method' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option === 'All' ? 'All methods' : option}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className='relative'>
                  <Icons.calendar className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2' />
                  <Input
                    type='date'
                    value={date}
                    onChange={(event) => updateDate(event.target.value)}
                    className='w-full pl-9 sm:w-40'
                    aria-label='Filter by date'
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant='ghost' onClick={clearFilters} className='shrink-0'>
                  <Icons.close data-icon='inline-start' />
                  Clear filters
                </Button>
              )}
            </div>
            {customerFilter && (
              <div className='flex items-center gap-2'>
                <Badge variant='outline' className='gap-1.5 py-1 pl-2.5 pr-1.5'>
                  <span>Customer: {customerFilterRecord?.customer ?? customerFilter}</span>
                  <Button
                    variant='ghost'
                    size='icon-xs'
                    aria-label='Clear customer filter'
                    onClick={clearCustomerFilter}
                  >
                    <Icons.close />
                  </Button>
                </Badge>
              </div>
            )}
            {payoutFilter && (
              <div className='flex items-center gap-2'>
                <Badge variant='outline' className='gap-1.5 py-1 pl-2.5 pr-1.5'>
                  <span>Payout: {payoutFilter}</span>
                  <Button
                    variant='ghost'
                    size='icon-xs'
                    aria-label='Clear payout filter'
                    onClick={clearPayoutFilter}
                  >
                    <Icons.close />
                  </Button>
                </Badge>
              </div>
            )}
            {transactionFilter && (
              <div className='flex items-center gap-2'>
                <Badge variant='outline' className='gap-1.5 py-1 pl-2.5 pr-1.5'>
                  <span>Transaction: {transactionFilter}</span>
                  <Button variant='ghost' size='icon-xs' aria-label='Clear transaction filter' onClick={clearTransactionFilter}>
                    <Icons.close />
                  </Button>
                </Badge>
              </div>
            )}

            <div className='overflow-x-auto rounded-lg border'>
              <Table className='min-w-[900px]'>
                <TableHeader>
                  <TableRow className='bg-muted/50 hover:bg-muted/50'>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Settlement</TableHead>
                    <TableHead className='w-12'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTransactions.length > 0 ? visibleTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className='cursor-pointer'
                      tabIndex={0}
                      onClick={() => setSelectedTransaction(transaction)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedTransaction(transaction);
                        }
                      }}
                    >
                      <TableCell>
                        <div className='font-medium'>{transaction.id}</div>
                        <div className='text-muted-foreground mt-1 text-xs'>{transaction.createdAt}</div>
                      </TableCell>
                      <TableCell>
                        <div className='font-medium'>{transaction.customer}</div>
                        <div className='text-muted-foreground mt-1 text-xs'>{transaction.email}</div>
                      </TableCell>
                      <TableCell className='font-medium tabular-nums'>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <div>{transaction.method}</div>
                        <div className='text-muted-foreground mt-1 text-xs'>{transaction.methodDetail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className={statusClassName(transaction.status)}>{transaction.status}</Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>{transaction.settlement}</TableCell>
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='icon'
                          aria-label={`View ${transaction.id}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTransaction(transaction);
                          }}
                        >
                          <Icons.ellipsis />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className='h-32 text-center'>
                        <p className='font-medium'>No transactions found</p>
                        <p className='text-muted-foreground mt-1 text-sm'>Try adjusting your search or filters.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-muted-foreground text-sm'>
                Showing {filteredTransactions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length}
              </p>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='icon' aria-label='Previous page' disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                  <Icons.chevronLeft />
                </Button>
                <span className='text-muted-foreground min-w-16 text-center text-sm'>Page {page} of {pageCount}</span>
                <Button variant='outline' size='icon' aria-label='Next page' disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>
                  <Icons.chevronRight />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={displayedTransaction !== null} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <SheetContent className='z-[100] max-h-[100dvh] min-h-0 w-full overflow-hidden sm:max-w-lg'>
          <SheetHeader className='shrink-0'>
            <SheetTitle>Transaction Details</SheetTitle>
            <SheetDescription>ARC Pay payment record and settlement information</SheetDescription>
          </SheetHeader>
          {displayedTransaction && (
            <TransactionDetails
              transaction={displayedTransaction}
              onCopy={() => void copySelectedTransactionId(displayedTransaction.id)}
              onRefund={() => setRefundTarget(displayedTransaction)}
              onDownload={() => handleDownloadReceipt(displayedTransaction)}
              onContact={() => setContactTarget(displayedTransaction)}
              copyState={copiedTransactionId === displayedTransaction.id ? copyState : 'idle'}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={refundTarget !== null} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a mock action for{' '}
              <span className='font-mono'>{refundTarget?.id}</span>. Refund{' '}
              <span className='font-medium'>{refundTarget ? formatCurrency(refundTarget.amount) : ''}</span>{' '}
              for <span className='font-medium'>{refundTarget?.customer}</span> without contacting a payment gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep payment</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRefund}>Confirm refund</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={contactTarget !== null} onOpenChange={(open) => !open && setContactTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact customer</DialogTitle>
            <DialogDescription>Send a message to the customer associated with this transaction.</DialogDescription>
          </DialogHeader>
          <div className='rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium'>
            {contactTarget?.email}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setContactTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (contactTarget) window.location.href = `mailto:${contactTarget.email}`;
              }}
            >
              <Icons.send data-icon='inline-start' />
              Open mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
