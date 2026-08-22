import type { ApplicationRefund } from './types';

const STORAGE_KEY = 'arc-pay:refunds:v1';

function readAll(): ApplicationRefund[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as ApplicationRefund[]) : [];
  } catch {
    return [];
  }
}

function writeAll(refunds: ApplicationRefund[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(refunds));
}

export function getRefunds(ownerAddress: string): ApplicationRefund[] {
  return readAll().filter(
    (refund) => refund.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()
  );
}

export function createRefund(
  input: Omit<ApplicationRefund, 'id' | 'createdAt' | 'status' | 'confirmedAt'>
): ApplicationRefund {
  const refund: ApplicationRefund = {
    ...input,
    id: `RF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    asset: input.asset ?? 'USDC',
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  writeAll([refund, ...readAll()]);
  return refund;
}

export function markRefundConfirmed(
  ownerAddress: string,
  refundId: string,
  refundTransactionHash: string
): ApplicationRefund | null {
  const refunds = readAll();
  let updated: ApplicationRefund | null = null;
  const next = refunds.map((refund) => {
    if (refund.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase() || refund.id !== refundId)
      return refund;
    updated = {
      ...refund,
      status: 'Confirmed',
      refundTransactionHash,
      confirmedAt: new Date().toISOString()
    };
    return updated;
  });
  if (updated) writeAll(next);
  return updated;
}
