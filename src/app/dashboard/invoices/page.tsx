'use client';

import * as React from 'react';
import { toast } from 'sonner';

import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useArcData } from '@/hooks/use-arc-data';
import { sendConfirmedUsdcPayment, isEvmAddress, parseUsdcAmount } from '@/lib/arc-payment';
import {
  createInvoice,
  getInvoices,
  markInvoicePaid,
  markInvoiceRefunded
} from '@/features/invoices/storage';
import { createRefund, markRefundConfirmed } from '@/features/refunds/storage';
import type { ApplicationInvoice } from '@/features/invoices/types';
import type { ArcTransactionRecord } from '@/lib/arc-transactions';

const today = (): string => new Date().toISOString().slice(0, 10);
const defaultDueDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(value: string): string {
  return currency.format(Number(value));
}
function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
function statusClassName(status: ApplicationInvoice['status']): string {
  return status === 'Paid'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : status === 'Overdue'
      ? 'border-red-500/30 bg-red-500/10 text-red-400'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-400';
}

interface FormValues {
  customer: string;
  recipient: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  description: string;
}
function emptyForm(): FormValues {
  return {
    customer: '',
    recipient: '',
    amount: '',
    issueDate: today(),
    dueDate: defaultDueDate(),
    description: ''
  };
}

