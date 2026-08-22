import type { ApplicationInvoice } from './types';

const STORAGE_KEY = 'arc-pay:invoices:v1';

function readAll(): ApplicationInvoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as ApplicationInvoice[]) : [];
  } catch {
    return [];
  }
}

function writeAll(invoices: ApplicationInvoice[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function getInvoices(ownerAddress: string): ApplicationInvoice[] {
  return readAll().filter(
    (invoice) => invoice.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()
  );
}

export function createInvoice(
  input: Omit<ApplicationInvoice, 'id' | 'createdAt' | 'status' | 'currency' | 'asset'>
): ApplicationInvoice {
  const invoice: ApplicationInvoice = {
    ...input,
    id: `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    asset: 'USDC',
    currency: 'USDC',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  writeAll([invoice, ...readAll()]);
  return invoice;
}

export function markInvoicePaid(
  ownerAddress: string,
  invoiceId: string,
  transactionHash: string,
  payerAddress?: string,
  asset: 'USDC' = 'USDC'
): ApplicationInvoice | null {
  const invoices = readAll();
  let updated: ApplicationInvoice | null = null;
  const next = invoices.map((invoice) => {
    if (
      invoice.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase() ||
      invoice.id !== invoiceId
    )
      return invoice;

    updated = {
      ...invoice,
      status: 'Paid',
      asset,
      currency: 'USDC',
      transactionHash,
      payerAddress: payerAddress ?? invoice.payerAddress,
      paidDate: new Date().toISOString()
    };
    return updated;
  });
  if (updated) writeAll(next);
  return updated;
}

export function markInvoiceRefunded(
  ownerAddress: string,
  invoiceId: string,
  amount: string,
  refundTransactionHash: string,
  refundDestination?: string
): ApplicationInvoice | null {
  const invoices = readAll();
  let updated: ApplicationInvoice | null = null;
  const next = invoices.map((invoice) => {
    if (
      invoice.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase() ||
      invoice.id !== invoiceId
    )
      return invoice;
    updated = {
      ...invoice,
      refundStatus: 'Confirmed',
      refundedAmount: amount,
      refundTransactionHash,
      refundDestination: refundDestination ?? invoice.refundDestination ?? invoice.payerAddress ?? invoice.recipient
    };
    return updated;
  });
  if (updated) writeAll(next);
  return updated;
}