function InvoiceForm({
  open,
  onOpenChange,
  ownerAddress,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerAddress: string;
  onCreated: (invoice: ApplicationInvoice) => void;
}) {
  const [values, setValues] = React.useState<FormValues>(emptyForm);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  function update(field: keyof FormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }
  function close(openState: boolean): void {
    if (!openState && !saving) {
      setValues(emptyForm());
      setError(null);
    }
    onOpenChange(openState);
  }
  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!values.customer.trim()) return setError('Enter a customer name.');
    if (!isEvmAddress(values.recipient.trim()))
      return setError('Enter a valid recipient wallet address.');
    const amount = parseUsdcAmount(values.amount);
    if (!amount || amount <= BigInt(0)) return setError('Enter a USDC amount greater than 0.');
    if (!values.issueDate || !values.dueDate || values.dueDate < values.issueDate)
      return setError('Due date must be on or after the issue date.');
    setSaving(true);
    const invoice = createInvoice({
      ownerAddress,
      customer: values.customer.trim(),
      recipient: values.recipient.trim(),
      amount: values.amount.trim(),
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      description: values.description.trim()
    });
    onCreated(invoice);
    setSaving(false);
    close(false);
    toast.success(`${invoice.id} created`);
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>
            Create a payable USDC invoice. It will remain Pending until a real Arc Testnet payment
            is confirmed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='grid gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='invoice-customer'>Customer</Label>
            <Input
              id='invoice-customer'
              value={values.customer}
              onChange={(event) => update('customer', event.target.value)}
              placeholder='Customer or company name'
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='invoice-recipient'>Recipient wallet address</Label>
            <Input
              id='invoice-recipient'
              value={values.recipient}
              onChange={(event) => update('recipient', event.target.value)}
              placeholder='0x...'
              className='font-mono'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-2'>
              <Label htmlFor='invoice-amount'>Amount</Label>
              <Input
                id='invoice-amount'
                inputMode='decimal'
                value={values.amount}
                onChange={(event) => update('amount', event.target.value)}
                placeholder='0.00'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='invoice-currency'>Currency</Label>
              <Input id='invoice-currency' value='USDC' readOnly aria-label='Currency USDC' />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-2'>
              <Label htmlFor='invoice-issue-date'>Issue date</Label>
              <Input
                id='invoice-issue-date'
                type='date'
                value={values.issueDate}
                onChange={(event) => update('issueDate', event.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='invoice-due-date'>Due date</Label>
              <Input
                id='invoice-due-date'
                type='date'
                value={values.dueDate}
                onChange={(event) => update('dueDate', event.target.value)}
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='invoice-description'>
              Description or notes{' '}
              <span className='text-muted-foreground font-normal'>(optional)</span>
            </Label>
            <Textarea
              id='invoice-description'
              value={values.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder='What is this invoice for?'
            />
          </div>
          {error && (
            <p className='text-destructive text-sm' role='alert'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => close(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Creating...' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RefundConfirmation({
  invoice,
  open,
  busy,
  onOpenChange,
  onConfirm
}: {
  invoice: ApplicationInvoice | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!invoice) return null;
  const refundDestination = invoice.payerAddress ?? invoice.refundDestination ?? invoice.recipient;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refund this paid invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            A real Arc Testnet USDC refund is sent only to a verified payer address captured from the confirmed payment transaction.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className='grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm'>
          <div className='flex justify-between gap-4'>
            <span className='text-muted-foreground'>Original transaction</span>
            <span className='max-w-[60%] truncate font-mono text-xs'>
              {invoice.transactionHash}
            </span>
          </div>
          <div className='flex justify-between gap-4'>
            <span className='text-muted-foreground'>Original payment</span>
            <span className='font-medium'>{formatCurrency(invoice.amount)} USDC</span>
          </div>
          <div className='flex justify-between gap-4'>
            <span className='text-muted-foreground'>Refund amount</span>
            <span className='font-medium'>{formatCurrency(invoice.amount)} USDC</span>
          </div>
          <div className='flex justify-between gap-4'>
            <span className='text-muted-foreground'>Refund destination</span>
            <span className='max-w-[60%] truncate text-right font-medium'>
              {refundDestination}
            </span>
          </div>
        </div>
        {!invoice.payerAddress && !invoice.refundDestination && (
          <p className='text-destructive text-sm'>
            No verified payer address is available for this invoice. Refund cannot be sent until the transaction metadata is confirmed.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy || (!invoice.payerAddress && !invoice.refundDestination)} onClick={onConfirm}>
            {busy ? 'Confirming...' : 'Submit real refund'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function InvoicesPage() {
  const arc = useArcData<ArcTransactionRecord[]>('/api/invoices', 'transactionPaymentStatuses');
  const [invoices, setInvoices] = React.useState<ApplicationInvoice[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [payingId, setPayingId] = React.useState<string | null>(null);
  const [refundInvoice, setRefundInvoice] = React.useState<ApplicationInvoice | null>(null);
  const [refundBusy, setRefundBusy] = React.useState(false);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (arc.address) {
      // Wallet-scoped localStorage is an external source synchronized into the page state.
      // eslint-disable-next-line react/set-state-in-effect
      setInvoices(getInvoices(arc.address));
    }
  }, [arc.address]);
  React.useEffect(() => {
    if (!arc.address || !arc.data?.length) return;
    // Reconcile persisted invoice records with confirmed Arc receipts after API refresh.
    // eslint-disable-next-line react/set-state-in-effect
    setInvoices((current) =>
      current.map((invoice) => {
        if (invoice.status === 'Paid' && invoice.payerAddress) return invoice;
        const match = arc.data?.find(
          (transaction) =>
            transaction.hash.toLowerCase() === invoice.transactionHash?.toLowerCase() &&
            transaction.status === 'Confirmed'
        );
        if (!match) return invoice;
        return (
          markInvoicePaid(
            arc.address as string,
            invoice.id,
            match.hash,
            match.from,
            invoice.asset ?? 'USDC'
          ) ?? invoice
        );
      })
    );
  }, [arc.address, arc.data]);

  async function pay(invoice: ApplicationInvoice): Promise<void> {
    if (!arc.address) return;
    setPayingId(invoice.id);
    try {
      const hash = await sendConfirmedUsdcPayment(arc.address, invoice.recipient, invoice.amount);
      const paid = markInvoicePaid(arc.address, invoice.id, hash, arc.address, invoice.asset ?? 'USDC');
      if (paid)
        setInvoices((current) => current.map((item) => (item.id === invoice.id ? paid : item)));
      toast.success(`${invoice.id} paid on Arc Testnet`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invoice payment failed.');
    } finally {
      setPayingId(null);
    }
  }

  async function refund(invoice: ApplicationInvoice): Promise<void> {
    if (!arc.address || !invoice.transactionHash) return;
    const verifiedPayerAddress =
      invoice.payerAddress ??
      arc.data?.find(
        (transaction) =>
          transaction.hash.toLowerCase() === invoice.transactionHash?.toLowerCase() &&
          transaction.status === 'Confirmed'
      )?.from;

    if (!verifiedPayerAddress || !isEvmAddress(verifiedPayerAddress)) {
      toast.error('Refund unavailable: no verified payer address was captured for this invoice.');
      return;
    }

    setRefundBusy(true);
    let pendingRefundId: string | null = null;
    try {
      const refundHash = await sendConfirmedUsdcPayment(
        arc.address,
        verifiedPayerAddress,
        invoice.amount,
        (submittedHash) => {
          const pending = createRefund({
            ownerAddress: arc.address as string,
            invoiceId: invoice.id,
            originalTransactionHash: invoice.transactionHash as string,
            refundTransactionHash: submittedHash,
            amount: invoice.amount,
            customer: invoice.customer,
            recipient: verifiedPayerAddress,
            payerAddress: verifiedPayerAddress,
            asset: 'USDC'
          });
          pendingRefundId = pending.id;
        }
      );
      if (!pendingRefundId) throw new Error('Refund submission was not recorded.');
      const confirmed = markRefundConfirmed(arc.address, pendingRefundId, refundHash);
      const updatedInvoice = markInvoiceRefunded(
        arc.address,
        invoice.id,
        invoice.amount,
        refundHash,
        verifiedPayerAddress
      );
      if (confirmed && updatedInvoice) {
        setInvoices((current) =>
          current.map((item) => (item.id === invoice.id ? updatedInvoice : item))
        );
      }
      setRefundInvoice(null);
      toast.success(`Refund confirmed on Arc Testnet: ${refundHash.slice(0, 10)}...`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Refund transaction failed.');
    } finally {
      setRefundBusy(false);
    }
  }

  const filtered = invoices.filter((invoice) =>
    [invoice.id, invoice.customer, invoice.recipient].some((value) =>
      value.toLowerCase().includes(search.trim().toLowerCase())
    )
  );
  const totals = {
    invoiced: invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
    paid: invoices
      .filter((invoice) => invoice.status === 'Paid')
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0),
    pending: invoices
      .filter((invoice) => invoice.status === 'Pending')
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  };

  if (arc.loading || arc.error || !arc.address)
    return (
      <PageContainer
        pageTitle='Invoices'
        pageDescription='Create, send, and track ARC Pay invoices.'
      >
        <Card>
          <CardContent className='py-12 text-center'>
            <p className='font-medium'>
              {arc.loading ? 'Loading Arc Testnet invoices...' : arc.error}
            </p>
            <p className='text-muted-foreground mt-2 text-sm'>
              Connect an injected wallet on Arc Testnet to continue.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );

  return (
    <PageContainer
      pageTitle='Invoices'
      pageDescription='Create, send, and track ARC Pay invoices.'
      pageHeaderAction={
        <Button type='button' onClick={() => setCreateOpen(true)}>
          <Icons.add data-icon='inline-start' />
          Create invoice
        </Button>
      }
    >
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Total invoiced</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {formatCurrency(String(totals.invoiced))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-muted-foreground text-xs'>Persisted application records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Paid</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {formatCurrency(String(totals.paid))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-emerald-400 text-xs'>Confirmed on Arc Testnet</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardDescription>Pending</CardDescription>
              <CardTitle className='text-2xl tabular-nums'>
                {formatCurrency(String(totals.pending))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-amber-400 text-xs'>Awaiting real payment</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className='gap-4 border-b sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle>All invoices</CardTitle>
              <CardDescription className='mt-1'>
                Application invoices are stored locally for this wallet.
              </CardDescription>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search invoices...'
              className='sm:w-64'
              aria-label='Search invoices'
            />
          </CardHeader>
          <CardContent className='pt-6'>
            <div className='overflow-x-auto rounded-lg border'>
              <Table className='min-w-[980px]'>
                <TableHeader>
                  <TableRow className='bg-muted/50 hover:bg-muted/50'>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue date</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Transaction hash</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? (
                    filtered.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className='font-mono text-sm font-medium'>
                          {invoice.id}
                        </TableCell>
                        <TableCell>
                          <div className='font-medium'>{invoice.customer}</div>
                          <div className='text-muted-foreground mt-1 font-mono text-xs'>
                            {invoice.recipient.slice(0, 6)}...{invoice.recipient.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell className='font-medium tabular-nums'>
                          {formatCurrency(invoice.amount)} USDC
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline' className={statusClassName(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {formatDate(invoice.issueDate)}
                        </TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {formatDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell>
                          {invoice.transactionHash ? (
                            <a
                              href={`https://testnet.arcscan.app/tx/${invoice.transactionHash}`}
                              target='_blank'
                              rel='noreferrer'
                              className='font-mono text-xs text-primary hover:underline'
                            >
                              {invoice.transactionHash.slice(0, 10)}...
                            </a>
                          ) : (
                            <span className='text-muted-foreground text-xs'>Not paid</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.status === 'Paid' && !invoice.refundStatus ? (
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              disabled={refundBusy || (!invoice.payerAddress && !arc.data?.some((transaction) => transaction.hash.toLowerCase() === invoice.transactionHash?.toLowerCase() && transaction.status === 'Confirmed'))}
                              onClick={() => setRefundInvoice(invoice)}
                            >
                              {!invoice.payerAddress && !arc.data?.some((transaction) => transaction.hash.toLowerCase() === invoice.transactionHash?.toLowerCase() && transaction.status === 'Confirmed')
                                ? 'Refund unavailable'
                                : 'Refund'}
                            </Button>
                          ) : invoice.refundStatus === 'Confirmed' ? (
                            <Badge
                              variant='outline'
                              className='border-sky-500/30 bg-sky-500/10 text-sky-400'
                            >
                              Refunded
                            </Badge>
                          ) : (
                            invoice.status !== 'Paid' && (
                              <Button
                                type='button'
                                size='sm'
                                disabled={payingId !== null}
                                onClick={() => void pay(invoice)}
                              >
                                {payingId === invoice.id ? 'Confirming...' : 'Pay'}
                              </Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className='py-14 text-center'>
                        <p className='font-medium'>
                          {search ? 'No invoices match your search.' : 'No invoices yet.'}
                        </p>
                        <p className='text-muted-foreground mt-2 text-sm'>
                          Create an invoice to start tracking a real Arc Testnet USDC payment.
                        </p>
                        <Button type='button' className='mt-4' onClick={() => setCreateOpen(true)}>
                          <Icons.add data-icon='inline-start' />
                          Create invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <InvoiceForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        ownerAddress={arc.address}
        onCreated={(invoice) => setInvoices((current) => [invoice, ...current])}
      />
      <RefundConfirmation
        invoice={refundInvoice}
        open={refundInvoice !== null}
        busy={refundBusy}
        onOpenChange={(open) => !open && !refundBusy && setRefundInvoice(null)}
        onConfirm={() => refundInvoice && void refund(refundInvoice)}
      />
    </PageContainer>
  );
}
